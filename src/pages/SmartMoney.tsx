import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Bell, BellOff, Star, Copy, X, RefreshCw, Users, Scan } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAlerts } from "@/hooks/useAlerts";
import SmartMoneyWallets from "@/components/SmartMoneyWallets";
import { toast } from "sonner";

interface TrackedWalletRow {
  id: string;
  address: string;
  label: string | null;
  chain: string | null;
  notifications_on: boolean | null;
  created_at: string;
}

const CHAINS = [
  { value: "ETH", label: "Ethereum", scanChain: "eth" },
  { value: "BNB", label: "BNB Chain", scanChain: "bsc" },
  { value: "SOL", label: "Solana", scanChain: "solana" },
  { value: "MATIC", label: "Polygon", scanChain: "polygon" },
  { value: "ARB", label: "Arbitrum", scanChain: "arbitrum" },
  { value: "TRX", label: "TRON", scanChain: "tron" },
  { value: "SUI", label: "Sui", scanChain: "sui" },
  { value: "SEI", label: "Sei", scanChain: "sei" },
  { value: "ETC", label: "Ethereum Classic", scanChain: "etc" },
];

function isValidAddress(addr: string, chain: string): boolean {
  if (!addr || addr.length < 10) return false;
  if (chain === "SOL" || chain === "SUI") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  if (chain === "TRX") return /^T[a-zA-Z0-9]{33}$/.test(addr);
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export default function SmartMoney() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addAlert, isAlertEnabled, alerts, toggleAlert } = useAlerts();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchChain, setSearchChain] = useState("ETH");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newChain, setNewChain] = useState("ETH");
  const [tracked, setTracked] = useState<TrackedWalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallets = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("tracked_wallets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTracked((data as TrackedWalletRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchWallets(); }, [user]);

  const handleScanWallet = () => {
    if (!searchQuery.trim()) { toast.error("Enter a wallet address"); return; }
    if (!isValidAddress(searchQuery, searchChain)) {
      toast.error(`Invalid ${searchChain} address format`);
      return;
    }
    if (user) {
      addAlert("wallet", searchQuery, `Wallet ${searchQuery.slice(0, 8)}...`);
    }
    const chain = CHAINS.find((c) => c.value === searchChain);
    navigate(`/smart-money/${encodeURIComponent(searchQuery)}?chain=${chain?.scanChain || "eth"}`);
  };

  const handleAddWallet = async () => {
    if (!newAddress.trim() || !isValidAddress(newAddress, newChain)) {
      toast.error("Please enter a valid wallet address for the selected chain");
      return;
    }
    if (!user) { toast.error("Sign in to track wallets"); return; }
    const { error } = await supabase.from("tracked_wallets").insert({
      user_id: user.id,
      address: newAddress,
      label: newLabel || `Wallet ${tracked.length + 1}`,
      chain: newChain,
    });
    if (error) { toast.error("Failed to add wallet"); return; }
    addAlert("wallet", newAddress, newLabel || `Wallet ${tracked.length + 1}`);
    toast.success("Wallet added to tracking");
    setShowAddModal(false);
    setNewAddress("");
    setNewLabel("");
    fetchWallets();
  };

  const handleRemoveWallet = async (id: string) => {
    await supabase.from("tracked_wallets").delete().eq("id", id);
    toast.success("Wallet removed");
    fetchWallets();
  };

  const handleToggleNotifications = async (id: string, current: boolean) => {
    await supabase.from("tracked_wallets").update({ notifications_on: !current }).eq("id", id);
    fetchWallets();
  };

  const navigateToWallet = (address: string, chain: string) => {
    const c = CHAINS.find((ch) => ch.value === chain);
    navigate(`/smart-money/${encodeURIComponent(address)}?chain=${c?.scanChain || "eth"}`);
  };

  const filtered = tracked.filter(
    (w) => !searchQuery || w.address.toLowerCase().includes(searchQuery.toLowerCase()) || (w.label || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Smart Money Feed</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Multi-chain wallet explorer & tracker</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Track Wallet
            </button>
          )}
          <button onClick={fetchWallets} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Wallet Scanner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-3 sm:p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Scan className="h-4 w-4 text-primary" /> Scan Wallet
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleScanWallet()} placeholder="Enter wallet address (0x...)" className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary font-mono" />
          </div>
          <div className="flex gap-2">
            <select value={searchChain} onChange={(e) => setSearchChain(e.target.value)} className="flex-1 sm:flex-none rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary">
              {CHAINS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
            <button onClick={handleScanWallet} className="rounded-lg bg-primary px-4 sm:px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <Scan className="h-3.5 w-3.5" /> Scan
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-3 sm:p-4 text-center">
          <p className="font-heading text-lg sm:text-xl font-bold text-primary">{tracked.length}</p>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Tracked</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-3 sm:p-4 text-center">
          <p className="font-heading text-lg sm:text-xl font-bold text-emerald-500">{tracked.filter((w) => w.notifications_on).length}</p>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Alerts On</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-3 sm:p-4 text-center">
          <p className="font-heading text-lg sm:text-xl font-bold text-cyan-500">{new Set(tracked.map((w) => w.chain)).size}</p>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Chains</p>
        </motion.div>
      </div>

      {!user && (
        <div className="rounded-xl border border-border bg-secondary/50 p-5 sm:p-6 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">Sign in to track wallets</p>
          <p className="text-xs text-muted-foreground mt-1">Scan any wallet above, or sign in to save your watchlist</p>
          <button onClick={() => navigate("/auth")} className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Sign In</button>
        </div>
      )}

      {user && loading && <p className="text-sm text-muted-foreground text-center py-8">Loading wallets...</p>}

      {user && !loading && filtered.length === 0 && tracked.length === 0 && (
        <div className="rounded-xl border border-border bg-secondary/50 p-5 sm:p-6 text-center">
          <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">No wallets tracked yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Track Wallet" to add addresses</p>
        </div>
      )}

      {filtered.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 sm:p-5">
          <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Tracked Wallets
          </h3>
          <div className="space-y-2">
            {filtered.map((w) => (
              <div key={w.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 p-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">{w.label || "Unnamed"}</span>
                  <button onClick={() => navigateToWallet(w.address, w.chain || "ETH")} className="font-mono text-[10px] text-primary hover:underline truncate">
                    {w.address.slice(0, 8)}...{w.address.slice(-4)}
                  </button>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{w.chain}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleToggleNotifications(w.id, !!w.notifications_on)} className={`p-1.5 rounded transition-colors ${w.notifications_on ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {w.notifications_on ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(w.address); toast.success("Copied"); }} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleRemoveWallet(w.id)} className="p-1.5 text-red-500/60 hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <SmartMoneyWallets />

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="glass-strong rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">Track New Wallet</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Wallet Address</label>
                <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="0x..., T..., or Solana address" className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Label (optional)</label>
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Whale 1" className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Chain</label>
                <select value={newChain} onChange={(e) => setNewChain(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                  {CHAINS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <button onClick={handleAddWallet} className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Add Wallet</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
