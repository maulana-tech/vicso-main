const BINANCE_URL = "https://api.binance.com/api/v3";

const BINANCE_MAP: Record<string, string> = {
  BTC: "BTCUSDT", ETH: "ETHUSDT", BNB: "BNBUSDT", SOL: "SOLUSDT",
  XRP: "XRPUSDT", DOGE: "DOGEUSDT", ADA: "ADAUSDT", AVAX: "AVAXUSDT",
  LINK: "LINKUSDT", MATIC: "MATICUSDT", DOT: "DOTUSDT", LTC: "LTCUSDT",
  UNI: "UNIUSDT", ATOM: "ATOMUSDT", XLM: "XLMUSDT",
};

export interface BinanceTicker {
  price: number;
  changePct: number;
  volume: number;
  high: number;
  low: number;
}

export async function getBinanceTicker(symbol: string): Promise<BinanceTicker | null> {
  const binSym = BINANCE_MAP[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`;
  try {
    const res = await fetch(`${BINANCE_URL}/ticker/24hr?symbol=${binSym}`);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      price: parseFloat(d.lastPrice),
      changePct: parseFloat(d.priceChangePercent),
      volume: parseFloat(d.quoteVolume),
      high: parseFloat(d.highPrice),
      low: parseFloat(d.lowPrice),
    };
  } catch { return null; }
}

export async function getBinanceTopTickers(): Promise<{ symbol: string; price: number; changePct: number; volume: number }[]> {
  try {
    const res = await fetch(`${BINANCE_URL}/ticker/24hr`);
    if (!res.ok) return [];
    const all = await res.json();
    const targets = Object.values(BINANCE_MAP);
    return all
      .filter((t: any) => targets.includes(t.symbol))
      .map((t: any) => ({
        symbol: t.symbol.replace("USDT", ""),
        price: parseFloat(t.lastPrice),
        changePct: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
      }));
  } catch { return []; }
}

export { BINANCE_MAP };