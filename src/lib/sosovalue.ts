const BASE_URL = "https://openapi.sosovalue.com/openapi/v1";
const API_KEY = 'SOSO-b788a96885df4898b7f8e760f13bf57b';

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
  token_allocation: {
    holder: string;
    percentage: number;
  }[];
  token_unlock: {
    unlocked: string;
    total_locked: string;
  };
  unlock_timeline: {
    vestings: {
      label: string;
      amount: number;
    }[];
    timestamp: string;
  }[];
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

async function fetchSoSo<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  console.log('Fetching SoSoValue:', url, 'with key:', API_KEY.substring(0, 20) + '...');

  const response = await fetch(url, {
    headers: {
      "x-soso-api-key": API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  console.log('Response status:', response.status, response.statusText);

  if (!response.ok) {
    const text = await response.text();
    console.error('SoSoValue API error response:', text);
    throw new Error(`SoSoValue API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.code !== 0) {
    throw new Error(json.message || `SoSoValue API error: ${json.code}`);
  }

  return json.data;
}

export async function getCurrencies(): Promise<SoSoCurrency[]> {
  return fetchSoSo<SoSoCurrency[]>("/currencies");
}

export async function getCurrencyBySymbol(symbol: string): Promise<SoSoCurrency | null> {
  const currencies = await getCurrencies();
  return currencies.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase()) || null;
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

export async function getCurrencyKlines(currencyId: string, interval = "1d", limit = 30): Promise<unknown[]> {
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

export async function getCurrencyKlinesData(symbol: string, interval = "1d"): Promise<SoSoKline[]> {
  const currency = await getCurrencyBySymbol(symbol);
  if (!currency) return [];
  const data = await getCurrencyKlines(currency.currency_id, interval, 300);
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  return data.map((k: any) => ({
    time: Math.floor(parseInt(k.timestamp || k.time || 0) / 1000),
    open: parseFloat(k.open || 0),
    high: parseFloat(k.high || 0),
    low: parseFloat(k.low || 0),
    close: parseFloat(k.close || 0),
    volume: parseFloat(k.volume || 0),
  }));
}
