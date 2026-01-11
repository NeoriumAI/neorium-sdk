# NEORIUM (neo) — Your DeFi Co-Pilot.

![NEORIUM](assets/background.png)

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

## Investor updates (Twitter-ready)
We added first-class support for generating concise investor/holder updates. Use the CLI command `neorium holder-update --chain <chain> --address <address>` or the VS Code command **Neorium: Generate Holder Update**.

Suggested short posts:
- "TL;DR: <one-line summary>. Key facts: <supply>, <vesting>, <event>. Risks: <short>. CTA: <link>"
- "Investor update for <TOKEN>: TL;DR: <one-liner>. 3 bullets: ... Risks: ... "

Files changed for this feature:
- `packages/prompts/src/index.ts` — new `DEFAULT_NEO_HOLDER_PROMPT` and `neo_holder_snapshot` tool schema
- `packages/sdk/src/prompts.ts` — new `buildNeoHolderPrompt` helper
- `packages/sdk/src/tools/registry.ts` — `neo_holder_snapshot` handler
- `packages/cli/src/index.ts` — `holder-update` CLI command
- `extensions/neorium-copilot` — `neorium.generateHolderUpdate` command
- `docs/defi-prompting-guide.md` — new guidance for investor updates

## Security Model
- Non-custodial: never handles private keys, seed phrases, or signing.
- Read-only by default.
- Never logs or exposes API keys.
