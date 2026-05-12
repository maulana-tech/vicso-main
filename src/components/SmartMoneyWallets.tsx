import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, TrendingUp, TrendingDown } from "lucide-react";

interface KnownWallet {
  name: string;
  address: string;
  chain: string;
  pnl30d: number;
  description: string;
}

const KNOWN_WALLETS: KnownWallet[] = [
  { name: "Vitalik.eth", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "eth", pnl30d: 2450000, description: "Ethereum co-founder" },
  { name: "Justin Sun", address: "0x176F3DAb24a159341c0509bB36B833E7fdd0a132", chain: "eth", pnl30d: -850000, description: "TRON founder" },
  { name: "Whale 0x28c6", address: "0x28C6c06298d514Db089934071355E5743bf21d60", chain: "eth", pnl30d: 5200000, description: "Binance Hot Wallet" },
  { name: "Jump Trading", address: "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621", chain: "eth", pnl30d: 12000000, description: "Institutional market maker" },
  { name: "Alameda Research", address: "0x84D34f4f83a87596Cd3FB6887cFf8F17Bf5A7B83", chain: "eth", pnl30d: -45000000, description: "Trading firm (defunct)" },
  { name: "Wintermute", address: "0x0000000000000000000000000000000000000000", chain: "eth", pnl30d: 8700000, description: "DeFi market maker" },
];

export default function SmartMoneyWallets() {
  const navigate = useNavigate();

  const formatPnl = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return `${v >= 0 ? "+" : "-"}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${v >= 0 ? "+" : "-"}$${(abs / 1e3).toFixed(0)}K`;
    return `${v >= 0 ? "+" : "-"}$${abs.toFixed(0)}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Users className="h-4 w-4 text-cyan-500" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Smart Money Wallets</h3>
      </div>
      <div className="space-y-2 max-h-[300px] sm:max-h-[350px] overflow-y-auto scrollbar-thin">
        {KNOWN_WALLETS.map((w, i) => (
          <motion.button
            key={w.address + i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/smart-money/${encodeURIComponent(w.address)}?chain=${w.chain}`)}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-2.5 sm:p-3 hover:bg-secondary transition-colors text-left"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0 ${w.pnl30d >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {w.pnl30d >= 0 ? <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-semibold text-foreground">{w.name}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">{w.description}</span>
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground">{w.address.slice(0, 6)}...{w.address.slice(-4)}</span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className={`text-[11px] sm:text-xs font-mono font-bold ${w.pnl30d >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatPnl(w.pnl30d)}
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">30d PnL</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
