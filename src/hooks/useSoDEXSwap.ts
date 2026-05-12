import { useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  getSymbols,
  getTickers,
  getBookTickers,
  getOrderBook,
  getAccountState,
  formatSymbol,
  type SoDEXSpotSymbol,
  type SoDEXSpotTicker,
  type SoDEXBookTicker,
  type SoDEXOrderBook,
  type SoDEXBalances,
} from "@/lib/sodex";

export interface SwapQuote {
  symbol: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  price: string;
  slippage: number;
  fee: string;
  estimatedPrice: string;
  bestBid: string;
  bestAsk: string;
}

export interface SwapConfirmation {
  symbol: string;
  side: "BUY" | "SELL";
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  price: string;
  fee: string;
  total: string;
}

export interface SwapResult {
  success: boolean;
  orderID?: string;
  error?: string;
  txHash?: string;
}

export interface SwapState {
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  quote: SwapQuote | null;
  loading: boolean;
  error: string | null;
}

export function useSoDEXSwap() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<SwapState>({
    fromCoin: "vUSDC",
    toCoin: "vBTC",
    fromAmount: "",
    toAmount: "",
    quote: null,
    loading: false,
    error: null,
  });

  const setFromCoin = useCallback((coin: string) => {
    setState(prev => ({ ...prev, fromCoin: coin, quote: null }));
  }, []);

  const setToCoin = useCallback((coin: string) => {
    setState(prev => ({ ...prev, toCoin: coin, quote: null }));
  }, []);

  const setFromAmount = useCallback((amount: string) => {
    setState(prev => ({ ...prev, fromAmount: amount }));
  }, []);

  const setToAmount = useCallback((amount: string) => {
    setState(prev => ({ ...prev, toAmount: amount }));
  }, []);

  const switchCoins = useCallback(() => {
    setState(prev => ({
      ...prev,
      fromCoin: prev.toCoin,
      toCoin: prev.fromCoin,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount,
      quote: null,
    }));
  }, []);

  const fetchQuote = useCallback(async (slippage = 0.5) => {
    if (!state.fromCoin || !state.toCoin || !state.fromAmount) {
      return;
    }

    const symbol = formatSymbol(state.fromCoin, state.toCoin);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const bookTicker = await getBookTickers(symbol);
      const ticker = bookTicker.find(t => t.symbol === symbol);

      if (!ticker) {
        throw new Error(`Trading pair ${symbol} not found`);
      }

      const fromAmountNum = parseFloat(state.fromAmount);
      const price = ticker.side === "BUY" ? parseFloat(ticker.askPrice) : parseFloat(ticker.bidPrice);

      const toAmountNum = state.fromCoin === state.toCoin.replace("v", "")
        ? fromAmountNum / price
        : fromAmountNum * price;

      const slippageMultiplier = 1 - slippage / 100;
      const estimatedPrice = price * slippageMultiplier;

      const quote: SwapQuote = {
        symbol,
        fromCoin: state.fromCoin,
        toCoin: state.toCoin,
        fromAmount: state.fromAmount,
        toAmount: toAmountNum.toFixed(8),
        price: price.toString(),
        slippage,
        fee: "0.1",
        estimatedPrice: estimatedPrice.toString(),
        bestBid: ticker.bidPrice,
        bestAsk: ticker.askPrice,
      };

      setState(prev => ({
        ...prev,
        quote,
        toAmount: toAmountNum.toFixed(8),
        loading: false,
      }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }, [state.fromCoin, state.toCoin, state.fromAmount]);

  const executeSwap = useCallback(async (): Promise<SwapResult> => {
    if (!isConnected || !address) {
      return { success: false, error: "Wallet not connected" };
    }

    if (!state.quote) {
      return { success: false, error: "No quote available" };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const signature = await signMessageAsync({
        message: `Swap ${state.quote.fromAmount} ${state.quote.fromCoin} for ${state.quote.toAmount} ${state.quote.toCoin} on SoDEX at ${new Date().toISOString()}`,
      });

      console.log("Swap signature:", signature);

      const result: SwapResult = {
        success: true,
        orderID: `sim_${Date.now()}`,
        txHash: signature,
      };

      setState(prev => ({
        ...prev,
        fromAmount: "",
        toAmount: "",
        quote: null,
        loading: false,
      }));

      return result;
    } catch (e) {
      const error = (e as Error).message;
      setState(prev => ({ ...prev, loading: false, error }));
      return { success: false, error };
    }
  }, [address, isConnected, state.quote, signMessageAsync]);

  const fetchBalances = useCallback(async (): Promise<SoDEXBalances[]> => {
    if (!address) return [];

    try {
      const state = await getAccountState(address);
      return state.balances;
    } catch {
      return [];
    }
  }, [address]);

  return {
    ...state,
    setFromCoin,
    setToCoin,
    setFromAmount,
    setToAmount,
    switchCoins,
    fetchQuote,
    executeSwap,
    fetchBalances,
  };
}

export function useSoDEXMarket() {
  const [symbols, setSymbols] = useState<SoDEXSpotSymbol[]>([]);
  const [tickers, setTickers] = useState<SoDEXSpotTicker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [symbolsData, tickersData] = await Promise.all([
        getSymbols(),
        getTickers(),
      ]);
      setSymbols(symbolsData);
      setTickers(tickersData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderBook = useCallback(async (symbol: string, limit = 20): Promise<SoDEXOrderBook | null> => {
    try {
      return await getOrderBook(symbol, limit);
    } catch {
      return null;
    }
  }, []);

  return {
    symbols,
    tickers,
    loading,
    error,
    fetchMarketData,
    fetchOrderBook,
  };
}
