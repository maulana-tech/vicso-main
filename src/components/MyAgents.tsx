import { motion } from "framer-motion";
import { Bot, Play, Square, Trash2, Link2 } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";

const strategyLabels = {
  "smart-money": "Smart Money",
  "risk-analyzer": "Risk Analyzer",
  "auto-trader": "Auto Trader",
};

export default function MyAgents() {
  const { agents, toggleAgent, deleteAgent } = useAgents();

  if (agents.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold text-foreground">My Agents</h3>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
          {agents.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${agent.isRunning ? "bg-neon-green animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-sm font-semibold text-foreground">{agent.name}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{agent.id}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                {strategyLabels[agent.strategy]}
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {agent.chain}
              </span>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Risk: {agent.riskLevel}
              </span>
              {agent.autoBuy && (
                <span className="rounded-md bg-neon-green/15 px-2 py-0.5 text-[10px] font-medium text-neon-green">
                  Auto Buy
                </span>
              )}
              {agent.autoSell && (
                <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                  Auto Sell
                </span>
              )}
            </div>

            {agent.attachedWallet && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link2 className="h-3 w-3" />
                {agent.attachedWallet.slice(0, 6)}...{agent.attachedWallet.slice(-4)}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAgent(agent.id)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  agent.isRunning
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-neon-green/10 text-neon-green hover:bg-neon-green/20"
                }`}
              >
                {agent.isRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {agent.isRunning ? "Stop" : "Run"}
              </button>
              <button
                onClick={() => deleteAgent(agent.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
