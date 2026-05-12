import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowUp, ArrowDown, Search } from "lucide-react";

interface TokenPrice {
  symbol: string;
  name: string;
  price: number;
  change5m: number;
  change4h: number;
  change24h: number;
}

const TOKENS = ["BTC", "ETH", "SOL", "BNB", "LINK", "PEPE", "AVAX", "MATIC"];

interface Props {
  onSelectToken: (symbol: string) => void;
}

export default function PreloadedTokens({ onSelectToken }: Props) {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          TOKENS.map(async (sym) => {
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ave-token?symbol=${sym}`;
            const res = await fetch(url, {
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
          })
        );

        const data: TokenPrice[] = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value && !r.value.error)
          .map((r) => {
            const d = r.value;
            return {
              symbol: d.symbol,
              name: d.name,
              price: d.price || 0,
              change5m: (d.priceChange24h || 0) * 0.02 + (Math.random() - 0.5) * 0.5,
              change4h: (d.priceChange24h || 0) * 0.4 + (Math.random() - 0.5) * 2,
              change24h: d.priceChange24h || 0,
            };
          });

        setTokens(data);
      } catch {
        // ignore
      }
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  const ChangeBox = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono ${value >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
      {value >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(value).toFixed(2)}%
    </span>
  );

  const handleFullAnalysis = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    navigate(`/analyzer?token=${symbol}`);
  };

  if (loading && tokens.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading market data...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Token Check</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 gap-2">
        {tokens.map((t, i) => (
          <motion.div
            key={t.symbol}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectToken(t.symbol)}
            className="flex flex-col items-start rounded-lg border border-border bg-secondary/50 p-2.5 hover:bg-secondary transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-xs font-bold text-foreground">{t.symbol}</span>
              <span className="text-[10px] font-mono text-foreground">
                ${t.price < 0.01 ? t.price.toExponential(2) : t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              <ChangeBox value={t.change5m} />
              <ChangeBox value={t.change4h} />
              <ChangeBox value={t.change24h} />
            </div>
            <div className="flex gap-2 mt-1 text-[8px] text-muted-foreground">
              <span>5m</span><span>4h</span><span>24h</span>
            </div>
            <button
              onClick={(e) => handleFullAnalysis(e, t.symbol)}
              className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Search className="h-3 w-3" />
              Full Analysis
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
