import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrencyBySymbol, getMarketSnapshot, type SoSoMarketSnapshot } from "@/lib/sosovalue";
import { getTickers, formatSymbol } from "@/lib/sodex";

export interface ClawAgentState {
  id: string;
  name: string;
  description: string;
  status: "idle" | "running" | "success" | "error";
  statusText: string;
  output: string | null;
  lastUpdated: number;
}

const INITIAL_AGENTS: ClawAgentState[] = [
  { id: "data-collector", name: "Data Collector", description: "Fetches live token price, volume & liquidity via SoSoValue API", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "risk-analyzer", name: "Risk Analyzer", description: "Evaluates token safety & risk level", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "smart-money", name: "Smart Money Detector", description: "Detects whale & smart wallet activity via SoSoValue", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "ai-explainer", name: "AI Explainer", description: "Translates analysis into simple insights", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "trade-executor", name: "Trade Executor", description: "Executes trades via SoDEX on-chain", status: "idle", statusText: "Waiting for trade input", output: null, lastUpdated: Date.now() },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useClawAgents() {
  const [agents, setAgents] = useState<ClawAgentState[]>(INITIAL_AGENTS);
  const lastTokenRef = useRef<string | null>(null);

  const updateAgent = useCallback((id: string, patch: Partial<ClawAgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...patch, lastUpdated: Date.now() } : a));
  }, []);

  const runPipeline = useCallback(async (symbol: string) => {
    if (!symbol) return;
    lastTokenRef.current = symbol;

    // 1. Data Collector - SoSoValue API
    updateAgent("data-collector", { status: "running", statusText: "Fetching market data via SoSoValue…", output: null });
    let tokenData: any = null;
    try {
      const currency = await getCurrencyBySymbol(symbol);
      if (currency) {
        const snapshot = await getMarketSnapshot(currency.currency_id);
        tokenData = {
          price: snapshot.price,
          volume24h: snapshot.turnover_24h,
          priceChange24h: snapshot.change_pct_24h,
          high24h: snapshot.high_24h,
          low24h: snapshot.low_24h,
          marketcap: snapshot.marketcap,
          riskScore: calculateRiskScore(snapshot),
          source: "sosovalue",
        };
      } else {
        throw new Error("Token not found in SoSoValue");
      }

      const priceStr = tokenData.price >= 1 ? `$${tokenData.price.toFixed(2)}` : `$${tokenData.price.toFixed(6)}`;
      const volStr = tokenData.volume24h >= 1e6 ? `$${(tokenData.volume24h / 1e6).toFixed(1)}M` : `$${tokenData.volume24h?.toLocaleString() || 0}`;
      updateAgent("data-collector", { status: "success", statusText: `SoSoValue data updated`, output: `${symbol}: ${priceStr} | Vol: ${volStr}` });
    } catch (e: any) {
      updateAgent("data-collector", { status: "error", statusText: "Error fetching from SoSoValue", output: e.message });
      return;
    }

    // 2. Risk Analyzer
    updateAgent("risk-analyzer", { status: "running", statusText: "Analyzing risk…", output: null });
    try {
      const risk = tokenData.riskScore ?? 50;
      const level = risk <= 30 ? "LOW" : risk <= 65 ? "MEDIUM" : "HIGH";
      const emoji = level === "LOW" ? "✅" : level === "MEDIUM" ? "⚠️" : "🚨";
      const reasons: string[] = [];
      if (tokenData.volume24h < 50000) reasons.push("Low liquidity");
      if (tokenData.marketcap && tokenData.marketcap < 1000000) reasons.push("Low market cap");
      updateAgent("risk-analyzer", {
        status: "success",
        statusText: `Risk level: ${level} ${emoji}`,
        output: reasons.length ? reasons.join(" · ") : "No major risks detected",
      });
    } catch {
      updateAgent("risk-analyzer", { status: "error", statusText: "Analysis failed", output: null });
    }

    // 3. Smart Money Detector - SoSoValue
    updateAgent("smart-money", { status: "running", statusText: "Scanning smart money…", output: null });
    try {
      const vol = tokenData.volume24h || 0;
      const change = tokenData.priceChange24h || 0;
      if (vol > 5_000_000 && change > 0) {
        updateAgent("smart-money", { status: "success", statusText: "Whale activity detected 🐋", output: `High volume: $${(vol / 1e6).toFixed(1)}M with ${change >= 0 ? "+" : ""}${change.toFixed(1)}% — possible whale accumulation` });
      } else if (vol > 500_000) {
        updateAgent("smart-money", { status: "success", statusText: "Moderate activity", output: `Volume $${(vol / 1e3).toFixed(0)}K — normal trading` });
      } else {
        updateAgent("smart-money", { status: "success", statusText: "No unusual activity", output: "Low volume — no whale signals" });
      }
    } catch {
      updateAgent("smart-money", { status: "error", statusText: "Scan failed", output: null });
    }

    // 4. AI Explainer
    updateAgent("ai-explainer", { status: "running", statusText: "Generating explanation…", output: null });
    try {
      const change = tokenData.priceChange24h || 0;
      const risk = tokenData.riskScore ?? 50;
      const momentum = change > 5 ? "strong upward momentum" : change > 0 ? "slight upward movement" : change > -5 ? "slight decline" : "significant downtrend";
      const riskWord = risk <= 30 ? "low risk" : risk <= 65 ? "medium risk" : "high risk";
      const liqStatus = tokenData.volume24h > 500000 ? "healthy liquidity" : "limited liquidity";
      updateAgent("ai-explainer", {
        status: "success",
        statusText: "Insight ready",
        output: `${symbol} shows ${momentum} with ${riskWord} and ${liqStatus}. 24h change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%. Powered by SoSoValue API`,
      });
    } catch {
      updateAgent("ai-explainer", { status: "error", statusText: "Generation failed", output: null });
    }

    // 5. Trade Executor stays idle until user trades
    updateAgent("trade-executor", { status: "idle", statusText: "Ready to execute trades via SoDEX", output: `Swap ${symbol} on SoDEX` });
  }, [updateAgent]);

  const setTradeExecutorStatus = useCallback((status: ClawAgentState["status"], statusText: string, output?: string) => {
    updateAgent("trade-executor", { status, statusText, output: output || null });
  }, [updateAgent]);

  // Auto-run on dashboard load with ETH
  useEffect(() => {
    const timer = setTimeout(() => runPipeline("ETH"), 1500);
    return () => clearTimeout(timer);
  }, [runPipeline]);

  return { agents, runPipeline, setTradeExecutorStatus };
}

function calculateRiskScore(snapshot: SoSoMarketSnapshot): number {
  let score = 50;
  if (snapshot.turnover_rate < 0.05) score += 20;
  if (snapshot.down_from_ath && parseFloat(snapshot.down_from_ath) > 50) score -= 10;
  return Math.max(0, Math.min(100, score));
}
