import { useState, useCallback } from "react";
import {
  getCurrencyBySymbol,
  getMarketSnapshot,
  getTokenEconomics,
  getIndices,
  getHotNews,
  type SoSoMarketSnapshot,
} from "@/lib/sosovalue";

export interface SignalAlert {
  id: string;
  type: "WHALE_ACTIVITY" | "MOMENTUM" | "VOLUME_SPIKE" | "NEWS_HOT" | "RISK_CHANGE" | "OPPORTUNITY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  symbol: string;
  title: string;
  description: string;
  metrics: Record<string, number | string>;
  recommendation?: {
    action: "BUY" | "SELL" | "HOLD" | "WATCH";
    entryPrice?: number;
    targetPrice?: number;
    stopLoss?: number;
    confidence: number;
    reasoning: string[];
  };
  timestamp: number;
  source: "sosovalue" | "sodex";
}

export interface TokenSignal {
  symbol: string;
  overallScore: number;
  momentumScore: number;
  riskScore: number;
  volumeScore: number;
  whaleScore: number;
  signals: SignalAlert[];
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  lastUpdated: number;
}

function calculateMomentumScore(snapshot: SoSoMarketSnapshot): number {
  const change = snapshot.change_pct_24h;
  const volumeRatio = snapshot.turnover_rate;

  let score = 50;
  if (change > 10) score += 25;
  else if (change > 5) score += 15;
  else if (change > 2) score += 5;
  else if (change < -10) score -= 25;
  else if (change < -5) score -= 15;
  else if (change < -2) score -= 5;

  if (volumeRatio > 0.2) score += 15;
  else if (volumeRatio > 0.1) score += 5;
  else if (volumeRatio < 0.03) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function calculateVolumeScore(snapshot: SoSoMarketSnapshot): number {
  const vol = snapshot.turnover_24h;
  if (vol > 1_000_000_000) return 90;
  if (vol > 100_000_000) return 75;
  if (vol > 10_000_000) return 60;
  if (vol > 1_000_000) return 40;
  if (vol > 100_000) return 25;
  return 10;
}

function calculateWhaleScore(snapshot: SoSoMarketSnapshot): number {
  let score = 30;
  if (snapshot.turnover_24h > 500_000_000) score += 40;
  else if (snapshot.turnover_24h > 100_000_000) score += 25;
  else if (snapshot.turnover_24h > 10_000_000) score += 10;

  if (snapshot.change_pct_24h > 5 && snapshot.turnover_rate > 0.15) score += 20;
  if (snapshot.up_from_cycle_low > 20) score += 10;

  return Math.max(0, Math.min(100, score));
}

function detectWhaleActivity(snapshot: SoSoMarketSnapshot, symbol: string): SignalAlert | null {
  const vol = snapshot.turnover_24h;
  const change = snapshot.change_pct_24h;

  if (vol > 500_000_000 && change > 3) {
    return {
      id: `whale-${symbol}-${Date.now()}`,
      type: "WHALE_ACTIVITY",
      severity: "HIGH",
      symbol,
      title: "Whale Accumulation Detected",
      description: `Unusual volume surge with positive price movement indicates potential whale accumulation`,
      metrics: {
        volume: vol,
        volumeFormatted: vol >= 1e6 ? `$${(vol / 1e6).toFixed(1)}M` : `$${(vol / 1e3).toFixed(0)}K`,
        priceChange: change,
      },
      timestamp: Date.now(),
      source: "sosovalue",
    };
  }

  if (vol > 200_000_000 && change > 8) {
    return {
      id: `whale-${symbol}-${Date.now()}`,
      type: "WHALE_ACTIVITY",
      severity: "CRITICAL",
      symbol,
      title: "Strong Whale Signal",
      description: `Massive volume with strong price increase — institutional buying likely`,
      metrics: {
        volume: vol,
        volumeFormatted: `$${(vol / 1e6).toFixed(1)}M`,
        priceChange: change,
      },
      timestamp: Date.now(),
      source: "sosovalue",
    };
  }

  return null;
}

function detectVolumeSpike(snapshot: SoSoMarketSnapshot, symbol: string): SignalAlert | null {
  if (snapshot.turnover_rate > 0.25) {
    return {
      id: `volume-${symbol}-${Date.now()}`,
      type: "VOLUME_SPIKE",
      severity: snapshot.turnover_rate > 0.4 ? "HIGH" : "MEDIUM",
      symbol,
      title: "Volume Spike Alert",
      description: `Trading volume significantly above average`,
      metrics: {
        turnoverRate: snapshot.turnover_rate,
        volume24h: snapshot.turnover_24h,
        volumeFormatted: `$${(snapshot.turnover_24h / 1e6).toFixed(1)}M`,
      },
      timestamp: Date.now(),
      source: "sosovalue",
    };
  }
  return null;
}

function detectMomentumShift(snapshot: SoSoMarketSnapshot, symbol: string): SignalAlert | null {
  const change = snapshot.change_pct_24h;
  const upFromCycle = snapshot.up_from_cycle_low ? parseFloat(snapshot.up_from_cycle_low) : 0;

  if (change > 10 && upFromCycle > 15) {
    return {
      id: `momentum-${symbol}-${Date.now()}`,
      type: "MOMENTUM",
      severity: "HIGH",
      symbol,
      title: "Strong Momentum Building",
      description: `Positive momentum accelerating with strong cycle recovery`,
      metrics: {
        priceChange24h: change,
        upFromCycleLow: upFromCycle,
      },
      timestamp: Date.now(),
      source: "sosovalue",
    };
  }

  if (change < -15 && snapshot.down_from_ath && parseFloat(snapshot.down_from_ath) > 60) {
    return {
      id: `momentum-${symbol}-${Date.now()}`,
      type: "MOMENTUM",
      severity: "MEDIUM",
      symbol,
      title: "Deep Discount Zone",
      description: `Significant pullback from ATH — potential accumulation zone`,
      metrics: {
        priceChange24h: change,
        downFromATH: parseFloat(snapshot.down_from_ath),
      },
      timestamp: Date.now(),
      source: "sosovalue",
    };
  }

  return null;
}

function generateRecommendation(
  momentum: number,
  risk: number,
  volume: number,
  whale: number
): { action: "BUY" | "SELL" | "HOLD"; confidence: number; reasoning: string[] } {
  const avgScore = (momentum + volume + whale) / 3;
  const reasoning: string[] = [];

  if (avgScore > 70 && momentum > 60) {
    reasoning.push("Strong bullish momentum detected");
    if (volume > 70) reasoning.push("Above-average volume confirms trend");
    if (whale > 70) reasoning.push("Whale activity supports direction");
    return { action: "BUY", confidence: Math.round(avgScore), reasoning };
  }

  if (avgScore > 55) {
    reasoning.push("Moderate positive signals");
    if (risk > 60) reasoning.push("Elevated risk — use caution");
    return { action: "BUY", confidence: Math.round(avgScore * 0.8), reasoning };
  }

  if (avgScore < 35 && momentum < 40) {
    reasoning.push("Weak momentum and low volume");
    if (volume < 30) reasoning.push("Lack of market interest");
    return { action: "SELL", confidence: Math.round(100 - avgScore), reasoning };
  }

  reasoning.push("Mixed signals — hold for more clarity");
  return { action: "HOLD", confidence: Math.round(50 + (avgScore - 50) * 0.5), reasoning };
}

function calculateOverallScore(momentum: number, risk: number, volume: number, whale: number): number {
  return Math.round((momentum * 0.4 + volume * 0.2 + whale * 0.25 + (100 - risk) * 0.15));
}

export function useAISignals() {
  const [signals, setSignals] = useState<SignalAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  const checkApiKey = useCallback(() => {
    const apiKey = import.meta.env.VITE_SOSOVALUE_API_KEY;
    if (!apiKey) {
      setHasApiKey(false);
      setError("SoSoValue API key not configured. Please add VITE_SOSOVALUE_API_KEY to your environment variables.");
      return false;
    }
    setHasApiKey(true);
    return true;
  }, []);

  const analyzeToken = useCallback(async (symbol: string): Promise<TokenSignal | null> => {
    setLoading(true);
    setError(null);

    if (!checkApiKey()) {
      setLoading(false);
      return null;
    }

    try {
      const currency = await getCurrencyBySymbol(symbol);
      if (!currency) {
        throw new Error(`Token ${symbol} not found. Try with uppercase symbol like "BTC" or "ETH".`);
      }

      const [snapshot, economics] = await Promise.all([
        getMarketSnapshot(currency.currency_id).catch(() => null),
        getTokenEconomics(currency.currency_id).catch(() => null),
      ]);

      if (!snapshot) {
        throw new Error("Failed to fetch market data from SoSoValue API");
      }

      const signals: SignalAlert[] = [];

      const whaleSignal = detectWhaleActivity(snapshot, symbol);
      if (whaleSignal) signals.push(whaleSignal);

      const volumeSignal = detectVolumeSpike(snapshot, symbol);
      if (volumeSignal) signals.push(volumeSignal);

      const momentumSignal = detectMomentumShift(snapshot, symbol);
      if (momentumSignal) signals.push(momentumSignal);

      const momentumScore = calculateMomentumScore(snapshot);
      const volumeScore = calculateVolumeScore(snapshot);
      const whaleScore = calculateWhaleScore(snapshot);

      let riskScore = 50;
      if (economics?.token_unlock?.total_locked) {
        const locked = parseFloat(economics.token_unlock.total_locked);
        if (locked < 1000000) riskScore += 20;
      }
      if (snapshot.down_from_ath && parseFloat(snapshot.down_from_ath) > 70) riskScore += 10;

      const { action, confidence, reasoning } = generateRecommendation(
        momentumScore,
        riskScore,
        volumeScore,
        whaleScore
      );

      const recommendation = {
        action,
        entryPrice: action === "BUY" ? snapshot.price * 1.02 : undefined,
        targetPrice: action === "BUY" ? snapshot.price * (1 + (snapshot.change_pct_24h > 0 ? 5 : 3)) : undefined,
        stopLoss: action === "BUY" ? snapshot.price * 0.97 : undefined,
        confidence,
        reasoning,
      };

      if (action !== "HOLD") {
        signals.push({
          id: `opportunity-${symbol}-${Date.now()}`,
          type: "OPPORTUNITY",
          severity: confidence > 75 ? "HIGH" : "MEDIUM",
          symbol,
          title: action === "BUY" ? "Buy Signal" : "Sell Signal",
          description: `AI confidence: ${confidence}%`,
          metrics: {
            overallScore: calculateOverallScore(momentumScore, riskScore, volumeScore, whaleScore),
            confidence,
          },
          recommendation,
          timestamp: Date.now(),
          source: "sosovalue",
        });
      }

      setSignals(prev => [...prev, ...signals]);

      return {
        symbol,
        overallScore: calculateOverallScore(momentumScore, riskScore, volumeScore, whaleScore),
        momentumScore,
        riskScore,
        volumeScore,
        whaleScore,
        signals,
        recommendation: action,
        confidence,
        lastUpdated: Date.now(),
      };
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [checkApiKey]);

  const getMarketSignals = useCallback(async (): Promise<SignalAlert[]> => {
    if (!checkApiKey()) return [];

    try {
      const [indices, hotNews] = await Promise.all([
        getIndices().catch(() => []),
        getHotNews(5).catch(() => []),
      ]);

      const alerts: SignalAlert[] = [];

      for (const news of hotNews) {
        alerts.push({
          id: `news-${news.id}`,
          type: "NEWS_HOT",
          severity: "MEDIUM",
          symbol: "MARKET",
          title: news.title.slice(0, 60) + (news.title.length > 60 ? "..." : ""),
          description: news.content.slice(0, 150),
          metrics: {
            source: news.source_link,
            publishedAt: news.release_time,
          },
          timestamp: parseInt(news.release_time),
          source: "sosovalue",
        });
      }

      setSignals(prev => [...prev, ...alerts]);
      return alerts;
    } catch (e) {
      console.error("Failed to fetch market signals:", e);
      return [];
    }
  }, [checkApiKey]);

  const clearSignals = useCallback(() => {
    setSignals([]);
    setError(null);
  }, []);

  return {
    signals,
    loading,
    error,
    hasApiKey,
    analyzeToken,
    getMarketSignals,
    clearSignals,
  };
}
