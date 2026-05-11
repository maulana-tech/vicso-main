import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ExternalLink, History, Clock, Trash2, AlertTriangle, CheckCircle, XCircle, Loader2, X, LineChart, FileText, Bell, BellOff, Copy } from "lucide-react";
import RiskMeter from "@/components/dashboard/RiskMeter";
import AIInsightPanel from "@/components/AIInsightPanel";
import LiveTokenDashboard from "@/components/LiveTokenDashboard";
import PreloadedTokens from "@/components/PreloadedTokens";
import { useAIAnalysis, type AIAnalysis } from "@/hooks/useTokenAPI";
import { useTokenHistory } from "@/hooks/useTokenHistory";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function isContractAddress(input: string): boolean {
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input) && !input.match(/^[A-Z]{2,10}$/)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(input)) return true;
  return false;
}

export default function TokenAnalyzer() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("token") || "");
  const [activeTab, setActiveTab] = useState<"analyze" | "history">(searchParams.get("tab") === "history" ? "history" : "analyze");
  const { analysis, loading, error, analyze } = useAIAnalysis();
  const { history, addToHistory, removeFromHistory, clearHistory } = useTokenHistory();
  const { addAlert, isAlertEnabled, alerts, toggleAlert } = useAlerts();
  const { user } = useAuth();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setQuery(tokenParam);
      handleAnalyze(tokenParam);
      setActiveTab("analyze");
    }
  }, [searchParams]);

  useEffect(() => {
    if (analysis?.tokenData) {
      addToHistory({
        tokenName: analysis.tokenData.name,
        tokenSymbol: analysis.tokenData.symbol,
        price: analysis.tokenData.price ?? 0,
        riskScore: analysis.tokenData.riskScore,
        verdict: analysis.verdict,
      });
      if (user) {
        addAlert("token", analysis.tokenData.symbol, analysis.tokenData.name);
      }
    }
  }, [analysis]);

  const handleAnalyze = (q?: string) => {
    const searchQuery = (q || query).trim();
    if (!searchQuery) return;
    analyze(searchQuery, false);
  };

  const handleTokenSelect = (symbol: string) => {
    setQuery(symbol);
    handleAnalyze(symbol);
    setActiveTab("analyze");
  };

  const statusColor = (score: number) => {
    if (score <= 35) return "text-neon-green border-neon-green/30 bg-neon-green/5";
    if (score <= 65) return "text-neon-orange border-neon-orange/30 bg-neon-orange/5";
    return "text-destructive border-destructive/30 bg-destructive/5";
  };

  const statusLabel = (score: number) => {
    if (score <= 35) return "SAFE";
    if (score <= 65) return "WARNING";
    return "DANGER";
  };

  const statusIcon = (score: number) => {
    if (score <= 35) return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-neon-green" />;
    if (score <= 65) return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-neon-orange" />;
    return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />;
  };

  const inputHint = (() => {
    const q = query.trim();
    if (!q) return null;
    if (isContractAddress(q)) return "📋 Contract address detected";
    if (q.length >= 2 && q.length <= 10 && q === q.toUpperCase()) return "🔤 Token symbol";
    return null;
  })();

  const tokenAlertId = analysis?.tokenData
    ? alerts.find((a) => a.target_identifier === analysis.tokenData!.symbol && a.alert_type === "token")
    : null;
  const tokenAlertEnabled = analysis?.tokenData ? isAlertEnabled(analysis.tokenData.symbol, "token") : false;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Token Analyzer</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">AI-powered live token analysis — enter symbol or contract address</p>
      </div>

      <div className="flex rounded-lg border border-border bg-secondary text-xs w-fit">
        {(["analyze", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={"px-3 sm:px-4 py-2 font-medium capitalize transition-colors " + (activeTab === tab ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground")}>
            {tab === "analyze" ? <><Search className="h-3 w-3 inline mr-1.5" />Analyze</> : <><History className="h-3 w-3 inline mr-1.5" />History ({history.length})</>}
          </button>
        ))}
      </div>

      {activeTab === "analyze" ? (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAnalyze()} placeholder="Token symbol (ETH) or address (0x...)" className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary font-mono" />
              </div>
              <button onClick={() => handleAnalyze()} disabled={loading} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</> : "Analyze"}
              </button>
            </div>
            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <p className="text-[10px] text-muted-foreground">Powered by AVE API — live market data & AI risk assessment</p>
              {inputHint && <span className="text-[10px] text-primary">{inputHint}</span>}
            </div>
          </motion.div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:p-4 text-xs sm:text-sm text-destructive">{error}</div>
          )}

          {(analysis || loading) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <LiveTokenDashboard data={analysis?.tokenData || null} loading={loading} />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {analysis && analysis.tokenData && (
                  <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-sm font-semibold text-foreground">{analysis.tokenData.name}</h3>
                        <span className="rounded bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{analysis.tokenData.symbol}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {user && (
                          <button
                            onClick={() => {
                              if (tokenAlertId) {
                                toggleAlert((tokenAlertId as any).id, tokenAlertEnabled);
                              } else {
                                addAlert("token", analysis.tokenData!.symbol, analysis.tokenData!.name);
                              }
                              toast.success(tokenAlertEnabled ? "Alert disabled" : "Alert enabled");
                            }}
                            className={`p-1.5 rounded transition-colors ${tokenAlertEnabled ? "text-neon-green" : "text-muted-foreground"}`}
                            title={tokenAlertEnabled ? "Alerts ON — click to disable" : "Alerts OFF — click to enable"}
                          >
                            {tokenAlertEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                          </button>
                        )}
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5 ${statusColor(analysis.tokenData.riskScore)}`}>
                          {statusIcon(analysis.tokenData.riskScore)} {statusLabel(analysis.tokenData.riskScore)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <RiskMeter score={analysis.tokenData.riskScore} />
                    </div>
                    {/* Contract Address Display */}
                    {analysis.tokenData.address && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
                        <span className="text-[10px] text-muted-foreground shrink-0">Contract:</span>
                        <span className="text-[11px] font-mono text-foreground truncate max-w-[180px] sm:max-w-[260px]">{analysis.tokenData.address}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(analysis.tokenData!.address); toast.success("Contract address copied!"); }}
                          className="shrink-0 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title="Copy address"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      {analysis.tokenData.address && (
                        <button onClick={() => {
                          const chain = analysis.tokenData!.chain || "bsc";
                          window.open(`https://ave.ai/token/${analysis.tokenData!.address}-${chain}?from=Home`, "_blank");
                        }} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Ave.ai
                        </button>
                      )}
                      <button onClick={() => {
                        const addr = analysis.tokenData!.address || analysis.tokenData!.symbol;
                        const chain = analysis.tokenData!.chain || "bsc";
                        window.open(`https://ave.ai/token/${addr}-${chain}?from=Home`, "_blank");
                      }} className="flex items-center gap-1.5 text-xs text-neon-green hover:underline">
                        <LineChart className="h-3 w-3" /> Chart
                      </button>
                    </div>
                  </div>
                )}
                <AIInsightPanel analysis={analysis} loading={loading} />
              </div>
            </motion.div>
          )}

          <PreloadedTokens onSelectToken={handleTokenSelect} />
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Analysis History</h3>
            {history.length > 0 && <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3" /> Clear All</button>}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No tokens analyzed yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 p-3 hover:bg-secondary transition-colors">
                  <button onClick={() => { setQuery(entry.tokenSymbol); analyze(entry.tokenSymbol, false); setActiveTab("analyze"); }} className="flex items-center gap-3 text-left flex-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusColor(entry.riskScore)}`}>{statusLabel(entry.riskScore)}</span>
                    <div>
                      <span className="text-sm font-semibold text-foreground">{entry.tokenName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{entry.tokenSymbol}</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="font-mono text-muted-foreground">Risk: {entry.riskScore}</span>
                    <div className="hidden sm:flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{new Date(entry.analyzedAt).toLocaleDateString()}</div>
                    <button onClick={() => removeFromHistory(entry.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Remove">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
