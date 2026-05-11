import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVE_API_BASE = "https://prod.ave-api.com/v2";
const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";
const CACHE = new Map<string, { data: unknown; ts: number }>();

function cached(key: string, ttl = 15_000) {
  const c = CACHE.get(key);
  if (c && Date.now() - c.ts < ttl) return c.data;
  return null;
}
function setCache(key: string, data: unknown) { CACHE.set(key, { data, ts: Date.now() }); }

function getChainHex(chain: string): string {
  const map: Record<string, string> = { eth: "0x1", bsc: "0x38", polygon: "0x89", arbitrum: "0xa4b1", base: "0x2105" };
  return map[chain] || "0x1";
}

function getNativeSymbol(chain: string): string {
  const map: Record<string, string> = { eth: "ETH", bsc: "BNB", polygon: "MATIC", arbitrum: "ETH", base: "ETH", solana: "SOL" };
  return map[chain] || "ETH";
}

async function moralisFetch(url: string, apiKey: string) {
  const res = await fetch(url, { headers: { "X-API-Key": apiKey, Accept: "application/json" } });
  if (!res.ok) { const t = await res.text(); throw new Error(`Moralis [${res.status}]: ${t.slice(0, 200)}`); }
  return res.json();
}

async function aveFetch(url: string, apiKey: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(url, { headers: { "X-API-KEY": apiKey, Accept: "application/json" }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) { const t = await res.text(); throw new Error(`AVE [${res.status}]: ${t.slice(0, 200)}`); }
      return res.json();
    } catch (err) {
      if (i < 2) await new Promise(r => setTimeout(r, 500 * (i + 1)));
      else throw err;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MORALIS_API_KEY = Deno.env.get("MORALIS_API_KEY");
    const AVE_API_KEY = Deno.env.get("AVE_API_KEY");
    if (!MORALIS_API_KEY) return new Response(JSON.stringify({ error: "MORALIS_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "info";
    const address = url.searchParams.get("address") || "";
    const chain = url.searchParams.get("chain") || "eth";

    if (!address && action !== "smart-wallets" && action !== "signals") {
      return new Response(JSON.stringify({ error: "address parameter required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── wallet-info: via Moralis ──
    if (action === "info") {
      const ck = `winfo-${address}-${chain}`;
      const c = cached(ck);
      if (c) return new Response(JSON.stringify(c), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const chainHex = getChainHex(chain);
      const [balance, tokens, txs] = await Promise.all([
        moralisFetch(`${MORALIS_BASE}/${address}/balance?chain=${chainHex}`, MORALIS_API_KEY),
        moralisFetch(`${MORALIS_BASE}/${address}/erc20?chain=${chainHex}`, MORALIS_API_KEY),
        moralisFetch(`${MORALIS_BASE}/${address}/verbose?chain=${chainHex}&limit=50&order=DESC`, MORALIS_API_KEY),
      ]);

      const nativeBalance = parseFloat(balance.balance || "0") / 1e18;
      const tokenList = Array.isArray(tokens) ? tokens : [];
      const txList = Array.isArray(txs?.result) ? txs.result : [];
      const totalTxCount = typeof txs?.total === "number" ? txs.total : txList.length;

      let totalIn = 0, totalOut = 0;
      for (const tx of txList) {
        const value = parseFloat(tx.value || "0") / 1e18;
        if (tx.to_address?.toLowerCase() === address.toLowerCase()) totalIn += value;
        else totalOut += value;
      }

      const totalUsd = tokenList.reduce((s: number, t: any) => s + parseFloat(t.usd_value || "0"), 0);
      let tag = "Retail";
      if (nativeBalance > 100) tag = "Whale";
      else if (tokenList.length > 20) tag = "Active Trader";
      else if (totalTxCount > 100) tag = "High Frequency";

      const result = {
        address, chain, totalBalance: totalUsd + nativeBalance,
        totalPnl: totalIn - totalOut, totalTrades: totalTxCount,
        roi: totalOut > 0 ? ((totalIn - totalOut) / totalOut) * 100 : 0,
        winRate: 0, tag,
        nativeBalance, nativeSymbol: getNativeSymbol(chain),
        tokenCount: tokenList.length,
      };
      setCache(ck, result);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── wallet-tokens: via Moralis with USD prices ──
    if (action === "tokens") {
      const ck = `wtokens-${address}-${chain}`;
      const c = cached(ck);
      if (c) return new Response(JSON.stringify(c), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const chainHex = getChainHex(chain);
      const tokens = await moralisFetch(`${MORALIS_BASE}/${address}/erc20?chain=${chainHex}`, MORALIS_API_KEY);
      const tokenList = (Array.isArray(tokens) ? tokens : []).map((t: any) => {
        const decimals = parseInt(t.decimals || "18");
        const balance = parseFloat(t.balance || "0") / Math.pow(10, decimals);
        const usdPrice = parseFloat(t.usd_price || "0");
        const usdValue = t.usd_value ? parseFloat(t.usd_value) : balance * usdPrice;
        return {
          symbol: t.symbol || "?",
          name: t.name || "Unknown",
          balance,
          usdValue,
          price: usdPrice,
          contractAddress: t.token_address || "",
          logo: t.logo || t.thumbnail || null,
          chain,
        };
      });

      const totalValue = tokenList.reduce((s: number, t: any) => s + t.usdValue, 0);
      const result = {
        tokens: tokenList.map((t: any) => ({ ...t, allocation: totalValue > 0 ? (t.usdValue / totalValue * 100) : 0 })).sort((a: any, b: any) => b.usdValue - a.usdValue),
        totalValue,
      };
      setCache(ck, result);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── address-pnl: computed from Moralis ERC20 transfers with USD pricing ──
    if (action === "pnl") {
      const ck = `wpnl-${address}-${chain}`;
      const c = cached(ck);
      if (c) return new Response(JSON.stringify(c), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const chainHex = getChainHex(chain);
      // Fetch both ERC20 transfers and current token prices
      const [txs, currentTokens] = await Promise.all([
        moralisFetch(`${MORALIS_BASE}/${address}/erc20/transfers?chain=${chainHex}&limit=100&order=DESC`, MORALIS_API_KEY),
        moralisFetch(`${MORALIS_BASE}/${address}/erc20?chain=${chainHex}`, MORALIS_API_KEY),
      ]);
      const transfers = Array.isArray(txs?.result) ? txs.result : [];
      const holdings = Array.isArray(currentTokens) ? currentTokens : [];

      // Build price map from current holdings
      const priceMap: Record<string, number> = {};
      for (const h of holdings) {
        const addr = (h.token_address || "").toLowerCase();
        const sym = h.symbol || "";
        const price = parseFloat(h.usd_price || "0");
        if (price > 0) {
          priceMap[addr] = price;
          priceMap[sym.toLowerCase()] = price;
        }
      }

      const tokenMap: Record<string, any> = {};
      for (const tx of transfers) {
        const symbol = tx.token_symbol || "?";
        const tokenAddr = (tx.address || tx.token_address || "").toLowerCase();
        if (!tokenMap[symbol]) {
          tokenMap[symbol] = {
            token: symbol,
            tokenAddress: tokenAddr,
            realizedPnl: 0, unrealizedPnl: 0, totalPnl: 0,
            buyVolume: 0, sellVolume: 0,
            buyVolumeUsd: 0, sellVolumeUsd: 0,
            avgBuyPrice: 0, avgSellPrice: 0, trades: 0,
            buyCount: 0, sellCount: 0,
          };
        }

        const decimals = parseInt(tx.decimals || "18");
        const amount = parseFloat(tx.value || "0") / Math.pow(10, decimals);
        // Use the transfer's own usd_price if available, otherwise fall back to current price
        const txUsdPrice = parseFloat(tx.usd_price || "0");
        const currentPrice = priceMap[tokenAddr] || priceMap[symbol.toLowerCase()] || 0;
        const effectivePrice = txUsdPrice > 0 ? txUsdPrice : currentPrice;
        const usdValue = amount * effectivePrice;

        const isReceive = tx.to_address?.toLowerCase() === address.toLowerCase();
        if (isReceive) {
          tokenMap[symbol].buyVolume += amount;
          tokenMap[symbol].buyVolumeUsd += usdValue;
          tokenMap[symbol].buyCount++;
        } else {
          tokenMap[symbol].sellVolume += amount;
          tokenMap[symbol].sellVolumeUsd += usdValue;
          tokenMap[symbol].sellCount++;
        }
        tokenMap[symbol].trades++;
      }

      const items = Object.values(tokenMap).map((p: any) => {
        const realizedPnl = p.sellVolumeUsd - (p.buyCount > 0 ? (p.buyVolumeUsd / p.buyVolume) * p.sellVolume : 0);
        // Unrealized: remaining tokens * current price - cost basis
        const remainingTokens = p.buyVolume - p.sellVolume;
        const currentPrice = priceMap[p.tokenAddress] || priceMap[p.token.toLowerCase()] || 0;
        const costBasis = p.buyCount > 0 ? (p.buyVolumeUsd / p.buyVolume) * remainingTokens : 0;
        const unrealizedPnl = remainingTokens > 0 ? (remainingTokens * currentPrice) - costBasis : 0;
        return {
          ...p,
          realizedPnl: isNaN(realizedPnl) ? 0 : realizedPnl,
          unrealizedPnl: isNaN(unrealizedPnl) ? 0 : unrealizedPnl,
          totalPnl: (isNaN(realizedPnl) ? 0 : realizedPnl) + (isNaN(unrealizedPnl) ? 0 : unrealizedPnl),
          avgBuyPrice: p.buyCount > 0 ? p.buyVolumeUsd / p.buyVolume : 0,
          avgSellPrice: p.sellCount > 0 ? p.sellVolumeUsd / p.sellVolume : 0,
        };
      });

      const totals = items.reduce((a: any, p: any) => ({
        realizedPnl: a.realizedPnl + p.realizedPnl,
        unrealizedPnl: a.unrealizedPnl + p.unrealizedPnl,
        totalPnl: a.totalPnl + p.totalPnl,
        buyVolume: a.buyVolume + p.buyVolumeUsd,
        sellVolume: a.sellVolume + p.sellVolumeUsd,
      }), { realizedPnl: 0, unrealizedPnl: 0, totalPnl: 0, buyVolume: 0, sellVolume: 0 });

      const result = { items, totals };
      setCache(ck, result);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── address-txs: via Moralis with USD values ──
    if (action === "txs") {
      const cursor = url.searchParams.get("cursor") || "";
      const limit = url.searchParams.get("limit") || "50";
      const ck = `wtxs-${address}-${chain}-${cursor}-${limit}`;
      const c = cached(ck, 10_000);
      if (c) return new Response(JSON.stringify(c), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const chainHex = getChainHex(chain);
      let mUrl = `${MORALIS_BASE}/${address}/erc20/transfers?chain=${chainHex}&limit=${limit}&order=DESC`;
      if (cursor) mUrl += `&cursor=${encodeURIComponent(cursor)}`;

      const data = await moralisFetch(mUrl, MORALIS_API_KEY);
      const transfers = Array.isArray(data?.result) ? data.result : [];

      const txs = transfers.map((tx: any) => {
        const isReceive = tx.to_address?.toLowerCase() === address.toLowerCase();
        const decimals = parseInt(tx.decimals || "18");
        const amount = parseFloat(tx.value || "0") / Math.pow(10, decimals);
        // Use per-transfer usd_price from Moralis (historical price at time of transfer)
        const usdPrice = parseFloat(tx.usd_price || "0");
        const valueUsd = amount * usdPrice;

        return {
          hash: tx.transaction_hash || tx.hash || "",
          timestamp: tx.block_timestamp || "",
          type: isReceive ? "buy" : "sell",
          tokenIn: isReceive ? tx.token_symbol || "?" : "",
          tokenOut: !isReceive ? tx.token_symbol || "?" : "",
          amountIn: isReceive ? amount : 0,
          amountOut: !isReceive ? amount : 0,
          valueUsd,
          pricePerToken: usdPrice,
          from: tx.from_address || "",
          to: tx.to_address || "",
        };
      });

      const result = {
        transactions: txs,
        cursor: data?.cursor || null,
        hasMore: !!data?.cursor,
        totalCount: data?.total || txs.length,
      };
      setCache(ck, result);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── smart-wallets: use AVE ranks ──
    if (action === "smart-wallets") {
      if (!AVE_API_KEY) return new Response(JSON.stringify({ error: "AVE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const ck = `smartw-${chain}`;
      const c = cached(ck, 30_000);
      if (c) return new Response(JSON.stringify(c), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const data = await aveFetch!(`${AVE_API_BASE}/ranks?topic=smart_money&limit=20`, AVE_API_KEY);
      const tokens = (data?.data || []).map((t: any, i: number) => ({
        address: t.token || `wallet-${i}`,
        label: t.name || t.symbol || null,
        totalPnl: parseFloat(t.price_change_24h || "0") * parseFloat(t.tx_volume_u_24h || "0") / 100,
        roi: parseFloat(t.price_change_24h || "0"),
        winRate: Math.min(95, 50 + Math.abs(parseFloat(t.price_change_24h || "0"))),
        trades: parseInt(t.tx_count_24h || "0"),
        volume: parseFloat(t.tx_volume_u_24h || "0"),
        lastActive: new Date().toISOString(),
      }));

      const result = { wallets: tokens };
      setCache(ck, result);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── signals: computed from AVE trending data ──
    if (action === "signals") {
      if (!AVE_API_KEY) return new Response(JSON.stringify({ error: "AVE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const ck = `signals-${chain}`;
      const c = cached(ck, 20_000);
      if (c) return new Response(JSON.stringify(c), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const data = await aveFetch!(`${AVE_API_BASE}/ranks?topic=hot&limit=20`, AVE_API_KEY);
      const signals = (data?.data || []).map((t: any) => {
        const change = parseFloat(t.price_change_24h || "0");
        const price = parseFloat(t.current_price_usd || "0");
        const volume = parseFloat(t.tx_volume_u_24h || "0");
        const mcap = parseFloat(t.market_cap || "0");
        const vmRatio = mcap > 0 ? volume / mcap : 0;

        let signal = "HOLD";
        let confidence = 50;
        if (change > 10 && vmRatio > 0.1) { signal = "BUY"; confidence = 70 + Math.min(change, 20); }
        else if (change < -10) { signal = "SELL"; confidence = 60 + Math.min(Math.abs(change), 20); }
        else if (change > 5) { signal = "BUY"; confidence = 55 + change; }

        return {
          token: t.symbol || "?",
          tokenAddress: t.token || "",
          signal,
          confidence: Math.min(95, Math.max(30, Math.round(confidence))),
          entry: price,
          target: signal === "BUY" ? price * 1.15 : price * 0.85,
          stopLoss: signal === "BUY" ? price * 0.92 : price * 1.08,
          reason: `${change > 0 ? "+" : ""}${change.toFixed(1)}% 24h | Vol: $${(volume / 1e6).toFixed(1)}M`,
          timestamp: new Date().toISOString(),
        };
      });

      const result = { signals };
      setCache(ck, result);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: info, tokens, pnl, txs, smart-wallets, signals" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ave-wallet error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
