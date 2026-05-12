import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Shield, Users } from "lucide-react";
import type { Alert } from "@/data/mockData";

const iconMap = {
  whale_buy: Users,
  risk_spike: AlertTriangle,
  trending: TrendingUp,
  rug_warning: Shield,
};

const severityStyles = {
  info: "border-cyan-500/30 bg-cyan-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  critical: "border-red-500/30 bg-red-500/5",
};

const severityIconColor = {
  info: "text-cyan-500",
  warning: "text-amber-500",
  critical: "text-red-500",
};

export default function AlertCard({ alert, index = 0 }: { alert: Alert; index?: number }) {
  const Icon = iconMap[alert.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-lg border p-4 ${severityStyles[alert.severity]} ${!alert.read ? "ring-1 ring-primary/20" : ""}`}
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 ${severityIconColor[alert.severity]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
            <span className="shrink-0 text-[10px] text-muted-foreground">{alert.timestamp}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
