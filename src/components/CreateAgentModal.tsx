import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Zap } from "lucide-react";
import { useAgents, type CustomAgent } from "@/hooks/useAgents";
import { toast } from "sonner";

const strategies: { id: CustomAgent["strategy"]; label: string; desc: string }[] = [
  { id: "smart-money", label: "Smart Money Tracker", desc: "Follow whale activity and mirror trades" },
  { id: "risk-analyzer", label: "Risk Analyzer", desc: "Monitor token risk and alert on changes" },
  { id: "auto-trader", label: "Auto Trader", desc: "Execute trades based on AI signals" },
];

const chains: { id: "ETH" | "BNB" | "SOL"; label: string }[] = [
  { id: "ETH", label: "Ethereum" },
  { id: "BNB", label: "BNB Chain" },
  { id: "SOL", label: "Solana" },
];

export default function CreateAgentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createAgent } = useAgents();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState<CustomAgent["strategy"]>("smart-money");
  const [riskLevel, setRiskLevel] = useState(50);
  const [chain, setChain] = useState<"ETH" | "BNB" | "SOL">("ETH");
  const [autoBuy, setAutoBuy] = useState(false);
  const [autoSell, setAutoSell] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Agent name is required");
      return;
    }
    createAgent({ name: name.trim(), strategy, riskLevel, chain, autoBuy, autoSell });
    toast.success(`Agent "${name}" created`);
    setName("");
    setStrategy("smart-money");
    setRiskLevel(50);
    setChain("ETH");
    setAutoBuy(false);
    setAutoSell(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/20 p-2">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-heading text-lg font-bold text-foreground">Create Agent</h2>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-muted-foreground">Agent Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Whale Hunter Alpha"
                  className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              {/* Strategy */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Strategy Type</label>
                <div className="space-y-2">
                  {strategies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStrategy(s.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        strategy === s.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/50 hover:border-border/80"
                      }`}
                    >
                      <p className="text-xs font-semibold text-foreground">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Level */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Risk Level</span>
                  <span className="font-mono text-foreground">{riskLevel}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Chain */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Chain</label>
                <div className="flex gap-2">
                  {chains.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setChain(c.id)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        chain === c.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                {[
                  { label: "Auto Buy", value: autoBuy, set: setAutoBuy, color: "bg-neon-green" },
                  { label: "Auto Sell", value: autoSell, set: setAutoSell, color: "bg-destructive" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <button
                      onClick={() => t.set(!t.value)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${t.value ? t.color : "bg-secondary"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                          t.value ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <span className="text-xs text-muted-foreground">{t.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreate}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Create Agent
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
