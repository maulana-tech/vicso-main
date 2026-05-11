import { useLocalStorage } from "./useLocalStorage";

export interface CustomAgent {
  id: string;
  name: string;
  strategy: "smart-money" | "risk-analyzer" | "auto-trader";
  riskLevel: number;
  chain: "ETH" | "BNB" | "SOL";
  autoBuy: boolean;
  autoSell: boolean;
  createdAt: string;
  attachedWallet?: string;
  isRunning: boolean;
}

export function useAgents() {
  const [agents, setAgents] = useLocalStorage<CustomAgent[]>("cn-agents", []);

  const createAgent = (agent: Omit<CustomAgent, "id" | "createdAt" | "isRunning">) => {
    const newAgent: CustomAgent = {
      ...agent,
      id: "AGT-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      isRunning: false,
    };
    setAgents((prev) => [...prev, newAgent]);
    return newAgent;
  };

  const deleteAgent = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRunning: !a.isRunning } : a))
    );
  };

  const attachWallet = (agentId: string, walletAddress: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, attachedWallet: walletAddress } : a))
    );
  };

  return { agents, createAgent, deleteAgent, toggleAgent, attachWallet };
}
