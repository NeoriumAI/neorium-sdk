# @neorium/cli

NEORIUM (neo) — Your DeFi Co-Pilot.

CLI for testing AI responses and read-only DeFi analysis.

## Install
```bash
npm i -g @neorium/cli
```

## Commands
```bash
neorium verify-env
neorium chat "Explain slippage" --stream
neorium explain-token --chain solana --address <mint>
neorium risk-scan --chain solana --address <mint>
neorium glossary "impermanent loss"
```

## Exit Codes
- `0` success
- `1` runtime/API error
- `2` missing environment configuration
