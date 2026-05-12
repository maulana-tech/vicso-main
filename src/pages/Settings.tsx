import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Save, Bell, Palette, Shield } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"trading" | "alerts" | "general">("trading");
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Configure trading parameters, alerts, and preferences</p>
      </div>

      <div className="flex rounded-lg border border-border bg-secondary text-xs w-fit">
        {([
          { id: "trading", icon: Shield, label: "Trading" },
          { id: "alerts", icon: Bell, label: "Alerts" },
          { id: "general", icon: Palette, label: "General" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "trading" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h3 className="font-heading text-sm font-semibold text-foreground">Risk Management</h3>
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Max Risk Level</span>
                <span className="font-mono text-foreground">{localSettings.maxRiskLevel}%</span>
              </div>
              <input type="range" min={0} max={100} value={localSettings.maxRiskLevel} onChange={(e) => setLocalSettings((s) => ({ ...s, maxRiskLevel: Number(e.target.value) }))} className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Max Trade Size (USD)</span>
                <span className="font-mono text-foreground">${localSettings.maxTradeSize.toLocaleString()}</span>
              </div>
              <input type="range" min={100} max={100000} step={100} value={localSettings.maxTradeSize} onChange={(e) => setLocalSettings((s) => ({ ...s, maxTradeSize: Number(e.target.value) }))} className="w-full accent-primary" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <h3 className="font-heading text-sm font-semibold text-foreground">Auto Trading</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-foreground font-medium">Auto Buy</p><p className="text-[10px] text-muted-foreground">Automatically buy when risk is below threshold</p></div>
                <button onClick={() => setLocalSettings((s) => ({ ...s, autoBuyEnabled: !s.autoBuyEnabled }))} className={`relative h-6 w-11 rounded-full transition-colors ${localSettings.autoBuyEnabled ? "bg-emerald-500" : "bg-secondary"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${localSettings.autoBuyEnabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              {localSettings.autoBuyEnabled && (
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Risk threshold (buy below)</span><span className="font-mono text-foreground">{localSettings.autoBuyRiskThreshold}</span></div>
                  <input type="range" min={5} max={50} value={localSettings.autoBuyRiskThreshold} onChange={(e) => setLocalSettings((s) => ({ ...s, autoBuyRiskThreshold: Number(e.target.value) }))} className="w-full accent-primary" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-foreground font-medium">Auto Sell</p><p className="text-[10px] text-muted-foreground">Automatically sell when risk increases</p></div>
                <button onClick={() => setLocalSettings((s) => ({ ...s, autoSellEnabled: !s.autoSellEnabled }))} className={`relative h-6 w-11 rounded-full transition-colors ${localSettings.autoSellEnabled ? "bg-destructive" : "bg-secondary"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${localSettings.autoSellEnabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              {localSettings.autoSellEnabled && (
                <div className="pl-4 border-l-2 border-red-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Risk threshold (sell above)</span><span className="font-mono text-foreground">{localSettings.autoSellRiskThreshold}</span></div>
                  <input type="range" min={50} max={100} value={localSettings.autoSellRiskThreshold} onChange={(e) => setLocalSettings((s) => ({ ...s, autoSellRiskThreshold: Number(e.target.value) }))} className="w-full accent-primary" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-foreground font-medium">Whale Activity Trigger</p><p className="text-[10px] text-muted-foreground">Execute when whale signal detected</p></div>
                <button onClick={() => setLocalSettings((s) => ({ ...s, whaleActivityTrigger: !s.whaleActivityTrigger }))} className={`relative h-6 w-11 rounded-full transition-colors ${localSettings.whaleActivityTrigger ? "bg-primary" : "bg-secondary"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${localSettings.whaleActivityTrigger ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </div>

          <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Save className="h-4 w-4" /> Save Settings
          </button>
        </motion.div>
      )}

      {activeTab === "alerts" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Alert Preferences</h3>
            {[
              { label: "Token Alerts", desc: "Get notified on analyzed token price changes", key: "tokenAlerts" },
              { label: "Wallet Alerts", desc: "Get notified on tracked wallet activity", key: "walletAlerts" },
              { label: "Risk Alerts", desc: "Get notified on sudden risk changes", key: "riskAlerts" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div><p className="text-sm text-foreground font-medium">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div>
                <div className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-medium">Active</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Individual alerts can be managed on the Alerts page</p>
        </motion.div>
      )}

      {activeTab === "general" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Appearance</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground font-medium">Theme</p><p className="text-[10px] text-muted-foreground">Dark mode optimized for trading</p></div>
              <span className="text-xs text-muted-foreground px-3 py-1 rounded-lg bg-secondary">Dark (Default)</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Account</h3>
            {user ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground">{user.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">User ID</span><span className="font-mono text-muted-foreground">{user.id.slice(0, 8)}...</span></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to see account details</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
