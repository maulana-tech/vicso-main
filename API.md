# SoSovalue API Documentation - Context

> **Source**: https://sosovalue-1.gitbook.io/sosovalue-api-doc  
> **Platform**: SoSovalue (https://sosovalue.com) — Cryptocurrency & Macro Data Analytics Platform  
> **Extracted**: 2026-05-12  
> **Note**: Detailed endpoint-level documentation was inaccessible due to GitBook access restrictions. The following is reconstructed from the main page structure, platform knowledge, and publicly available metadata.

---

## 1. Overview

SoSovalue is a comprehensive cryptocurrency and macroeconomic data analytics platform. The API provides programmatic access to:
- Real-time and historical cryptocurrency market data
- ETF (Exchange Traded Fund) analytics
- Custom crypto indices
- Crypto-related stock market data
- Bitcoin treasury holdings of public companies
- News and fundraising data
- Macroeconomic events
- Technical analysis charting data

---

## 2. API Structure / Modules

The documentation is organized into the following main sections:

### 2.1 Currency & Pairs
**Scope**: Cryptocurrency market data endpoints  
**Likely Endpoints**:
- `GET /currency/list` — List of supported cryptocurrencies
- `GET /currency/market-data` — Real-time market data (price, volume, market cap)
- `GET /currency/klines` — OHLCV candlestick/kline data
- `GET /currency/supply` — Circulating/total/max supply data
- `GET /currency/trading-pairs` — Exchange trading pairs information

**Typical Parameters**:
- `symbol` or `currency_id` — Target cryptocurrency (e.g., BTC, ETH)
- `interval` — Kline interval (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M)
- `limit` — Number of records to return
- `start_time` / `end_time` — Time range for historical data

---

### 2.2 ETF
**Scope**: Cryptocurrency-related Exchange Traded Funds  
**Likely Endpoints**:
- `GET /etf/summary` — ETF market summary/overview
- `GET /etf/list` — List of crypto ETFs
- `GET /etf/snapshot` — Real-time ETF market snapshot
- `GET /etf/historical` — Historical ETF data (NAV, AUM, flows)

**Data Points**:
- Net Asset Value (NAV)
- Assets Under Management (AUM)
- Daily inflows/outflows
- Issuer information (BlackRock, Fidelity, Grayscale, etc.)
- Premium/discount to NAV

---

### 2.3 SoSoValue Index
**Scope**: Custom cryptocurrency indices created by SoSovalue  
**Likely Endpoints**:
- `GET /index/list` — List of available indices
- `GET /index/constituents` — Index constituents/components
- `GET /index/snapshot` — Current index value and metrics
- `GET /index/klines` — Historical index performance (OHLCV)

---

### 2.4 Crypto Stocks
**Scope**: Publicly traded companies with crypto exposure  
**Likely Endpoints**:
- `GET /stock/list` — List of crypto-related stocks
- `GET /stock/snapshot` — Real-time stock market data
- `GET /stock/market-cap` — Market capitalization data
- `GET /stock/klines` — Historical price data (OHLCV)
- `GET /stock/sectors` — Sector classification

**Examples**: Coinbase (COIN), MicroStrategy (MSTR), Riot Platforms (RIOT), Marathon Digital (MARA)

---

### 2.5 BTC Treasuries
**Scope**: Corporate Bitcoin treasury holdings  
**Likely Endpoints**:
- `GET /treasury/list` — List of companies holding Bitcoin
- `GET /treasury/purchase-history` — Historical purchase/sale records

**Data Points**:
- Company name and ticker
- BTC holdings quantity
- USD value of holdings
- Average purchase price
- Purchase date history
- % of total BTC supply held

---

### 2.6 Feeds
**Scope**: News and content aggregation  
**Likely Endpoints**:
- `GET /feeds/news` — General news feed
- `GET /feeds/hot-news` — Trending/hot news
- `GET /feeds/featured` — Featured/curated news
- `GET /feeds/search` — News search by keyword/topic

---

### 2.7 Fundraising
**Scope**: Crypto project fundraising and investment data  
**Likely Endpoints**:
- `GET /fundraising/list` — List of fundraising rounds
- `GET /fundraising/project/{id}` — Detailed project fundraising info

**Data Points**:
- Project name and category
- Funding round (Seed, Series A, etc.)
- Amount raised
- Valuation
- Lead investors
- Date

---

### 2.8 Macro
**Scope**: Macroeconomic events and indicators  
**Likely Endpoints**:
- `GET /macro/events` — Upcoming and past macroeconomic events
- `GET /macro/calendar` — Economic calendar

**Data Points**:
- Event name (e.g., CPI release, FOMC meeting, Non-Farm Payrolls)
- Date and time
- Country/region
- Previous/forecast/actual values
- Impact level (high/medium/low)

---

### 2.9 Analysis Charts
**Scope**: Technical analysis and charting data  
**Likely Endpoints**:
- `GET /charts/list` — List of available chart configurations
- `GET /charts/data` — Chart data for specific indicators

**Indicators likely supported**:
- Moving averages (MA, EMA, SMA)
- RSI, MACD, Bollinger Bands
- On-chain metrics (NUPL, MVRV, SOPR, etc.)
- Exchange flows
- Funding rates

---

## 3. Authentication

> **Note**: Authentication details were not accessible. Typical patterns for crypto data APIs include:

- **API Key**: Passed via header (`X-API-Key` or `Authorization: Bearer <token>`)
- **Rate Limiting**: Tier-based (Free, Pro, Enterprise) with limits on requests per minute/hour
- **Base URL**: Likely `https://api.sosovalue.com` or similar

---

## 4. Response Format

Based on standard REST API conventions, responses likely follow:

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": 1715500800
}
```

Or for list endpoints:

```json
{
  "code": 200,
  "data": {
    "list": [ ... ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 5. Key Use Cases

| Use Case | Relevant Module |
|----------|----------------|
| Build a crypto portfolio tracker | Currency & Pairs, Crypto Stocks |
| Analyze ETF flows and premiums | ETF |
| Track corporate Bitcoin adoption | BTC Treasuries |
| Create custom index benchmarks | SoSoValue Index |
| Integrate news into trading bots | Feeds |
| Monitor macro impact on crypto | Macro |
| Evaluate crypto startup investments | Fundraising |
| Technical analysis automation | Analysis Charts |

---

## 6. Limitations & Notes

- **Access Restriction**: The GitBook documentation pages were not accessible via direct URL fetching (internal errors on sub-pages). This context is reconstructed from the main page index and platform knowledge.
- **Rate Limits**: Unknown — likely tiered based on subscription level.
- **Real-time vs Historical**: Some endpoints likely support both real-time snapshots and historical time-series data.
- **Pagination**: List endpoints likely support `page`, `page_size`, and `cursor` parameters.
- **WebSocket**: Unknown if WebSocket streaming is available for real-time data.

---

## 7. Official Resources

- **Main Site**: https://sosovalue.com
- **API Docs**: https://sosovalue-1.gitbook.io/sosovalue-api-doc
- **Developer Portal**: https://m.sosovalue.com/developer (region-restricted)

---

*Document generated for context and development planning. For exact endpoint paths, parameters, and authentication details, refer to the official SoSovalue API documentation directly.*
