import { motion } from "framer-motion";

export default function AIConfidenceMeter({ confidence, label = "AI Confidence" }: { confidence: number; label?: string }) {
  const color = confidence >= 75 ? "text-emerald-500" : confidence >= 50 ? "text-amber-500" : "text-red-500";
  const bgColor = confidence >= 75 ? "bg-emerald-500" : confidence >= 50 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className={`text-xs font-bold font-mono ${color}`}>{confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${bgColor}`}
          />
        </div>
      </div>
    </div>
  );
}
