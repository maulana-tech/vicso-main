import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    // Navigate to Token Analyzer with query
    navigate(`/analyzer?token=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 backdrop-blur-sm pt-[15vh]" onClick={() => setOpen(false)}>
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-lg rounded-xl p-0 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search token symbol (e.g. ETH, BTC, SOL...)"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-4">
                {query.trim() ? (
                  <button onClick={handleSearch} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-secondary transition-colors">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-foreground">Analyze <span className="font-bold text-primary">{query.toUpperCase()}</span></span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Type a token symbol and press Enter to analyze</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
