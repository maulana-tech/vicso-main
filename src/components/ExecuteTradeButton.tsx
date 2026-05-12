import { useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TradeConfirmModal from "@/components/TradeConfirmModal";
import { useSoDEXSwap } from "@/hooks/useSoDEXSwap";
import { getSpotPrice, formatSymbol } from "@/lib/sodex";

interface ExecuteTradeButtonProps {
  symbol: string;
  fromCoin: string;
  toCoin: string;
  amount: string;
  side?: "BUY" | "SELL";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export default function ExecuteTradeButton({
  symbol,
  fromCoin,
  toCoin,
  amount,
  side = "BUY",
  riskLevel = "MEDIUM",
  disabled = false,
  size = "md",
  fullWidth = false,
}: ExecuteTradeButtonProps) {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { fetchQuote, executeSwap, quote, loading, error } = useSoDEXSwap();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const sizeConfig = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };

  const handleClick = async () => {
    if (!isConnected) {
      navigate("/settings");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) return;

    setModalOpen(true);
    await fetchQuote(0.5);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const result = await executeSwap();
    setConfirming(false);
    return result;
  };

  const confirmation = quote
    ? {
        symbol,
        side: side as "BUY" | "SELL",
        fromCoin: quote.fromCoin,
        toCoin: quote.toCoin,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        price: quote.price,
        fee: quote.fee,
        total: (parseFloat(quote.fromAmount) + parseFloat(quote.fee)).toFixed(8),
      }
    : null;

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || !amount || parseFloat(amount) <= 0}
        className={`${sizeConfig[size]} ${fullWidth ? "w-full" : ""} bg-neon-green hover:bg-neon-green/90 text-black font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </>
        ) : (
          <>
            <ArrowRight className={`h-4 w-4 ${size !== "sm" ? "mr-2" : "mr-1"}`} />
            {isConnected ? "Execute Trade" : "Connect Wallet"}
          </>
        )}
      </Button>

      {riskLevel === "HIGH" && !disabled && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          <span>High risk — trade with caution</span>
        </div>
      )}

      {error && (
        <div className="mt-1 text-[10px] text-destructive">{error}</div>
      )}

      <TradeConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        quote={confirmation}
        isLoading={confirming}
        riskLevel={riskLevel}
      />
    </>
  );
}
