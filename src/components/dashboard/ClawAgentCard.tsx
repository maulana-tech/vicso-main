import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ChevronDown, ChevronUp, Info, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ClawAgentState } from "@/hooks/useClawAgents";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const statusConfig = {
  idle: { color: "bg-muted-foreground", icon: Bot, pulse: false },
  running: { color: "bg-neon-orange", icon: Loader2, pulse: true },
  success: { color: "bg-neon-green", icon: CheckCircle2, pulse: false },
  error: { color: "bg-destructive", icon: XCircle, pulse: false },
};

export default function ClawAgentCard({ agent, index = 0 }: { agent: ClawAgentState; index?: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[agent.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`rounded-lg p-2 ${agent.status === "running" ? "bg-neon-orange/10" : agent.status === "success" ? "bg-neon-green/10" : agent.status === "error" ? "bg-destructive/10" : "bg-primary/10"}`}>
          {agent.status === "running" ? (
            <Loader2 className="h-4 w-4 text-neon-orange animate-spin" />
          ) : (
            <Bot className={`h-4 w-4 ${agent.status === "success" ? "text-neon-green" : agent.status === "error" ? "text-destructive" : "text-primary"}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground truncate">{agent.name}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">{agent.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{agent.statusText}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-muted-foreground">{timeAgo(agent.lastUpdated)}</span>
          <span className={`h-2 w-2 rounded-full ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`} />
          {agent.output && (expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />)}
        </div>
      </div>

      <AnimatePresence>
        {expanded && agent.output && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <div className="rounded-lg bg-secondary/50 p-2.5">
                <p className="text-[11px] text-foreground leading-relaxed">{agent.output}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
