import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, CheckCircle, AlertTriangle, XCircle, TrendingUp, Target, ArrowUpRight, ArrowDownRight, Shield, Zap } from "lucide-react";
import type { AIAnalysis } from "@/hooks/useTokenAPI";

const verdictConfig = {
  BUY: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle },
  HOLD: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  AVOID: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
};

function formatPrice(v: number): string {
  if (!v) return "$0";
  if (v < 0.0001) return "$" + v.toFixed(8);
  if (v < 0.01) return "$" + v.toFixed(6);
  if (v < 1) return "$" + v.toFixed(4);
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AIInsightPanel({ analysis, loading }: { analysis: AIAnalysis | null; loading: boolean }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground">AI is analyzing...</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-secondary" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const cfg = verdictConfig[analysis.verdict];
  const VerdictIcon = cfg.icon;

  const handleAutoTrade = () => {
    if (!analysis.entryExit) return;
    const ee = analysis.entryExit;
    // Pick best entry (midpoint of entry range)
    const bestEntry = (ee.entryLow + ee.entryHigh) / 2;
    const params = new URLSearchParams({
      token: analysis.tokenData?.symbol || "",
      entry: bestEntry.toString(),
      tp: ee.takeProfit2.toString(),
      sl: ee.stopLoss.toString(),
      side: analysis.verdict === "AVOID" ? "sell" : "buy",
    });
    navigate(`/trading?${params.toString()}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-foreground">AI Analysis</h3>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1 ${cfg.bg}`}>
          <VerdictIcon className={`h-4 w-4 ${cfg.color}`} />
          <span className={`font-heading text-sm font-bold ${cfg.color}`}>{analysis.verdict}</span>
        </div>
      </div>

      {/* Confidence + Risk */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">AI Confidence</span>
            <span className={`font-mono font-bold ${cfg.color}`}>{analysis.confidence}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${analysis.confidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                analysis.verdict === "BUY" ? "bg-emerald-500" : analysis.verdict === "HOLD" ? "bg-amber-500" : "bg-destructive"
              }`}
            />
          </div>
        </div>
        {analysis.riskLevel && (
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${
              analysis.riskLevel === "LOW" ? "text-emerald-500" :
              analysis.riskLevel === "MEDIUM" ? "text-amber-500" : "text-red-500"
            }`} />
            <div>
              <span className="text-[10px] text-muted-foreground block">Risk Level</span>
              <span className={`text-xs font-bold ${
                analysis.riskLevel === "LOW" ? "text-emerald-500" :
                analysis.riskLevel === "MEDIUM" ? "text-amber-500" : "text-red-500"
              }`}>{analysis.riskLevel}</span>
            </div>
          </div>
        )}
      </div>

      {/* Entry/Exit Suggestions */}
      {analysis.entryExit && analysis.verdict !== "AVOID" && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              Entry & Exit Suggestions
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-emerald-500" />
              <span className="text-muted-foreground">Entry:</span>
              <span className="font-mono text-foreground">{formatPrice(analysis.entryExit.entryLow)} – {formatPrice(analysis.entryExit.entryHigh)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-muted-foreground">TP 1:</span>
              <span className="font-mono text-emerald-500">{formatPrice(analysis.entryExit.takeProfit1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-muted-foreground">TP 2:</span>
              <span className="font-mono text-emerald-500">{formatPrice(analysis.entryExit.takeProfit2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">Stop Loss:</span>
              <span className="font-mono text-red-500">{formatPrice(analysis.entryExit.stopLoss)}</span>
            </div>
          </div>
          {/* Auto Trade Button */}
          <button
            onClick={handleAutoTrade}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Auto Trade This Setup
          </button>
        </div>
      )}

      {/* Reasoning */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2">Analysis Breakdown</h4>
        <div className="space-y-1.5">
          {analysis.reasoning.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 text-xs"
            >
              <TrendingUp className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
              <span className="text-muted-foreground">{r}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Conversational */}
      {analysis.conversational && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">{analysis.conversational}</p>
        </div>
      )}
    </motion.div>
  );
}
