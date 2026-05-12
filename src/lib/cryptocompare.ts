const CC_URL = "https://min-api.cryptocompare.com/data";

export interface CcKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CcTicker {
  price: number;
  change24h: number;
  volume: number;
  high: number;
  low: number;
}

const CC_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC", ETH: "ETH", BNB: "BNB", SOL: "SOL",
  XRP: "XRP", DOGE: "DOGE", ADA: "ADA", AVAX: "AVAX",
  LINK: "LINK", MATIC: "MATIC", DOT: "DOT", LTC: "LTC",
  UNI: "UNI", ATOM: "ATOM", XLM: "XLM", PEPE: "PEPE",
  TRUMP: "TRUMP", SHIB: "SHIB", ARB: "ARB", SUI: "SUI",
  TON: "TON", HYPE: "HYPE",
};

export async function getCCKlines(symbol: string, limit = 300): Promise<CcKline[]> {
  const fsym = CC_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();
  try {
    const res = await fetch(`${CC_URL}/v2/histoday?fsym=${fsym}&tsym=USD&limit=${limit}`);
    if (!res.ok) return [];
    const d = await res.json() as any;
    return (d.Data?.Data || []).map((k: any) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volumefrom,
    }));
  } catch { return []; }
}

export async function getCCTickers(symbols: string[]): Promise<Record<string, CcTicker>> {
  const fsyms = symbols.map(s => CC_SYMBOL_MAP[s.toUpperCase()] || s.toUpperCase()).join(",");
  try {
    const res = await fetch(`${CC_URL}/pricemultifull?fsyms=${fsyms}&tsyms=USD`);
    if (!res.ok) return {};
    const d = await res.json() as any;
    const result: Record<string, CcTicker> = {};
    for (const [sym, raw] of Object.entries(d.RAW || {})) {
      const r = raw as any;
      const change = r.USD?.OPENDAY ? ((r.USD.PRICE - r.USD.OPENDAY) / r.USD.OPENDAY * 100) : 0;
      result[sym] = {
        price: r.USD?.PRICE || 0,
        change24h: change,
        volume: r.USD?.VOLUME24HOURTO || 0,
        high: r.USD?.HIGHDAY || 0,
        low: r.USD?.LOWDAY || 0,
      };
    }
    return result;
  } catch { return {}; }
}

export { CC_SYMBOL_MAP };