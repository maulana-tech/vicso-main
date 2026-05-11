import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Shield, Droplets, BarChart3, Users, Lock, Unlock } from "lucide-react";
import type { TokenData } from "@/hooks/useTokenAPI";

function formatUsd(v: number) {
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + v.toFixed(2);
}

function formatPrice(v: number) {
  if (v < 0.0001) return "$" + v.toFixed(8);
  if (v < 0.01) return "$" + v.toFixed(6);
  if (v < 1) return "$" + v.toFixed(4);
  return "$" + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function LiveTokenDashboard({ data, loading }: { data: TokenData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="h-3 w-12 animate-pulse rounded bg-secondary mb-2" />
              <div className="h-5 w-16 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    { label: "Price", value: formatPrice(data.price), icon: data.priceChange24h >= 0 ? TrendingUp : TrendingDown, color: data.priceChange24h >= 0 ? "text-neon-green" : "text-destructive" },
    { label: "Market Cap", value: formatUsd(data.marketCap), icon: BarChart3, color: "text-foreground" },
    { label: "Liquidity", value: formatUsd(data.liquidity), icon: Droplets, color: data.liquidity > 1e6 ? "text-neon-green" : "text-neon-orange" },
    { label: "Volume 24h", value: formatUsd(data.volume24h), icon: BarChart3, color: "text-neon-blue" },
    { label: "24h Change", value: (data.priceChange24h >= 0 ? "+" : "") + data.priceChange24h.toFixed(1) + "%", icon: data.priceChange24h >= 0 ? TrendingUp : TrendingDown, color: data.priceChange24h >= 0 ? "text-neon-green" : "text-destructive" },
    { label: "Risk Score", value: data.riskScore + "/100", icon: Shield, color: data.riskScore > 60 ? "text-destructive" : data.riskScore > 35 ? "text-neon-orange" : "text-neon-green" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h3 className="font-heading text-sm font-semibold text-foreground">{data.name}</h3>
          <span className="rounded bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{data.symbol}</span>
          <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{data.chain}</span>
          {data.source === "ave" && (
            <span className="rounded-full bg-neon-green/10 px-2 py-0.5 text-[10px] font-medium text-neon-green">LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          {data.liquidityLocked ? (
            <span className="flex items-center gap-1 text-neon-green"><Lock className="h-3 w-3" /> Locked</span>
          ) : (
            <span className="flex items-center gap-1 text-destructive"><Unlock className="h-3 w-3" /> Unlocked</span>
          )}
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /> {data.holders.toLocaleString()}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-secondary/30 p-2.5 sm:p-3">
            <div className="flex items-center gap-1 mb-1">
              <m.icon className={`h-3 w-3 ${m.color}`} />
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
            </div>
            <p className={`font-heading text-xs sm:text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
