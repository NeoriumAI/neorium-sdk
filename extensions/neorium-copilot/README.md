# NEORIUM (neo) — Your DeFi Co-Pilot.

Copilot-style VS Code extension: commands + inline completions.

## Security
- Never requests private keys, seed phrases, or signing.
- API key is stored in VS Code `SecretStorage`.
- No webviews, no side panels.

## Disclaimer
NEORIUM provides informational assistance only and is not financial advice. Never paste private keys, seed phrases, or signing material.

## Commands
- Neorium: Ask DeFi Copilot
- Neorium: Explain Selected Text
- Neorium: Risk Scan Address
- Neorium: Generate DeFi Script (TypeScript)
- Neorium: Fix Code Using neo

## Settings
- `neorium.baseUrl`
- `neorium.model`
- `neorium.temperature`
- `neorium.enableInlineCompletion`

## Troubleshooting
- Ensure API key is set via command prompt on first use.
- Check OutputChannel: **Neorium**.
