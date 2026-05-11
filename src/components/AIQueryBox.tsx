import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Send, Loader2, Target, Shield } from "lucide-react";
import { useAIAnalysis } from "@/hooks/useTokenAPI";

export default function AIQueryBox() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const { analysis, loading, error, analyze } = useAIAnalysis();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (analysis?.conversational) {
      setResponse(analysis.conversational);
      setShowResponse(true);
    }
  }, [analysis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    analyze(query, true);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <Brain className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything… e.g. Should I buy ETH? or paste a contract address"
          className="w-full rounded-xl border border-border bg-card/60 backdrop-blur-xl py-3 pl-10 pr-12 text-sm text-foreground outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-1.5 text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      <AnimatePresence>
        {showResponse && response && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">AI Response</span>
              {analysis?.verdict && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  analysis.verdict === "BUY" ? "bg-neon-green/10 text-neon-green" :
                  analysis.verdict === "HOLD" ? "bg-neon-orange/10 text-neon-orange" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {analysis.verdict}
                </span>
              )}
              {analysis?.riskLevel && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${
                  analysis.riskLevel === "LOW" ? "bg-neon-green/10 text-neon-green" :
                  analysis.riskLevel === "MEDIUM" ? "bg-neon-orange/10 text-neon-orange" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  <Shield className="h-2.5 w-2.5" /> {analysis.riskLevel}
                </span>
              )}
              <button
                onClick={() => setShowResponse(false)}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">{response}</p>

            {/* Entry/Exit suggestions */}
            {analysis?.entryExit && analysis.verdict !== "AVOID" && (
              <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground mb-1.5">
                  <Target className="h-3 w-3 text-primary" /> Entry/Exit
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <span className="text-muted-foreground">Entry: <span className="font-mono text-foreground">${analysis.entryExit.entryLow.toFixed(4)} – ${analysis.entryExit.entryHigh.toFixed(4)}</span></span>
                  <span className="text-muted-foreground">TP: <span className="font-mono text-neon-green">${analysis.entryExit.takeProfit1.toFixed(4)}</span></span>
                  <span className="text-muted-foreground">SL: <span className="font-mono text-destructive">${analysis.entryExit.stopLoss.toFixed(4)}</span></span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-destructive px-1">Error: {error}</p>
      )}
    </div>
  );
}
