import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, TrendingUp, TrendingDown, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Position } from "@/hooks/usePositions";

function ShareModal({ position, onClose }: { position: Position; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
  const isProfit = pnlPercent >= 0;

  const copyToClipboard = () => {
    const text = `${isProfit ? "🟢" : "🔴"} ${position.symbol} ${isProfit ? "+" : ""}${pnlPercent.toFixed(2)}%\nEntry: $${position.entryPrice}\nCurrent: $${position.currentPrice}\n— Visco AI`;
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        <div ref={cardRef} className={`rounded-2xl p-6 ${isProfit ? "bg-gradient-to-br from-neon-green/20 via-background to-background border border-neon-green/30" : "bg-gradient-to-br from-destructive/20 via-background to-background border border-destructive/30"}`}>
          <div className="flex items-center justify-between mb-6">
            <span className={`text-xs font-bold tracking-widest px-3 py-1 rounded-full ${isProfit ? "bg-neon-green/20 text-neon-green" : "bg-destructive/20 text-destructive"}`}>
              LONG
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center space-y-2 mb-6">
            <p className="text-sm text-muted-foreground font-medium">{position.symbol}</p>
            <div className={`text-5xl font-heading font-black ${isProfit ? "text-neon-green" : "text-destructive"}`}>
              {isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-muted-foreground text-xs">Entry Price</p>
              <p className="font-mono text-foreground font-semibold">${position.entryPrice < 0.01 ? position.entryPrice.toFixed(8) : position.entryPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Current Price</p>
              <p className="font-mono text-foreground font-semibold">${position.currentPrice < 0.01 ? position.currentPrice.toFixed(8) : position.currentPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{user?.user_metadata?.username || user?.email?.split("@")[0] || "Trader"}</span>
            <span className="text-[10px] text-muted-foreground font-mono">Visco AI</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3 justify-center">
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Share2 className="h-3 w-3" /> Copy to Clipboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PnLCard({ position }: { position: Position }) {
  const [showShare, setShowShare] = useState(false);
  const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
  const pnlUsd = (position.currentPrice - position.entryPrice) * position.amount;
  const isProfit = pnlPercent >= 0;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`glass rounded-xl p-4 border ${isProfit ? "border-neon-green/20" : "border-destructive/20"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-heading font-bold text-foreground">{position.symbol}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{position.chain}</span>
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold ${isProfit ? "text-neon-green" : "text-destructive"}`}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Entry</p>
              <p className="font-mono text-foreground">${position.entryPrice < 0.01 ? position.entryPrice.toFixed(8) : position.entryPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-mono text-foreground">${position.currentPrice < 0.01 ? position.currentPrice.toFixed(8) : position.currentPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-mono text-foreground">{position.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">P&L</p>
              <p className={`font-mono font-bold ${isProfit ? "text-neon-green" : "text-destructive"}`}>
                {isProfit ? "+" : ""}${Math.abs(pnlUsd) < 1 ? pnlUsd.toFixed(6) : pnlUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-3 w-3" /> Share
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showShare && <ShareModal position={position} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </>
  );
}
