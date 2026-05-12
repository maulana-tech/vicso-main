import { useState } from "react";
import { Loader2, AlertTriangle, CheckCircle, XCircle, ArrowRight, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SwapConfirmation } from "@/hooks/useSoDEXSwap";

interface TradeConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  quote: SwapConfirmation | null;
  isLoading?: boolean;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
}

export default function TradeConfirmModal({
  open,
  onClose,
  onConfirm,
  quote,
  isLoading = false,
  riskLevel = "MEDIUM",
}: TradeConfirmModalProps) {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleConfirm = async () => {
    setExecuting(true);
    setResult(null);

    try {
      const res = await onConfirm();
      setResult(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
          setResult(null);
        }, 2000);
      }
    } catch (e) {
      setResult({ success: false, error: (e as Error).message });
    } finally {
      setExecuting(false);
    }
  };

  const handleClose = () => {
    if (executing) return;
    setResult(null);
    onClose();
  };

  const getRiskColor = (level: "LOW" | "MEDIUM" | "HIGH") => {
    switch (level) {
      case "LOW": return "text-emerald-500";
      case "MEDIUM": return "text-yellow-500";
      case "HIGH": return "text-red-500";
    }
  };

  const getRiskBg = (level: "LOW" | "MEDIUM" | "HIGH") => {
    switch (level) {
      case "LOW": return "bg-emerald-500/10 border-emerald-500/30";
      case "MEDIUM": return "bg-yellow-500/10 border-yellow-500/30";
      case "HIGH": return "bg-red-500/10 border-red-500/30";
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result?.success ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : result && !result.success ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            {result?.success
              ? "Trade Executed!"
              : result && !result.success
              ? "Trade Failed"
              : "Confirm Trade"}
          </DialogTitle>
          <DialogDescription>
            {result?.success
              ? "Your trade has been submitted successfully."
              : result && !result.success
              ? result.error || "An error occurred"
              : "Please review and confirm your trade details."}
          </DialogDescription>
        </DialogHeader>

        {!result && quote && (
          <div className="space-y-4">
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">You Pay</span>
                <span className="font-medium">{quote.fromAmount} {quote.fromCoin}</span>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">You Receive</span>
                <span className="font-medium text-emerald-500">{quote.toAmount} {quote.toCoin}</span>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-mono">{quote.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (0.1%)</span>
                <span className="font-mono">{quote.fee} {quote.fromCoin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium">{quote.total} {quote.fromCoin}</span>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getRiskBg(riskLevel)}`}>
              <AlertTriangle className={`h-4 w-4 ${getRiskColor(riskLevel)}`} />
              <span className={`text-sm font-medium ${getRiskColor(riskLevel)}`}>
                {riskLevel === "LOW" ? "Low Risk" : riskLevel === "MEDIUM" ? "Medium Risk" : "High Risk - Caution Advised"}
              </span>
            </div>
          </div>
        )}

        {result?.success && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Transaction submitted to SoDEX</p>
          </div>
        )}

        {result && !result.success && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">{result.error}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!result && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={executing}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={executing} className="bg-emerald-500 hover:bg-emerald-500/90 text-black">
                {executing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Trade"
                )}
              </Button>
            </>
          )}
          {result?.success && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
          {result && !result.success && (
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
