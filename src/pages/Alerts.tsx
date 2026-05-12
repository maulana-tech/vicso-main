import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, BellOff, Search, AlertTriangle, Info, Zap, Shield, Loader2, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";

const tabs = [
  { id: "all", label: "All", icon: Bell },
  { id: "wallet", label: "Wallet", icon: Zap },
  { id: "token", label: "Token", icon: Info },
  { id: "risk", label: "Risk", icon: Shield },
] as const;

const typeColor = (type: string) => {
  if (type === "risk") return "border-red-500/30 bg-red-500/5";
  if (type === "wallet") return "border-cyan-500/30 bg-cyan-500/5";
  return "border-emerald-500/30 bg-emerald-500/5";
};

const typeBadge = (type: string) => {
  if (type === "risk") return "bg-red-500/10 text-red-500";
  if (type === "wallet") return "bg-cyan-500/10 text-cyan-500";
  return "bg-emerald-500/10 text-emerald-500";
};

export default function Alerts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alerts, loading, toggleAlert, removeAlert, refetch } = useAlerts();
  const initialFilter = searchParams.get("filter") || "all";
  const [activeTab, setActiveTab] = useState<string>(initialFilter);
  const [search, setSearch] = useState("");

  // Auto-refresh alerts every 15s
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(refetch, 15000);
    return () => clearInterval(iv);
  }, [user, refetch]);

  const filtered = alerts
    .filter((a) => activeTab === "all" || a.alert_type === activeTab)
    .filter((a) => !search || a.target_name?.toLowerCase().includes(search.toLowerCase()) || a.target_identifier.toLowerCase().includes(search.toLowerCase()));

  const activeCount = alerts.filter((a) => a.enabled).length;

  const handleAlertClick = (alert: typeof alerts[0]) => {
    if (alert.alert_type === "wallet") {
      navigate(`/smart-money/${encodeURIComponent(alert.target_identifier)}?chain=eth`);
    } else if (alert.alert_type === "token") {
      navigate(`/analyzer?token=${alert.target_identifier}`);
    } else {
      navigate(`/analyzer?token=${alert.target_identifier}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Alerts</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Manage alerts for tokens, wallets, and risk events</p>
        </div>
        {user && (
          <button onClick={refetch} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={"flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium transition-colors " + (activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
            <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts..." className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Active", count: activeCount, color: "text-emerald-500" },
          { label: "Token", count: alerts.filter((a) => a.alert_type === "token").length, color: "text-cyan-500" },
          { label: "Wallet", count: alerts.filter((a) => a.alert_type === "wallet").length, color: "text-amber-500" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-3 text-center">
            <p className={"font-heading text-lg sm:text-2xl font-bold " + s.color}>{s.count}</p>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts...
        </div>
      ) : (
        <div className="space-y-2">
          {!user ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sign in to manage your alerts</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No alerts yet — analyze tokens or scan wallets to auto-create alerts
            </p>
          ) : (
            filtered.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl border p-3 sm:p-4 transition-all cursor-pointer hover:ring-1 hover:ring-primary/20 ${typeColor(alert.alert_type)}`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex items-start sm:items-center justify-between gap-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${typeBadge(alert.alert_type)}`}>
                      {alert.alert_type}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{alert.target_name || alert.target_identifier}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{alert.target_identifier}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAlert(alert.id, alert.enabled); }}
                      className={`p-1.5 rounded transition-colors ${alert.enabled ? "text-emerald-500" : "text-muted-foreground"}`}
                    >
                      {alert.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }} className="p-1.5 text-red-500/60 hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Created: {new Date(alert.created_at).toLocaleString()} • {alert.enabled ? "Active" : "Paused"}
                  {alert.last_triggered_at && ` • Last triggered: ${new Date(alert.last_triggered_at).toLocaleString()}`}
                </p>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
