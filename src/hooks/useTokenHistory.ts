import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TokenHistoryEntry {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  price: number;
  riskScore: number;
  verdict: string;
  analyzedAt: string;
}

const LS_KEY = "cn-token-history";

function loadLocal(): TokenHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(entries: TokenHistoryEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {}
}

export function useTokenHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<TokenHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Load history
  const fetchHistory = useCallback(async () => {
    if (user) {
      setLoading(true);
      const { data } = await supabase
        .from("token_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) {
        setHistory(
          data.map((d) => ({
            id: d.id,
            tokenName: d.token_name,
            tokenSymbol: d.token_symbol,
            price: (d.analysis_data as any)?.price ?? 0,
            riskScore: d.risk_score ?? 0,
            verdict: d.verdict ?? "HOLD",
            analyzedAt: d.created_at,
          }))
        );
      }
      setLoading(false);
    } else {
      setHistory(loadLocal());
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addToHistory = useCallback(
    async (entry: Omit<TokenHistoryEntry, "id" | "analyzedAt">) => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const newEntry: TokenHistoryEntry = { ...entry, id, analyzedAt: now };

      if (user) {
        await supabase.from("token_analyses").insert({
          user_id: user.id,
          token_address: "",
          token_name: entry.tokenName,
          token_symbol: entry.tokenSymbol,
          risk_score: entry.riskScore,
          verdict: entry.verdict,
          confidence: 0,
          analysis_data: { price: entry.price } as any,
        });
        fetchHistory();
      } else {
        const updated = [newEntry, ...loadLocal().filter((h) => h.tokenSymbol !== entry.tokenSymbol)].slice(0, 50);
        saveLocal(updated);
        setHistory(updated);
      }
    },
    [user, fetchHistory]
  );

  const removeFromHistory = useCallback(
    async (id: string) => {
      if (user) {
        await supabase.from("token_analyses").delete().eq("id", id).eq("user_id", user.id);
        setHistory((prev) => prev.filter((h) => h.id !== id));
      } else {
        const updated = loadLocal().filter((h) => h.id !== id);
        saveLocal(updated);
        setHistory(updated);
      }
    },
    [user]
  );

  const clearHistory = useCallback(async () => {
    if (user) {
      await supabase.from("token_analyses").delete().eq("user_id", user.id);
      setHistory([]);
    } else {
      saveLocal([]);
      setHistory([]);
    }
  }, [user]);

  return { history, loading, addToHistory, removeFromHistory, clearHistory };
}
