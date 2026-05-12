import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Search, Wallet, Bell, X } from "lucide-react";

export default function QuickActionBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: Search, label: "Analyze Token", onClick: () => { navigate("/analyzer"); setOpen(false); } },
    { icon: Wallet, label: "Search Wallet", onClick: () => { navigate("/smart-money"); setOpen(false); } },
    { icon: Bell, label: "View Alerts", onClick: () => { navigate("/alerts"); setOpen(false); } },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200"
      >
        {open ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </button>

      {/* Action menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-40 flex flex-col gap-2"
          >
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={action.onClick}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/90 px-4 py-3 text-sm font-medium text-foreground shadow-lg hover:bg-secondary transition-colors"
              >
                <action.icon className="h-4 w-4 text-primary" />
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
