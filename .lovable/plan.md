
## Phase 1 — New AVE API Edge Functions (Backend Foundation)
Create new edge functions for missing AVE API endpoints:
- `ave-wallet` — wallet-info, wallet-tokens, address-pnl, address-txs, tx-detail
- `ave-signals` — signals endpoint
- `ave-smart-wallets` — smart wallet discovery
- `ave-liquidity` — liq-txs endpoint
- Update `ave-klines` to add pair and search-details actions

## Phase 2 — Portfolio Page + Wallet Detail Tabs
- Create new Portfolio page with wallet holdings, PnL, allocation
- Add tabs to WalletDetail: Overview, Transactions, Recent Trades, Recent PnL, Holdings
- Add Buys & Sells analytics panel

## Phase 3 — Trading Page Upgrades
- Add Signals Feed panel
- Add Auto Trader toggle system
- Add Copy Trading panel
- Add "Auto Trade This Setup" flow from analysis

## Phase 4 — AI System Upgrade
- Connect AI to real skill calls (signals, wallet-info, etc.)
- Add chat history/memory persistence
- Remove generic responses, use real data

## Phase 5 — Smart Money + Feed Improvements
- Add "Track Wallet" button on every wallet view
- Add "Full Analysis" button on feed tokens
- Smart wallet discovery using AVE API

## Phase 6 — UI/UX Fixes
- Remove password from Settings, keep in Profile only
- Fix Connect Wallet button
- Add nav item for Portfolio
- PWA manifest + install button
- Full responsiveness pass

**Note:** This is ~15,000+ lines of changes across 20+ files. I'll implement in batches, starting with Phase 1 (backend) since everything depends on it.
