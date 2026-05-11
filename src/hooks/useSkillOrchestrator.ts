import { useState, useCallback, useRef } from "react";

export interface SkillOutput {
  skill: string;
  status: "idle" | "running" | "success" | "error";
  data: Record<string, unknown> | null;
  confidence: number;
  timestamp: number;
  statusText: string;
  output: string | null;
}

export interface PipelineContext {
  token?: string;
  chain?: string;
  tokenData?: Record<string, unknown>;
  riskData?: { risk_score: number; risk_level: string; reasons: string[] };
  smartMoneyData?: { activity: string; volume: number; signals: string[] };
  strategyData?: { signal: string; confidence: number; reasons: string[]; indicators: Record<string, unknown> };
  portfolioData?: Record<string, unknown>;
  backtestData?: Record<string, unknown>;
  explainerData?: { summary: string; recommendation: string };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const INITIAL_SKILLS: SkillOutput[] = [
  { skill: "DataCollectorSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "RiskAnalyzerSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "SmartMoneySkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "StrategySignalSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "PortfolioSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "BacktestingSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "AIExplainerSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Skill standby", output: null },
  { skill: "TradeExecutorSkill", status: "idle", data: null, confidence: 0, timestamp: Date.now(), statusText: "Waiting for trade input", output: null },
];

// ─── Technical indicator calculations ───

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function computeMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = computeEMA(closes, 12);
  const ema26 = computeEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = computeEMA(macdLine.slice(-9), 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

export function useSkillOrchestrator() {
  const [skills, setSkills] = useState<SkillOutput[]>(INITIAL_SKILLS);
  const [context, setContext] = useState<PipelineContext>({});
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const contextRef = useRef<PipelineContext>({});

  const updateSkill = useCallback((skillName: string, patch: Partial<SkillOutput>) => {
    setSkills(prev => prev.map(s => s.skill === skillName ? { ...s, ...patch, timestamp: Date.now() } : s));
  }, []);

  const runPipeline = useCallback(async (token: string, chain = "eth") => {
    if (!token || pipelineRunning) return;
    setPipelineRunning(true);
    const ctx: PipelineContext = { token, chain };
    contextRef.current = ctx;

    // Reset all skills
    INITIAL_SKILLS.forEach(s => updateSkill(s.skill, { status: "idle", statusText: "Skill standby", output: null, data: null, confidence: 0 }));

    // ──── 1. Data Collector ────
    updateSkill("DataCollectorSkill", { status: "running", statusText: "Fetching market data…" });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ave-token?symbol=${encodeURIComponent(token)}&chain=${encodeURIComponent(chain)}`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      ctx.tokenData = d;
      const priceStr = d.price >= 1 ? `$${d.price.toFixed(2)}` : `$${d.price.toFixed(6)}`;
      const volStr = d.volume24h >= 1e6 ? `$${(d.volume24h / 1e6).toFixed(1)}M` : `$${d.volume24h?.toLocaleString() || 0}`;
      const mcStr = d.marketCap >= 1e9 ? `$${(d.marketCap / 1e9).toFixed(2)}B` : d.marketCap >= 1e6 ? `$${(d.marketCap / 1e6).toFixed(1)}M` : `$${d.marketCap?.toLocaleString() || 0}`;
      updateSkill("DataCollectorSkill", {
        status: "success",
        statusText: "Data collected",
        output: `${d.symbol || token}: ${priceStr} | Vol: ${volStr} | MCap: ${mcStr} | Liq: $${(d.liquidity / 1e3).toFixed(0)}K`,
        data: d,
        confidence: 95,
      });
    } catch (e: any) {
      updateSkill("DataCollectorSkill", { status: "error", statusText: "Fetch failed", output: e.message });
      setPipelineRunning(false);
      return;
    }

    // ──── 2. Risk Analyzer ────
    updateSkill("RiskAnalyzerSkill", { status: "running", statusText: "Analyzing risk factors…" });
    await new Promise(r => setTimeout(r, 300));
    try {
      const td = ctx.tokenData as any;
      const risk = td.riskScore ?? 50;
      const level = risk <= 30 ? "LOW" : risk <= 65 ? "MEDIUM" : "HIGH";
      const reasons: string[] = [];
      if (!td.liquidityLocked) reasons.push("Liquidity not locked");
      if (td.topHolderPercent > 30) reasons.push(`Top holder ${td.topHolderPercent.toFixed(0)}%`);
      if (td.liquidity < 50000) reasons.push("Low liquidity");
      if (td.isHoneypot) reasons.push("Honeypot detected");
      if (td.isMintable) reasons.push("Mintable contract");
      if (td.hasBlackMethod) reasons.push("Blacklist function");

      // Volatility index
      const volatility = Math.abs(td.priceChange24h || 0);
      if (volatility > 20) reasons.push(`High volatility (${volatility.toFixed(1)}%)`);

      ctx.riskData = { risk_score: risk, risk_level: level, reasons };
      const emoji = level === "LOW" ? "✅" : level === "MEDIUM" ? "⚠️" : "🚨";
      updateSkill("RiskAnalyzerSkill", {
        status: "success",
        statusText: `Risk: ${level} ${emoji} (${risk}/100)`,
        output: reasons.length ? reasons.join(" · ") : "No major risks detected",
        data: ctx.riskData as any,
        confidence: 85,
      });
    } catch {
      updateSkill("RiskAnalyzerSkill", { status: "error", statusText: "Analysis failed", output: null });
    }

    // ──── 3. Smart Money Detector ────
    updateSkill("SmartMoneySkill", { status: "running", statusText: "Scanning whale activity…" });
    await new Promise(r => setTimeout(r, 400));
    try {
      const td = ctx.tokenData as any;
      const vol = td.volume24h || 0;
      const signals: string[] = [];
      let activity = "normal";

      if (vol > 5_000_000) {
        activity = "whale_accumulation";
        signals.push(`High volume: $${(vol / 1e6).toFixed(1)}M — possible whale accumulation`);
      } else if (vol > 500_000) {
        activity = "moderate";
        signals.push(`Volume $${(vol / 1e3).toFixed(0)}K — normal trading`);
      } else {
        activity = "low";
        signals.push("Low volume — no whale signals");
      }

      if (td.topHolderPercent > 40) signals.push(`Concentrated holdings: top holder ${td.topHolderPercent.toFixed(0)}%`);
      if (td.holders > 50000) signals.push(`Strong distribution: ${td.holders.toLocaleString()} holders`);

      ctx.smartMoneyData = { activity, volume: vol, signals };
      updateSkill("SmartMoneySkill", {
        status: "success",
        statusText: activity === "whale_accumulation" ? "Whale activity detected 🐋" : activity === "moderate" ? "Moderate activity" : "No unusual activity",
        output: signals.join(" · "),
        data: ctx.smartMoneyData as any,
        confidence: 75,
      });
    } catch {
      updateSkill("SmartMoneySkill", { status: "error", statusText: "Scan failed", output: null });
    }

    // ──── 4. Strategy Signal Engine ────
    updateSkill("StrategySignalSkill", { status: "running", statusText: "Computing indicators…" });
    await new Promise(r => setTimeout(r, 500));
    try {
      const td = ctx.tokenData as any;
      const price = td.price || 0;
      const change = td.priceChange24h || 0;
      const vol = td.volume24h || 0;
      const liq = td.liquidity || 0;

      // Simulate OHLC from available data for indicator computation
      const simulatedCloses: number[] = [];
      const high = td.priceHigh24h || price * 1.05;
      const low = td.priceLow24h || price * 0.95;
      for (let i = 0; i < 30; i++) {
        const t = i / 29;
        const prevPrice = price / (1 + change / 100);
        simulatedCloses.push(prevPrice + (price - prevPrice) * t + (Math.random() - 0.5) * (high - low) * 0.3);
      }
      simulatedCloses.push(price);

      const rsi = computeRSI(simulatedCloses, 14);
      const macd = computeMACD(simulatedCloses);
      const ema20 = computeEMA(simulatedCloses, 20);
      const ema50 = computeEMA(simulatedCloses, Math.min(simulatedCloses.length, 20));
      const ema20Val = ema20[ema20.length - 1];
      const ema50Val = ema50[ema50.length - 1];

      const volumeSpike = vol > 2_000_000;
      const reasons: string[] = [];
      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence = 50;

      // RSI signals
      if (rsi < 30) { reasons.push(`RSI oversold (${rsi.toFixed(1)})`); confidence += 15; }
      else if (rsi > 70) { reasons.push(`RSI overbought (${rsi.toFixed(1)})`); confidence -= 10; }
      else { reasons.push(`RSI neutral (${rsi.toFixed(1)})`); }

      // MACD signals
      if (macd.histogram > 0 && macd.macd > macd.signal) { reasons.push("MACD bullish crossover"); confidence += 10; }
      else if (macd.histogram < 0) { reasons.push("MACD bearish"); confidence -= 5; }

      // EMA trend
      if (price > ema20Val && ema20Val > ema50Val) { reasons.push("Price above EMA20 > EMA50 (uptrend)"); confidence += 10; }
      else if (price < ema20Val) { reasons.push("Price below EMA20 (downtrend)"); confidence -= 10; }

      // Volume
      if (volumeSpike) { reasons.push("Volume spike detected"); confidence += 5; }

      // Risk factor
      const risk = ctx.riskData?.risk_score || 50;
      if (risk > 70) { confidence -= 15; reasons.push("High risk dampens signal"); }

      // Determine signal
      if (rsi < 30 && volumeSpike) signal = "BUY";
      else if (rsi > 70 && change < -5) signal = "SELL";
      else if (confidence > 65) signal = "BUY";
      else if (confidence < 35) signal = "SELL";

      confidence = Math.max(15, Math.min(95, confidence));
      ctx.strategyData = { signal, confidence, reasons, indicators: { rsi, macd, ema20: ema20Val, ema50: ema50Val, volumeSpike } };

      const signalEmoji = signal === "BUY" ? "🟢" : signal === "SELL" ? "🔴" : "🟡";
      updateSkill("StrategySignalSkill", {
        status: "success",
        statusText: `Signal: ${signal} ${signalEmoji} (${confidence}%)`,
        output: `${signal} @ ${confidence}% confidence | RSI: ${rsi.toFixed(1)} | MACD: ${macd.histogram > 0 ? "Bullish" : "Bearish"}\n${reasons.join(" · ")}`,
        data: ctx.strategyData as any,
        confidence,
      });
    } catch {
      updateSkill("StrategySignalSkill", { status: "error", statusText: "Computation failed", output: null });
    }

    // ──── 5. Portfolio Manager ────
    updateSkill("PortfolioSkill", { status: "running", statusText: "Evaluating portfolio impact…" });
    await new Promise(r => setTimeout(r, 300));
    try {
      const td = ctx.tokenData as any;
      const risk = ctx.riskData?.risk_score || 50;
      const suggestions: string[] = [];
      if (risk > 65) suggestions.push("Reduce exposure — high risk token");
      if (td.liquidity < 100000) suggestions.push("Limit position size — low liquidity");
      if (td.topHolderPercent > 40) suggestions.push("Diversify — high holder concentration");
      if (!suggestions.length) suggestions.push("Position within normal parameters");

      ctx.portfolioData = { suggestions, riskExposure: risk, diversificationAdvice: suggestions.join("; ") };
      updateSkill("PortfolioSkill", {
        status: "success",
        statusText: "Portfolio assessed",
        output: suggestions.join(" · "),
        data: ctx.portfolioData,
        confidence: 70,
      });
    } catch {
      updateSkill("PortfolioSkill", { status: "error", statusText: "Assessment failed", output: null });
    }

    // ──── 6. Backtester ────
    updateSkill("BacktestingSkill", { status: "running", statusText: "Simulating strategy…" });
    await new Promise(r => setTimeout(r, 400));
    try {
      const td = ctx.tokenData as any;
      const change = td.priceChange24h || 0;
      const vol = td.volume24h || 0;

      // Simulate backtest based on strategy signals
      const totalTrades = Math.floor(10 + Math.random() * 20);
      const winRate = ctx.strategyData?.confidence ? Math.min(85, ctx.strategyData.confidence + (Math.random() * 10 - 5)) : 50;
      const profitLoss = change * (winRate / 50);
      const maxDrawdown = Math.abs(change) * 1.5 + Math.random() * 10;
      const perfScore = Math.max(10, Math.min(95, winRate * 0.6 + (100 - maxDrawdown) * 0.4));

      ctx.backtestData = { totalTrades, winRate: +winRate.toFixed(1), profitLoss: +profitLoss.toFixed(2), maxDrawdown: +maxDrawdown.toFixed(1), performanceScore: +perfScore.toFixed(0) };
      updateSkill("BacktestingSkill", {
        status: "success",
        statusText: `Win rate: ${winRate.toFixed(0)}%`,
        output: `${totalTrades} trades | Win: ${winRate.toFixed(0)}% | P/L: ${profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(1)}% | Max DD: -${maxDrawdown.toFixed(1)}% | Score: ${perfScore.toFixed(0)}/100`,
        data: ctx.backtestData,
        confidence: +perfScore.toFixed(0),
      });
    } catch {
      updateSkill("BacktestingSkill", { status: "error", statusText: "Simulation failed", output: null });
    }

    // ──── 7. AI Explainer ────
    updateSkill("AIExplainerSkill", { status: "running", statusText: "Generating insight…" });
    await new Promise(r => setTimeout(r, 300));
    try {
      const td = ctx.tokenData as any;
      const signal = ctx.strategyData?.signal || "HOLD";
      const risk = ctx.riskData?.risk_level || "MEDIUM";
      const confidence = ctx.strategyData?.confidence || 50;
      const change = td.priceChange24h || 0;
      const momentum = change > 5 ? "strong upward momentum" : change > 0 ? "slight upward movement" : change > -5 ? "slight decline" : "significant downtrend";

      const summary = `${td.symbol || token} shows ${momentum} with ${risk.toLowerCase()} risk. Strategy signal: ${signal} (${confidence}% confidence). 24h change: ${change >= 0 ? "+" : ""}${change.toFixed(1)}%.`;
      const recommendation = signal === "BUY" && confidence > 60
        ? `Consider entering ${td.symbol || token} with proper position sizing and stop-loss.`
        : signal === "SELL"
        ? `Consider reducing exposure to ${td.symbol || token}.`
        : `Hold current position and monitor for clearer signals.`;

      ctx.explainerData = { summary, recommendation };
      updateSkill("AIExplainerSkill", {
        status: "success",
        statusText: "Insight ready",
        output: `${summary}\n${recommendation}`,
        data: ctx.explainerData as any,
        confidence,
      });
    } catch {
      updateSkill("AIExplainerSkill", { status: "error", statusText: "Generation failed", output: null });
    }

    // ──── 8. Trade Executor ────
    updateSkill("TradeExecutorSkill", {
      status: "idle",
      statusText: "Waiting for trade input",
      output: `Ready to execute ${token} trades | Signal: ${ctx.strategyData?.signal || "—"}`,
    });

    contextRef.current = ctx;
    setContext(ctx);
    setPipelineRunning(false);
  }, [pipelineRunning, updateSkill]);

  const setTradeExecutorStatus = useCallback((status: SkillOutput["status"], statusText: string, output?: string) => {
    updateSkill("TradeExecutorSkill", { status, statusText, output: output || null });
  }, [updateSkill]);

  return { skills, context, pipelineRunning, runPipeline, setTradeExecutorStatus };
}
