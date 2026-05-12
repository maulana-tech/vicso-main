import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, PieChart, Loader2, RefreshCw, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useWalletTokens, useWalletPnL } from "@/hooks/useAVEWallet";
import { useNavigate } from "react-router-dom";

function formatVal(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { address, isConnected } = useWalletConnection();
  const tokensHook = useWalletTokens();
  const pnlHook = useWalletPnL();
  const [activeTab, setActiveTab] = useState<"holdings" | "pnl">("holdings");

  useEffect(() => {
    if (isConnected && address) {
      tokensHook.fetch(address, "eth");
      pnlHook.fetch(address, "eth");
    }
  }, [isConnected, address]);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 px-4">
        <Wallet className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-heading text-xl font-bold text-foreground text-center">Connect Wallet to View Portfolio</h2>
        <p className="text-sm text-muted-foreground text-center">Connect your wallet to see holdings, PnL, and allocation</p>
        {!user && (
          <button onClick={() => navigate("/auth")} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
            <LogIn className="h-4 w-4" /> Sign In
          </button>
        )}
      </div>
    );
  }

  const totalValue = tokensHook.data?.totalValue || 0;
  const tokens = tokensHook.data?.tokens || [];
  const pnlItems = pnlHook.data?.items || [];
  const pnlTotals = pnlHook.data?.totals || { realizedPnl: 0, unrealizedPnl: 0, totalPnl: 0, buyVolume: 0, sellVolume: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="mt-1 text-xs text-muted-foreground font-mono">{address.slice(0, 8)}...{address.slice(-6)}</p>
        </div>
        <button onClick={() => { tokensHook.fetch(address, "eth"); pnlHook.fetch(address, "eth"); }} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-4 w-4 ${tokensHook.loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 text-center">
          <Wallet className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="font-heading text-lg font-bold text-foreground">{formatVal(totalValue)}</p>
          <p className="text-[9px] uppercase text-muted-foreground">Total Value</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-xl p-4 text-center">
          <PieChart className="h-4 w-4 text-cyan-500 mx-auto mb-1" />
          <p className="font-heading text-lg font-bold text-foreground">{tokens.length}</p>
          <p className="text-[9px] uppercase text-muted-foreground">Assets</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-4 text-center">
          {pnlTotals.totalPnl >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" /> : <TrendingDown className="h-4 w-4 text-red-500 mx-auto mb-1" />}
          <p className={`font-heading text-lg font-bold ${pnlTotals.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatVal(Math.abs(pnlTotals.totalPnl))}</p>
          <p className="text-[9px] uppercase text-muted-foreground">Total PnL</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-xl p-4 text-center">
          <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
          <p className="font-heading text-lg font-bold text-foreground">{formatVal(pnlTotals.buyVolume)}</p>
          <p className="text-[9px] uppercase text-muted-foreground">Buy Volume</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border bg-secondary text-xs w-fit">
        {(["holdings", "pnl"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "holdings" ? "Holdings" : "PnL Breakdown"}
          </button>
        ))}
      </div>

      {/* Holdings Tab */}
      {activeTab === "holdings" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-5 bg-card border border-border">
          {tokensHook.loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : tokens.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No token holdings found</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center text-[10px] uppercase text-muted-foreground px-3 pb-2 border-b border-border">
                <span className="flex-1">Token</span>
                <span className="w-24 text-right">Balance</span>
                <span className="w-24 text-right hidden sm:block">Price</span>
                <span className="w-24 text-right">USD Value</span>
                <span className="w-16 text-right hidden sm:block">Alloc %</span>
              </div>
              {tokens.map((t, i) => (
                <div key={i} className="flex items-center rounded-lg bg-secondary/50 border border-border px-3 py-2.5 hover:bg-secondary/80 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {t.logo ? <img src={t.logo} alt={t.symbol} className="h-6 w-6 rounded-full" /> : <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">{t.symbol[0]}</div>}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.symbol}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{t.name}</p>
                    </div>
                  </div>
                  <span className="w-24 text-right text-xs font-mono text-muted-foreground">{t.balance < 0.01 ? t.balance.toFixed(6) : t.balance.toFixed(4)}</span>
                  <span className="w-24 text-right text-xs font-mono text-muted-foreground hidden sm:block">{t.price < 0.01 ? `$${t.price.toFixed(8)}` : `$${t.price.toFixed(2)}`}</span>
                  <span className="w-24 text-right text-xs font-mono text-foreground">{formatVal(t.usdValue)}</span>
                  <span className="w-16 text-right text-xs font-mono text-muted-foreground hidden sm:block">{t.allocation.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* PnL Tab */}
      {activeTab === "pnl" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-5 bg-card border border-border">
          {pnlHook.loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : pnlItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No PnL data available</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center text-[10px] uppercase text-muted-foreground px-3 pb-2 border-b border-border">
                <span className="flex-1">Token</span>
                <span className="w-24 text-right">Realized</span>
                <span className="w-24 text-right hidden sm:block">Unrealized</span>
                <span className="w-24 text-right">Total PnL</span>
                <span className="w-16 text-right hidden sm:block">Trades</span>
              </div>
              {pnlItems.map((p, i) => (
                <div key={i} className="flex items-center rounded-lg bg-secondary/50 border border-border px-3 py-2.5">
                  <span className="flex-1 text-xs font-medium text-foreground">{p.token}</span>
                  <span className={`w-24 text-right text-xs font-mono ${p.realizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>{p.realizedPnl >= 0 ? "+" : ""}{formatVal(Math.abs(p.realizedPnl))}</span>
                  <span className={`w-24 text-right text-xs font-mono hidden sm:block ${p.unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>{p.unrealizedPnl >= 0 ? "+" : ""}{formatVal(Math.abs(p.unrealizedPnl))}</span>
                  <span className={`w-24 text-right text-xs font-mono ${p.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>{p.totalPnl >= 0 ? "+" : ""}{formatVal(Math.abs(p.totalPnl))}</span>
                  <span className="w-16 text-right text-xs font-mono text-muted-foreground hidden sm:block">{p.trades}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
