import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Eye, BarChart3, RefreshCw, Search, Mail, Lock, ArrowRight, EyeOff, Eye as EyeIcon, X, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserRow { user_id: string; username: string | null; email: string | null; created_at: string; avatar_url: string | null; }
interface VisitorRow { id: string; session_id: string; started_at: string; last_active: string; page_views: number; tokens_analyzed: number; }
interface UserDetailData { profile: UserRow; wallets: { address: string; chain: string | null; label: string | null }[]; analyses: { token_symbol: string; risk_score: number | null; verdict: string | null; created_at: string }[]; }

function maskWallet(addr: string) { if (!addr || addr.length < 12) return addr; return addr.slice(0, 6) + "****" + addr.slice(-4); }

export default function Admin() {
  const { user, isAdmin, loading: authLoading, signIn } = useAuth();
  const [tab, setTab] = useState<"users" | "visitors" | "analytics">("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [totalWallets, setTotalWallets] = useState(0);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin, tab]);

  const fetchData = async () => {
    setLoading(true);
    // Always fetch all counts for stats cards regardless of active tab
    const [visitorRes, analysisRes, walletRes] = await Promise.all([
      supabase.from("visitor_sessions").select("*", { count: "exact", head: true }),
      supabase.from("token_analyses").select("*", { count: "exact", head: true }),
      supabase.from("tracked_wallets").select("*", { count: "exact", head: true }),
    ]);
    setTotalVisitors(visitorRes.count || 0);
    setTotalAnalyses(analysisRes.count || 0);
    setTotalWallets(walletRes.count || 0);

    if (tab === "users") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers((data as UserRow[]) || []);
    } else if (tab === "visitors") {
      const { data } = await supabase.from("visitor_sessions").select("*").order("last_active", { ascending: false }).limit(100);
      setVisitors((data as VisitorRow[]) || []);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoginLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error.message);
    else toast.success("Signed in successfully");
    setLoginLoading(false);
  };

  const openUserDetail = async (u: UserRow) => {
    setDetailLoading(true);
    setSelectedUser({ profile: u, wallets: [], analyses: [] });
    const [walletsRes, analysesRes] = await Promise.all([
      supabase.from("tracked_wallets").select("address, chain, label").eq("user_id", u.user_id).limit(50),
      supabase.from("token_analyses").select("token_symbol, risk_score, verdict, created_at").eq("user_id", u.user_id).order("created_at", { ascending: false }).limit(20),
    ]);
    setSelectedUser({ profile: u, wallets: (walletsRes.data as any[]) || [], analyses: (analysesRes.data as any[]) || [] });
    setDetailLoading(false);
  };

  const filteredUsers = users.filter(
    (u) => !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-10 sm:py-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/20">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">Admin Access</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {user ? "Your account doesn't have admin privileges." : "Sign in with an admin account."}
            </p>
          </div>
          {!user && (
            <div className="glass rounded-xl p-5 sm:p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-10 text-sm text-foreground outline-none focus:border-primary" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loginLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors">
                  {loginLoading ? "Signing in..." : "Admin Sign In"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-destructive/20 p-2"><Shield className="h-5 w-5 text-destructive" /></div>
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Platform management & analytics</p>
        </div>
      </div>

      <div className="flex rounded-lg border border-border bg-secondary text-xs w-fit">
        {([
          { id: "users", icon: Users, label: "Users" },
          { id: "visitors", icon: Eye, label: "Visitors" },
          { id: "analytics", icon: BarChart3, label: "Analytics" },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {[
          { label: "Users", value: users.length.toString(), color: "text-primary" },
          { label: "Visitors", value: totalVisitors.toString(), color: "text-neon-green" },
          { label: "Analyses", value: totalAnalyses.toString(), color: "text-neon-blue" },
          { label: "Wallets", value: totalWallets.toString(), color: "text-neon-orange" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-lg p-3 sm:p-4 text-center">
            <p className={`font-heading text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {tab === "users" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <button onClick={fetchData} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground text-sm">Loading...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No users found</p>
            ) : (
              filteredUsers.map((u) => (
                <button key={u.user_id} onClick={() => openUserDetail(u)} className="w-full glass rounded-lg p-3 text-left hover:bg-secondary/70 transition-colors">
                  <p className="text-sm font-semibold text-foreground">{u.username || "—"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email || "—"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                </button>
              ))
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Username</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Joined</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No users found</td></tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => openUserDetail(u)}>
                        <td className="px-4 py-3 font-semibold text-foreground">{u.username || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><button className="text-[10px] text-primary hover:underline">View</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {tab === "visitors" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground text-sm">Loading...</p>
            ) : visitors.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">No visitor sessions</p>
            ) : (
              visitors.map((v) => (
                <div key={v.id} className="glass rounded-lg p-3">
                  <p className="font-mono text-xs text-foreground">{v.session_id.slice(0, 12)}...</p>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>Views: {v.page_views}</span>
                    <span>Analyzed: {v.tokens_analyzed}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(v.last_active).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Session ID</th>
                    <th className="px-4 py-3 text-left font-medium">Started</th>
                    <th className="px-4 py-3 text-left font-medium">Last Active</th>
                    <th className="px-4 py-3 text-right font-medium">Views</th>
                    <th className="px-4 py-3 text-right font-medium">Analyzed</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : visitors.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No visitor sessions</td></tr>
                  ) : (
                    visitors.map((v) => (
                      <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="px-4 py-3 font-mono text-foreground">{v.session_id.slice(0, 12)}...</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(v.started_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(v.last_active).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-foreground">{v.page_views}</td>
                        <td className="px-4 py-3 text-right text-foreground">{v.tokens_analyzed}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {tab === "analytics" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="glass rounded-xl p-4 sm:p-5">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Platform Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "Token Analyses", value: totalAnalyses },
                  { label: "Tracked Wallets", value: totalWallets },
                  { label: "Users", value: users.length },
                  { label: "Visitor Sessions", value: visitors.length },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="font-mono text-sm font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-xl p-4 sm:p-5">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-3">System Status</h3>
              <div className="space-y-3">
                {[
                  { label: "Database", status: "Online", color: "text-neon-green" },
                  { label: "Auth Service", status: "Online", color: "text-neon-green" },
                  { label: "Edge Functions", status: "Ready", color: "text-neon-blue" },
                  { label: "API Gateway", status: "Active", color: "text-neon-green" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.color === "text-neon-green" ? "bg-neon-green" : "bg-neon-blue"}`} />
                      <span className={`text-xs font-medium ${s.color}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* User Detail Popup */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-xl p-5 sm:p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading text-sm font-semibold text-foreground">User Details</h3>
                <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3 mb-5">
                {[
                  { label: "Name", value: selectedUser.profile.username || "—" },
                  { label: "Email", value: selectedUser.profile.email || "—" },
                  { label: "User ID", value: maskWallet(selectedUser.profile.user_id) },
                  { label: "Joined", value: new Date(selectedUser.profile.created_at).toLocaleDateString() },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium text-foreground truncate ml-2">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wallet className="h-3 w-3" /> Wallets ({selectedUser.wallets.length})
                </h4>
                {selectedUser.wallets.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No wallets</p>
                ) : (
                  <div className="space-y-1">
                    {selectedUser.wallets.map((w, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-2">
                        <span className="font-mono text-[10px] text-foreground truncate">{maskWallet(w.address)}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{w.chain}</span>
                          <span className="text-[9px] text-muted-foreground">{w.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" /> Analyses ({selectedUser.analyses.length})
                </h4>
                {selectedUser.analyses.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No analyses</p>
                ) : (
                  <div className="space-y-1">
                    {selectedUser.analyses.slice(0, 10).map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-2">
                        <span className="text-xs font-semibold text-foreground">{a.token_symbol}</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={`font-mono ${(a.risk_score || 0) <= 35 ? "text-neon-green" : (a.risk_score || 0) <= 65 ? "text-neon-orange" : "text-destructive"}`}>
                            Risk: {a.risk_score}
                          </span>
                          <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
