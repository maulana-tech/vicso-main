import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVE_API_BASE = "https://prod.ave-api.com/v2";
const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30s cache to reduce API calls

function isContractAddress(input: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input) && !input.match(/^[A-Z]{2,10}$/)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(input)) return true; // TRX
  return false;
}

function sanitizeInput(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\-]/g, "").slice(0, 64);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const AVE_API_KEY = Deno.env.get("AVE_API_KEY");
    if (!AVE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AVE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const rawInput = url.searchParams.get("symbol") || url.searchParams.get("address") || "";
    const chain = url.searchParams.get("chain") || "";
    const input = sanitizeInput(rawInput);

    if (!input) {
      return new Response(
        JSON.stringify({ error: "symbol or address parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cacheKey = `${input}-${chain}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isContract = isContractAddress(rawInput);
    
    // Build AVE API URL — use address endpoint for contracts, keyword search for symbols
    let aveUrl: string;
    if (isContract) {
      aveUrl = `${AVE_API_BASE}/tokens?keyword=${encodeURIComponent(input)}${chain ? `&chain=${encodeURIComponent(chain)}` : ""}&limit=5`;
    } else {
      aveUrl = `${AVE_API_BASE}/tokens?keyword=${encodeURIComponent(input)}${chain ? `&chain=${encodeURIComponent(chain)}` : ""}&limit=5`;
    }

    // Retry with backoff to handle HTTP/2 connection errors
    let aveRes: Response | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        aveRes = await fetch(aveUrl, {
          headers: { "X-API-KEY": AVE_API_KEY, "Accept": "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        break;
      } catch (err) {
        lastErr = err;
        console.error(`AVE API fetch attempt ${attempt + 1} failed:`, err);
        if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    if (!aveRes) {
      return new Response(
        JSON.stringify({ error: "Failed to reach AVE API after retries", details: String(lastErr) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aveRes.ok) {
      const errText = await aveRes.text();
      console.error("AVE API error:", aveRes.status, errText);
      const isRateLimit = aveRes.status === 429;
      
      // For rate limits, return cached data if available, or a fallback-friendly response
      if (isRateLimit) {
        const cached = CACHE.get(cacheKey);
        if (cached) {
          return new Response(
            JSON.stringify(cached.data),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "RATE_LIMITED", fallback: true, details: "Too many requests, please retry shortly" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `AVE API returned ${aveRes.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aveData = await aveRes.json();
    const tokenArr = Array.isArray(aveData?.data) ? aveData.data : [];

    if (!tokenArr.length) {
      const label = isContract ? "contract address" : "symbol";
      return new Response(
        JSON.stringify({ error: `No token found for ${label} "${rawInput}"` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick best match
    const t = tokenArr.reduce((best: Record<string, unknown>, cur: Record<string, unknown>) => {
      const bestMcap = parseFloat(String(best.market_cap || best.fdv || "0"));
      const curMcap = parseFloat(String(cur.market_cap || cur.fdv || "0"));
      return curMcap > bestMcap ? cur : best;
    }, tokenArr[0]);

    const price = parseFloat(String(t.current_price_usd || t.price || "0"));
    const marketCap = parseFloat(String(t.market_cap || t.fdv || "0"));
    const liquidity = parseFloat(String(t.tvl || t.main_pair_tvl || t.liquidity || "0"));
    const volume24h = parseFloat(String(t.tx_volume_u_24h || t.volume_24h || "0"));
    const priceChange24h = parseFloat(String(t.price_change_24h || "0"));
    const holders = parseInt(String(t.holders || t.holder_count || "0"));
    const lockedPercent = parseFloat(String(t.locked_percent || "0"));
    const aveRiskScore = parseInt(String(t.risk_score || "0"));
    const txCount24h = parseInt(String(t.tx_count_24h || "0"));
    const priceHigh24h = parseFloat(String(t.price_high_24h || "0"));
    const priceLow24h = parseFloat(String(t.price_low_24h || "0"));

    const tokenData = {
      name: t.name || t.symbol || input,
      symbol: t.symbol || input.toUpperCase(),
      address: t.token || t.address || (isContract ? rawInput : ""),
      price,
      marketCap,
      liquidity,
      volume24h,
      priceChange24h,
      priceHigh24h,
      priceLow24h,
      holders,
      topHolderPercent: lockedPercent,
      liquidityLocked: lockedPercent > 0 || !!t.lock_platform,
      chain: t.chain || chain || "eth",
      txCount24h,
      lockPlatform: t.lock_platform || null,
      logoUrl: t.logo_url || null,
      aveRiskLevel: t.ave_risk_level ?? null,
      isMintable: t.is_mintable === "1",
      isHoneypot: t.is_honeypot === true || t.is_honeypot === "1",
      hasBlackMethod: t.has_black_method === true || t.has_black_method === "1",
      inputType: isContract ? "contract" : "symbol",
      source: "ave",
    };

    // Risk score calculation
    let riskScore = aveRiskScore;
    if (!riskScore || riskScore === 0) {
      riskScore = 50;
      if (liquidity > 1000000) riskScore -= 15;
      else if (liquidity < 10000) riskScore += 20;
      if (holders > 10000) riskScore -= 10;
      else if (holders < 100) riskScore += 15;
      if (!tokenData.liquidityLocked) riskScore += 15;
      if (marketCap > 0 && volume24h / marketCap > 0.5) riskScore -= 5;
      else if (marketCap > 0 && volume24h / marketCap < 0.01) riskScore += 10;
      if (tokenData.isMintable) riskScore += 10;
      if (tokenData.isHoneypot) riskScore += 30;
      if (tokenData.hasBlackMethod) riskScore += 15;
      riskScore = Math.max(5, Math.min(95, riskScore));
    }

    const result = { ...tokenData, riskScore };
    CACHE.set(cacheKey, { data: result, ts: Date.now() });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ave-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
