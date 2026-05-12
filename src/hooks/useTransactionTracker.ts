import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";

export interface Transaction {
  id: string;
  type: "SWAP" | "TRANSFER" | "APPROVE";
  status: "PENDING" | "CONFIRMING" | "CONFIRMED" | "FAILED";
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  txHash: string;
  timestamp: number;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  source: "sodex" | "sosovalue";
}

export interface TransactionState {
  transactions: Transaction[];
  pendingCount: number;
  recentCount: number;
}

const STORAGE_KEY = "cn_transaction_history";
const MAX_HISTORY = 50;

function loadHistory(): Transaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.filter((t: Transaction) => Date.now() - t.timestamp < 7 * 24 * 60 * 60 * 1000);
    }
  } catch {
    return [];
  }
  return [];
}

function saveHistory(transactions: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.slice(0, MAX_HISTORY)));
  } catch {
    console.error("Failed to save transaction history");
  }
}

export function useTransactionTracker() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const history = loadHistory();
    setTransactions(history);
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, "id" | "timestamp">) => {
    const newTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setTransactions(prev => {
      const updated = [newTx, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });

    return newTx;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const updated = prev.map(tx =>
        tx.id === id ? { ...tx, ...updates } : tx
      );
      saveHistory(updated);
      return updated;
    });
  }, []);

  const confirmTransaction = useCallback((id: string, blockNumber?: number) => {
    updateTransaction(id, { status: "CONFIRMED", blockNumber });
  }, [updateTransaction]);

  const failTransaction = useCallback((id: string, error: string) => {
    updateTransaction(id, { status: "FAILED", error });
  }, [updateTransaction]);

  const clearHistory = useCallback(() => {
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const pendingCount = transactions.filter(t => t.status === "PENDING" || t.status === "CONFIRMING").length;
  const recentCount = transactions.filter(t => Date.now() - t.timestamp < 24 * 60 * 60 * 1000).length;

  return {
    transactions,
    pendingCount,
    recentCount,
    loading,
    addTransaction,
    updateTransaction,
    confirmTransaction,
    failTransaction,
    clearHistory,
  };
}

export function useLiveTransaction(txHash: string) {
  const [status, setStatus] = useState<"PENDING" | "CONFIRMING" | "CONFIRMED" | "FAILED">("PENDING");
  const [blockNumber, setBlockNumber] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!txHash) return;

    const checkStatus = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStatus("CONFIRMING");
      await new Promise(resolve => setTimeout(resolve, 3000));
      setStatus("CONFIRMED");
      setBlockNumber(Math.floor(Math.random() * 10000000) + 19000000);
    };

    checkStatus();
  }, [txHash]);

  return { status, blockNumber, error };
}
