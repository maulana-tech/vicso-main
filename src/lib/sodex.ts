const SPOT_BASE = "https://mainnet-gw.sodex.dev/api/v1/spot";
const PERPS_BASE = "https://mainnet-gw.sodex.dev/api/v1/perps";

export const MAINNET_CHAIN_ID = 286623;

export interface SoDEXSymbol {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  basePrecision: number;
  quotePrecision: number;
  pricePrecision: number;
  quantityPrecision: number;
  stepSize: string;
  tickSize: string;
  minPrice: string;
  maxPrice: string;
  minQuantity: string;
  maxQuantity: string;
  minNotional: string;
  maxNotional: string;
  isEnable: boolean;
}

export interface SoDEXCoin {
  coin: string;
  precision: number;
  isEnable: boolean;
}

export interface SoDEXTicker {
  symbol: string;
  lastPx: string;
  openPx: string;
  highPx: string;
  lowPx: string;
  volume: string;
  quoteVolume: string;
  change: string;
  changePct: number;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  openTime: number;
  closeTime: number;
}

export interface SoDEXMiniTicker {
  symbol: string;
  lastPx: string;
  volume: string;
  quoteVolume: string;
  changePct: number;
}

export interface SoDEXBookTicker {
  symbol: string;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
}

export interface SoDEXKline {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

let symbolCache: SoDEXSymbol[] | null = null;
let symbolCacheTime = 0;
const SYMBOL_CACHE_TTL = 30 * 60 * 1000;

async function fetchSoDEX<T>(endpoint: string, base = SPOT_BASE): Promise<T> {
  const response = await fetch(`${base}${endpoint}`, {
    headers: { "Accept": "application/json" },
  });
  if (!response.ok) throw new Error(`SoDEX API error: ${response.status}`);
  const json = await response.json();
  if (json.code !== 0) throw new Error(json.message || `SoDEX error: ${json.code}`);
  return json.data;
}

export async function getSymbols(): Promise<SoDEXSymbol[]> {
  if (symbolCache && Date.now() - symbolCacheTime < SYMBOL_CACHE_TTL) return symbolCache;
  const data = await fetchSoDEX<SoDEXSymbol[]>("/markets/symbols");
  symbolCache = data;
  symbolCacheTime = Date.now();
  return data;
}

export async function getCoins(): Promise<SoDEXCoin[]> {
  return fetchSoDEX<SoDEXCoin[]>("/markets/coins");
}

export async function getTickers(symbol?: string): Promise<SoDEXTicker[]> {
  const ep = symbol ? `/markets/tickers?symbol=${symbol}` : "/markets/tickers";
  return fetchSoDEX<SoDEXTicker[]>(ep);
}

export async function getMiniTickers(symbol?: string): Promise<SoDEXMiniTicker[]> {
  const ep = symbol ? `/markets/miniTickers?symbol=${symbol}` : "/markets/miniTickers";
  return fetchSoDEX<SoDEXMiniTicker[]>(ep);
}

export async function getBookTickers(symbol?: string): Promise<SoDEXBookTicker[]> {
  const ep = symbol ? `/markets/bookTickers?symbol=${symbol}` : "/markets/bookTickers";
  return fetchSoDEX<SoDEXBookTicker[]>(ep);
}

export async function getOrderBook(symbol: string, limit = 20): Promise<{ bids: [string, string][]; asks: [string, string][] }> {
  return fetchSoDEX(`/markets/${symbol}/orderbook?limit=${limit}`);
}

export async function getKlines(symbol: string, interval = "1d", limit = 90): Promise<SoDEXKline[]> {
  return fetchSoDEX<SoDEXKline[]>(`/markets/${symbol}/klines?interval=${interval}&limit=${limit}`);
}

export async function getTrades(symbol: string, limit = 20): Promise<unknown[]> {
  return fetchSoDEX(`/markets/${symbol}/trades?limit=${limit}`);
}

export async function findSymbol(coinA: string, coinB: string): Promise<SoDEXSymbol | null> {
  const symbols = await getSymbols();
  return symbols.find(s => s.baseCoin === coinA && s.quoteCoin === coinB) || null;
}

export async function getSpotPrice(symbol: string): Promise<number> {
  const tickers = await getTickers(symbol);
  const t = tickers.find(x => x.symbol === symbol);
  return t ? parseFloat(t.lastPx) : 0;
}

export function formatSymbol(base: string, quote: string): string {
  return `${base.toLowerCase()}_${quote.toLowerCase()}`;
}

const KNOWN_SODEX_SYMBOLS: Record<string, string> = {
  BTC: "vBTC_vUSDC", ETH: "vETH_vUSDC", BNB: "vBNB_vUSDC", SOL: "vSOL_vUSDC",
  XRP: "vXRP_vUSDC", DOGE: "vDOGE_vUSDC", ADA: "vADA_vUSDC", AVAX: "vAVAX_vUSDC",
  LINK: "vLINK_vUSDC", UNI: "vUNI_vUSDC", LTC: "vLTC_vUSDC", XLM: "vXLM_vUSDC",
  PEPE: "vPEPE_vUSDC", SHIB: "vSHIB_vUSDC", ARB: "vARB_vUSDC", SUI: "vSUI_vUSDC",
  TON: "vTON_vUSDC", HYPE: "vHYPE_vUSDC",
};

export function toSoDEXSymbol(symbol: string): string {
  return KNOWN_SODEX_SYMBOLS[symbol.toUpperCase()] || `${symbol.toLowerCase()}_usdt`;
}