import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Users } from "lucide-react";

interface WhaleActivity {
  id: string;
  wallet: string;
  token: string;
  tokenSymbol: string;
  action: "buy" | "sell";
  amount: number;
  usdValue: number;
  timestamp: string;
  isUnusual: boolean;
  chain: string;
}

export default function WhaleActivityTable({ data }: { data: WhaleActivity[] }) {
  const formatUsd = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

  if (data.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No whale activity data available</p>
        <p className="text-xs text-muted-foreground mt-1">Whale tracking requires an on-chain data feed integration</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">Live Whale Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-left font-medium">Wallet</th>
              <th className="px-5 py-3 text-left font-medium">Token</th>
              <th className="px-5 py-3 text-left font-medium">Action</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
              <th className="px-5 py-3 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{item.wallet}</span>
                    {item.isUnusual && <AlertTriangle className="h-3.5 w-3.5 text-neon-orange" />}
                  </div>
                </td>
                <td className="px-5 py-3.5"><span className="font-medium text-foreground">{item.tokenSymbol}</span></td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${item.action === "buy" ? "bg-neon-green/10 text-neon-green" : "bg-destructive/10 text-destructive"}`}>
                    {item.action === "buy" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {item.action.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-xs text-foreground">{formatUsd(item.usdValue)}</td>
                <td className="px-5 py-3.5 text-right text-xs text-muted-foreground">{item.timestamp}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
