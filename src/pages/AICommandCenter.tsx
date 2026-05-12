import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Loader2, Sparkles, Search, Wallet, TrendingUp, Shield, Zap, BarChart3, History, Trash2, Clock, LayoutGrid } from "lucide-react";
import { useAIAnalysis } from "@/hooks/useTokenAPI";
import { useNavigate } from "react-router-dom";
import SignalWidget from "@/components/SignalWidget";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  verdict?: string;
  tokenSymbol?: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

const HISTORY_KEY = "cn_ai_chat_history";

function loadHistory(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(sessions: ChatSession[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, 50)));
}

const quickActions = [
  { icon: TrendingUp, label: "What's trending?", query: "What tokens are trending right now?" },
  { icon: Search, label: "Analyze ETH", query: "Analyze ETH" },
  { icon: Wallet, label: "Track whales", query: "What are whales buying?" },
  { icon: Shield, label: "Portfolio risk", query: "Show me low-risk tokens with high potential" },
  { icon: Zap, label: "Should I buy SOL?", query: "Should I buy SOL?" },
  { icon: BarChart3, label: "Best opportunities", query: "What are the best investment opportunities right now?" },
];

export default function AICommandCenter() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "signals" | "history">("chat");
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(loadHistory);
  const { analysis, loading, error, analyze } = useAIAnalysis();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (analysis) {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: analysis.conversational || "Analysis complete.",
        verdict: analysis.verdict,
        tokenSymbol: analysis.tokenData?.symbol,
        timestamp: Date.now(),
      };
      setMessages(prev => {
        const next = [...prev, assistantMsg];
        // Save to history
        if (next.length >= 2) {
          const firstUserMsg = next.find(m => m.role === "user");
          const session: ChatSession = {
            id: crypto.randomUUID(),
            title: firstUserMsg?.content.slice(0, 60) || "Chat",
            messages: next,
            timestamp: Date.now(),
          };
          setChatHistory(prev => {
            const updated = [session, ...prev.filter(s => s.title !== session.title)].slice(0, 50);
            saveHistory(updated);
            return updated;
          });
        }
        return next;
      });
    }
  }, [analysis]);

  useEffect(() => {
    if (error) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ Error: ${error}`, timestamp: Date.now() }]);
    }
  }, [error]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: q, timestamp: Date.now() }]);
    setInput("");
    analyze(q, true);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setActiveTab("chat");
  };

  const clearHistory = () => {
    setChatHistory([]);
    saveHistory([]);
  };

  const removeSession = (id: string) => {
    setChatHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveHistory(updated);
      return updated;
    });
  };

  const verdictColor = (v?: string) => {
    if (v === "BUY") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    if (v === "AVOID") return "bg-red-500/10 text-red-500 border-red-500/30";
    return "bg-amber-500/10 text-amber-500 border-amber-500/30";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">Visco AI Command Center</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Powered by AVE Skills — Ask anything about crypto trading</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-border bg-secondary text-xs">
            <button onClick={() => setActiveTab("chat")} className={`px-3 py-1.5 font-medium transition-colors ${activeTab === "chat" ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground"}`}>
              Chat
            </button>
            <button onClick={() => setActiveTab("signals")} className={`flex items-center gap-1 px-3 py-1.5 font-medium transition-colors ${activeTab === "signals" ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground"}`}>
              <Zap className="h-3 w-3" /> Signals
            </button>
            <button onClick={() => setActiveTab("history")} className={`flex items-center gap-1 px-3 py-1.5 font-medium transition-colors ${activeTab === "history" ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground"}`}>
              <History className="h-3 w-3" /> History ({chatHistory.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "signals" ? (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <SignalWidget defaultSymbol="BTC" autoRefresh={true} refreshInterval={60000} />
          </div>
        </div>
      ) : activeTab === "history" ? (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-semibold text-foreground">Chat History</h3>
            {chatHistory.length > 0 && (
              <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <Trash2 className="h-3 w-3" /> Clear All
              </button>
            )}
          </div>
          {chatHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No chat history yet</p>
          ) : (
            chatHistory.map(session => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => loadSession(session)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(session.timestamp).toLocaleString()}
                    <span>· {session.messages.length} messages</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeSession(session.id); }} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-16 space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-2 max-w-lg">
                  <h2 className="font-heading text-lg font-bold text-foreground">Welcome to Visco AI</h2>
                  <p className="text-sm text-muted-foreground">Your intelligent trading assistant. Ask about any token, strategy, or market trend.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-xl">
                  {quickActions.map(a => (
                    <button
                      key={a.label}
                      onClick={() => handleSend(a.query)}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left text-xs text-foreground hover:bg-secondary hover:border-primary/30 transition-all"
                    >
                      <a.icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="line-clamp-1">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}>
                  {msg.verdict && (
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold mb-2 ${verdictColor(msg.verdict)}`}>
                      {msg.verdict}
                    </span>
                  )}
                  <div className="prose prose-sm prose-invert max-w-none [&_strong]:text-foreground [&_p]:text-foreground/90 [&_li]:text-foreground/90 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
                    {msg.content.split("\n").map((line, i) => {
                      const cleaned = line.replace(/^#{1,3}\s*/, "");
                      if (line.startsWith("#")) return <p key={i} className="font-bold text-foreground">{cleaned}</p>;
                      return <p key={i} className="whitespace-pre-line">{line}</p>;
                    })}
                  </div>
                  {msg.tokenSymbol && msg.role === "assistant" && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/analyzer?token=${msg.tokenSymbol}`)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Search className="h-3 w-3" /> Full analysis →
                      </button>
                      <button
                        onClick={() => navigate(`/trading?token=${msg.tokenSymbol}`)}
                        className="flex items-center gap-1 text-xs text-emerald-500 hover:underline"
                      >
                        <TrendingUp className="h-3 w-3" /> Trade →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Analyzing with AVE Skills...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border p-3 sm:p-4 bg-background">
            <div className="flex gap-2 max-w-3xl mx-auto">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask Visco AI anything... (e.g. 'Should I buy ETH?', 'Analyze 0x...')"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
