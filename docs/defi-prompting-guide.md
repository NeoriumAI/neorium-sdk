# DeFi Prompting Guide (NEORIUM)

NEORIUM (neo) — Your DeFi Co-Pilot.

This guide helps you ask better DeFi questions and interpret answers responsibly.

## Principles
- Be explicit about chain, token mint/contract, and timeframe.
- Ask for assumptions and uncertainties.
- Prefer structured outputs: checklists, tables, bullet points.
- Treat outputs as informational only (not financial advice).

## Good Question Templates

### Token research
"On Solana, explain this token mint <MINT>. Summarize supply/decimals, upgradeability/authority risks if known, and what data is missing."

### Swap simulation
"Simulate swapping 1 SOL to USDC via Jupiter. Show expected output, slippage, and main risks if price moves."

### Transaction review
"Explain this Solana transaction <SIGNATURE> in plain English. Identify token transfers and any approvals/authority changes."

## Risk Disclaimers (Recommended)
- Never assume legitimacy from a single signal.
- Always verify with multiple sources and the official program/docs.
- Treat newly launched tokens and thin liquidity as high risk.

## Token holder / Investor updates
Use this template when generating concise updates for holders or investors. Keep the output short and factual; do not provide financial advice.

Template:
- TL;DR (1 line)
- 3–6 short bullets: key facts (circulating supply, vesting/locks, recent events)
- Explicit risks / uncertainties
- Single CTA (e.g., check governance forum, stake, verify contract links)

Notes:
- Be explicit about data sources and assumptions.
- Avoid jargon; use plain language.
- Limit length to ~200 words to be easy to post on social platforms.

Example prompt:
"Generate a concise investor-facing update for token <MINT>: TL;DR (1 line), 3–6 bullets with facts, explicit risks, and a single call-to-action. Cite data sources when available."
