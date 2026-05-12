import { motion } from "framer-motion";
import { Users, Activity, Globe } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function PlatformStats() {
  const { stats } = useDashboardStats();

  const items = [
    { icon: Users, label: "Tracked Wallets", value: stats.totalTrackedWallets.toLocaleString(), color: "text-cyan-500" },
    { icon: Activity, label: "Analyses", value: stats.tokensAnalyzed.toLocaleString(), color: "text-emerald-500" },
    { icon: Globe, label: "Alerts", value: stats.activeAlerts.toLocaleString(), color: "text-purple-500" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 text-[10px]">
      {items.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <s.icon className={`h-3 w-3 ${s.color}`} />
          <span className="text-muted-foreground">{s.label}:</span>
          <span className={`font-mono font-bold ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </motion.div>
  );
}
