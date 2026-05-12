import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import type { AgentStatus } from "@/data/mockData";

export default function AgentStatusCard({ agent, index = 0 }: { agent: AgentStatus; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-3 rounded-lg p-3 bg-card border border-border"
    >
      <div className="rounded-lg bg-primary/10 p-2">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-foreground">{agent.name}</p>
        <p className="text-[10px] text-muted-foreground">{agent.tasksCompleted} tasks • {agent.lastRun}</p>
      </div>
      <span className={`h-2 w-2 rounded-full ${
        agent.status === "active" ? "bg-primary" : agent.status === "idle" ? "bg-amber-500" : "bg-red-500"
      }`} />
    </motion.div>
  );
}
