import { useState, useEffect, useCallback, useRef } from "react";

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
  { id: "data-collector", name: "Data Collector", description: "Fetches live token price, volume & liquidity", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "risk-analyzer", name: "Risk Analyzer", description: "Evaluates token safety & risk level", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "smart-money", name: "Smart Money Detector", description: "Detects whale & smart wallet activity", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "ai-explainer", name: "AI Explainer", description: "Translates analysis into simple insights", status: "idle", statusText: "Ready", output: null, lastUpdated: Date.now() },
  { id: "trade-executor", name: "Trade Executor", description: "Handles trade execution via wallet", status: "idle", statusText: "Waiting for trade input", output: null, lastUpdated: Date.now() },
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

    // 1. Data Collector
    updateAgent("data-collector", { status: "running", statusText: "Fetching market data…", output: null });
    let tokenData: any = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ave-token?symbol=${encodeURIComponent(symbol)}`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      tokenData = d;
      const priceStr = d.price >= 1 ? `$${d.price.toFixed(2)}` : `$${d.price.toFixed(6)}`;
      const volStr = d.volume24h >= 1e6 ? `$${(d.volume24h / 1e6).toFixed(1)}M` : `$${d.volume24h?.toLocaleString() || 0}`;
      updateAgent("data-collector", { status: "success", statusText: `Data updated just now`, output: `${symbol}: ${priceStr} | Vol: ${volStr}` });
    } catch (e: any) {
      updateAgent("data-collector", { status: "error", statusText: "Error fetching data", output: e.message });
      return;
    }

    // 2. Risk Analyzer
    updateAgent("risk-analyzer", { status: "running", statusText: "Analyzing risk…", output: null });
    await new Promise(r => setTimeout(r, 600));
    try {
      const risk = tokenData.riskScore ?? 50;
      const level = risk <= 30 ? "LOW" : risk <= 65 ? "MEDIUM" : "HIGH";
      const emoji = level === "LOW" ? "✅" : level === "MEDIUM" ? "⚠️" : "🚨";
      const reasons: string[] = [];
      if (!tokenData.liquidityLocked) reasons.push("Liquidity not locked");
      if (tokenData.topHolderPercent > 30) reasons.push(`Top holder ${tokenData.topHolderPercent.toFixed(0)}%`);
      if (tokenData.liquidity < 50000) reasons.push("Low liquidity");
      updateAgent("risk-analyzer", {
        status: "success",
        statusText: `Risk level: ${level} ${emoji}`,
        output: reasons.length ? reasons.join(" · ") : "No major risks detected",
      });
    } catch {
      updateAgent("risk-analyzer", { status: "error", statusText: "Analysis failed", output: null });
    }

    // 3. Smart Money Detector
    updateAgent("smart-money", { status: "running", statusText: "Scanning smart money…", output: null });
    await new Promise(r => setTimeout(r, 800));
    try {
      const vol = tokenData.volume24h || 0;
      if (vol > 5_000_000) {
        updateAgent("smart-money", { status: "success", statusText: "Whale activity detected 🐋", output: `High volume: $${(vol / 1e6).toFixed(1)}M — possible whale accumulation` });
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
    await new Promise(r => setTimeout(r, 500));
    try {
      const change = tokenData.priceChange24h || 0;
      const risk = tokenData.riskScore ?? 50;
      const momentum = change > 5 ? "strong upward momentum" : change > 0 ? "slight upward movement" : change > -5 ? "slight decline" : "significant downtrend";
      const riskWord = risk <= 30 ? "low risk" : risk <= 65 ? "medium risk" : "high risk";
      const liqStatus = tokenData.liquidity > 500000 ? "healthy liquidity" : "limited liquidity";
      updateAgent("ai-explainer", {
        status: "success",
        statusText: "Insight ready",
        output: `${symbol} shows ${momentum} with ${riskWord} and ${liqStatus}. 24h change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%.`,
      });
    } catch {
      updateAgent("ai-explainer", { status: "error", statusText: "Generation failed", output: null });
    }

    // 5. Trade Executor stays idle until user trades
    updateAgent("trade-executor", { status: "idle", statusText: "Waiting for trade input", output: `Ready to execute ${symbol} trades` });
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
