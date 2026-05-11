import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";
const SOL_BASE = "https://solana-gateway.moralis.io";
const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10_000;

const RequestSchema = z.object({
  address: z.string().min(10).max(128),
  chain: z.enum(["eth", "bsc", "polygon", "arbitrum", "solana", "tron"]),
  action: z.enum(["summary", "transactions", "portfolio"]).default("summary"),
});

function getChainHex(chain: string): string {
  const map: Record<string, string> = {
    eth: "0x1",
    bsc: "0x38",
    polygon: "0x89",
    arbitrum: "0xa4b1",
  };
  return map[chain] || "0x1";
}

async function moralisFetch(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moralis API [${res.status}]: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function getEVMSummary(address: string, chain: string, apiKey: string) {
  const chainHex = getChainHex(chain);

  const [balance, tokens, txs] = await Promise.all([
    moralisFetch(`${MORALIS_BASE}/${address}/balance?chain=${chainHex}`, apiKey),
    moralisFetch(`${MORALIS_BASE}/${address}/erc20?chain=${chainHex}`, apiKey),
    moralisFetch(`${MORALIS_BASE}/${address}/verbose?chain=${chainHex}&limit=50&order=DESC`, apiKey),
  ]);

  const nativeBalance = parseFloat(balance.balance || "0") / 1e18;
  const tokenList = Array.isArray(tokens) ? tokens : [];
  const txList = Array.isArray(txs?.result) ? txs.result : [];
  const totalTxCount = typeof txs?.total === "number" ? txs.total : txList.length;

  // Calculate 30-day PnL from transactions
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentTxs = txList.filter((tx: any) => tx.block_timestamp >= thirtyDaysAgo);

  let totalIn = 0;
  let totalOut = 0;
  for (const tx of recentTxs) {
    const value = parseFloat(tx.value || "0") / 1e18;
    if (tx.to_address?.toLowerCase() === address.toLowerCase()) {
      totalIn += value;
    } else {
      totalOut += value;
    }
  }

  // Token portfolio with values
  const portfolio = tokenList.map((t: any) => ({
    symbol: t.symbol || "?",
    name: t.name || "Unknown",
    balance: parseFloat(t.balance || "0") / Math.pow(10, parseInt(t.decimals || "18")),
    contractAddress: t.token_address,
    logo: t.logo || t.thumbnail || null,
    usdPrice: t.usd_price || null,
    usdValue: t.usd_value || null,
  }));

  // Format transactions
  const transactions = txList.slice(0, 50).map((tx: any) => {
    const isIncoming = tx.to_address?.toLowerCase() === address.toLowerCase();
    return {
      hash: tx.hash,
      timestamp: tx.block_timestamp,
      type: isIncoming ? "Receive" : "Send",
      from: tx.from_address,
      to: tx.to_address,
      value: parseFloat(tx.value || "0") / 1e18,
      gasUsed: tx.receipt_gas_used || tx.gas_used || "0",
      gasPrice: tx.gas_price || "0",
      status: tx.receipt_status === "1" ? "Success" : "Failed",
      methodLabel: tx.method_label || null,
    };
  });

  // Wallet behavior tag
  let tag = "Retail";
  if (nativeBalance > 100) tag = "Whale";
  else if (tokenList.length > 20) tag = "Active Trader";
  else if (totalTxCount > 100) tag = "High Frequency";

  // Top traded tokens
  const tokenCounts: Record<string, number> = {};
  for (const tx of txList) {
    if (tx.method_label) {
      const key = tx.method_label;
      tokenCounts[key] = (tokenCounts[key] || 0) + 1;
    }
  }
  const topInteractions = Object.entries(tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([method, count]) => ({ method, count }));

  return {
    address,
    chain,
    nativeBalance,
    nativeSymbol: chain === "bsc" ? "BNB" : chain === "polygon" ? "MATIC" : chain === "arbitrum" ? "ETH" : "ETH",
    tokenCount: tokenList.length,
    txCount: totalTxCount,
    portfolio,
    transactions,
    pnl30d: {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      percentChange: totalOut > 0 ? ((totalIn - totalOut) / totalOut) * 100 : 0,
    },
    tag,
    topInteractions,
  };
}

async function getSolanaSummary(address: string, apiKey: string) {
  const [balance, tokens, txs] = await Promise.all([
    moralisFetch(`${SOL_BASE}/account/mainnet/${address}/balance`, apiKey),
    moralisFetch(`${SOL_BASE}/account/mainnet/${address}/tokens`, apiKey),
    moralisFetch(`${MORALIS_BASE}/${address}/verbose?chain=solana&limit=50&order=DESC`, apiKey).catch(() => ({ result: [] })),
  ]);

  const nativeBalance = parseFloat(balance.solana || balance.lamports || "0") / (balance.solana ? 1 : 1e9);
  const tokenList = Array.isArray(tokens) ? tokens : [];

  const portfolio = tokenList.map((t: any) => ({
    symbol: t.symbol || "?",
    name: t.name || "Unknown",
    balance: parseFloat(t.amount || "0") / Math.pow(10, parseInt(t.decimals || "9")),
    contractAddress: t.mint,
    logo: null,
    usdPrice: null,
    usdValue: null,
  }));

  return {
    address,
    chain: "solana",
    nativeBalance,
    nativeSymbol: "SOL",
    tokenCount: tokenList.length,
    txCount: 0,
    portfolio,
    transactions: [],
    pnl30d: { totalIn: 0, totalOut: 0, net: 0, percentChange: 0 },
    tag: nativeBalance > 1000 ? "Whale" : "Retail",
    topInteractions: [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const MORALIS_API_KEY = Deno.env.get("MORALIS_API_KEY");
    if (!MORALIS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "MORALIS_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const parsed = RequestSchema.safeParse({
      address: url.searchParams.get("address") || "",
      chain: url.searchParams.get("chain") || "eth",
      action: url.searchParams.get("action") || "summary",
    });

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { address, chain, action } = parsed.data;

    // Cache check
    const cacheKey = `${address}-${chain}-${action}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    if (chain === "solana") {
      result = await getSolanaSummary(address, MORALIS_API_KEY);
    } else if (chain === "tron") {
      // Tron not supported by Moralis — return info message
      result = { error: "Tron chain support coming soon. Use TronScan for now.", chain: "tron", address };
    } else {
      result = await getEVMSummary(address, chain, MORALIS_API_KEY);
    }

    CACHE.set(cacheKey, { data: result, ts: Date.now() });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("wallet-scan error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to scan wallet", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
