import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Bell, RefreshCw, AlertTriangle, Zap } from "lucide-react";
import { useAISignals, type TokenSignal, type SignalAlert } from "@/hooks/useAISignals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignalWidgetProps {
  defaultSymbol?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function SignalBadge({ severity }: { severity: SignalAlert["severity"] }) {
  const config = {
    LOW: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", label: "Low" },
    MEDIUM: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", label: "Medium" },
    HIGH: { color: "bg-orange-500/10 text-orange-500 border-orange-500/30", label: "High" },
    CRITICAL: { color: "bg-red-500/10 text-red-500 border-red-500/30", label: "Critical" },
  };
  const { color, label } = config[severity];
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>
      {label}
    </span>
  );
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon?: React.ElementType }) {
  const getColor = (s: number) => {
    if (s >= 70) return "bg-emerald-500";
    if (s >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </span>
        <span className="font-mono font-medium">{score}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function RecommendationCard({ signal }: { signal: TokenSignal }) {
  const Icon = signal.recommendation === "BUY" ? TrendingUp : signal.recommendation === "SELL" ? TrendingDown : Minus;
  const config = {
    BUY: {
      icon: TrendingUp,
      bg: "bg-emerald-500/5 border border-emerald-500/20",
      text: "text-emerald-500",
      label: "BUY",
    },
    SELL: {
      icon: TrendingDown,
      bg: "bg-red-500/5 border border-red-500/20",
      text: "text-red-500",
      label: "SELL",
    },
    HOLD: {
      icon: Minus,
      bg: "bg-yellow-500/5 border border-yellow-500/20",
      text: "text-yellow-500",
      label: "HOLD",
    },
  };
  const { bg, text, label } = config[signal.recommendation];
  const RecommendationIcon = config[signal.recommendation].icon;

  return (
    <div className={`p-4 rounded-lg border ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RecommendationIcon className={`h-5 w-5 ${text}`} />
          <span className={`font-heading font-bold text-lg ${text}`}>{label}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono">{signal.confidence}%</div>
          <div className="text-xs text-muted-foreground">Confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <ScoreBar label="Momentum" score={signal.momentumScore} />
        <ScoreBar label="Volume" score={signal.volumeScore} />
        <ScoreBar label="Whale" score={signal.whaleScore} />
        <ScoreBar label="Risk" score={signal.riskScore} />
      </div>

      {signal.signals.filter(s => s.recommendation).map(rec => (
        <div key={rec.id} className="mt-3 pt-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Trade Plan</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {rec.recommendation?.entryPrice && (
              <div>
                <span className="text-muted-foreground">Entry: </span>
                <span className="font-mono">${rec.recommendation.entryPrice.toFixed(2)}</span>
              </div>
            )}
            {rec.recommendation?.targetPrice && (
              <div>
                <span className="text-muted-foreground">Target: </span>
                <span className="font-mono text-emerald-500">${rec.recommendation.targetPrice.toFixed(2)}</span>
              </div>
            )}
            {rec.recommendation?.stopLoss && (
              <div>
                <span className="text-muted-foreground">Stop: </span>
                <span className="font-mono text-red-500">${rec.recommendation.stopLoss.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalAlertItem({ alert }: { alert: SignalAlert }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {alert.type === "WHALE_ACTIVITY" && <Zap className="h-4 w-4 text-emerald-500" />}
        {alert.type === "VOLUME_SPIKE" && <TrendingUp className="h-4 w-4 text-yellow-500" />}
        {alert.type === "MOMENTUM" && <TrendingUp className="h-4 w-4 text-cyan-500" />}
        {alert.type === "NEWS_HOT" && <Bell className="h-4 w-4 text-primary" />}
        {alert.type === "OPPORTUNITY" && <AlertTriangle className="h-4 w-4 text-purple-500" />}
        {alert.type === "RISK_CHANGE" && <AlertTriangle className="h-4 w-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{alert.title}</span>
          <SignalBadge severity={alert.severity} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="font-mono">{alert.symbol}</span>
          <span>•</span>
          <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
          <span>•</span>
          <span className="capitalize">{alert.source}</span>
        </div>
      </div>
    </div>
  );
}

export default function SignalWidget({
  defaultSymbol = "BTC",
  autoRefresh = false,
  refreshInterval = 60000,
}: SignalWidgetProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [inputValue, setInputValue] = useState(defaultSymbol);
  const [signal, setSignal] = useState<TokenSignal | null>(null);

  const { signals, loading, error, hasApiKey, analyzeToken, getMarketSignals, clearSignals } = useAISignals();

  useEffect(() => {
    analyzeToken(symbol);
    getMarketSignals();
  }, [symbol, analyzeToken, getMarketSignals]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      analyzeToken(symbol);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, symbol, refreshInterval, analyzeToken]);

  const handleAnalyze = () => {
    if (inputValue.trim()) {
      setSymbol(inputValue.trim().toUpperCase());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            AI Signal Center
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => analyzeToken(symbol)}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSignals}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Enter token symbol..."
            className="flex-1 px-3 py-1.5 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button size="sm" onClick={handleAnalyze} disabled={loading}>
            Analyze
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {!hasApiKey && !loading && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-500 font-medium">API Key Required</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please add VITE_SOSOVALUE_API_KEY to your .env file to enable AI signals.
            </p>
          </div>
        )}

        {signal && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {signal.symbol} Analysis
            </div>
            <RecommendationCard signal={signal} />
          </div>
        )}

        {signals.length > 0 && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Bell className="h-3 w-3" />
              Active Signals ({signals.length})
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {signals.slice(0, 10).map((alert) => (
                <SignalAlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {!signal && !loading && signals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter a token symbol to analyze</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
