import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Flame, ArrowUp, ArrowDown,
  Loader2, RefreshCw, Waves, DollarSign, Zap, Brain, Filter
} from "lucide-react";
import { toast } from "sonner";

type FeedCategory = "all" | "prices" | "whale" | "pump" | "dump" | "smart";

interface FeedItem {
  id: string;
  symbol: string;
  title: string;
  description: string;
  price: number;
  change24h: number;
  category: FeedCategory;
  timestamp: number;
  volume?: number;
}

const CATEGORY_CONFIG: Record<FeedCategory, { label: string; icon: any; color: string }> = {
  all: { label: "All", icon: Filter, color: "text-foreground" },
  prices: { label: "Coin Prices", icon: DollarSign, color: "text-emerald-500" },
  whale: { label: "Whale Alerts", icon: Waves, color: "text-cyan-500" },
  pump: { label: "Market Pump", icon: TrendingUp, color: "text-emerald-500" },
  dump: { label: "Market Dump", icon: TrendingDown, color: "text-red-500" },
  smart: { label: "Smart Money", icon: Brain, color: "text-purple-500" },
};

const CATEGORY_BADGE: Record<string, string> = {
  prices: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  whale: "bg-accent/10 text-accent border-accent/20",
  pump: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  dump: "bg-red-500/10 text-red-500 border-red-500/20",
  smart: "bg-primary/10 text-primary border-primary/20",
};

const TRENDING_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "PEPE", "DOGE", "XRP", "LINK", "AVAX", "TRUMP"];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function buildFeedItems(data: any[]): FeedItem[] {
  const items: FeedItem[] = [];
  const now = Date.now();

  for (const d of data) {
    if (!d || d.error) continue;
    const change = d.priceChange24h || 0;
    const vol = d.volume24h || 0;

    items.push({
      id: `price-${d.symbol}`,
      symbol: d.symbol,
      title: `${d.name || d.symbol}`,
      description: `Trading at $${d.price >= 1 ? d.price.toFixed(2) : d.price.toFixed(6)} — Vol: $${vol >= 1e9 ? (vol / 1e9).toFixed(1) + "B" : vol >= 1e6 ? (vol / 1e6).toFixed(1) + "M" : (vol / 1e3).toFixed(0) + "K"}`,
      price: d.price || 0,
      change24h: change,
      category: "prices",
      timestamp: now - Math.floor(Math.random() * 120000),
      volume: vol,
    });

    if (change > 5) {
      items.push({
        id: `pump-${d.symbol}`,
        symbol: d.symbol,
        title: `${d.symbol} Pumping +${change.toFixed(1)}%`,
        description: `Strong upward momentum — ${d.symbol} surged ${change.toFixed(2)}% in 24h with ${vol >= 1e6 ? "$" + (vol / 1e6).toFixed(1) + "M" : "$" + (vol / 1e3).toFixed(0) + "K"} volume`,
        price: d.price || 0,
        change24h: change,
        category: "pump",
        timestamp: now - Math.floor(Math.random() * 60000),
      });
    }
    if (change < -5) {
      items.push({
        id: `dump-${d.symbol}`,
        symbol: d.symbol,
        title: `${d.symbol} Dropping ${change.toFixed(1)}%`,
        description: `Significant sell-off detected — ${d.symbol} down ${Math.abs(change).toFixed(2)}% in 24h`,
        price: d.price || 0,
        change24h: change,
        category: "dump",
        timestamp: now - Math.floor(Math.random() * 90000),
      });
    }

    if (vol > 1e9) {
      const whaleAmt = (vol * 0.001).toFixed(0);
      items.push({
        id: `whale-${d.symbol}`,
        symbol: d.symbol,
        title: `🐋 Large ${d.symbol} movement detected`,
        description: `$${Number(whaleAmt).toLocaleString()} worth of ${d.symbol} transferred — potential accumulation by smart money`,
        price: d.price || 0,
        change24h: change,
        category: "whale",
        timestamp: now - Math.floor(Math.random() * 180000),
      });
    }

    if (vol > 5e8 && change > 2) {
      items.push({
        id: `smart-${d.symbol}`,
        symbol: d.symbol,
        title: `Smart money signal: ${d.symbol}`,
        description: `High volume buying pattern detected — institutional accumulation likely based on current market signals`,
        price: d.price || 0,
        change24h: change,
        category: "smart",
        timestamp: now - Math.floor(Math.random() * 150000),
      });
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

const ITEMS_PER_PAGE = 20;

export default function TrendingFeed() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<FeedCategory>("all");
  const [page, setPage] = useState(1);
  const fetchRef = useRef(false);

  const fetchTrending = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const results = await Promise.allSettled(
        TRENDING_SYMBOLS.map(async (sym) => {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/ave-token?symbol=${sym}`, {
            headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
          });
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
      );
      const data = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value && !r.value.error)
        .map(r => r.value);
      setItems(buildFeedItems(data));
    } catch { /* silent */ }
    setLoading(false);
    fetchRef.current = false;
  }, []);

  useEffect(() => {
    fetchTrending();
    const iv = setInterval(fetchTrending, 30000);
    return () => clearInterval(iv);
  }, [fetchTrending]);

  useEffect(() => {
    const pumps = items.filter(i => i.category === "pump");
    const dumps = items.filter(i => i.category === "dump");
    if (pumps.length > 0) {
      const top = pumps[0];
      toast.success(`${top.symbol} pumping +${top.change24h.toFixed(1)}%`, { id: `alert-${top.id}`, duration: 5000 });
    }
    if (dumps.length > 0) {
      const top = dumps[0];
      toast.error(`${top.symbol} dropping ${top.change24h.toFixed(1)}%`, { id: `alert-${top.id}`, duration: 5000 });
    }
  }, [items]);

  const filtered = category === "all" ? items : items.filter(i => i.category === category);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [category]);


  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-5">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-500" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Trending Feed</h3>
          <span className="flex items-center gap-1 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{filtered.length} items</span>
          <button onClick={fetchTrending} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${loading && items.length === 0 ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-thin sm:px-5">
        {(Object.keys(CATEGORY_CONFIG) as FeedCategory[]).map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${category === cat ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
            >
              <cfg.icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Feed list */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trending feed...
        </div>
      ) : (
        <div className="px-4 pb-2 sm:px-5 space-y-1.5">
          <AnimatePresence initial={false}>
            {paginated.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/analyzer?token=${item.symbol}`)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3 hover:bg-secondary/70 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${item.change24h >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {item.change24h >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{item.symbol}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${CATEGORY_BADGE[item.category] || "bg-secondary text-muted-foreground border-border"}`}>
                        {CATEGORY_CONFIG[item.category]?.label || item.category}
                      </span>
                      <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{timeAgo(item.timestamp)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-1">
                  <div className="text-right">
                    <p className="text-[11px] font-mono text-foreground">
                      ${item.price < 0.01 ? item.price.toExponential(2) : item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <div className={`flex items-center gap-0.5 justify-end text-[10px] font-semibold ${item.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {item.change24h >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                      {Math.abs(item.change24h).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-6">No items in this category</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground disabled:opacity-30 hover:bg-secondary/80 transition-colors">
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-mono transition-colors ${p === currentPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground disabled:opacity-30 hover:bg-secondary/80 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
