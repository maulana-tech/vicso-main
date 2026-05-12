const CG_URL = "https://api.coingecko.com/api/v3";

export interface CgTicker {
  price: number;
  change24h: number;
  volume: number;
  high: number;
  low: number;
}

const CG_ID_MAP: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  XRP: "ripple", DOGE: "dogecoin", ADA: "cardano", AVAX: "avalanche-2",
  LINK: "chainlink", MATIC: "matic-network", DOT: "polkadot", LTC: "litecoin",
  UNI: "uniswap", ATOM: "cosmos", XLM: "stellar",
};

export async function getCoinGeckoPrice(symbol: string): Promise<CgTicker | null> {
  const id = CG_ID_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
  try {
    const res = await fetch(
      `${CG_URL}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
    );
    if (!res.ok) return null;
    const d = await res.json() as any;
    const coin = d[id];
    if (!coin) return null;
    return {
      price: coin.usd || 0,
      change24h: coin.usd_24h_change || 0,
      volume: coin.usd_24h_vol || 0,
      high: 0,
      low: 0,
    };
  } catch { return null; }
}

export { CG_ID_MAP };