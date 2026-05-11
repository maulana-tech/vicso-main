// Type definitions only — no mock data

export interface WhaleActivity {
  id: string;
  wallet: string;
  token: string;
  tokenSymbol: string;
  action: "buy" | "sell";
  amount: number;
  usdValue: number;
  timestamp: string;
  isUnusual: boolean;
  chain: string;
}

export interface TokenAnalysis {
  address: string;
  name: string;
  symbol: string;
  riskScore: number;
  liquidityLocked: boolean;
  liquidityAmount: number;
  holderCount: number;
  topHolderPercent: number;
  volume24h: number;
  priceChange24h: number;
  contractRisks: string[];
  rugPullStatus: "SAFE" | "WARNING" | "DANGER";
  aiSummary: string;
  recommendation: "BUY" | "AVOID" | "WATCH";
  confidence: number;
}

export interface Alert {
  id: string;
  type: "whale_buy" | "risk_spike" | "trending" | "rug_warning";
  category: "wallet" | "token" | "risk";
  title: string;
  description: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  read: boolean;
  relatedAddress?: string;
}

export interface AgentStatus {
  name: string;
  status: "active" | "idle" | "error";
  lastRun: string;
  tasksCompleted: number;
}

export interface WalletTransaction {
  hash: string;
  type: "buy" | "sell" | "transfer";
  token: string;
  symbol: string;
  amount: number;
  usdValue: number;
  timestamp: string;
  chain: string;
}

export interface NarrativeItem {
  id: string;
  theme: string;
  tokens: string[];
  momentum: number;
  description: string;
}
