const SPOT_BASE_URL = "https://testnet-gw.sodex.dev/api/v1/spot";
const PERPS_BASE_URL = "https://testnet-gw.sodex.dev/api/v1/perps";

export const TESTNET_CHAIN_ID = 138565;
export const MAINNET_CHAIN_ID = 286623;

export interface SoDEXSpotSymbol {
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
  marketMinQuantity: string;
  marketMaxQuantity: string;
  minNotional: string;
  maxNotional: string;
  buyLimitUpRatio: number;
  sellLimitDownRatio: number;
  marketDeviationRatio: number;
  isEnable: boolean;
}

export interface SoDEXSpotCoin {
  coin: string;
  precision: number;
  dustThreshold: string;
  isEnable: boolean;
}

export interface SoDEXSpotTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
  openPrice: string;
  openInterest: string;
  closeTime: number;
}

export interface SoDEXBookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

export interface SoDEXOrderBook {
  symbol: string;
  bids: [string, string][];
  asks: [string, string][];
}

export interface SoDEXBalances {
  coin: string;
  available: string;
  locked: string;
  total: string;
}

export interface SoDEXAccountState {
  balances: SoDEXBalances[];
  openOrders: SoDEXOrder[];
}

export interface SoDEXOrder {
  orderID: string;
  clOrdID: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price: string;
  quantity: string;
  filledQty: string;
  status: "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "EXPIRED";
  timeInForce: "GTC" | "IOC" | "GTX";
  createdAt: number;
  updatedAt: number;
}

export interface SoDEXNewOrderParams {
  symbol: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price?: string;
  quantity: string;
  funds?: string;
  timeInForce?: "GTC" | "IOC" | "GTX";
  clOrdID?: string;
}

async function fetchSoDEX<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${SPOT_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.error || `SoDEX API error: ${data.code}`);
  }
  return data.data;
}

export async function getSymbols(symbol?: string): Promise<SoDEXSpotSymbol[]> {
  const endpoint = symbol ? `/markets/symbols?symbol=${symbol}` : "/markets/symbols";
  return fetchSoDEX(endpoint);
}

export async function getCoins(coin?: string): Promise<SoDEXSpotCoin[]> {
  const endpoint = coin ? `/markets/coins?coin=${coin}` : "/markets/coins";
  return fetchSoDEX(endpoint);
}

export async function getTickers(symbol?: string): Promise<SoDEXSpotTicker[]> {
  const endpoint = symbol ? `/markets/tickers?symbol=${symbol}` : "/markets/tickers";
  return fetchSoDEX(endpoint);
}

export async function getBookTickers(symbol?: string): Promise<SoDEXBookTicker[]> {
  const endpoint = symbol ? `/markets/bookTickers?symbol=${symbol}` : "/markets/bookTickers";
  return fetchSoDEX(endpoint);
}

export async function getOrderBook(symbol: string, limit = 20): Promise<SoDEXOrderBook> {
  return fetchSoDEX(`/markets/${symbol}/orderbook?limit=${limit}`);
}

export async function getKlines(symbol: string, interval = "1h", limit = 100) {
  return fetchSoDEX(`/markets/${symbol}/klines?interval=${interval}&limit=${limit}`);
}

export async function getBalances(userAddress: string, accountID?: number) {
  const endpoint = accountID
    ? `/accounts/${userAddress}/balances?accountID=${accountID}`
    : `/accounts/${userAddress}/balances`;
  return fetchSoDEX(endpoint);
}

export async function getAccountState(userAddress: string, accountID?: number) {
  const endpoint = accountID
    ? `/accounts/${userAddress}/state?accountID=${accountID}`
    : `/accounts/${userAddress}/state`;
  return fetchSoDEX(endpoint);
}

export async function getOpenOrders(userAddress: string, symbol?: string, accountID?: number) {
  let endpoint = `/accounts/${userAddress}/orders`;
  const params: string[] = [];
  if (symbol) params.push(`symbol=${symbol}`);
  if (accountID) params.push(`accountID=${accountID}`);
  if (params.length) endpoint += `?${params.join("&")}`;
  return fetchSoDEX(endpoint);
}

export async function getOrderHistory(userAddress: string, options?: {
  symbol?: string;
  accountID?: number;
  startTime?: number;
  endTime?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.symbol) params.append("symbol", options.symbol);
  if (options?.accountID) params.append("accountID", options.accountID.toString());
  if (options?.startTime) params.append("startTime", options.startTime.toString());
  if (options?.endTime) params.append("endTime", options.endTime.toString());
  if (options?.limit) params.append("limit", options.limit.toString());

  const queryString = params.toString();
  const endpoint = queryString
    ? `/accounts/${userAddress}/orders/history?${queryString}`
    : `/accounts/${userAddress}/orders/history`;
  return fetchSoDEX(endpoint);
}

export async function getFeeRate(userAddress: string, symbol?: string, accountID?: number) {
  let endpoint = `/accounts/${userAddress}/fee-rate`;
  const params: string[] = [];
  if (symbol) params.push(`symbol=${symbol}`);
  if (accountID) params.append("accountID", accountID.toString());
  if (params.length) endpoint += `?${params.join("&")}`;
  return fetchSoDEX(endpoint);
}

export function formatSymbol(coinA: string, coinB: string): string {
  return `${coinA}_${coinB}`;
}

export function parseSymbol(symbol: string): { base: string; quote: string } | null {
  const match = symbol.match(/^(.+)_([^_]+)$/);
  if (!match) return null;
  return { base: match[1], quote: match[2] };
}

export async function findSymbolByCoins(baseCoin: string, quoteCoin: string): Promise<SoDEXSpotSymbol | null> {
  const symbols = await getSymbols();
  return symbols.find(s => s.baseCoin === baseCoin && s.quoteCoin === quoteCoin) || null;
}

export async function getSpotPrice(symbol: string): Promise<number> {
  const tickers = await getTickers(symbol);
  const ticker = tickers.find(t => t.symbol === symbol);
  return ticker ? parseFloat(ticker.lastPrice) : 0;
}

export async function getQuoteAsset(): Promise<SoDEXSpotCoin[]> {
  return getCoins();
}
