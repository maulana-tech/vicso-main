import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TokenData {
  name: string;
  symbol: string;
  address: string;
  price: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
  priceHigh24h?: number;
  priceLow24h?: number;
  holders: number;
  topHolderPercent: number;
  liquidityLocked: boolean;
  chain: string;
  riskScore: number;
  source: string;
  inputType?: "contract" | "symbol";
}

interface EntryExit {
  entryLow: number;
  entryHigh: number;
  takeProfit1: number;
  takeProfit2: number;
  stopLoss: number;
}

interface AIAnalysis {
  verdict: "BUY" | "HOLD" | "AVOID";
  confidence: number;
  reasoning: string[];
  conversational: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  entryExit?: EntryExit | null;
  tokenData: TokenData | null;
}

function isContractAddress(input: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input) && !input.match(/^[A-Z]{2,10}$/)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(input)) return true;
  return false;
}

export function useTokenData(symbol: string, autoRefresh = false) {
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchToken = useCallback(async (sym?: string) => {
    const target = sym || symbol;
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const isContract = isContractAddress(target);
      const param = isContract ? "address" : "symbol";
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ave-token?${param}=${encodeURIComponent(target)}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch token data");
      const tokenData = await response.json();
      if (tokenData.error) throw new Error(tokenData.error);
      setData(tokenData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) fetchToken();
  }, [symbol, fetchToken]);

  useEffect(() => {
    if (autoRefresh && symbol) {
      intervalRef.current = setInterval(() => fetchToken(), 15_000);
      return () => clearInterval(intervalRef.current);
    }
  }, [autoRefresh, symbol, fetchToken]);

  return { data, loading, error, refetch: fetchToken };
}

// Session ID for chat memory
let sessionId = crypto.randomUUID();

export function useAIAnalysis() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (symbolOrQuery: string, isNaturalLanguage = false) => {
    if (!symbolOrQuery.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const body = isNaturalLanguage
        ? { query: symbolOrQuery, sessionId }
        : { symbol: symbolOrQuery, sessionId };

      const { data, error: err } = await supabase.functions.invoke("ai-analyze", {
        body,
      });
      if (err) throw err;
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, analyze };
}

export type { TokenData, AIAnalysis, EntryExit };
