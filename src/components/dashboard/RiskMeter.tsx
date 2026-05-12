import { motion } from "framer-motion";

interface RiskMeterProps {
  score: number;
  size?: number;
  label?: string;
}

export default function RiskMeter({ score, size = 160, label = "Risk Score" }: RiskMeterProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score <= 33 ? "hsl(145, 55%, 45%)" : score <= 66 ? "hsl(38, 90%, 55%)" : "hsl(0, 65%, 50%)";
  const statusText = score <= 33 ? "LOW RISK" : score <= 66 ? "MODERATE" : "HIGH RISK";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(230, 20%, 15%)"
            strokeWidth="8"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-heading text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{statusText}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
