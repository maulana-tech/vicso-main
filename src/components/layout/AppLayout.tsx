import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  Users,
  Bell,
  Settings,
  Menu,
  X,
  Sparkles,
  User,
  Shield,
  LogIn,
  LogOut,
  ArrowUpDown,
  Wallet,
  Zap,
  PieChart,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import WalletConnectModal from "@/components/WalletConnectModal";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Feed" },
  { to: "/trading", icon: ArrowUpDown, label: "Trading" },
  { to: "/ai", icon: Sparkles, label: "AI" },
  { to: "/analyzer", icon: Search, label: "Analyzer" },
  { to: "/smart-money", icon: Users, label: "Smart Money" },
  { to: "/portfolio", icon: PieChart, label: "Portfolio" },
  { to: "/alerts", icon: Bell, label: "Alerts" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { address, isConnected, disconnect: disconnectWallet, balanceSymbol, balance } = useWalletConnection();
  useVisitorTracking();

  const isActive = (to: string) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">

      {/* ═══════ HEADER BAR ═══════ */}
      <header className="sticky top-0 z-[9999] flex items-center h-14 border-b border-border bg-background/95 shrink-0 px-4 lg:px-6">

        <button onClick={() => setDrawerOpen(true)} className="lg:hidden mr-2 text-foreground">
          <Menu className="h-5 w-5" />
        </button>

        <button onClick={() => navigate("/")} className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity shrink-0">
          <img src={logoImg} alt="Visco AI" className="h-7 w-7 rounded-lg object-contain" />
          <span className="font-heading text-base font-bold text-foreground hidden sm:inline">Visco AI</span>
        </button>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive(item.to)
                  ? "text-primary bg-primary/10 border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive("/admin")
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isConnected && address ? (
            <button onClick={() => disconnectWallet()} className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1.5 text-xs font-mono text-primary hover:bg-primary/10 transition-colors">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          ) : (
            <button onClick={() => setWalletModalOpen(true)} className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <button onClick={() => signOut()} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/auth")} className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
          )}

          <button onClick={() => navigate("/settings")} className="hidden lg:flex p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ═══════ MOBILE DRAWER ═══════ */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] bg-background/60 lg:hidden" onClick={() => setDrawerOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-[10001] w-64 transform border-r border-border bg-card transition-transform duration-300 lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <button onClick={() => { navigate("/"); setDrawerOpen(false); }} className="flex items-center gap-2">
              <img src={logoImg} alt="Visco AI" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-heading text-lg font-bold text-foreground">Visco AI</span>
            </button>
            <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setDrawerOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive(item.to) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/settings" onClick={() => setDrawerOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive("/settings") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" onClick={() => setDrawerOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive("/admin") ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Shield className="h-4 w-4" />
                Admin
              </NavLink>
            )}
          </nav>

          <div className="border-t border-border px-4 py-4 space-y-3">
            {isConnected && address ? (
              <div className="rounded-lg p-3 space-y-2 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-foreground font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{balance.toFixed(4)} {balanceSymbol}</span>
                  <button onClick={() => disconnectWallet()} className="text-destructive/70 hover:text-destructive">Disconnect</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setWalletModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                <Wallet className="h-3.5 w-3.5" />
                Connect Wallet
              </button>
            )}

            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center"><User className="h-3.5 w-3.5 text-primary" /></div>
                  <span className="text-xs text-foreground truncate max-w-[120px]">{user.email}</span>
                </div>
                <button onClick={() => signOut()} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><LogOut className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => navigate("/auth")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
            )}

            <div className="rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                VicSO Skills
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs text-foreground">8 skills online</span>
              </div>
            </div>

            <p className="text-[9px] text-center text-muted-foreground">Powered by VicSO Skills</p>
          </div>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      <WalletConnectModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  );
}
