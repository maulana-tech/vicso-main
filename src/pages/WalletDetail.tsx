import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ExternalLink, Copy, RefreshCw, Wallet, Plus,
  TrendingUp, TrendingDown, Activity, Tag, ArrowDownRight, ArrowUpRight,
  Loader2, Search, X
} from "lucide-react";
import { toast } from "sonner";
import { useWalletScan } from "@/hooks/useWalletScan";
import { useWalletPnL, useWalletTxs, type PnLItem, type WalletTx } from "@/hooks/useAVEWallet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const CHAINS = [
  { value: "eth", label: "Ethereum", symbol: "ETH" },
  { value: "bsc", label: "BNB Chain", symbol: "BNB" },
  { value: "polygon", label: "Polygon", symbol: "MATIC" },
  { value: "arbitrum", label: "Arbitrum", symbol: "ETH" },
  { value: "solana", label: "Solana", symbol: "SOL" },
];

function getExplorerUrl(chain: string, address: string, type: "address" | "tx" = "address") {
  const map: Record<string, string> = {
    eth: `https://etherscan.io/${type}/${address}`,
    bsc: `https://bscscan.com/${type}/${address}`,
    polygon: `https://polygonscan.com/${type}/${address}`,
    arbitrum: `https://arbiscan.io/${type}/${address}`,
    solana: `https://solscan.io/${type === "tx" ? "tx" : "account"}/${address}`,
  };
  return map[chain] || `https://etherscan.io/${type}/${address}`;
}

function shortenAddr(addr: string) { return addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : ""; }

function formatValue(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(v < 0.01 ? 6 : 4);
}

type TabType = "overview" | "transactions" | "trades" | "pnl" | "holdings";

