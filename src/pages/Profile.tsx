import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Camera, Save, Shield, BarChart3, LogIn, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { address, isConnected, connectWallet, disconnect: disconnectWallet } = useWalletConnection();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalAnalyses: 0, trackedWallets: 0 });

  useEffect(() => {
    if (user) { loadProfile(); loadStats(); } else { setLoading(false); }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) { setUsername(data.username || ""); setEmail(data.email || ""); setAvatarUrl(data.avatar_url || ""); }
    setLoading(false);
  };

  const loadStats = async () => {
    if (!user) return;
    const { count: analyses } = await supabase.from("token_analyses").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    const { count: walletCount } = await supabase.from("tracked_wallets").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setStats({ totalAnalyses: analyses || 0, trackedWallets: walletCount || 0 });
  };

  const handleSave = async () => {
    if (!user) { toast.error("Sign in to save your profile"); return; }
    const { error } = await supabase.from("profiles").update({ username, email, avatar_url: avatarUrl }).eq("user_id", user.id);
    if (error) toast.error("Failed to save profile");
    else toast.success("Profile saved");
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Failed to update password");
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setAvatarUrl(reader.result as string); toast.success("Avatar updated — click Save to persist"); };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20 space-y-4 px-4">
        <User className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
        <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground text-center">Sign in to access your profile</h2>
        <p className="text-xs sm:text-sm text-muted-foreground text-center">Visitors can browse but need an account to save data</p>
        <button onClick={() => navigate("/auth")} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <LogIn className="h-4 w-4" /> Sign In
        </button>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading profile...</div>;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Manage your account and wallet connections</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
          <div className="relative group shrink-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-5 w-5 text-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4 w-full">
            <div>
              <label className="text-xs text-muted-foreground">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">User ID</label>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{user.id.slice(0, 8)}...{user.id.slice(-4)}</p>
            </div>
            <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Save className="h-4 w-4" /> Save Profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Change Password</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button onClick={handlePasswordChange} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap">
            Update Password
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Your Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          {[
            { label: "Analyzed", value: stats.totalAnalyses.toString(), color: "text-cyan-500" },
            { label: "Wallets", value: stats.trackedWallets.toString(), color: "text-emerald-500" },
            { label: "Connected", value: isConnected ? "1" : "0", color: "text-purple-500" },
            { label: "Age", value: Math.ceil((Date.now() - new Date(user.created_at).getTime()) / 86400000) + "d", color: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
              <p className={`font-heading text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Wallet Connection</h3>
        {isConnected && address ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="font-heading text-sm font-bold text-emerald-500">Connected</span>
              <span className="font-mono text-xs text-muted-foreground">{address.slice(0, 6)}...{address.slice(-4)}</span>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                <Shield className="h-3 w-3" /> Secure
              </div>
            </div>
            <button onClick={() => disconnectWallet()} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={() => connectWallet("metamask")} className="w-full rounded-lg bg-primary px-3 py-2.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">Connect MetaMask</button>
            <button onClick={() => connectWallet("walletconnect")} className="w-full rounded-lg border border-border px-3 py-2.5 text-xs text-foreground hover:bg-secondary transition-colors">WalletConnect</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
