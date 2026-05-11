import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, X, Sparkles, Search, Wallet, TrendingUp, Shield, WifiOff, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  verdict?: string;
  tokenSymbol?: string;
  data?: Record<string, unknown>;
}

type ConnectionStatus = "idle" | "connected" | "disconnected" | "error";

const quickActions = [
  { icon: TrendingUp, label: "What's trending?", query: "What tokens are trending right now?" },
  { icon: Search, label: "Analyze ETH", query: "Analyze ETH" },
  { icon: Wallet, label: "Wallet PnL", query: "Show my wallet PnL" },
  { icon: Shield, label: "BTC Signal", query: "Give entry, TP, SL for BTC" },
];

export default function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("openclaw-session-id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("openclaw-session-id", id);
    return id;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendToOpenClaw = useCallback(async (text: string) => {
    setLoading(true);
    setStreamingContent("");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Try streaming first
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${projectUrl}/functions/v1/openclaw-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({ message: text, sessionId, stream: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));

        if (res.status === 503 || errData?.status === "disconnected") {
          setConnectionStatus("disconnected");
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: "⚡ OpenClaw is not connected yet. The system is ready — once the API URL is configured, I'll be fully operational." },
          ]);
          return;
        }

        setConnectionStatus("error");
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "ChainNova AI is currently unavailable. Please try again." },
        ]);
        return;
      }

      // Check if streaming SSE response
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        setConnectionStatus("connected");
        let fullContent = "";
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed?.choices?.[0]?.delta?.content || "";
                  fullContent += delta;
                  setStreamingContent(fullContent);
                } catch { /* skip malformed chunks */ }
              }
            }
          }
        }

        setStreamingContent("");
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: fullContent || "No response received." },
        ]);
      } else {
        // Non-streaming JSON response
        const data = await res.json();

        if (data?.status === "disconnected") {
          setConnectionStatus("disconnected");
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: "⚡ OpenClaw is not connected yet." },
          ]);
          return;
        }

        if (data?.error) {
          setConnectionStatus("error");
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: "ChainNova AI is currently unavailable. Please try again." },
          ]);
          return;
        }

        setConnectionStatus("connected");
        const reply = data?.reply || "No response received.";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: typeof reply === "string" ? reply : JSON.stringify(reply),
            verdict: data?.verdict,
            tokenSymbol: data?.tokenSymbol,
            data: data?.data,
          },
        ]);
      }
    } catch (err: unknown) {
      console.error("OpenClaw chat error:", err);
      setConnectionStatus("error");
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "ChainNova AI is currently unavailable. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleSend = (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    sendToOpenClaw(q);
  };

  const verdictColor = (v?: string) => {
    if (v === "BUY") return "bg-neon-green/10 text-neon-green";
    if (v === "AVOID") return "bg-destructive/10 text-destructive";
    return "bg-neon-orange/10 text-neon-orange";
  };

  const statusIndicator = () => {
    if (connectionStatus === "connected") return "bg-neon-green";
    if (connectionStatus === "disconnected") return "bg-neon-orange";
    if (connectionStatus === "error") return "bg-destructive";
    return "bg-muted-foreground";
  };

  const statusLabel = () => {
    if (connectionStatus === "connected") return "OpenClaw Connected";
    if (connectionStatus === "disconnected") return "Awaiting Connection";
    if (connectionStatus === "error") return "Connection Error";
    return "OpenClaw AI";
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl neon-glow-purple hover:scale-105 transition-all duration-200"
        aria-label="AI Chat"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5 sm:h-6 sm:w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-24 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[380px] max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
            style={{ maxHeight: "min(540px, calc(100vh - 140px))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-3 sm:px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{statusLabel()}</h3>
                  <span className={`h-2 w-2 rounded-full ${statusIndicator()} animate-pulse`} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {connectionStatus === "disconnected"
                    ? "Waiting for OpenClaw backend"
                    : "Ask me anything about crypto"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin" style={{ minHeight: 180 }}>
              {messages.length === 0 && !streamingContent && (
                <div className="space-y-3">
                  {connectionStatus === "disconnected" ? (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                      <WifiOff className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        OpenClaw is not connected yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground text-center py-2">
                        👋 Hi! I'm OpenClaw — your AI trading brain.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {quickActions.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => handleSend(a.query)}
                            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2 text-left text-[11px] text-foreground hover:bg-secondary transition-colors"
                          >
                            <a.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="line-clamp-1">{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.verdict && (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mb-1 ${verdictColor(msg.verdict)}`}>
                        {msg.verdict}
                      </span>
                    )}
                    <div className="whitespace-pre-line prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.tokenSymbol && msg.role === "assistant" && (
                      <button
                        onClick={() => {
                          navigate(`/analyzer?token=${msg.tokenSymbol}`);
                          setOpen(false);
                        }}
                        className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline"
                      >
                        <Search className="h-3 w-3" /> Full analysis
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming content */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl bg-secondary px-3 py-2 text-xs leading-relaxed text-foreground">
                    <div className="whitespace-pre-line prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    </div>
                    <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse ml-0.5" />
                  </div>
                </div>
              )}

              {loading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> OpenClaw thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-2 sm:p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask OpenClaw anything..."
                  className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
