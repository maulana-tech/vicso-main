# Visco AI

> AI-Powered Crypto Analytics & Trading Platform — **SoSoValue Buildathon Submission**

![Status](https://img.shields.io/badge/Status-Active-22C55E?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Ethereum%20%7C%20BSC%20%7C%20Polygon-6366F1?style=flat-square)
![API](https://img.shields.io/badge/Powered%20by-SoSoValue%20API-8B5CF6?style=flat-square)

**Visco AI** is an intelligent crypto trading platform that combines real-time market data from SoSoValue with AI-driven analysis to generate actionable trading signals and execute trades on-chain via SoDEX.

## ✨ Key Features

### 🤖 AI Signal Center
- **Whale Detection** — Real-time volume-based smart money activity monitoring
- **Momentum Scoring** — AI-powered price momentum analysis
- **Risk Assessment** — Comprehensive token risk scoring with entry/exit recommendations
- **Market Intelligence** — SoSoValue Index tracking and hot news aggregation

### 📊 Data Pipeline
```
SoSoValue API → AI Analysis → Trading Signals → SoDEX Execution → Tx Tracking
```

### 🔗 API Integrations

| API | Purpose | Status |
|-----|---------|--------|
| **SoSoValue** | Market data, news, indices | ✅ Active |
| **SoDEX** | On-chain trading (testnet) | ✅ Active |
| **Supabase** | Auth, storage, edge functions | ✅ Active |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Bun (recommended) or npm
- SoSoValue API Key
- MetaMask or WalletConnect wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/chainnova-ai.git
cd chainnova-ai

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Then edit .env with your API keys
```

### Environment Variables

```env
# SoSoValue API — https://sosovalue-1.gitbook.io/sosovalue-api-doc
VITE_SOSOVALUE_API_KEY=your_sosovalue_api_key

# SoDEX API — https://sodex.com/documentation/api/api
VITE_SODEX_API_KEY=your_sodex_api_key

# Supabase (already configured)
VITE_SUPABASE_URL=https://iikuixprsdulnrffedoi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=iikuixprsdulnrffedoi
```

### Run Development Server

```bash
bun run dev
```

Open [http://localhost:8080](http://localhost:8080)

### Build for Production

```bash
bun run build      # Production build
bun run build:dev # Development build (with tagger)
```

## 📁 Project Structure

```
src/
├── lib/                        # API clients
│   ├── sosovalue.ts            # SoSoValue API wrapper
│   └── sodex.ts               # SoDEX API wrapper
├── hooks/                      # React hooks
│   ├── useAISignals.ts        # AI signal generation
│   ├── useSoDEXSwap.ts        # Swap execution
│   ├── useTokenAPI.ts         # Token data fetching
│   └── useTransactionTracker.ts
├── components/                  # UI components
│   ├── SignalWidget.tsx       # AI signals dashboard
│   ├── SoSoValueWidget.tsx    # SoSoValue data display
│   ├── TradeConfirmModal.tsx  # Trade confirmation
│   └── TransactionHistory.tsx
└── pages/
    ├── Index.tsx              # Dashboard
    └── AICommandCenter.tsx    # AI chat + signals
```

## 🎯 How It Works

### 1. Data Collection
ChainNova connects to SoSoValue API to fetch real-time market data:
- Token prices and market cap
- 24h volume and price changes
- Token economics and allocations
- Hot news and market sentiment

### 2. AI Analysis
The AI engine analyzes data to generate:
- **Whale Activity Score** — Detects unusual trading patterns
- **Momentum Score** — Measures price trend strength
- **Risk Score** — Evaluates token safety metrics
- **Volume Score** — Assesses trading activity level

### 3. Signal Generation
Based on analysis, the system generates:
- BUY/SELL/HOLD recommendations
- Entry price targets
- Stop-loss levels
- Confidence scores

### 4. Trade Execution
Users can execute trades via SoDEX:
- Market data from SoDEX orderbook
- Wallet-connected signing
- Risk confirmation modal
- Transaction tracking

## ⚖️ Buildathon Alignment

| Judging Criteria | Implementation |
|-----------------|----------------|
| **User Value (30%)** | Real-time signals, whale tracking, risk assessment |
| **Functionality (25%)** | Complete data→action flow |
| **Logic/Design (20%)** | Clean architecture, modular components |
| **API Integration (15%)** | SoSoValue + SoDEX APIs |
| **UX (10%)** | shadcn/ui, dark mode, responsive |

## 📚 Resources

- **SoSoValue API**: https://sosovalue-1.gitbook.io/sosovalue-api-doc
- **SoDEX API**: https://sodex.com/documentation/api/api
- **Buildathon Form**: https://forms.gle/2nuJT2qNbUQsyyZy8

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Web3 | wagmi v3 + viem + WalletConnect |
| Data | @tanstack/react-query v5 |
| Backend | Supabase |
| AI | SoSoValue API + Custom ML |
| Animation | Framer Motion |

## 📝 License

MIT License
