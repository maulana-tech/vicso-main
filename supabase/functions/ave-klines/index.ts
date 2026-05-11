import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVE_API_BASE = "https://prod.ave-api.com/v2";
const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 8_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const AVE_API_KEY = Deno.env.get("AVE_API_KEY");
    if (!AVE_API_KEY) {
      return new Response(JSON.stringify({ error: "AVE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "klines";

    // ── ACTION: klines (candle data by token) ──
    if (action === "klines") {
      const tokenId = url.searchParams.get("token_id") || "";
      const interval = url.searchParams.get("interval") || "5";
      const limit = url.searchParams.get("limit") || "200";

      if (!tokenId) {
        return new Response(JSON.stringify({ error: "token_id is required (format: {address}-{chain})" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cacheKey = `klines-${tokenId}-${interval}-${limit}`;
      const cached = CACHE.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aveUrl = `${AVE_API_BASE}/klines/token/${encodeURIComponent(tokenId)}?interval=${interval}&limit=${limit}`;
      const aveRes = await fetch(aveUrl, {
        headers: { "X-API-KEY": AVE_API_KEY, "Accept": "application/json" },
      });

      if (!aveRes.ok) {
        const errText = await aveRes.text();
        return new Response(JSON.stringify({ error: `AVE API ${aveRes.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aveData = await aveRes.json();
      const points = aveData?.data?.points || [];

      const candles = points.map((p: any) => ({
        time: p.time,
        open: parseFloat(p.open),
        high: parseFloat(p.high),
        low: parseFloat(p.low),
        close: parseFloat(p.close),
        volume: parseFloat(p.volume || "0"),
      }));

      const result = { candles, total: candles.length };
      CACHE.set(cacheKey, { data: result, ts: Date.now() });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: hot (trending tokens for market list) ──
    if (action === "hot") {
      const topic = url.searchParams.get("topic") || "hot";
      const limit = url.searchParams.get("limit") || "30";

      const cacheKey = `hot-${topic}-${limit}`;
      const cached = CACHE.get(cacheKey);
      if (cached && Date.now() - cached.ts < 30_000) {
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aveUrl = `${AVE_API_BASE}/ranks?topic=${encodeURIComponent(topic)}&limit=${limit}`;
      const aveRes = await fetch(aveUrl, {
        headers: { "X-API-KEY": AVE_API_KEY, "Accept": "application/json" },
      });

      if (!aveRes.ok) {
        const errText = await aveRes.text();
        return new Response(JSON.stringify({ error: `AVE API ${aveRes.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aveData = await aveRes.json();
      const tokens = (aveData?.data || []).map((t: any) => ({
        symbol: t.symbol,
        name: t.name,
        address: t.token,
        chain: t.chain,
        price: parseFloat(t.current_price_usd || "0"),
        change24h: parseFloat(t.price_change_24h || "0"),
        volume24h: parseFloat(t.tx_volume_u_24h || "0"),
        marketCap: parseFloat(t.market_cap || "0"),
        liquidity: parseFloat(t.tvl || t.main_pair_tvl || "0"),
        logoUrl: t.logo_url || null,
        tokenId: `${t.token}-${t.chain}`,
      }));

      const result = { tokens };
      CACHE.set(cacheKey, { data: result, ts: Date.now() });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: detail (token detail + pairs for getting pair IDs) ──
    if (action === "detail") {
      const tokenId = url.searchParams.get("token_id") || "";
      if (!tokenId) {
        return new Response(JSON.stringify({ error: "token_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cacheKey = `detail-${tokenId}`;
      const cached = CACHE.get(cacheKey);
      if (cached && Date.now() - cached.ts < 15_000) {
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aveUrl = `${AVE_API_BASE}/tokens/${encodeURIComponent(tokenId)}`;
      const aveRes = await fetch(aveUrl, {
        headers: { "X-API-KEY": AVE_API_KEY, "Accept": "application/json" },
      });

      if (!aveRes.ok) {
        const errText = await aveRes.text();
        return new Response(JSON.stringify({ error: `AVE API ${aveRes.status}`, details: errText }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aveData = await aveRes.json();
      const t = aveData?.data?.token || {};
      const pairs = (aveData?.data?.pairs || []).map((p: any) => ({
        pairId: `${p.pair}-${p.chain}`,
        pair: p.pair,
        chain: p.chain,
        amm: p.amm,
        token0Symbol: p.token0_symbol,
        token1Symbol: p.token1_symbol,
        volume: parseFloat(p.volume_u || "0"),
        txCount: p.tx_count || 0,
      }));

      const result = {
        symbol: t.symbol,
        name: t.name,
        price: parseFloat(t.current_price_usd || "0"),
        change24h: parseFloat(t.price_change_24h || "0"),
        volume24h: parseFloat(t.tx_volume_u_24h || "0"),
        marketCap: parseFloat(t.market_cap || "0"),
        liquidity: parseFloat(t.tvl || "0"),
        holders: parseInt(t.holders || "0"),
        pairs,
      };

      CACHE.set(cacheKey, { data: result, ts: Date.now() });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: klines, hot, detail" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ave-klines:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
