import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Search, Loader2 } from "lucide-react";
import { useTokenData } from "@/hooks/useTokenAPI";

const trendingSymbols = ["BTC", "ETH", "SOL", "PEPE"];

export default function NarrativeDetector() {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const { data, loading } = useTokenData(selectedSymbol);

  return (
    <div className="rounded-xl p-5 bg-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-4 w-4 text-amber-500" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Quick Token Check</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {trendingSymbols.map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedSymbol === sym
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching live data...
        </div>
      )}
      {data && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{data.name} ({data.symbol})</span>
            <span className={`text-xs font-mono font-bold ${data.priceChange24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {data.priceChange24h >= 0 ? "+" : ""}{data.priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-mono text-foreground">${data.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">MCap</span><span className="font-mono text-foreground">${(data.marketCap / 1e6).toFixed(1)}M</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Risk</span><span className={`font-mono font-bold ${data.riskScore <= 35 ? "text-emerald-500" : data.riskScore <= 65 ? "text-amber-500" : "text-red-500"}`}>{data.riskScore}/100</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="font-mono text-foreground">{data.source}</span></div>
          </div>
        </motion.div>
      )}
      {!data && !loading && !selectedSymbol && (
        <p className="text-xs text-muted-foreground py-4 text-center">Click a token above to check live data</p>
      )}
    </div>
  );
}
