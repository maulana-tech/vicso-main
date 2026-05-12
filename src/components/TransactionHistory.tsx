import { useState } from "react";
import { ArrowRightLeft, CheckCircle2, Clock, XCircle, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactionTracker, type Transaction } from "@/hooks/useTransactionTracker";

function TransactionStatusBadge({ status }: { status: Transaction["status"] }) {
  const config = {
    PENDING: { icon: Clock, color: "text-yellow-500 bg-yellow-500/10", label: "Pending" },
    CONFIRMING: { icon: Loader2, color: "text-blue-500 bg-blue-500/10", label: "Confirming" },
    CONFIRMED: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10", label: "Confirmed" },
    FAILED: { icon: XCircle, color: "text-red-500 bg-red-500/10", label: "Failed" },
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${color}`}>
      <Icon className={`h-3 w-3 ${status === "CONFIRMING" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function TransactionItem({ tx, onRemove }: { tx: Transaction; onRemove: () => void }) {
  const formatAmount = (amount: string, decimals = 4) => {
    const num = parseFloat(amount);
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://etherscan.io/tx/${txHash}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{tx.fromToken}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-xs font-medium text-emerald-500">{tx.toToken}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{formatAmount(tx.fromAmount)} → {formatAmount(tx.toAmount)}</span>
            <span>•</span>
            <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TransactionStatusBadge status={tx.status} />
        {tx.txHash && (
          <a
            href={getExplorerUrl(tx.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {tx.status === "CONFIRMED" || tx.status === "FAILED" ? (
          <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

interface TransactionHistoryProps {
  maxItems?: number;
  showHeader?: boolean;
}

export default function TransactionHistory({
  maxItems = 10,
  showHeader = true,
}: TransactionHistoryProps) {
  const { transactions, clearHistory } = useTransactionTracker();
  const [expanded, setExpanded] = useState(false);

  const displayTxs = expanded ? transactions : transactions.slice(0, maxItems);

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <ArrowRightLeft className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No transactions yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Execute a trade to see history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transaction History
              <span className="text-[10px] text-muted-foreground">({transactions.length})</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {transactions.length > maxItems && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px]"
                >
                  {expanded ? "Show Less" : `Show All (${transactions.length})`}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-[10px] text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          <AnimatePresence>
            {displayTxs.map(tx => (
              <TransactionItem
                key={tx.id}
                tx={tx}
                onRemove={() => {}}
              />
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
