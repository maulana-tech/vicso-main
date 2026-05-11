import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, ChevronUp, Info, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { SkillOutput } from "@/hooks/useSkillOrchestrator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SKILL_LABELS: Record<string, { name: string; desc: string }> = {
  DataCollectorSkill: { name: "Data Collector", desc: "Fetches live OHLC, volume, liquidity & market cap" },
  RiskAnalyzerSkill: { name: "Risk Analyzer", desc: "Computes volatility, liquidity risk & holder concentration" },
  SmartMoneySkill: { name: "Smart Money Detector", desc: "Detects whale buys/sells & wallet clustering" },
  StrategySignalSkill: { name: "Strategy Engine", desc: "Computes RSI, MACD, EMA & generates BUY/SELL/HOLD signals" },
  PortfolioSkill: { name: "Portfolio Manager", desc: "Evaluates portfolio risk exposure & suggests rebalancing" },
  BacktestingSkill: { name: "Backtester", desc: "Simulates strategy on historical data for win rate & P/L" },
  AIExplainerSkill: { name: "AI Explainer", desc: "Translates analysis into actionable insights" },
  TradeExecutorSkill: { name: "Trade Executor", desc: "Handles trade execution via connected wallet" },
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function SkillCard({ skill, index = 0 }: { skill: SkillOutput; index?: number }) {
  const [expanded, setExpanded] = useState(false);
  const label = SKILL_LABELS[skill.skill] || { name: skill.skill, desc: "" };
  const isRunning = skill.status === "running";
  const isSuccess = skill.status === "success";
  const isError = skill.status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`rounded-lg p-2 ${isRunning ? "bg-neon-orange/10" : isSuccess ? "bg-neon-green/10" : isError ? "bg-destructive/10" : "bg-primary/10"}`}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 text-neon-orange animate-spin" />
          ) : (
            <Zap className={`h-4 w-4 ${isSuccess ? "text-neon-green" : isError ? "text-destructive" : "text-primary"}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground truncate">{label.name}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">{label.desc}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{skill.statusText}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {skill.confidence > 0 && (
            <span className="text-[9px] font-mono text-muted-foreground">{skill.confidence}%</span>
          )}
          <span className="text-[9px] text-muted-foreground">{timeAgo(skill.timestamp)}</span>
          <span className={`h-2 w-2 rounded-full ${isRunning ? "bg-neon-orange animate-pulse" : isSuccess ? "bg-neon-green" : isError ? "bg-destructive" : "bg-muted-foreground"}`} />
          {skill.output && (expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />)}
        </div>
      </div>

      <AnimatePresence>
        {expanded && skill.output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-line">{skill.output}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
