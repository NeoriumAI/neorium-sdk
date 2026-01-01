# NEORIUM (neo) — Your DeFi Co-Pilot.

Production-grade, SDK-first monorepo for building DeFi-aware AI experiences.

**Scope (pure SDK)**
- TypeScript AI SDK: `@neorium/sdk`
- CLI for testing AI responses: `@neorium/cli` (binary: `neorium`)
- VS Code extension (Copilot-style commands + inline completion, no webviews): `neorium-copilot`
- Read-only system prompt + DeFi tool schemas: `@neorium/prompts`

## Packages
- `packages/sdk` — Neorium API client with streaming, retries, timeouts, and safe tool loop
- `packages/cli` — CLI using the SDK
- `packages/prompts` — Default system prompt + tool schemas (read-only)
- `extensions/neorium-copilot` — VS Code extension (commands + inline assistance)

## Environment
Required:
- `NEO_APIKEY` (alias: `neo_apikey`)

Optional:
- `NEO_BASE_URL` (default: `https://api.neorium.ai`)
- `NEO_MODEL` (default: `neorium-1`)
- `NEO_TIMEOUT_MS`

See `.env.example`.

## Install
```bash
npm install
```

## Build
```bash
npm run build
```

## Test
```bash
npm test
```

## CLI
```bash
npx neorium verify-env
npx neorium chat "Explain impermanent loss"
```

## VS Code Extension
Build/package:
```bash
npm -w extensions/neorium-copilot run build
npm -w extensions/neorium-copilot run package
```

## Security Model
- Non-custodial: never handles private keys, seed phrases, or signing.
- Read-only by default.
- Never logs or exposes API keys.
