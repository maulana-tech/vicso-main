import { useState, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function aveWalletFetch(params: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ave-wallet?${params}`, {
    headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export interface WalletInfo {
  address: string; chain: string; totalBalance: number; totalPnl: number;
  totalTrades: number; roi: number; winRate: number; tag: string | null;
}

export interface WalletToken {
  symbol: string; name: string; balance: number; usdValue: number; price: number;
  contractAddress: string; logo: string | null; chain: string; allocation: number;
}

export interface PnLItem {
  token: string; tokenAddress: string; realizedPnl: number; unrealizedPnl: number;
  totalPnl: number; buyVolume: number; sellVolume: number; avgBuyPrice: number;
  avgSellPrice: number; trades: number;
}

export interface WalletTx {
  hash: string; timestamp: string; type: string; tokenIn: string; tokenOut: string;
  amountIn: number; amountOut: number; valueUsd: number; from: string; to: string;
}

export interface SignalItem {
  token: string; tokenAddress: string; signal: string; confidence: number;
  entry: number; target: number; stopLoss: number; reason: string; timestamp: string;
}

export interface SmartWallet {
  address: string; label: string | null; totalPnl: number; roi: number;
  winRate: number; trades: number; volume: number; lastActive: string | null;
}

export function useWalletInfo() {
  const [data, setData] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (address: string, chain = "eth") => {
    setLoading(true); setError(null);
    try {
      const result = await aveWalletFetch(`action=info&address=${encodeURIComponent(address)}&chain=${chain}`);
      setData(result);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch };
}

export function useWalletTokens() {
  const [data, setData] = useState<{ tokens: WalletToken[]; totalValue: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (address: string, chain = "eth") => {
    setLoading(true); setError(null);
    try {
      const result = await aveWalletFetch(`action=tokens&address=${encodeURIComponent(address)}&chain=${chain}`);
      setData(result);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch };
}

export function useWalletPnL() {
  const [data, setData] = useState<{ items: PnLItem[]; totals: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (address: string, chain = "eth") => {
    setLoading(true); setError(null);
    try {
      const result = await aveWalletFetch(`action=pnl&address=${encodeURIComponent(address)}&chain=${chain}`);
      setData(result);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch };
}

export function useWalletTxs() {
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetch = useCallback(async (address: string, chain = "eth", reset = true) => {
    setLoading(true); setError(null);
    try {
      let params = `action=txs&address=${encodeURIComponent(address)}&chain=${chain}&limit=50`;
      if (!reset && cursor) params += `&cursor=${encodeURIComponent(cursor)}`;
      const result = await aveWalletFetch(params);
      if (reset) setTransactions(result.transactions || []);
      else setTransactions(prev => [...prev, ...(result.transactions || [])]);
      setCursor(result.cursor);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount || 0);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [cursor]);

  const loadMore = useCallback(async (address: string, chain = "eth") => {
    if (!hasMore || loading) return;
    await fetch(address, chain, false);
  }, [hasMore, loading, fetch]);

  return { transactions, loading, error, totalCount, hasMore, fetch, loadMore };
}

export function useSignals() {
  const [data, setData] = useState<SignalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (chain = "eth") => {
    setLoading(true); setError(null);
    try {
      const result = await aveWalletFetch(`action=signals&address=global&chain=${chain}`);
      setData(result.signals || []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch };
}

export function useSmartWallets() {
  const [data, setData] = useState<SmartWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (chain = "eth", topic = "pnl") => {
    setLoading(true); setError(null);
    try {
      const result = await aveWalletFetch(`action=smart-wallets&address=global&chain=${chain}&topic=${topic}`);
      setData(result.wallets || []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch };
}
