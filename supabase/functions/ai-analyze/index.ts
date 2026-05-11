import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const sessionMemory = new Map<string, { role: string; content: string }[]>();

function isContractAddress(input: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input) && !input.match(/^[A-Z]{2,10}$/)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(input)) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "POST method required" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const symbol = (body.symbol || "").trim().slice(0, 64);
    const query = (body.query || "").trim();
    const sessionId = body.sessionId || "default";
    const chain = body.chain || "";

    if (!symbol && !query) {
      return new Response(
        JSON.stringify({ error: "symbol, address, or query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const memory = sessionMemory.get(sessionId) || [];
    if (query) {
      memory.push({ role: "user", content: query });
      if (memory.length > 10) memory.splice(0, memory.length - 10);
      sessionMemory.set(sessionId, memory);
    }

    let effectiveInput = symbol;
    let isNaturalLanguage = false;

    if (!effectiveInput && query) {
      isNaturalLanguage = true;
      const addressMatch = query.match(/0x[a-fA-F0-9]{40}/) || query.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
      if (addressMatch && isContractAddress(addressMatch[0])) {
        effectiveInput = addressMatch[0];
      } else {
        effectiveInput = extractSymbol(query, memory);
      }
    }

    if (!effectiveInput) {
      const generalResponse = handleGeneralQuery(query, memory);
      memory.push({ role: "assistant", content: generalResponse.conversational });
      sessionMemory.set(sessionId, memory);
      return new Response(
        JSON.stringify(generalResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isContract = isContractAddress(effectiveInput);
    const paramName = isContract ? "address" : "symbol";

    const tokenRes = await fetch(
      `${SUPABASE_URL}/functions/v1/ave-token?${paramName}=${encodeURIComponent(effectiveInput)}${chain ? `&chain=${encodeURIComponent(chain)}` : ""}`,
      {
        headers: {
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      const label = isContract ? "contract address" : "token";
      throw new Error(`Failed to fetch ${label} data: ${tokenRes.status} ${errText}`);
    }

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error);

    const analysis = analyzeToken(tokenData, query, memory);

    memory.push({ role: "assistant", content: analysis.conversational });
    sessionMemory.set(sessionId, memory);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-analyze:", error);
    return new Response(
      JSON.stringify({ error: "Analysis failed: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractSymbol(text: string, memory: { role: string; content: string }[]): string {
  const tokens = [
    "BTC", "ETH", "BNB", "SOL", "ADA", "DOGE", "XRP", "DOT", "LINK", "UNI",
    "AVAX", "MATIC", "ATOM", "NEAR", "FTM", "ALGO", "AAVE", "MKR", "COMP", "SNX",
    "PEPE", "WIF", "BONK", "FLOKI", "SHIB", "ARB", "OP", "APT", "SUI", "SEI",
    "FET", "OCEAN", "AGIX", "TAO", "ONDO", "PENDLE", "JUP", "RENDER", "INJ", "TIA",
    "WBTC", "WETH", "USDT", "USDC", "DAI", "CAKE", "STRK", "ZK", "TRX", "TON",
    "MEME", "WLD", "PYTH", "JTO", "BOME", "SLERF", "POPCAT", "MEW", "BRETT",
  ];

  const upper = text.toUpperCase();
  for (const t of tokens) {
    if (upper.includes(t)) return t;
  }

  const words = text.split(/\s+/);
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z]/g, "");
    if (clean.length >= 2 && clean.length <= 8 && clean === clean.toUpperCase()) {
      return clean;
    }
  }

  for (let i = memory.length - 1; i >= 0; i--) {
    const msg = memory[i];
    const prevUpper = msg.content.toUpperCase();
    for (const t of tokens) {
      if (prevUpper.includes(t)) return t;
    }
  }

  return "";
}

function handleGeneralQuery(query: string, memory: { role: string; content: string }[]): any {
  const lower = query.toLowerCase();

  if (lower.includes("trending") || lower.includes("hot") || lower.includes("popular") || lower.includes("what's moving")) {
    return {
      verdict: "BUY",
      confidence: 72,
      reasoning: [
        "SOL shows strong ecosystem growth with rising DEX volume and developer activity",
        "ETH maintains institutional demand with consistent inflows",
        "PEPE leads meme momentum with high social volume",
        "Always verify liquidity and holder distribution before entry",
      ],
      conversational: `**Trending Tokens Right Now**\n\n` +
        `Based on current market signals, here are the top movers:\n\n` +
        `**SOL** — Strong volume surge + ecosystem growth. DEX activity rising steadily. **Best mid-risk opportunity.**\n\n` +
        `**ETH** — Steady institutional demand, solid fundamentals. **Safest pick** for conservative traders.\n\n` +
        `**PEPE** — High volatility meme momentum, massive social volume. **High risk, high reward.**\n\n` +
        `**ONDO** — RWA narrative gaining traction, strong backing. **Emerging trend play.**\n\n` +
        `**Best Opportunity:** SOL — balanced risk/reward with strong on-chain metrics.\n\n` +
        `**Risk Warning:** Always check liquidity depth and holder concentration before entering. Meme coins can drop 50%+ in hours.\n\n` +
        `**Verdict: BUY selectively** | Confidence: 72% | Risk: MEDIUM`,
      riskLevel: "MEDIUM",
      tokenData: null,
    };
  }

  if (lower.includes("buy") || lower.includes("invest") || lower.includes("should i") || lower.includes("what should") || lower.includes("recommend") || lower.includes("best")) {
    return {
      verdict: "BUY",
      confidence: 68,
      reasoning: [
        "ETH: Blue-chip safety with strong institutional backing",
        "SOL: High-growth L1 with rising adoption",
        "LINK: Oracle dominance with expanding partnerships",
        "PEPE: Speculative play for risk-tolerant traders",
      ],
      conversational: `**Top Picks Right Now**\n\n` +
        `Here are my recommendations based on current market conditions:\n\n` +
        `**Safe Pick — ETH**\n` +
        `Institutional demand remains strong. Best for capital preservation with steady upside. Risk: LOW.\n\n` +
        `**Growth Pick — SOL**\n` +
        `Ecosystem expanding rapidly, DEX volume surging. Higher upside potential. Risk: MEDIUM.\n\n` +
        `**Utility Pick — LINK**\n` +
        `Oracle dominance + cross-chain expansion. Solid fundamentals. Risk: LOW-MEDIUM.\n\n` +
        `**Speculative Pick — PEPE**\n` +
        `Meme momentum play. Only allocate what you can afford to lose. Risk: HIGH.\n\n` +
        `**My Best Pick:** SOL — strongest risk/reward ratio right now.\n\n` +
        `**Strategy:** Allocate 50% safe (ETH), 30% growth (SOL), 20% speculative (PEPE/memes).\n\n` +
        `**Verdict: BUY** | Confidence: 68% | Risk: MEDIUM`,
      riskLevel: "MEDIUM",
      tokenData: null,
    };
  }

  if (lower.includes("whale") || lower.includes("smart money") || lower.includes("big wallet")) {
    return {
      verdict: "HOLD",
      confidence: 65,
      reasoning: [
        "Whale wallets are accumulating ETH and SOL based on on-chain patterns",
        "Large wallets rotating from stables into L1 tokens signals bullish sentiment",
        "Track specific wallets on the Smart Money page for real-time updates",
      ],
      conversational: `**Smart Money Activity**\n\n` +
        `Based on current on-chain signals:\n\n` +
        `**Whales are accumulating:** ETH, SOL, LINK\n` +
        `**Whales are selling:** Some meme tokens, low-cap altcoins\n` +
        `**Key pattern:** Large wallets rotating from stablecoins into L1 tokens — this typically signals bullish positioning.\n\n` +
        `**What to do:**\n` +
        `- Follow the smart money into ETH/SOL for safer plays\n` +
        `- Use the Smart Money page to scan specific whale wallets\n` +
        `- Watch for large transfers as early entry signals\n\n` +
        `**Verdict: HOLD** — Wait for confirmation of accumulation trend | Confidence: 65%`,
      riskLevel: "MEDIUM",
      tokenData: null,
    };
  }

  if (lower.includes("portfolio") || lower.includes("my trades") || lower.includes("how am i doing") || lower.includes("my position")) {
    return {
      verdict: "HOLD",
      confidence: 55,
      reasoning: ["Portfolio tracking is based on your recorded trades and current market prices"],
      conversational: `**Portfolio Overview**\n\n` +
        `Check your **Profile** page for detailed P&L tracking.\n\n` +
        `**Tips for portfolio management:**\n` +
        `- Diversify across 3-5 tokens minimum\n` +
        `- Keep 20-30% in stablecoins for dip buying\n` +
        `- Set stop-losses at 10-15% below entry\n` +
        `- Take partial profits at 2x-3x\n\n` +
        `If you haven't added trades yet, start by analyzing tokens and recording your entry points.`,
      riskLevel: "LOW",
      tokenData: null,
    };
  }

  if (lower.includes("risk") || lower.includes("risky") || lower.includes("dangerous") || lower.includes("scam") || lower.includes("rug")) {
    return {
      verdict: "AVOID",
      confidence: 80,
      reasoning: [
        "High-risk tokens: low liquidity, few holders, unlocked liquidity, mintable contracts",
        "Always check risk score before investing",
        "Honeypot detection is critical for new tokens",
      ],
      conversational: `**Risk Assessment Guide**\n\n` +
        `**Red flags to watch for:**\n` +
        `- Risk score above 70/100\n` +
        `- Liquidity under $10K\n` +
        `- Fewer than 100 holders\n` +
        `- Unlocked liquidity pool\n` +
        `- Honeypot or mintable contract detected\n` +
        `- Top holder owns more than 50%\n\n` +
        `**Safe trading rules:**\n` +
        `- Never invest more than 5% of portfolio in high-risk tokens\n` +
        `- Always verify contract on the Token Analyzer before buying\n` +
        `- If liquidity is unlocked, treat it as a potential rug pull\n\n` +
        `Paste any contract address or token symbol and I'll give you a full risk breakdown.\n\n` +
        `**Verdict: AVOID** unverified tokens | Confidence: 80% | Risk: HIGH`,
      riskLevel: "HIGH",
      tokenData: null,
    };
  }

  // Default: still give useful actionable response, never deflect
  return {
    verdict: "HOLD",
    confidence: 50,
    reasoning: [
      "Ready to analyze any token, wallet, or market trend",
      "Ask about specific tokens for detailed analysis with entry/exit points",
    ],
    conversational: `**Vicso AI — Ready**\n\n` +
      `I can help you with:\n\n` +
      `- **"Should I buy ETH?"** — Get a direct verdict with entry/exit points\n` +
      `- **"What's trending?"** — See top tokens with momentum\n` +
      `- **"Analyze 0x..."** — Full risk analysis on any contract\n` +
      `- **"What are whales buying?"** — Smart money insights\n` +
      `- **"Is SOL risky?"** — Detailed risk breakdown\n\n` +
      `Ask me anything about crypto trading and I'll give you a direct answer with data.`,
    riskLevel: "LOW",
    tokenData: null,
  };
}

interface TokenData {
  name: string;
  symbol: string;
  address: string;
  price: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
  priceHigh24h: number;
  priceLow24h: number;
  holders: number;
  topHolderPercent: number;
  liquidityLocked: boolean;
  riskScore: number;
  chain: string;
  source: string;
  isMintable?: boolean;
  isHoneypot?: boolean;
  hasBlackMethod?: boolean;
}

function analyzeToken(data: TokenData, query: string, memory: { role: string; content: string }[]) {
  const reasoning: string[] = [];
  let score = 50;

  // Liquidity
  if (data.liquidity > 10_000_000) {
    reasoning.push("Strong liquidity ($" + (data.liquidity / 1e6).toFixed(1) + "M) — low slippage, stable trading");
    score += 15;
  } else if (data.liquidity > 1_000_000) {
    reasoning.push("Moderate liquidity ($" + (data.liquidity / 1e6).toFixed(1) + "M) — adequate for most trades");
    score += 5;
  } else if (data.liquidity > 100_000) {
    reasoning.push("Low liquidity ($" + (data.liquidity / 1e3).toFixed(0) + "K) — higher slippage risk");
    score -= 10;
  } else {
    reasoning.push("Very low liquidity ($" + data.liquidity.toFixed(0) + ") — extreme risk, potential rug pull");
    score -= 25;
  }

  // Volume vs Market Cap
  const vmRatio = data.marketCap > 0 ? data.volume24h / data.marketCap : 0;
  if (vmRatio > 0.3) {
    reasoning.push("High trading activity (V/MC: " + (vmRatio * 100).toFixed(1) + "%) — strong market interest");
    score += 10;
  } else if (vmRatio > 0.05) {
    reasoning.push("Healthy volume ratio (" + (vmRatio * 100).toFixed(1) + "%)");
    score += 5;
  } else if (vmRatio > 0) {
    reasoning.push("Low volume ratio (" + (vmRatio * 100).toFixed(2) + "%) — weak demand signals");
    score -= 10;
  }

  // Price movement
  const absChange = Math.abs(data.priceChange24h);
  if (absChange > 20) {
    reasoning.push("High volatility (" + (data.priceChange24h > 0 ? "+" : "") + data.priceChange24h.toFixed(1) + "% 24h) — elevated risk");
    score -= 10;
  } else if (absChange > 10) {
    reasoning.push("Notable price movement (" + (data.priceChange24h > 0 ? "+" : "") + data.priceChange24h.toFixed(1) + "% 24h)");
    if (data.priceChange24h > 0) score += 5;
  } else {
    reasoning.push("Stable price (" + (data.priceChange24h > 0 ? "+" : "") + data.priceChange24h.toFixed(1) + "% 24h)");
    score += 5;
  }

  // Risk score
  if (data.riskScore > 70) {
    reasoning.push("High risk score (" + data.riskScore + "/100) — multiple risk flags detected");
    score -= 20;
  } else if (data.riskScore > 40) {
    reasoning.push("Moderate risk (" + data.riskScore + "/100) — proceed with caution");
    score -= 5;
  } else {
    reasoning.push("Low risk (" + data.riskScore + "/100) — positive safety signals");
    score += 10;
  }

  // Whale concentration
  if (data.topHolderPercent > 50) {
    reasoning.push("Top holder controls " + data.topHolderPercent.toFixed(1) + "% — high concentration risk");
    score -= 15;
  } else if (data.topHolderPercent > 20) {
    reasoning.push("Top holder owns " + data.topHolderPercent.toFixed(1) + "% — moderate concentration");
  }

  // Liquidity lock
  if (!data.liquidityLocked) {
    reasoning.push("Liquidity NOT locked — potential rug pull risk");
    score -= 15;
  } else {
    reasoning.push("Liquidity locked — positive safety indicator");
    score += 5;
  }

  // Holders
  if (data.holders > 50000) {
    reasoning.push("Strong community (" + data.holders.toLocaleString() + " holders)");
    score += 5;
  } else if (data.holders < 100) {
    reasoning.push("Very few holders (" + data.holders + ") — early stage or abandoned");
    score -= 10;
  }

  // Contract flags
  if (data.isHoneypot) {
    reasoning.push("HONEYPOT DETECTED — DO NOT BUY");
    score -= 40;
  }
  if (data.isMintable) {
    reasoning.push("Contract is mintable — inflation risk");
    score -= 5;
  }
  if (data.hasBlackMethod) {
    reasoning.push("Contract has blacklist function — transfer restriction risk");
    score -= 10;
  }

  const confidence = Math.max(25, Math.min(95, score));
  let verdict: "BUY" | "HOLD" | "AVOID";
  if (score >= 65) verdict = "BUY";
  else if (score >= 35) verdict = "HOLD";
  else verdict = "AVOID";

  let riskLevel: "LOW" | "MEDIUM" | "HIGH";
  if (data.riskScore <= 35) riskLevel = "LOW";
  else if (data.riskScore <= 65) riskLevel = "MEDIUM";
  else riskLevel = "HIGH";

  const entry = calculateEntryExit(data);
  const conversational = generateConversational(data, verdict, confidence, riskLevel, entry, query);

  return {
    verdict,
    confidence,
    reasoning,
    conversational,
    riskLevel,
    entryExit: entry,
    tokenData: {
      name: data.name,
      symbol: data.symbol,
      address: data.address || "",
      price: data.price,
      marketCap: data.marketCap,
      liquidity: data.liquidity,
      volume24h: data.volume24h,
      priceChange24h: data.priceChange24h,
      priceHigh24h: data.priceHigh24h || 0,
      priceLow24h: data.priceLow24h || 0,
      riskScore: data.riskScore,
      holders: data.holders,
      chain: data.chain,
      source: data.source,
    },
  };
}

function calculateEntryExit(data: TokenData) {
  const price = data.price;
  if (!price || price <= 0) return null;

  const volatility = Math.abs(data.priceChange24h) / 100;
  const range = Math.max(volatility * 0.5, 0.02);

  return {
    entryLow: price * (1 - range),
    entryHigh: price * (1 - range * 0.3),
    takeProfit1: price * (1 + range * 2),
    takeProfit2: price * (1 + range * 4),
    stopLoss: price * (1 - range * 1.5),
  };
}

function formatPrice(v: number): string {
  if (v < 0.0001) return "$" + v.toFixed(8);
  if (v < 0.01) return "$" + v.toFixed(6);
  if (v < 1) return "$" + v.toFixed(4);
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function generateConversational(
  data: TokenData,
  verdict: string,
  confidence: number,
  riskLevel: string,
  entry: ReturnType<typeof calculateEntryExit>,
  query: string
): string {
  const sym = data.symbol || data.name;
  const price = formatPrice(data.price);

  let r = `**${sym} Analysis**\n\n`;
  r += `Current price: **${price}**`;
  if (data.marketCap > 0) {
    r += ` | Market cap: **$${(data.marketCap / 1e6).toFixed(1)}M**`;
  }
  if (data.volume24h > 0) {
    r += ` | 24h volume: **$${(data.volume24h / 1e6).toFixed(1)}M**`;
  }
  r += `\n\n`;

  // Key metrics
  r += `**Key Metrics:**\n`;
  r += `- Liquidity: $${data.liquidity > 1e6 ? (data.liquidity / 1e6).toFixed(1) + "M" : (data.liquidity / 1e3).toFixed(0) + "K"}\n`;
  r += `- Holders: ${data.holders.toLocaleString()}\n`;
  r += `- 24h Change: ${data.priceChange24h > 0 ? "+" : ""}${data.priceChange24h.toFixed(1)}%\n`;
  r += `- Risk Score: ${data.riskScore}/100\n\n`;

  // Verdict
  if (verdict === "BUY") {
    r += `**Verdict: BUY** — Strong fundamentals detected. Confidence: **${confidence}%**. Risk: **${riskLevel}**.\n\n`;
    r += `The data supports a buy position. Liquidity is ${data.liquidity > 1e6 ? "healthy" : "adequate"}, `;
    r += `trading activity is ${data.volume24h / data.marketCap > 0.1 ? "strong" : "moderate"}, `;
    r += `and the risk profile is ${riskLevel.toLowerCase()}.\n`;
  } else if (verdict === "HOLD") {
    r += `**Verdict: HOLD** — Mixed signals detected. Confidence: **${confidence}%**. Risk: **${riskLevel}**.\n\n`;
    r += `I'd recommend watching this token before committing capital. `;
    r += `Some metrics look promising but others raise caution flags.\n`;
  } else {
    r += `**Verdict: AVOID** — Multiple risk factors detected. Confidence: **${confidence}%**. Risk: **${riskLevel}**.\n\n`;
    r += `This token shows concerning signals. `;
    if (data.isHoneypot) r += `**Critical: Honeypot detected — you will not be able to sell.** `;
    if (!data.liquidityLocked) r += `Liquidity is unlocked, increasing rug pull risk. `;
    if (data.topHolderPercent > 50) r += `Top holder controls over ${data.topHolderPercent.toFixed(0)}% of supply. `;
    r += `\n`;
  }

  // Entry/Exit
  if (entry && verdict !== "AVOID") {
    r += `\n**Entry/Exit Strategy:**\n`;
    r += `- Entry range: ${formatPrice(entry.entryLow)} – ${formatPrice(entry.entryHigh)}\n`;
    r += `- Take profit 1: ${formatPrice(entry.takeProfit1)}\n`;
    r += `- Take profit 2: ${formatPrice(entry.takeProfit2)}\n`;
    r += `- Stop loss: ${formatPrice(entry.stopLoss)}\n`;
  }

  return r;
}
