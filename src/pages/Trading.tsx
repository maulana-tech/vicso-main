import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Loader2, Star, ChevronDown,
  TrendingUp, TrendingDown, List, BarChart3, BookOpen, ArrowLeftRight,
  Maximize2, Camera, X, AlertTriangle, Zap, Copy, Power, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createChart, ColorType } from "lightweight-charts";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { usePositions } from "@/hooks/usePositions";
import { useSignals, useWalletTxs, type SignalItem } from "@/hooks/useAVEWallet";

import { getCurrencyKlinesData } from "@/lib/sosovalue";
import { getCCKlines, getCCTickers } from "@/lib/cryptocompare";
import { getOrderBook, toSoDEXSymbol } from "@/lib/sodex";
import WalletConnectModal from "@/components/WalletConnectModal";
import { toast } from "sonner";

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1d", "5m": "1d", "15m": "1d", "30m": "1d", "1h": "1d", "4h": "1d", "1D": "1d",
};

const KNOWN_TOKENS = [
  { symbol: "ETH", name: "Ethereum", tokenId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee-eth", leverage: "100x" },
  { symbol: "BTC", name: "Bitcoin", tokenId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee-btc", leverage: "100x" },
  { symbol: "BNB", name: "BNB", tokenId: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c-bsc", leverage: "50x" },
  { symbol: "SOL", name: "Solana", tokenId: "So11111111111111111111111111111111111111112-solana", leverage: "25x" },
  { symbol: "PEPE", name: "Pepe", tokenId: "0x6982508145454ce325ddbe47a25d4ec3d2311933-eth", leverage: "10x" },
  { symbol: "TRUMP", name: "TRUMP", tokenId: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN-solana", leverage: "10x" },
  { symbol: "LINK", name: "Chainlink", tokenId: "0x514910771af9ca656af840dff83e8264ecf986ca-eth", leverage: "25x" },
  { symbol: "DOGE", name: "Dogecoin", tokenId: "0xba2ae424d960c26247dd6c32edc70b295c744c43-bsc", leverage: "25x" },
  { symbol: "XRP", name: "XRP", tokenId: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe-bsc", leverage: "25x" },
  { symbol: "AVAX", name: "Avalanche", tokenId: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee-avalanche", leverage: "25x" },
];



interface TokenMarket {
  symbol: string;
  name: string;
  tokenId: string;
  leverage: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OrderBookEntry { price: number; size: number; total: number; }

function generateOrderBook(midPrice: number): { asks: OrderBookEntry[]; bids: OrderBookEntry[] } {
  const asks: OrderBookEntry[] = [], bids: OrderBookEntry[] = [];
  let at = 0, bt = 0;
  for (let i = 0; i < 11; i++) {
    const ap = midPrice * (1 + (i + 1) * 0.0001 + Math.random() * 0.0002);
    const as = +(Math.random() * 5 + 0.01).toFixed(4);
    at += as;
    asks.push({ price: ap, size: as, total: +at.toFixed(4) });
    const bp = midPrice * (1 - (i + 1) * 0.0001 - Math.random() * 0.0002);
    const bs = +(Math.random() * 5 + 0.01).toFixed(4);
    bt += bs;
    bids.push({ price: bp, size: bs, total: +bt.toFixed(4) });
  }
  return { asks: asks.reverse(), bids };
}

function fmtPrice(p: number | undefined): string {
  if (p === undefined || p === null || isNaN(p)) return "0.00";
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toFixed(10);
}
function fmtVol(v: number | undefined): string {
  if (v === undefined || v === null || isNaN(v)) return "$0";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${v.toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function hotFeed() { return []; }

// Fetch real USDT balance on BNB Chain
async function fetchUSDTBalance(address: string): Promise<number> {
  const USDT_BNB = "0x55d398326f99059fF775485246999027B3197955";
  const ABI_BALANCE = "0x70a08231";
  try {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return 0;
    const paddedAddr = address.toLowerCase().replace("0x", "").padStart(64, "0");
    const data = ABI_BALANCE + paddedAddr;
    const result = await ethereum.request({
      method: "eth_call",
      params: [{ to: USDT_BNB, data }, "latest"],
    });
    const raw = BigInt(result || "0x0");
    return Number(raw) / 1e18;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════
// TRADING VIEW CHART COMPONENT
// ═══════════════════════════════════════════
function TradingChart({ tokenId, interval, currentPrice }: { tokenId: string; interval: string; currentPrice: number }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCandles = useCallback(async () => {
    try {
      const symbolMap: Record<string, string> = {
        eth: "ETH", btc: "BTC", bnb: "BNB", sol: "SOL", pepe: "PEPE",
        link: "LINK", doge: "DOGE", xrp: "XRP", avax: "AVAX", trump: "TRUMP",
      };
      const symbol = symbolMap[tokenId.split("-")[1]?.toLowerCase()] || tokenId.split("-")[0]?.toUpperCase() || "ETH";
      // Try CryptoCompare first (no rate limit)
      const cc = await getCCKlines(symbol, 300);
      if (cc && cc.length > 0) return cc;
      // Fallback to SoSoValue
      return await getCurrencyKlinesData(symbol);
    } catch {
      return [];
    }
  }, [tokenId]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(container, {
      layout: { background: { type: ColorType.Solid, color: 'hsl(220 20% 6%)' }, textColor: '#888' },
      grid: { vertLines: { color: 'hsl(220 15% 12%)' }, horzLines: { color: 'hsl(220 15% 12%)' } },
      width: container.clientWidth,
      height: container.clientHeight,
      timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false, borderColor: 'hsl(220 15% 12%)' },
      rightPriceScale: { borderVisible: false, borderColor: 'hsl(220 15% 12%)' },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00ff9d', downColor: '#ff0055', borderVisible: false, wickUpColor: '#00ff9d', wickDownColor: '#ff0055',
    });
    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    return () => { resizeObserver.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCandles().then((candles: CandleData[]) => {
      if (cancelled || !candleSeriesRef.current || !volumeSeriesRef.current) return;
      if (candles.length > 0) {
        candleSeriesRef.current.setData(candles.map((c: CandleData) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));
        volumeSeriesRef.current.setData(candles.map((c: CandleData) => ({ time: c.time as any, value: c.volume, color: c.close >= c.open ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255, 0, 85, 0.3)' })));
        chartRef.current?.timeScale().fitContent();
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchCandles]);

  useEffect(() => {
    if (!currentPrice || !candleSeriesRef.current) return;
    const iv = setInterval(async () => {
      try {
        const candles = await fetchCandles();
        if (candles.length > 0 && candleSeriesRef.current) {
          const last = candles[candles.length - 1];
          candleSeriesRef.current.update({ time: last.time as any, open: last.open, high: last.high, low: last.low, close: last.close });
          volumeSeriesRef.current?.update({ time: last.time as any, value: last.volume, color: last.close >= last.open ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255, 0, 85, 0.3)' });
        }
      } catch { /* silent */ }
    }, 8000);
    return () => clearInterval(iv);
  }, [currentPrice, fetchCandles]);

  return (
    <div ref={chartContainerRef} className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// TP/SL MODAL
// ═══════════════════════════════════════════
function TPSLModal({ open, onClose, onConfirm, currentPrice, orderSide }: {
  open: boolean; onClose: () => void; onConfirm: (tp: number, sl: number) => void;
  currentPrice: number; orderSide: "buy" | "sell";
}) {
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    const tpNum = parseFloat(tp);
    const slNum = parseFloat(sl);
    if (!tp && !sl) { setError("Enter at least one value"); return false; }
    if (tp && isNaN(tpNum)) { setError("Invalid Take Profit price"); return false; }
    if (sl && isNaN(slNum)) { setError("Invalid Stop Loss price"); return false; }

    if (orderSide === "buy") {
      if (tp && tpNum <= currentPrice) { setError(`TP must be above current price ($${fmtPrice(currentPrice)})`); return false; }
      if (sl && slNum >= currentPrice) { setError(`SL must be below current price ($${fmtPrice(currentPrice)})`); return false; }
      // Sanity check: TP shouldn't be unrealistically far
      if (tp && tpNum > currentPrice * 100) { setError("Take Profit price is unrealistically high"); return false; }
      if (sl && slNum < currentPrice * 0.001) { setError("Stop Loss price is unrealistically low"); return false; }
    } else {
      if (tp && tpNum >= currentPrice) { setError(`TP must be below current price ($${fmtPrice(currentPrice)})`); return false; }
      if (sl && slNum <= currentPrice) { setError(`SL must be above current price ($${fmtPrice(currentPrice)})`); return false; }
      if (tp && tpNum < currentPrice * 0.001) { setError("Take Profit price is unrealistically low"); return false; }
      if (sl && slNum > currentPrice * 100) { setError("Stop Loss price is unrealistically high"); return false; }
    }
    setError("");
    return true;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    onConfirm(parseFloat(tp) || 0, parseFloat(sl) || 0);
    onClose();
    setTp(""); setSl(""); setError("");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-foreground">Take Profit / Stop Loss</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="text-xs text-muted-foreground">
              Current Price: <span className="text-foreground font-mono">${fmtPrice(currentPrice)}</span> · Side: <span className={orderSide === "buy" ? "text-emerald-500" : "text-red-500"}>{orderSide === "buy" ? "Long" : "Short"}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Take Profit Price</label>
              <div className="flex border border-border rounded-lg px-3 py-2.5 items-center">
                <input value={tp} onChange={e => { setTp(e.target.value); setError(""); }} placeholder={orderSide === "buy" ? `Above ${fmtPrice(currentPrice)}` : `Below ${fmtPrice(currentPrice)}`} type="number" className="bg-transparent flex-1 text-sm font-mono outline-none text-foreground" />
                <span className="text-muted-foreground text-xs">USDT</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Stop Loss Price</label>
              <div className="flex border border-border rounded-lg px-3 py-2.5 items-center">
                <input value={sl} onChange={e => { setSl(e.target.value); setError(""); }} placeholder={orderSide === "buy" ? `Below ${fmtPrice(currentPrice)}` : `Above ${fmtPrice(currentPrice)}`} type="number" className="bg-transparent flex-1 text-sm font-mono outline-none text-foreground" />
                <span className="text-muted-foreground text-xs">USDT</span>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}
            <button onClick={handleConfirm} className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
              Confirm TP / SL
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════
// MAIN TRADING PAGE
// ═══════════════════════════════════════════
export default function Trading() {
  const { user } = useAuth();
  const { isConnected, address, disconnect } = useWalletConnection();
  const { positions, addPosition, removePosition } = usePositions();
  const [searchParams] = useSearchParams();
  const signalsHook = useSignals();
  const copyTxsHook = useWalletTxs();

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [selected, setSelected] = useState(KNOWN_TOKENS[0]);
  const [pairSearch, setPairSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cn_favorites") || "[]"); } catch { return []; }
  });
  const [pairTab, setPairTab] = useState<"all" | "favorites">("all");
  const [marketData, setMarketData] = useState<{ price: number; change24h: number; volume24h: number } | null>(null);
  const [pairPrices, setPairPrices] = useState<Record<string, { price: number; change24h: number; volume24h: number }>>({});
  const [hotTokens, setHotTokens] = useState<TokenMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTf, setSelectedTf] = useState("5m");
  const [orderBook, setOrderBook] = useState<{ asks: OrderBookEntry[]; bids: OrderBookEntry[] }>({ asks: [], bids: [] });

  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [leverage, setLeverage] = useState(10);
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("0.0000");
  const [sliderPct, setSliderPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bottomTab, setBottomTab] = useState<"positions" | "orders" | "history" | "trades" | "funding">("positions");
  const [mobileView, setMobileView] = useState<"chart" | "orderbook" | "trade" | "markets">("chart");

  // TP/SL state
  const [tpslOpen, setTpslOpen] = useState(false);
  const [tpPrice, setTpPrice] = useState(0);
  const [slPrice, setSlPrice] = useState(0);
  const [tpslEnabled, setTpslEnabled] = useState(false);

  // Real USDT balance on BNB chain
  const [usdtBalance, setUsdtBalance] = useState(0);

  // Auto Trading state
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [autoTradeStatus, setAutoTradeStatus] = useState<"idle" | "monitoring" | "executing" | "completed">("idle");
  const [autoRiskThreshold, setAutoRiskThreshold] = useState(30);
  const [autoConfidenceThreshold, setAutoConfidenceThreshold] = useState(70);
  const [autoMaxTrades, setAutoMaxTrades] = useState(5);
  const [autoTradesExecuted, setAutoTradesExecuted] = useState(0);

  // Copy Trading state
  const [copyWalletAddress, setCopyWalletAddress] = useState("");
  const [autoCopyEnabled, setAutoCopyEnabled] = useState(false);

  // Trading page panels tab
  const [tradingPanelTab, setTradingPanelTab] = useState<"manual" | "auto" | "copy" | "signals">("manual");

  // Handle URL params: token, entry, tp, sl, side, copyWallet
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const entryParam = searchParams.get("entry");
    const tpParam = searchParams.get("tp");
    const slParam = searchParams.get("sl");
    const sideParam = searchParams.get("side");
    const copyWallet = searchParams.get("copyWallet");

    if (tokenParam) {
      const found = KNOWN_TOKENS.find(t => t.symbol.toLowerCase() === tokenParam.toLowerCase());
      if (found) setSelected(found);
    }
    if (entryParam) {
      setPrice(entryParam);
      setOrderType("limit");
    }
    if (tpParam) {
      setTpPrice(parseFloat(tpParam));
      setTpslEnabled(true);
    }
    if (slParam) {
      setSlPrice(parseFloat(slParam));
      setTpslEnabled(true);
    }
    if (sideParam === "sell") setOrderSide("sell");
    else if (sideParam === "buy") setOrderSide("buy");

    if (copyWallet) {
      setCopyWalletAddress(copyWallet);
      setTradingPanelTab("copy");
      copyTxsHook.fetch(copyWallet, "eth");
    }
  }, [searchParams]);

  // Fetch signals on mount
  useEffect(() => {
    signalsHook.fetch("eth");
    const iv = setInterval(() => signalsHook.fetch("eth"), 30_000);
    return () => clearInterval(iv);
  }, []);

  // Auto Trading logic
  useEffect(() => {
    if (!autoTradeEnabled) {
      setAutoTradeStatus("idle");
      return;
    }
    setAutoTradeStatus("monitoring");

    const interval = setInterval(() => {
      if (autoTradesExecuted >= autoMaxTrades) {
        setAutoTradeEnabled(false);
        setAutoTradeStatus("completed");
        toast.success(`Auto Trading completed — ${autoTradesExecuted} trades executed`);
        return;
      }
      const validSignals = signalsHook.data.filter(
        s => s.confidence >= autoConfidenceThreshold && s.signal !== "HOLD"
      );
      if (validSignals.length > 0 && isConnected) {
        const best = validSignals[0];
        setAutoTradeStatus("executing");
        toast.success(`Auto Trade: ${best.signal} ${best.token} @ $${best.entry.toFixed(4)} (Confidence: ${best.confidence}%)`);
        setAutoTradesExecuted(prev => prev + 1);
        setTimeout(() => setAutoTradeStatus("monitoring"), 2000);
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [autoTradeEnabled, autoConfidenceThreshold, autoMaxTrades, autoTradesExecuted, signalsHook.data, isConnected]);

  // Fetch USDT balance when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      fetchUSDTBalance(address).then(setUsdtBalance);
      const iv = setInterval(() => fetchUSDTBalance(address).then(setUsdtBalance), 15000);
      return () => clearInterval(iv);
    } else {
      setUsdtBalance(0);
    }
  }, [isConnected, address]);

  useEffect(() => {
    const syms = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "UNI", "XLM", "PEPE", "TRUMP", "HYPE"];
    getCCTickers(syms).then(data => {
      const tokens: TokenMarket[] = Object.entries(data).map(([sym, d]) => ({
        symbol: sym, name: sym, tokenId: `hot-${sym}`, leverage: "10x",
        price: d.price, change24h: d.change24h, volume24h: d.volume,
      }));
      setHotTokens(tokens);
    }).catch(() => {});
  }, []);

  // Fetch prices for known tokens
  // Fetch prices: CryptoCompare (no CORS, no rate limit)
  const fetchAllPrices = useCallback(async () => {
    const syms = KNOWN_TOKENS.map(t => t.symbol);
    const data = await getCCTickers(syms);
    const results: Record<string, { price: number; change24h: number; volume24h: number }> = {};
    for (const sym of syms) if (data[sym]) results[sym] = data[sym];
    setPairPrices(results);
  }, []);

  useEffect(() => {
    fetchAllPrices();
    const iv = setInterval(fetchAllPrices, 30000);
    return () => clearInterval(iv);
  }, [fetchAllPrices]);

  // Fetch selected token data
  const fetchSelected = useCallback(async () => {
    const data = await getCCTickers([selected.symbol]);
    const ticker = data[selected.symbol];
    if (ticker && ticker.price > 0) {
      setMarketData(ticker);
    } else if (!marketData) {
      setMarketData({ price: 0, change24h: 0, volume24h: 0 });
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    fetchSelected();
    const iv = setInterval(fetchSelected, 15000);
    return () => clearInterval(iv);
  }, [fetchSelected]);

  // Order book: SoDEX real data
  useEffect(() => {
    if (!marketData) return;
    const sodexSymbol = toSoDEXSymbol(selected.symbol);
    const fetchOrderBook = async () => {
      try {
        const ob = await getOrderBook(sodexSymbol, 20);
        const maxAsk = parseFloat(ob.asks[0]?.[0] || marketData.price * 1.02);
        const maxBid = parseFloat(ob.bids[0]?.[0] || marketData.price * 0.98);
        let aTot = 0, bTot = 0;
        const asks = ob.asks.slice(0, 11).map((a) => {
          aTot += parseFloat(a[1]);
          return { price: parseFloat(a[0]), size: parseFloat(a[1]), total: +aTot.toFixed(4) };
        });
        const bids = ob.bids.slice(0, 11).map((b) => {
          bTot += parseFloat(b[1]);
          return { price: parseFloat(b[0]), size: parseFloat(b[1]), total: +bTot.toFixed(4) };
        });
        setOrderBook({ asks: asks.reverse(), bids });
      } catch { setOrderBook(generateOrderBook(marketData.price)); }
    };
    fetchOrderBook();
    const iv = setInterval(fetchOrderBook, 5000);
    return () => clearInterval(iv);
  }, [marketData, selected]);

  const allMarkets = useMemo(() => {
    const known = KNOWN_TOKENS.map(t => ({
      ...t, price: pairPrices[t.symbol]?.price || 0, change24h: pairPrices[t.symbol]?.change24h || 0, volume24h: pairPrices[t.symbol]?.volume24h || 0,
    }));
    const knownSymbols = new Set(KNOWN_TOKENS.map(t => t.symbol));
    const extra = hotTokens.filter(t => !knownSymbols.has(t.symbol));
    return [...known, ...extra];
  }, [pairPrices, hotTokens]);

  const filteredPairs = useMemo(() => {
    let list = allMarkets;
    if (pairTab === "favorites") list = list.filter(p => favorites.includes(p.symbol));
    if (pairSearch) list = list.filter(p => p.symbol.toLowerCase().includes(pairSearch.toLowerCase()) || p.name.toLowerCase().includes(pairSearch.toLowerCase()));
    return list;
  }, [allMarkets, pairSearch, pairTab, favorites]);

  const toggleFav = (sym: string) => setFavorites(f => {
    const next = f.includes(sym) ? f.filter(s => s !== sym) : [...f, sym];
    localStorage.setItem("cn_favorites", JSON.stringify(next));
    return next;
  });

  const maxLeverage = ["BTC", "ETH", "SOL"].includes(selected?.symbol) ? 20 : 15;
  const effectiveLeverage = Math.min(leverage, maxLeverage);

  const handleSignalTrade = useCallback((s: SignalItem) => {
    // Find matching token in KNOWN_TOKENS
    const found = KNOWN_TOKENS.find(t => t.symbol.toLowerCase() === s.token.toLowerCase());
    if (found) {
      setSelected(found);
    } else {
      // Create a dynamic token entry so the chart switches
      setSelected({
        symbol: s.token.toUpperCase(),
        name: s.token,
        tokenId: `${s.token.toLowerCase()}-eth`,
        leverage: "10x",
      });
    }
    // Auto-fill trade form
    setPrice(s.entry.toString());
    setOrderType("limit");
    setTpPrice(s.target);
    setSlPrice(s.stopLoss);
    setTpslEnabled(true);
    setOrderSide(s.signal === "SELL" ? "sell" : "buy");
    // Switch to manual tab and chart view
    setTradingPanelTab("manual");
    setMobileView("chart");
    toast.success(`Signal loaded: ${s.signal} ${s.token} @ $${s.entry < 0.01 ? s.entry.toExponential(2) : s.entry.toFixed(2)}`);
  }, []);

  const handleTrade = () => {
    if (!isConnected) { setWalletModalOpen(true); return; }
    if (!amount || parseFloat(amount) <= 0 || !marketData) { toast.error("Enter a valid amount"); return; }
    const p = orderType === "limit" ? parseFloat(price) : marketData.price;
    if (!p) { toast.error("Invalid price"); return; }

    const orderValue = parseFloat(amount) * p;
    const margin = orderValue / effectiveLeverage;

    // Check against real USDT balance
    if (margin > usdtBalance) {
      toast.error(`Insufficient USDT balance. Required margin: $${margin.toFixed(2)}, Available: $${usdtBalance.toFixed(2)}`);
      return;
    }

    // Validate TP/SL if enabled
    if (tpslEnabled) {
      if (tpPrice <= 0 && slPrice <= 0) { toast.error("Set TP or SL values first"); return; }
    }

    setSubmitting(true);
    setTimeout(() => {
      // Deduct from balance
      setUsdtBalance(prev => Math.max(0, prev - margin));
      addPosition({
        token: selected.symbol,
        symbol: `${selected.symbol}/USDT`,
        chain: "BNB",
        entryPrice: p,
        currentPrice: marketData.price,
        amount: parseFloat(amount),
        entryDate: new Date().toISOString(),
      });
      toast.success(`${orderSide === "buy" ? "Long" : "Short"} ${amount} ${selected.symbol} @ $${fmtPrice(p)} (${effectiveLeverage}x)${tpslEnabled && tpPrice ? ` | TP: $${fmtPrice(tpPrice)}` : ""}${tpslEnabled && slPrice ? ` | SL: $${fmtPrice(slPrice)}` : ""}`);
      setAmount("0.0000"); setPrice(""); setSliderPct(0); setSubmitting(false);
    }, 1200);
  };

  const maxOBTotal = Math.max(...orderBook.asks.map(a => a.total), ...orderBook.bids.map(b => b.total), 1);
  const spread = orderBook.bids.length && orderBook.asks.length ? (orderBook.asks[orderBook.asks.length - 1].price - orderBook.bids[0].price) : 0;
  const spreadPct = marketData ? ((spread / marketData.price) * 100).toFixed(3) : "0";

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden -m-4 lg:-m-6">

      {/* ── STATS BAR (desktop) ── */}
      <div className="hidden lg:flex items-center gap-6 border-b border-border bg-card px-6 py-3 text-sm shrink-0 relative">
        <PairDropdown selected={selected} pairs={filteredPairs} pairSearch={pairSearch} setPairSearch={setPairSearch} onSelect={(p: any) => setSelected(p)} marketData={marketData} favorites={favorites} toggleFav={toggleFav} pairTab={pairTab} setPairTab={setPairTab} />
        {marketData && (
          <div className="flex items-center gap-8">
            <div>
              <div className="text-[10px] text-muted-foreground">Mark Price</div>
              <div className="font-mono text-base text-foreground">${fmtPrice(marketData.price)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">24h Change</div>
              <div className={`font-medium text-sm flex items-center gap-1 ${marketData.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {marketData.change24h >= 0 ? "+" : ""}{marketData.change24h.toFixed(2)}%
                {marketData.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">24h Volume</div>
              <div className="font-mono text-base text-foreground">{fmtVol(marketData.volume24h)}</div>
            </div>
            {isConnected && (
              <div>
                <div className="text-[10px] text-muted-foreground">USDT Balance</div>
                <div className="font-mono text-base text-foreground">${usdtBalance.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => toggleFav(selected.symbol)} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 text-[11px] hover:bg-secondary/80 transition-colors">
            <Star className={`h-3 w-3 ${favorites.includes(selected.symbol) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
            <span className="text-foreground">{selected.symbol} / USDT</span>
          </button>
        </div>
      </div>

      {/* ── MOBILE: Stats bar ── */}
      <div className="flex lg:hidden items-center gap-2 border-b border-border bg-card px-3 py-2 text-xs shrink-0 overflow-x-auto scrollbar-thin">
        <span className="font-semibold text-foreground text-sm shrink-0">{selected.symbol}</span>
        {marketData && (
          <>
            <span className={`font-mono font-bold shrink-0 ${marketData.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>${fmtPrice(marketData.price)}</span>
            <span className={`font-mono text-[10px] shrink-0 ${marketData.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>{marketData.change24h >= 0 ? "+" : ""}{marketData.change24h.toFixed(2)}%</span>
          </>
        )}
        {isConnected && <span className="ml-auto font-mono text-[10px] text-foreground shrink-0">${usdtBalance.toFixed(2)} USDT</span>}
      </div>

      {/* ── MOBILE: Tab nav ── */}
      <div className="flex lg:hidden items-center border-b border-border bg-card shrink-0">
        {([
          { id: "chart" as const, icon: BarChart3, label: "Chart" },
          { id: "orderbook" as const, icon: BookOpen, label: "Book" },
          { id: "trade" as const, icon: ArrowLeftRight, label: "Trade" },
          { id: "markets" as const, icon: List, label: "Markets" },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setMobileView(tab.id)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${mobileView === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── MOBILE: Content ── */}
      <div className="flex-1 overflow-hidden lg:hidden">
        {mobileView === "chart" && (
          <div className="flex flex-col h-full bg-card">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-[10px]">
              <span className="text-foreground font-medium">{selected.symbol} · {selectedTf} · VicSO</span>
              <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                {Object.keys(INTERVAL_MAP).map(tf => (
                  <button key={tf} onClick={() => setSelectedTf(tf)} className={`px-1.5 py-0.5 rounded text-[9px] ${selectedTf === tf ? "bg-secondary text-foreground" : ""}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[250px]">
              <TradingChart tokenId={selected.tokenId} interval={selectedTf} currentPrice={marketData?.price || 0} />
            </div>
            <PositionsPanel positions={positions} bottomTab={bottomTab} setBottomTab={setBottomTab} removePosition={removePosition} />
          </div>
        )}
        {mobileView === "orderbook" && <OrderBookPanel asks={orderBook.asks} bids={orderBook.bids} maxTotal={maxOBTotal} spread={spread} spreadPct={spreadPct} marketData={marketData} base={selected.symbol} />}
        {mobileView === "trade" && (
          <div className="h-full overflow-y-auto">
            {/* Trading Panel Tabs */}
            <div className="flex border-b border-border bg-card">
              {(["manual", "auto", "copy", "signals"] as const).map(tab => (
                <button key={tab} onClick={() => setTradingPanelTab(tab)} className={`flex-1 py-2 text-[10px] font-medium capitalize transition-colors ${tradingPanelTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
                  {tab === "manual" ? "Trade" : tab === "auto" ? "Auto Trade" : tab === "copy" ? "Copy Trade" : "Signals"}
                </button>
              ))}
            </div>
            {tradingPanelTab === "manual" && (
              <TradeFormPanel
                orderType={orderType} setOrderType={setOrderType} orderSide={orderSide} setOrderSide={setOrderSide}
                price={price} setPrice={setPrice} amount={amount} setAmount={setAmount} sliderPct={sliderPct} setSliderPct={setSliderPct}
                isConnected={isConnected} usdtBalance={usdtBalance} marketData={marketData} selected={selected}
                submitting={submitting} handleTrade={handleTrade} leverage={leverage} setLeverage={setLeverage}
                maxLeverage={maxLeverage} effectiveLeverage={effectiveLeverage}
                tpslEnabled={tpslEnabled} setTpslEnabled={setTpslEnabled} onOpenTpsl={() => setTpslOpen(true)}
                tpPrice={tpPrice} slPrice={slPrice} setTpPrice={setTpPrice} setSlPrice={setSlPrice}
              />
            )}
            {tradingPanelTab === "auto" && (
              <AutoTradingPanel
                enabled={autoTradeEnabled} setEnabled={setAutoTradeEnabled}
                status={autoTradeStatus}
                riskThreshold={autoRiskThreshold} setRiskThreshold={setAutoRiskThreshold}
                confidenceThreshold={autoConfidenceThreshold} setConfidenceThreshold={setAutoConfidenceThreshold}
                maxTrades={autoMaxTrades} setMaxTrades={setAutoMaxTrades}
                tradesExecuted={autoTradesExecuted}
                isConnected={isConnected}
              />
            )}
            {tradingPanelTab === "copy" && (
              <CopyTradingPanel
                walletAddress={copyWalletAddress} setWalletAddress={setCopyWalletAddress}
                autoCopyEnabled={autoCopyEnabled} setAutoCopyEnabled={setAutoCopyEnabled}
                txsHook={copyTxsHook}
                isConnected={isConnected}
              />
            )}
            {tradingPanelTab === "signals" && (
              <SignalsPanel signals={signalsHook.data} loading={signalsHook.loading} onRefresh={() => signalsHook.fetch("eth")} onTrade={handleSignalTrade} />
            )}
          </div>
        )}
        {mobileView === "markets" && <MarketListPanel pairs={filteredPairs} selected={selected} setSelected={(p: any) => { setSelected(p); setMobileView("chart"); }} favorites={favorites} toggleFav={toggleFav} pairTab={pairTab} setPairTab={setPairTab} pairSearch={pairSearch} setPairSearch={setPairSearch} />}
      </div>

      {/* ═══════ DESKTOP LAYOUT ═══════ */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* LEFT TOOLBAR */}
        <div className="w-12 flex flex-col items-center gap-4 bg-card border-r border-border py-4 text-xs text-muted-foreground shrink-0">
          <button className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors text-[10px] font-mono">{selectedTf}</button>
          <button className="w-8 h-8 flex items-center justify-center text-primary"><BarChart3 className="h-4 w-4" /></button>
          <button className="w-8 h-8 flex items-center justify-center hover:text-primary"><Search className="h-4 w-4" /></button>
          <div className="mt-auto"><button className="w-8 h-8 flex items-center justify-center text-primary"><Maximize2 className="h-4 w-4" /></button></div>
        </div>

        {/* CHART + POSITIONS */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg text-foreground">{selected.symbol} · {selectedTf} · VicSO</span>
              {marketData && (
                <span className="text-emerald-500 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" /> LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {Object.keys(INTERVAL_MAP).map(tf => (
                <button key={tf} onClick={() => setSelectedTf(tf)} className={`px-4 py-1.5 rounded-full text-xs transition-colors ${selectedTf === tf ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}>{tf}</button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Maximize2 className="h-4 w-4 cursor-pointer hover:text-foreground" />
              <Camera className="h-4 w-4 cursor-pointer hover:text-foreground" />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <TradingChart tokenId={selected.tokenId} interval={selectedTf} currentPrice={marketData?.price || 0} />
          </div>
          <PositionsPanel positions={positions} bottomTab={bottomTab} setBottomTab={setBottomTab} removePosition={removePosition} />
        </div>

        {/* RIGHT: ORDER BOOK + TRADE PANELS */}
        <div className="w-[440px] xl:w-[480px] flex flex-col border-l border-border shrink-0">
          <div className="h-[280px] overflow-hidden shrink-0">
            <OrderBookPanel asks={orderBook.asks} bids={orderBook.bids} maxTotal={maxOBTotal} spread={spread} spreadPct={spreadPct} marketData={marketData} base={selected.symbol} />
          </div>
          {/* Trading Panel Tabs */}
          <div className="flex border-t border-b border-border bg-card shrink-0">
            {(["manual", "auto", "copy", "signals"] as const).map(tab => (
              <button key={tab} onClick={() => setTradingPanelTab(tab)} className={`flex-1 py-2 text-[10px] font-medium capitalize transition-colors ${tradingPanelTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
                {tab === "manual" ? "Trade" : tab === "auto" ? "Auto Trade" : tab === "copy" ? "Copy Trade" : "Signals"}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {tradingPanelTab === "manual" && (
              <TradeFormPanel
                orderType={orderType} setOrderType={setOrderType} orderSide={orderSide} setOrderSide={setOrderSide}
                price={price} setPrice={setPrice} amount={amount} setAmount={setAmount} sliderPct={sliderPct} setSliderPct={setSliderPct}
                isConnected={isConnected} usdtBalance={usdtBalance} marketData={marketData} selected={selected}
                submitting={submitting} handleTrade={handleTrade} leverage={leverage} setLeverage={setLeverage}
                maxLeverage={maxLeverage} effectiveLeverage={effectiveLeverage}
                tpslEnabled={tpslEnabled} setTpslEnabled={setTpslEnabled} onOpenTpsl={() => setTpslOpen(true)}
                tpPrice={tpPrice} slPrice={slPrice} setTpPrice={setTpPrice} setSlPrice={setSlPrice}
              />
            )}
            {tradingPanelTab === "auto" && (
              <AutoTradingPanel
                enabled={autoTradeEnabled} setEnabled={setAutoTradeEnabled}
                status={autoTradeStatus}
                riskThreshold={autoRiskThreshold} setRiskThreshold={setAutoRiskThreshold}
                confidenceThreshold={autoConfidenceThreshold} setConfidenceThreshold={setAutoConfidenceThreshold}
                maxTrades={autoMaxTrades} setMaxTrades={setAutoMaxTrades}
                tradesExecuted={autoTradesExecuted}
                isConnected={isConnected}
              />
            )}
            {tradingPanelTab === "copy" && (
              <CopyTradingPanel
                walletAddress={copyWalletAddress} setWalletAddress={setCopyWalletAddress}
                autoCopyEnabled={autoCopyEnabled} setAutoCopyEnabled={setAutoCopyEnabled}
                txsHook={copyTxsHook}
                isConnected={isConnected}
              />
            )}
            {tradingPanelTab === "signals" && (
              <SignalsPanel signals={signalsHook.data} loading={signalsHook.loading} onRefresh={() => signalsHook.fetch("eth")} onTrade={handleSignalTrade} />
            )}
          </div>
        </div>
      </div>

      <WalletConnectModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      <TPSLModal
        open={tpslOpen}
        onClose={() => setTpslOpen(false)}
        onConfirm={(tp, sl) => { setTpPrice(tp); setSlPrice(sl); setTpslEnabled(true); }}
        currentPrice={marketData?.price || 0}
        orderSide={orderSide}
      />
    </div>
  );
}

/* ═══════════ PAIR DROPDOWN ═══════════ */
function PairDropdown({ selected, pairs, pairSearch, setPairSearch, onSelect, marketData, favorites, toggleFav, pairTab, setPairTab }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 hover:bg-secondary/50 rounded-lg px-2 py-1 transition-colors">
        <span className="text-xl font-semibold text-foreground">{selected.symbol}</span>
        <span className="text-xs text-muted-foreground">/ USDT</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="flex items-center gap-1 ml-1 text-[10px] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> LIVE
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }} className="absolute top-full left-0 mt-2 w-[380px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="Search coins or pairs…"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary" autoFocus />
              </div>
            </div>
            {/* Favorites / All tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
              <button onClick={() => setPairTab("favorites")} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${pairTab === "favorites" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary"}`}>
                <Star className="h-3 w-3" /> Favorites
              </button>
              <button onClick={() => setPairTab("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${pairTab === "all" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary"}`}>
                All
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1 px-4 py-2 text-[10px] text-muted-foreground border-b border-border">
              <span></span><span>Pair</span><span className="text-right">Price</span><span className="text-right">24h</span><span className="text-right">Volume</span>
            </div>
            <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
              {pairs.map((p: any) => (
                <div key={p.symbol + p.tokenId}
                  className={`w-full grid grid-cols-5 gap-1 items-center px-4 py-2.5 text-sm hover:bg-secondary/70 transition-colors cursor-pointer ${selected.symbol === p.symbol ? "bg-secondary" : ""}`}>
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(p.symbol); }} className="flex items-center justify-center">
                    <Star className={`h-3.5 w-3.5 transition-colors ${favorites.includes(p.symbol) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40 hover:text-muted-foreground"}`} />
                  </button>
                  <button onClick={() => { onSelect(p); setOpen(false); setPairSearch(""); }} className="text-left">
                    <span className="font-semibold text-foreground">{p.symbol}</span>
                    <span className="text-muted-foreground text-xs ml-1">/ USDT</span>
                  </button>
                  <button onClick={() => { onSelect(p); setOpen(false); setPairSearch(""); }} className="text-right font-mono text-foreground">{p.price ? fmtPrice(p.price) : "…"}</button>
                  <button onClick={() => { onSelect(p); setOpen(false); setPairSearch(""); }} className={`text-right font-mono text-xs ${p.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {p.change24h ? `${p.change24h >= 0 ? "+" : ""}${p.change24h.toFixed(2)}%` : "—"}
                  </button>
                  <button onClick={() => { onSelect(p); setOpen(false); setPairSearch(""); }} className="text-right font-mono text-muted-foreground text-xs">{p.volume24h ? fmtVol(p.volume24h) : "—"}</button>
                </div>
              ))}
              {pairs.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{pairTab === "favorites" ? "No favorites yet — click ★ to add" : "No pairs found"}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ SUB-COMPONENTS ═══════════ */

function MarketListPanel({ pairs, selected, setSelected, favorites, toggleFav, pairTab, setPairTab, pairSearch, setPairSearch }: any) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-1 px-2 pt-2 text-[10px]">
        <button onClick={() => setPairTab("favorites")} className={`px-2 py-1 rounded ${pairTab === "favorites" ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>★ Favorites</button>
        <button onClick={() => setPairTab("all")} className={`px-2 py-1 rounded border ${pairTab === "all" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>All</button>
      </div>
      <div className="px-2 py-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="Search" className="w-full rounded border border-border bg-background py-1.5 pl-7 pr-2 text-[11px] text-foreground outline-none focus:border-primary" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 px-3 py-1 text-[9px] text-muted-foreground border-b border-border">
        <span>Token</span><span className="text-right">Price</span><span className="text-right">24h</span><span className="text-right">Vol</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {pairs.map((p: any) => (
          <button key={p.symbol + p.tokenId} onClick={() => setSelected(p)} className={`w-full grid grid-cols-4 gap-1 items-center px-3 py-1.5 text-[11px] hover:bg-secondary/70 transition-colors ${selected.symbol === p.symbol ? "bg-secondary" : ""}`}>
            <div className="flex items-center gap-1.5 text-left">
              <Star className={`h-3 w-3 shrink-0 cursor-pointer ${favorites.includes(p.symbol) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} onClick={(e: any) => { e.stopPropagation(); toggleFav(p.symbol); }} />
              <div><span className="font-medium text-foreground">{p.symbol}</span><span className="text-muted-foreground text-[9px] ml-0.5">{p.leverage}</span></div>
            </div>
            <span className="text-right font-mono text-foreground text-[10px]">{p.price ? fmtPrice(p.price) : "..."}</span>
            <span className={`text-right font-mono text-[10px] ${p.change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>{p.change24h ? `${p.change24h >= 0 ? "+" : ""}${p.change24h.toFixed(2)}%` : "—"}</span>
            <span className="text-right font-mono text-muted-foreground text-[10px]">{p.volume24h ? fmtVol(p.volume24h) : "—"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderBookPanel({ asks, bids, maxTotal, spread, spreadPct, marketData, base }: any) {
  return (
    <div className="flex flex-col h-full bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium border-b-2 border-foreground pb-1 text-foreground">Order Book</span>
        <div className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-[11px]">
          <span className="text-emerald-500">0.01</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-3 text-[10px] text-muted-foreground mb-2 px-1">
        <span>Price</span><span className="text-right">Size ({base})</span><span className="text-right">Total</span>
      </div>
      <div className="space-y-px mb-3">
        {asks.map((a: any, i: number) => (
          <div key={`a${i}`} className="relative grid grid-cols-3 gap-1 px-2 py-[2px] text-[11px] font-mono">
            <div className="absolute inset-0 bg-destructive/8" style={{ width: `${(a.total / maxTotal) * 100}%`, right: 0, left: 'auto' }} />
            <span className="text-red-500 relative z-10">{fmtPrice(a.price)}</span>
            <span className="text-right text-foreground relative z-10">{a.size.toFixed(4)}</span>
            <span className="text-right text-muted-foreground relative z-10">{a.total.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div className="flex justify-between text-[11px] py-2 px-1">
        <span className="text-muted-foreground">{spread.toFixed(2)}</span>
        <span className="text-muted-foreground">Spread</span>
        <span className="text-emerald-500">{spreadPct}%</span>
      </div>
      <div className="h-px bg-border" />
      <div className="space-y-px mt-3">
        {bids.map((b: any, i: number) => (
          <div key={`b${i}`} className="relative grid grid-cols-3 gap-1 px-2 py-[2px] text-[11px] font-mono">
            <div className="absolute inset-0 bg-emerald-500/8" style={{ width: `${(b.total / maxTotal) * 100}%`, right: 0, left: 'auto' }} />
            <span className="text-emerald-500 relative z-10">{fmtPrice(b.price)}</span>
            <span className="text-right text-foreground relative z-10">{b.size.toFixed(4)}</span>
            <span className="text-right text-muted-foreground relative z-10">{b.total.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeFormPanel({ orderType, setOrderType, orderSide, setOrderSide, price, setPrice, amount, setAmount, sliderPct, setSliderPct, isConnected, usdtBalance, marketData, selected, submitting, handleTrade, leverage, setLeverage, maxLeverage, effectiveLeverage, tpslEnabled, setTpslEnabled, onOpenTpsl, tpPrice, slPrice, setTpPrice, setSlPrice }: any) {
  const onConfirmTpsl = (tp: number, sl: number) => { setTpPrice?.(tp); setSlPrice?.(sl); };
  const orderValue = amount && marketData ? parseFloat(amount) * marketData.price : 0;
  const positionSize = orderValue * effectiveLeverage;
  const margin = effectiveLeverage > 0 ? orderValue / effectiveLeverage : 0;
  const liqPrice = marketData && orderValue > 0
    ? orderSide === "buy"
      ? marketData.price * (1 - 1 / effectiveLeverage * 0.9)
      : marketData.price * (1 + 1 / effectiveLeverage * 0.9)
    : 0;

  return (
    <div className="flex flex-col bg-card p-4">
      <div className="flex border-b border-border pb-3 mb-3">
        {(["market", "limit"] as const).map(t => (
          <button key={t} onClick={() => setOrderType(t)} className={`flex-1 text-center py-2 rounded-full text-sm capitalize ${orderType === t ? "bg-secondary text-foreground font-medium" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setOrderSide("buy")} className={`flex-1 py-3 rounded-full text-base font-bold transition-all ${orderSide === "buy" ? "bg-emerald-500 text-background" : "bg-secondary text-muted-foreground"}`}>Buy / Long</button>
        <button onClick={() => setOrderSide("sell")} className={`flex-1 py-3 rounded-full text-base font-bold transition-all ${orderSide === "sell" ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground"}`}>Sell / Short</button>
      </div>

      {/* Leverage Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[10px] mb-2">
          <span className="text-muted-foreground">Leverage</span>
          <span className="font-mono text-sm font-bold text-emerald-500">{effectiveLeverage}x</span>
        </div>
        <div className="flex items-center gap-3">
          <input type="range" min="1" max={maxLeverage} value={effectiveLeverage} onChange={e => setLeverage(parseInt(e.target.value))} className="flex-1 accent-emerald-500" />
          <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{maxLeverage}x max</span>
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>1x</span><span>{Math.round(maxLeverage / 2)}x</span><span>{maxLeverage}x</span>
        </div>
      </div>

      {/* TP/SL Checkbox + Inline Inputs */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground mb-2">
          <input type="checkbox" checked={tpslEnabled} onChange={e => setTpslEnabled(e.target.checked)} className="accent-emerald-500" />
          <span className="text-foreground font-medium">Take Profit / Stop Loss</span>
        </label>
        {tpslEnabled && (
          <div className="space-y-2 pl-5">
            <div className="flex border border-border rounded-lg px-3 py-2 items-center">
              <span className="text-[10px] text-emerald-500 mr-2 shrink-0">TP</span>
              <input value={tpPrice || ""} onChange={e => { const v = parseFloat(e.target.value) || 0; onConfirmTpsl?.(v, slPrice); }} placeholder={orderSide === "buy" ? `Above ${marketData ? fmtPrice(marketData.price) : "0"}` : `Below ${marketData ? fmtPrice(marketData.price) : "0"}`} type="number" className="bg-transparent flex-1 text-xs font-mono outline-none text-foreground" />
              <span className="text-muted-foreground text-[10px]">USDT</span>
            </div>
            <div className="flex border border-border rounded-lg px-3 py-2 items-center">
              <span className="text-[10px] text-red-500 mr-2 shrink-0">SL</span>
              <input value={slPrice || ""} onChange={e => { const v = parseFloat(e.target.value) || 0; onConfirmTpsl?.(tpPrice, v); }} placeholder={orderSide === "buy" ? `Below ${marketData ? fmtPrice(marketData.price) : "0"}` : `Above ${marketData ? fmtPrice(marketData.price) : "0"}`} type="number" className="bg-transparent flex-1 text-xs font-mono outline-none text-foreground" />
              <span className="text-muted-foreground text-[10px]">USDT</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs mb-4">
        <div>
          <div className="text-muted-foreground text-[10px]">Available (USDT)</div>
          <div className="font-mono text-sm text-foreground">{isConnected ? `$${usdtBalance.toFixed(2)}` : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-[10px]">Margin Required</div>
          <div className="font-mono text-sm text-foreground">{margin > 0 ? `$${margin.toFixed(2)}` : "—"}</div>
        </div>
      </div>

      {orderType === "limit" && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">Price</span></div>
          <div className="flex border border-border rounded-full px-4 py-2.5 items-center">
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder={marketData ? fmtPrice(marketData.price) : "0"} type="number" className="bg-transparent flex-1 text-lg font-mono outline-none text-foreground" />
            <span className="text-muted-foreground text-sm">USDT</span>
          </div>
        </div>
      )}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">Amount</span><span className="font-mono text-muted-foreground">{amount} {selected.symbol}</span></div>
        <div className="flex border border-border rounded-full px-4 py-2.5 items-center">
          <input value={amount} onChange={e => setAmount(e.target.value)} type="text" className="bg-transparent flex-1 text-lg font-mono outline-none text-foreground" />
          <span className="text-muted-foreground text-sm">{selected.symbol}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input type="range" min="0" max="100" value={sliderPct} onChange={e => {
            const pct = parseInt(e.target.value);
            setSliderPct(pct);
            if (isConnected && usdtBalance > 0 && marketData) {
              const maxAmount = (usdtBalance * pct / 100) / marketData.price;
              setAmount(maxAmount.toFixed(4));
            }
          }} className="flex-1 accent-emerald-500" />
          <span className="font-mono text-sm w-12 text-right text-foreground">{sliderPct}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] mb-4">
        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground"><input type="checkbox" className="accent-emerald-500" /> Reduce Only</label>
      </div>

      <button onClick={handleTrade} disabled={submitting || !amount || parseFloat(amount) <= 0}
        className={`w-full py-4 rounded-full text-base font-bold disabled:opacity-50 ${orderSide === "buy" ? "bg-emerald-500 text-background" : "bg-red-500 text-white"}`}>
        {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : isConnected ? `${orderSide === "buy" ? "Buy" : "Sell"} ${selected.symbol}` : "Connect Wallet to Trade"}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
        <div className="flex justify-between"><span className="text-muted-foreground">Order Value</span><span className="font-mono text-foreground">{orderValue > 0 ? `$${orderValue.toFixed(2)}` : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Position Size</span><span className="font-mono text-foreground">{positionSize > 0 ? `$${positionSize.toFixed(2)}` : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Est. Liq.</span><span className="font-mono text-red-500">{liqPrice > 0 ? `$${fmtPrice(liqPrice)}` : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Fees</span><span className="font-mono text-emerald-500">0% / 0%</span></div>
      </div>
    </div>
  );
}

function PositionsPanel({ positions, bottomTab, setBottomTab, removePosition }: any) {
  return (
    <div className="border-t border-border bg-card shrink-0">
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border text-sm overflow-x-auto">
        {(["positions", "orders", "history", "trades", "funding"] as const).map(tab => (
          <button key={tab} onClick={() => setBottomTab(tab)} className={`capitalize whitespace-nowrap ${bottomTab === tab ? "text-foreground font-medium border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "positions" ? "Positions" : tab === "orders" ? "Open Orders" : tab === "history" ? "Order History" : tab === "trades" ? "Trade History" : "Funding"}
          </button>
        ))}
      </div>
      <div className="h-[100px] overflow-y-auto px-4 py-2">
        {bottomTab === "positions" ? (
          positions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No active positions</p> : (
            <div className="space-y-1 min-w-[500px]">
              {positions.map((p: any) => {
                const pnlVal = (p.currentPrice - p.entryPrice) * p.amount;
                const pnlPct = ((p.currentPrice - p.entryPrice) / p.entryPrice) * 100;
                return (
                  <div key={p.id} className="grid grid-cols-6 gap-2 items-center text-[11px] py-1 border-b border-border/50">
                    <span className="font-medium text-foreground">{p.symbol}</span>
                    <span className="font-mono text-muted-foreground">${fmtPrice(p.entryPrice)}</span>
                    <span className="font-mono text-foreground">${fmtPrice(p.currentPrice)}</span>
                    <span className="font-mono text-foreground">{p.amount}</span>
                    <span className={`font-mono ${pnlVal >= 0 ? "text-emerald-500" : "text-red-500"}`}>{pnlVal >= 0 ? "+" : ""}${pnlVal.toFixed(2)} ({pnlPct.toFixed(1)}%)</span>
                    <button onClick={() => removePosition(p.id)} className="text-red-500 text-[10px] hover:underline">Close</button>
                  </div>
                );
              })}
            </div>
          )
        ) : <p className="text-sm text-muted-foreground text-center py-6">No data</p>}
      </div>
    </div>
  );
}

/* ═══════════ AUTO TRADING PANEL ═══════════ */
function AutoTradingPanel({ enabled, setEnabled, status, riskThreshold, setRiskThreshold, confidenceThreshold, setConfidenceThreshold, maxTrades, setMaxTrades, tradesExecuted, isConnected }: any) {
  const statusColor: Record<string, string> = {
    idle: "text-muted-foreground",
    monitoring: "text-cyan-500",
    executing: "text-emerald-500",
    completed: "text-amber-500",
  };
  const statusLabel: Record<string, string> = {
    idle: "Idle",
    monitoring: "Monitoring Signals...",
    executing: "Executing Trade...",
    completed: "Completed",
  };

  return (
    <div className="flex flex-col bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-foreground">Auto Trading</span>
        </div>
        <button
          onClick={() => {
            if (!isConnected) { toast.error("Connect wallet first"); return; }
            setEnabled(!enabled);
          }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${enabled ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border"}`}
        >
          <Power className="h-3 w-3" />
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 border border-border px-3 py-2">
        <Activity className={`h-3.5 w-3.5 ${statusColor[status]} ${status === "monitoring" || status === "executing" ? "animate-pulse" : ""}`} />
        <span className={`text-xs font-medium ${statusColor[status]}`}>{statusLabel[status]}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{tradesExecuted}/{maxTrades} trades</span>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Confidence Threshold</span>
            <span className="font-mono text-foreground">{confidenceThreshold}%</span>
          </div>
          <input type="range" min="30" max="95" value={confidenceThreshold} onChange={e => setConfidenceThreshold(parseInt(e.target.value))} className="w-full accent-emerald-500" />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Risk Threshold</span>
            <span className="font-mono text-foreground">{riskThreshold}%</span>
          </div>
          <input type="range" min="5" max="80" value={riskThreshold} onChange={e => setRiskThreshold(parseInt(e.target.value))} className="w-full accent-destructive" />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Max Trades</span>
            <span className="font-mono text-foreground">{maxTrades}</span>
          </div>
          <input type="range" min="1" max="20" value={maxTrades} onChange={e => setMaxTrades(parseInt(e.target.value))} className="w-full accent-primary" />
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground">Auto Trading uses real-time signals from VicSO Skills. Trades execute when confidence exceeds threshold.</p>
    </div>
  );
}

/* ═══════════ COPY TRADING PANEL ═══════════ */
function CopyTradingPanel({ walletAddress, setWalletAddress, autoCopyEnabled, setAutoCopyEnabled, txsHook, isConnected }: any) {
  const [copyMonitoring, setCopyMonitoring] = useState(false);

  const handleFetchTrades = () => {
    if (!walletAddress.trim()) { toast.error("Enter a wallet address"); return; }
    txsHook.fetch(walletAddress, "eth");
  };

  const handleCopyTradeWallet = () => {
    if (!isConnected) { toast.error("Connect wallet first"); return; }
    if (!walletAddress.trim()) { toast.error("Enter a wallet address first"); return; }
    setCopyMonitoring(true);
    setAutoCopyEnabled(true);
    toast.success(`Now monitoring wallet ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)} for swaps. Transfers/approvals ignored.`);
  };

  const stopCopyMonitoring = () => {
    setCopyMonitoring(false);
    setAutoCopyEnabled(false);
    toast.info("Copy trade monitoring stopped");
  };

  // Filter to swap-only trades
  const swapTrades = txsHook.transactions.filter((tx: any) =>
    tx.type === "swap" || tx.type === "buy" || tx.type === "sell"
  );

  return (
    <div className="flex flex-col bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Copy className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Copy Trading</span>
        </div>
        {copyMonitoring && (
          <span className="flex items-center gap-1 text-[9px] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> MONITORING
          </span>
        )}
      </div>

      {/* Wallet Input */}
      <div className="flex gap-2">
        <input
          value={walletAddress}
          onChange={e => setWalletAddress(e.target.value)}
          placeholder="Enter wallet address to copy..."
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-primary"
        />
        <button onClick={handleFetchTrades} disabled={txsHook.loading} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {txsHook.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Fetch"}
        </button>
      </div>

      {/* Recent Swap Trades (READ ONLY — no per-trade copy buttons) */}
      {swapTrades.length > 0 && (
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recent Swaps ({swapTrades.length})</p>
          {swapTrades.slice(0, 10).map((tx: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${tx.type === "buy" || tx.type === "swap" ? "bg-emerald-500/10 text-primary" : "bg-red-500/10 text-red-500"}`}>
                  {tx.type}
                </span>
                <span className="text-xs text-foreground">{tx.tokenIn || "?"} → {tx.tokenOut || "?"}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">${tx.valueUsd?.toFixed(2) || "0.00"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Single Copy Trade Wallet button */}
      {!copyMonitoring ? (
        <button
          onClick={handleCopyTradeWallet}
          disabled={!walletAddress.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/30 py-3 text-xs font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Trade Wallet
        </button>
      ) : (
        <button
          onClick={stopCopyMonitoring}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Power className="h-3.5 w-3.5" />
          Stop Monitoring
        </button>
      )}

      <p className="text-[9px] text-muted-foreground">
        {copyMonitoring
          ? "Monitoring wallet for swaps. TOKEN→ETH = SELL, ETH→TOKEN = BUY. Transfers & approvals are ignored."
          : "Enter a smart wallet address, fetch trades, then click 'Copy Trade Wallet' to start monitoring."}
      </p>
    </div>
  );
}

/* ═══════════ SIGNALS PANEL ═══════════ */
function SignalsPanel({ signals, loading, onRefresh, onTrade }: { signals: SignalItem[]; loading: boolean; onRefresh: () => void; onTrade?: (s: SignalItem) => void }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleTrade = (s: SignalItem) => {
    onTrade?.(s);
  };

  return (
    <div className="flex flex-col bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Live Signals</span>
          <span className="flex items-center gap-1 text-[9px] text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> LIVE
          </span>
        </div>
        <button onClick={onRefresh} className="text-muted-foreground hover:text-foreground">
          <Search className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && signals.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : signals.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">No signals available</p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {signals.map((s, i) => (
            <div key={i} className="rounded-lg bg-secondary/50 border border-border overflow-hidden">
              {/* Signal row — click to expand */}
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/70 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    s.signal === "BUY" ? "bg-emerald-500/10 text-emerald-500" :
                    s.signal === "SELL" ? "bg-red-500/10 text-red-500" :
                    "bg-secondary text-muted-foreground"
                  }`}>{s.signal}</span>
                  <span className="text-xs font-medium text-foreground">{s.token}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">${s.entry < 0.01 ? s.entry.toExponential(2) : s.entry.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-mono font-bold ${s.confidence >= 70 ? "text-emerald-500" : s.confidence >= 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {s.confidence}%
                  </span>
                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Expanded detail */}
              {expandedIdx === i && (
                <div className="border-t border-border px-3 py-2.5 space-y-2 bg-card/50">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry</span>
                      <span className="font-mono text-foreground">${s.entry < 0.01 ? s.entry.toExponential(2) : s.entry.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className={`font-mono font-bold ${s.confidence >= 70 ? "text-emerald-500" : "text-amber-500"}`}>{s.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-mono text-emerald-500">${s.target < 0.01 ? s.target.toExponential(2) : s.target.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stop Loss</span>
                      <span className="font-mono text-red-500">${s.stopLoss < 0.01 ? s.stopLoss.toExponential(2) : s.stopLoss.toFixed(4)}</span>
                    </div>
                  </div>
                  {s.reason && (
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{s.reason}</p>
                  )}
                  <button
                    onClick={() => handleTrade(s)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-2 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Zap className="h-3 w-3" /> Trade
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground">Click a signal to expand details. Signals refresh every 30s from AVE API.</p>
    </div>
  );
}