export default function WalletDetail() {
  const { address } = useParams<{ address: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const decodedAddress = decodeURIComponent(address || "");
  const chainParam = searchParams.get("chain") || "eth";
  const [selectedChain, setSelectedChain] = useState(chainParam);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [txPage, setTxPage] = useState(0);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackLabel, setTrackLabel] = useState("");
  const [trackChain, setTrackChain] = useState(chainParam.toUpperCase());
  const [tracking, setTracking] = useState(false);

  const { data, loading, error, scan, startAutoRefresh } = useWalletScan();
  const pnlHook = useWalletPnL();
  const txsHook = useWalletTxs();
  const TX_PER_PAGE = 20;

  useEffect(() => {
    if (decodedAddress) {
      scan(decodedAddress, selectedChain);
      startAutoRefresh(decodedAddress, selectedChain);
    }
  }, [decodedAddress, selectedChain]);

  useEffect(() => {
    if (activeTab === "pnl" && decodedAddress) pnlHook.fetch(decodedAddress, selectedChain);
    if ((activeTab === "transactions" || activeTab === "trades") && decodedAddress) txsHook.fetch(decodedAddress, selectedChain);
  }, [activeTab, decodedAddress, selectedChain]);

  const chainInfo = CHAINS.find((c) => c.value === selectedChain) || CHAINS[0];
  const paginatedTxs = data?.transactions?.slice(txPage * TX_PER_PAGE, (txPage + 1) * TX_PER_PAGE) || [];
  const totalTxPages = Math.ceil((data?.transactions?.length || 0) / TX_PER_PAGE);

  const buys = (data?.transactions || []).filter(tx => tx.type === "Receive");
  const sells = (data?.transactions || []).filter(tx => tx.type === "Send");
  const buyVolume = buys.reduce((s, tx) => s + tx.value, 0);
  const sellVolume = sells.reduce((s, tx) => s + tx.value, 0);

  const handleTrackWallet = async () => {
    if (!user) { toast.error("Sign in to track wallets"); return; }
    if (!trackLabel.trim()) { toast.error("Please enter a wallet name"); return; }
    setTracking(true);
    try {
      const { error } = await supabase.from("tracked_wallets").insert({
        user_id: user.id,
        address: decodedAddress,
        chain: trackChain,
        label: trackLabel.trim(),
      });
      if (error?.code === "23505") toast.info("Wallet already tracked");
      else if (error) throw error;
      else toast.success("Wallet tracked!");
      setShowTrackModal(false);
      setTrackLabel("");
    } catch (e) { toast.error("Failed to track wallet"); }
    finally { setTracking(false); }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "transactions", label: "Transactions" },
    { id: "trades", label: "Recent Trades" },
    { id: "pnl", label: "Recent PnL" },
    { id: "holdings", label: "Holdings" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/smart-money")} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">Wallet Explorer</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-[300px]">{decodedAddress}</span>
            <button onClick={() => { navigator.clipboard.writeText(decodedAddress); toast.success("Copied"); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
            <a href={getExplorerUrl(selectedChain, decodedAddress)} target="_blank" rel="noreferrer" className="text-primary hover:underline"><ExternalLink className="h-3 w-3" /></a>
            {data?.tag && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium"><Tag className="h-2.5 w-2.5 inline mr-0.5" />{data.tag}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTrackModal(true)} className="flex items-center gap-1.5 rounded-lg bg-neon-green/10 border border-neon-green/30 px-3 py-2 text-xs font-medium text-neon-green hover:bg-neon-green/20 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Track Wallet
          </button>
          <button onClick={() => navigate(`/trading?copyWallet=${decodedAddress}`)} className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            <Copy className="h-3.5 w-3.5" /> Copy Trade
          </button>
        </div>
      </div>

      {/* Chain selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {CHAINS.map((c) => (
          <button key={c.value} onClick={() => setSelectedChain(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedChain === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground border border-border"}`}>
            {c.label}
          </button>
        ))}
        <button onClick={() => scan(decodedAddress, selectedChain)} className="ml-auto rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !data && <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-secondary/50 animate-pulse" />)}</div>}
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center"><p className="text-sm text-destructive">{error}</p><button onClick={() => scan(decodedAddress, selectedChain)} className="mt-2 text-xs text-primary hover:underline">Retry</button></div>}

      {data && !data.error && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-3 sm:p-4 text-center">
              <Wallet className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="font-heading text-base sm:text-lg font-bold text-foreground">{formatValue(data.nativeBalance)} {data.nativeSymbol}</p>
              <p className="text-[9px] uppercase text-muted-foreground">Balance</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="glass rounded-xl p-3 sm:p-4 text-center">
              <Activity className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="font-heading text-base sm:text-lg font-bold text-foreground">{data.txCount.toLocaleString()}</p>
              <p className="text-[9px] uppercase text-muted-foreground">Total Txs</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass rounded-xl p-3 sm:p-4 text-center">
              <Search className="h-4 w-4 text-neon-blue mx-auto mb-1" />
              <p className="font-heading text-base sm:text-lg font-bold text-foreground">{data.tokenCount}</p>
              <p className="text-[9px] uppercase text-muted-foreground">Tokens</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="glass rounded-xl p-3 sm:p-4 text-center">
              {data.pnl30d.net >= 0 ? <TrendingUp className="h-4 w-4 text-neon-green mx-auto mb-1" /> : <TrendingDown className="h-4 w-4 text-destructive mx-auto mb-1" />}
              <p className={`font-heading text-base sm:text-lg font-bold ${data.pnl30d.net >= 0 ? "text-neon-green" : "text-destructive"}`}>{data.pnl30d.net >= 0 ? "+" : ""}{formatValue(data.pnl30d.net)} {data.nativeSymbol}</p>
              <p className="text-[9px] uppercase text-muted-foreground">30d PnL</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-xl p-3 sm:p-4 text-center">
              <ArrowDownRight className="h-4 w-4 text-neon-green mx-auto mb-1" />
              <p className="font-heading text-base sm:text-lg font-bold text-neon-green">{buys.length}</p>
              <p className="text-[9px] uppercase text-muted-foreground">Buys ({formatValue(buyVolume)} {data.nativeSymbol})</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-xl p-3 sm:p-4 text-center">
              <ArrowUpRight className="h-4 w-4 text-destructive mx-auto mb-1" />
              <p className="font-heading text-base sm:text-lg font-bold text-destructive">{sells.length}</p>
              <p className="text-[9px] uppercase text-muted-foreground">Sells ({formatValue(sellVolume)} {data.nativeSymbol})</p>
            </motion.div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-secondary text-xs w-fit max-w-full">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setTxPage(0); }} className={`px-3 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5">
                <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-neon-green" /> 30-Day Performance</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                    <ArrowDownRight className="h-3.5 w-3.5 text-neon-green mx-auto mb-1" />
                    <p className="font-heading text-base font-bold text-neon-green">{formatValue(data.pnl30d.totalIn)} {data.nativeSymbol}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">Total In</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                    <ArrowUpRight className="h-3.5 w-3.5 text-destructive mx-auto mb-1" />
                    <p className="font-heading text-base font-bold text-destructive">{formatValue(data.pnl30d.totalOut)} {data.nativeSymbol}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">Total Out</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                    <Activity className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                    <p className={`font-heading text-base font-bold ${data.pnl30d.percentChange >= 0 ? "text-neon-green" : "text-destructive"}`}>
                      {data.pnl30d.percentChange >= 0 ? "+" : ""}{data.pnl30d.percentChange.toFixed(1)}%
                    </p>
                    <p className="text-[9px] uppercase text-muted-foreground">Net Change</p>
                  </div>
                </div>
              </motion.div>
              {data.topInteractions.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5">
                  <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Top Contract Interactions</h3>
                  <div className="space-y-1.5">{data.topInteractions.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2">
                      <span className="text-xs text-foreground">{item.method}</span>
                      <span className="text-xs font-mono text-muted-foreground">{item.count}x</span>
                    </div>
                  ))}</div>
                </motion.div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === "transactions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Transaction History ({data.txCount.toLocaleString()} total)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground text-[10px] uppercase border-b border-border">
                    <th className="text-left py-2 px-2">Tx Hash</th><th className="text-left py-2 px-2">Date</th><th className="text-left py-2 px-2">Type</th><th className="text-right py-2 px-2">Value</th><th className="text-center py-2 px-2">Status</th>
                  </tr></thead>
                  <tbody>{paginatedTxs.map((tx, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 px-2"><a href={getExplorerUrl(selectedChain, tx.hash, "tx")} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline">{tx.hash.slice(0, 10)}...</a></td>
                      <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{new Date(tx.timestamp).toLocaleDateString()}</td>
                      <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${tx.type === "Receive" ? "bg-neon-green/20 text-neon-green" : "bg-destructive/20 text-destructive"}`}>{tx.type}</span></td>
                      <td className="py-2 px-2 text-right font-mono text-foreground">{formatValue(tx.value)} {data.nativeSymbol}</td>
                      <td className="py-2 px-2 text-center"><span className={`text-[9px] ${tx.status === "Success" ? "text-neon-green" : "text-destructive"}`}>{tx.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {totalTxPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button onClick={() => setTxPage(Math.max(0, txPage - 1))} disabled={txPage === 0} className="px-2 py-1 text-[10px] rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">Prev</button>
                  <span className="text-[10px] text-muted-foreground">{txPage + 1} / {totalTxPages}</span>
                  <button onClick={() => setTxPage(Math.min(totalTxPages - 1, txPage + 1))} disabled={txPage >= totalTxPages - 1} className="px-2 py-1 text-[10px] rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">Next</button>
                </div>
              )}
            </motion.div>
          )}

          {/* Recent Trades Tab (from AVE API) */}
          {activeTab === "trades" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Recent Trades</h3>
              {txsHook.loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : txsHook.transactions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No recent trades found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-muted-foreground text-[10px] uppercase border-b border-border">
                      <th className="text-left py-2 px-2">Type</th><th className="text-left py-2 px-2">Token In</th><th className="text-left py-2 px-2">Token Out</th><th className="text-right py-2 px-2">USD Value</th><th className="text-left py-2 px-2">Time</th>
                    </tr></thead>
                    <tbody>{txsHook.transactions.map((tx, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${tx.type === "buy" || tx.type === "swap" ? "bg-neon-green/20 text-neon-green" : "bg-destructive/20 text-destructive"}`}>{tx.type}</span></td>
                        <td className="py-2 px-2 text-foreground">{tx.tokenIn || "—"} <span className="text-muted-foreground">({tx.amountIn.toFixed(4)})</span></td>
                        <td className="py-2 px-2 text-foreground">{tx.tokenOut || "—"} <span className="text-muted-foreground">({tx.amountOut.toFixed(4)})</span></td>
                        <td className="py-2 px-2 text-right font-mono text-foreground">${tx.valueUsd.toFixed(2)}</td>
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {txsHook.hasMore && (
                    <button onClick={() => txsHook.loadMore(decodedAddress, selectedChain)} disabled={txsHook.loading} className="mt-3 w-full rounded-lg border border-border py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
                      {txsHook.loading ? "Loading..." : "Load More"}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Recent PnL Tab */}
          {activeTab === "pnl" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Recent PnL</h3>
              {pnlHook.loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : !pnlHook.data || pnlHook.data.items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No PnL data available</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                      <p className={`font-heading text-base font-bold ${pnlHook.data.totals.realizedPnl >= 0 ? "text-neon-green" : "text-destructive"}`}>${Math.abs(pnlHook.data.totals.realizedPnl).toFixed(2)}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Realized PnL</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                      <p className={`font-heading text-base font-bold ${pnlHook.data.totals.unrealizedPnl >= 0 ? "text-neon-green" : "text-destructive"}`}>${Math.abs(pnlHook.data.totals.unrealizedPnl).toFixed(2)}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Unrealized PnL</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                      <p className="font-heading text-base font-bold text-neon-green">${pnlHook.data.totals.buyVolume.toFixed(2)}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Buy Volume</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 border border-border p-3 text-center">
                      <p className="font-heading text-base font-bold text-destructive">${pnlHook.data.totals.sellVolume.toFixed(2)}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">Sell Volume</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-muted-foreground text-[10px] uppercase border-b border-border">
                        <th className="text-left py-2 px-2">Token</th><th className="text-right py-2 px-2">Realized</th><th className="text-right py-2 px-2">Unrealized</th><th className="text-right py-2 px-2">Total</th><th className="text-right py-2 px-2">Trades</th>
                      </tr></thead>
                      <tbody>{pnlHook.data.items.map((p, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="py-2 px-2 text-foreground font-medium">{p.token}</td>
                          <td className={`py-2 px-2 text-right font-mono ${p.realizedPnl >= 0 ? "text-neon-green" : "text-destructive"}`}>{p.realizedPnl >= 0 ? "+" : ""}${Math.abs(p.realizedPnl).toFixed(2)}</td>
                          <td className={`py-2 px-2 text-right font-mono ${p.unrealizedPnl >= 0 ? "text-neon-green" : "text-destructive"}`}>{p.unrealizedPnl >= 0 ? "+" : ""}${Math.abs(p.unrealizedPnl).toFixed(2)}</td>
                          <td className={`py-2 px-2 text-right font-mono ${p.totalPnl >= 0 ? "text-neon-green" : "text-destructive"}`}>{p.totalPnl >= 0 ? "+" : ""}${Math.abs(p.totalPnl).toFixed(2)}</td>
                          <td className="py-2 px-2 text-right font-mono text-muted-foreground">{p.trades}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Holdings Tab */}
          {activeTab === "holdings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Token Holdings ({data.portfolio.length})</h3>
              {data.portfolio.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No token holdings found</p>
              ) : (
                <div className="space-y-1.5">
                  {data.portfolio.map((token, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {token.logo ? <img src={token.logo} alt={token.symbol} className="h-6 w-6 rounded-full" /> : <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">{token.symbol[0]}</div>}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{token.symbol}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{token.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-foreground">{formatValue(token.balance)}</p>
                        {token.usdValue && <p className="text-[9px] text-muted-foreground">${Number(token.usdValue).toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Track Wallet Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setShowTrackModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="glass-strong rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">Track Wallet</h3>
              <button onClick={() => setShowTrackModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Wallet Address</label>
                <p className="mt-1 font-mono text-xs text-foreground bg-secondary rounded-lg px-3 py-2 truncate">{decodedAddress}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Wallet Name <span className="text-destructive">*</span></label>
                <input value={trackLabel} onChange={(e) => setTrackLabel(e.target.value)} placeholder="e.g. Whale 1, Smart Money Alpha" className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary" autoFocus />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Chain</label>
                <select value={trackChain} onChange={(e) => setTrackChain(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                  {CHAINS.map((c) => (<option key={c.value} value={c.value.toUpperCase()}>{c.label}</option>))}
                </select>
              </div>
              <button onClick={handleTrackWallet} disabled={tracking || !trackLabel.trim()} className="w-full rounded-lg bg-neon-green/20 border border-neon-green/30 py-2.5 text-sm font-medium text-neon-green hover:bg-neon-green/30 transition-colors disabled:opacity-50">
                {tracking ? "Saving..." : "Track This Wallet"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
