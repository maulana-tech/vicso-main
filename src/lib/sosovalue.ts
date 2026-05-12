const BASE_URL = "https://openapi.sosovalue.com/openapi/v1";
const API_KEY = 'SOSO-b788a96885df4898b7f8e760f13bf57b';

const CURRENCY_IDS: Record<string, string> = {
  BTC: "1673723677362319866", ETH: "1673723677362319868", BNB: "1673723677362319874",
  SOL: "1730846864525430787", XRP: "1673723677362319936", DOGE: "1673723677362319890",
  ADA: "1673723677362319869", AVAX: "1673723677362319875", LINK: "1673723677362319897",
  MATIC: "1730847291434274818", DOT: "1673723677362319898", LTC: "1673723677362319889",
  UNI: "1673723677362319908", ATOM: "1673723677362319895", XLM: "1673723677362319904",
  PEPE: "1845506759320096770", TRUMP: "1751660503379623939",
};

let currencyCache: { currency_id: string; symbol: string; name: string }[] | null = null;
let currencyCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

export interface SoSoCurrency {
  currency_id: string;
  symbol: string;
  name: string;
}

export interface SoSoMarketSnapshot {
  price: number;
  change_pct_24h: number;
  turnover_24h: number;
  turnover_rate: number;
  high_24h: number;
  low_24h: number;
  marketcap: number;
  fdv: number;
  max_supply: string | null;
  total_supply: string;
  circulating_supply: string;
  ath: number;
  ath_date: string;
  down_from_ath: string;
  cycle_low: number;
  cycle_low_date: string;
  up_from_cycle_low: string;
  marketcap_rank: number;
}

export interface SoSoTokenEconomics {
  token_allocation: { holder: string; percentage: number }[];
  token_unlock: { unlocked: string; total_locked: string };
  unlock_timeline: { vestings: { label: string; amount: number }[]; timestamp: string }[];
}

export interface SoSoNews {
  id: string;
  source_link: string;
  release_time: string;
  title: string;
  content: string;
}

export interface SoSoNewsList {
  page: number;
  page_size: number;
  total: string;
  list: SoSoNews[];
}

interface SoSoResponse<T> {
  code: number;
  message: string;
  data: T;
  details: unknown;
}

async function fetchSoSo<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { "x-soso-api-key": API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
  });
  if (!response.ok) throw new Error(`SoSoValue API error: ${response.status}`);
  const json = await response.json() as SoSoResponse<T>;
  if (json.code !== 0) throw new Error(json.message || `SoSoValue error: ${json.code}`);
  return json.data;
}

async function getCurrencies(): Promise<SoSoCurrency[]> {
  if (currencyCache && Date.now() - currencyCacheTime < CACHE_TTL) return currencyCache;
  try {
    const data = await fetchSoSo<SoSoCurrency[]>("/currencies");
    currencyCache = data;
    currencyCacheTime = Date.now();
    return data;
  } catch { return currencyCache || []; }
}

export async function getCurrencyBySymbol(symbol: string): Promise<SoSoCurrency | null> {
  const upper = symbol.toUpperCase();
  if (CURRENCY_IDS[upper]) return { currency_id: CURRENCY_IDS[upper], symbol: upper, name: upper };
  const currencies = await getCurrencies();
  return currencies.find((c) => c.symbol.toUpperCase() === upper) || null;
}

export async function getMarketSnapshot(currencyId: string): Promise<SoSoMarketSnapshot> {
  return fetchSoSo<SoSoMarketSnapshot>(`/currencies/${currencyId}/market-snapshot`);
}

export async function getTokenEconomics(currencyId: string): Promise<SoSoTokenEconomics> {
  return fetchSoSo<SoSoTokenEconomics>(`/currencies/${currencyId}/token-economics`);
}

export async function getIndices(): Promise<string[]> {
  return fetchSoSo<string[]>("/indices");
}

export async function getIndexSnapshot(indexTicker: string): Promise<unknown> {
  return fetchSoSo(`/indices/${indexTicker}/market-snapshot`);
}

export async function getIndexConstituents(indexTicker: string): Promise<unknown> {
  return fetchSoSo(`/indices/${indexTicker}/constituents`);
}

export async function getNews(limit = 20): Promise<SoSoNews[]> {
  const data = await fetchSoSo<SoSoNewsList>(`/news?limit=${limit}`);
  return data.list || [];
}

export async function searchNews(query: string, limit = 10): Promise<SoSoNews[]> {
  const data = await fetchSoSo<SoSoNewsList>(`/news/search?keyword=${encodeURIComponent(query)}&limit=${limit}`);
  return data.list || [];
}

export async function getHotNews(limit = 10): Promise<SoSoNews[]> {
  const data = await fetchSoSo<SoSoNewsList>(`/news/hot?limit=${limit}`);
  return data.list || [];
}

export async function getSectorSpotlight() {
  return fetchSoSo("/currencies/sector-spotlight");
}

export async function getCurrencyKlines(currencyId: string, interval = "1d", limit = 300): Promise<unknown[]> {
  return fetchSoSo(`/currencies/${currencyId}/klines?interval=${interval}&limit=${limit}`);
}

export interface SoSoKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getCurrencyKlinesData(symbol: string): Promise<SoSoKline[]> {
  const upper = symbol.toUpperCase();
  const currencyId = CURRENCY_IDS[upper];
  if (!currencyId) {
    const currency = await getCurrencyBySymbol(symbol);
    if (!currency) return [];
    const data = await getCurrencyKlines(currency.currency_id, "1d", 300);
    if (!Array.isArray(data) || data.length === 0) return [];
    return (data as any[]).map((k) => ({
      time: Math.floor(parseInt(k.timestamp || k.time || 0) / 1000),
      open: parseFloat(k.open || 0),
      high: parseFloat(k.high || 0),
      low: parseFloat(k.low || 0),
      close: parseFloat(k.close || 0),
      volume: parseFloat(k.volume || 0),
    }));
  }
  const data = await getCurrencyKlines(currencyId, "1d", 300);
  if (!Array.isArray(data) || data.length === 0) return [];
  return (data as any[]).map((k) => ({
    time: Math.floor(parseInt(k.timestamp || k.time || 0) / 1000),
    open: parseFloat(k.open || 0),
    high: parseFloat(k.high || 0),
    low: parseFloat(k.low || 0),
    close: parseFloat(k.close || 0),
    volume: parseFloat(k.volume || 0),
  }));
}

export { CURRENCY_IDS };