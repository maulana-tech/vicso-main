# Vicso AI — Agent Instructions

## Dev Commands

```bash
bun run dev          # dev server on port 8080
bun run build        # production build
bun run build:dev   # development build (dev mode enables component tagger)
bun run lint         # eslint
bun run test         # vitest run
bun run test:watch   # vitest watch mode
```

No typecheck script. ESLint uses `typescript-eslint` internally.

## Stack

- **Package manager**: bun (bun.lock, bun.lockb)
- **Framework**: Vite + React 18 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS + Radix primitives
- **Routing**: react-router-dom v6
- **Web3**: wagmi v3 + viem v2 + WalletConnect
- **Backend**: Supabase (@supabase/supabase-js)
- **Data fetching**: @tanstack/react-query v5
- **Testing**: vitest (unit) + @playwright/test (e2e, via lovable-agent-playwright-config)

## Path Alias

`@` maps to `src/`. Vitest and Vite both resolve it.

## Architecture

- `src/App.tsx` — root component with route definitions and providers (Wagmi, QueryClient, Auth, Router, Sonner, TooltipProvider)
- All routes wrapped in `AppLayout` except `/auth`
- Pages in `src/pages/`, components in `src/components/`, hooks in `src/hooks/`
- shadcn/ui in `src/components/ui/`
- Supabase auth in `src/contexts/AuthContext.tsx`; client auto-generated at `src/integrations/supabase/client.ts` (do not edit directly)
- Web3 config at `src/lib/wagmiConfig.ts` (WalletConnect project ID is hardcoded here)

## Tailwind

Dark mode via `class`. Custom neon color palette (`neon-pink/green/blue/purple/orange`) in `tailwind.config.ts`. Uses `tailwindcss-animate` plugin. Font families: `heading` (Space Grotesk), `body` (Space Grotesk), `mono` (JetBrains Mono).

## TypeScript

`noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.

## Vite Config

Dev server on `:::8080`, HMR overlay disabled. `componentTagger` from `lovable-tagger` runs only in development mode. Deduplicates: react, react-dom, react/jsx-runtime, @tanstack/react-query, @tanstack/query-core.

## Test Setup

Vitest: jsdom environment with globals. Setup: `src/test/setup.ts` (matchMedia polyfill + @testing-library/jest-dom). Test files: `src/**/*.{test,spec}.{ts,tsx}`. E2E: `playwright-fixture.ts` re-exports from `lovable-agent-playwright-config/fixture`.

## ESLint

Ignores `dist`. `@typescript-eslint/no-unused-vars` is off. React Refresh warn-only.

## Env vars

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (project ID: `iikuixprsdulnrffedoi`).

## Generated / ignore

- `.lovable/` — build-time component tagging artifacts, safe to ignore
- `src/integrations/supabase/client.ts` — auto-generated Supabase client, do not edit
