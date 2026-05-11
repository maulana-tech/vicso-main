import { useState, useCallback, useRef, useEffect } from "react";

export interface WalletTransaction {
  hash: string;
  timestamp: string;
  type: string;
  from: string;
  to: string;
  value: number;
  gasUsed: string;
  gasPrice: string;
  status: string;
  methodLabel: string | null;
}

export interface WalletToken {
  symbol: string;
  name: string;
  balance: number;
  contractAddress: string;
  logo: string | null;
  usdPrice: number | null;
  usdValue: number | null;
}

export interface WalletPnL {
  totalIn: number;
  totalOut: number;
  net: number;
  percentChange: number;
}

export interface WalletScanResult {
  address: string;
  chain: string;
  nativeBalance: number;
  nativeSymbol: string;
  tokenCount: number;
  txCount: number;
  portfolio: WalletToken[];
  transactions: WalletTransaction[];
  pnl30d: WalletPnL;
  tag: string;
  topInteractions: { method: string; count: number }[];
  error?: string;
}

export function useWalletScan() {
  const [data, setData] = useState<WalletScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const scan = useCallback(async (address: string, chain: string, autoRefresh = false) => {
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-scan?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(chain)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const startAutoRefresh = useCallback((address: string, chain: string) => {
    stopAutoRefresh();
    intervalRef.current = setInterval(() => scan(address, chain), 30_000);
  }, [scan]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => () => stopAutoRefresh(), [stopAutoRefresh]);

  return { data, loading, error, scan, startAutoRefresh, stopAutoRefresh };
}
