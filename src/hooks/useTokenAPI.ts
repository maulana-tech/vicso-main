import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrencyBySymbol,
  getMarketSnapshot,
  getTokenEconomics,
  type SoSoMarketSnapshot,
  type SoSoTokenEconomics,
} from "@/lib/sosovalue";

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

function transformSoSoToTokenData(symbol: string, snapshot: SoSoMarketSnapshot, economics?: SoSoTokenEconomics): TokenData {
  const topHolderPercent = economics?.token_allocation?.[0]?.percentage || 0;
  const riskScore = calculateRiskScore(snapshot, economics);

  return {
    name: symbol,
    symbol: symbol.toUpperCase(),
    address: "",
    price: snapshot.price,
    marketCap: snapshot.marketcap,
    liquidity: snapshot.turnover_24h,
    volume24h: snapshot.turnover_24h,
    priceChange24h: snapshot.change_pct_24h,
    priceHigh24h: snapshot.high_24h,
    priceLow24h: snapshot.low_24h,
    holders: 0,
    topHolderPercent,
    liquidityLocked: true,
    chain: "ethereum",
    riskScore,
    source: "sosovalue",
    inputType: "symbol",
  };
}

function calculateRiskScore(snapshot: SoSoMarketSnapshot, economics?: SoSoTokenEconomics): number {
  let score = 50;

  if (snapshot.turnover_rate < 0.05) score += 20;
  if (snapshot.down_from_ath && parseFloat(snapshot.down_from_ath) > 50) score -= 10;
  if (economics?.token_unlock?.total_locked) {
    const locked = parseFloat(economics.token_unlock.total_locked);
    if (locked < 1000000) score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

async function fetchTokenFromSoSoValue(symbol: string): Promise<TokenData | null> {
  const currency = await getCurrencyBySymbol(symbol);
  if (!currency) return null;

  const [snapshot, economics] = await Promise.all([
    getMarketSnapshot(currency.currency_id).catch(() => null),
    getTokenEconomics(currency.currency_id).catch(() => null),
  ]);

  if (!snapshot) return null;
  return transformSoSoToTokenData(symbol, snapshot, economics || undefined);
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

      if (isContract) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ave-token?address=${encodeURIComponent(target)}`;
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
        return;
      }

      const tokenData = await fetchTokenFromSoSoValue(target);
      if (tokenData) {
        setData(tokenData);
        return;
      }

      const fallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ave-token?symbol=${encodeURIComponent(target)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!fallbackRes.ok) throw new Error("Failed to fetch token data");
      const fallbackData = await fallbackRes.json();
      if (fallbackData.error) throw new Error(fallbackData.error);
      setData(fallbackData);
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
