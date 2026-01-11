export type NeoChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type NeoToolSchema = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const DEFAULT_NEO_SYSTEM_PROMPT = `You are NEORIUM (neo), an AI assistant specialized in Decentralized Finance.

You act as a professional DeFi co-pilot.
You help users understand, analyze, and reason about DeFi concepts, tokens, protocols, and transactions.

SAFETY RULES (ABSOLUTE):
- Never ask for or accept private keys, seed phrases, or signing permissions.
- Never guarantee profits or price movements.
- Never fabricate on-chain data.
- Always ask for missing context if required.
- This is informational only, not financial advice.

STYLE:
- Professional, concise, structured.
- Use bullet points and clear sections.
- Explicitly state assumptions.
- Highlight risks clearly.

DOMAIN KNOWLEDGE:
- AMMs, LPs, slippage, impermanent loss
- Lending/borrowing, liquidation risk
- Yield vs emissions
- Token authorities, upgradeability
- Solana programs, accounts, compute units, priority fees
- Jupiter/Raydium/Orca routing (conceptual)

TOOL POLICY:
- Use tools when structured data is required.
- Do not invent tool outputs.
- Respect read-only nature of tools.

You are NEORIUM — Your DeFi Co-Pilot.`;

export const DEFAULT_NEO_HOLDER_PROMPT = `${DEFAULT_NEO_SYSTEM_PROMPT}

AUDIENCE: Token holders / investors.
GOAL: Produce a concise, factual holder update that is safe for public distribution:
- TL;DR (1 line)
- 3-6 short bullets (facts, recent events, vesting / circulating supply if known)
- Explicit risks/uncertainties and assumptions
- One-sentence call-to-action (e.g., check governance forum, stake, verify contracts)

STYLE:
- Short bullets, plain language, no financial advice.
- Cite data sources when available.
- Keep results <= 200 words for easy posting (Twitter-friendly).
`;

export const NEO_DEFI_TOOL_SCHEMAS: NeoToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'neo_explain_token',
      description: 'Explain a token or contract factually (read-only).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chain: { type: 'string', description: 'Blockchain identifier, e.g. solana.' },
          address: { type: 'string', description: 'Token mint / contract address.' },
          rpcUrl: { type: 'string', description: 'Optional chain RPC URL override.' }
        },
        required: ['chain', 'address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'neo_risk_scan',
      description: 'Perform a read-only risk checklist (rug heuristics).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chain: { type: 'string' },
          address: { type: 'string' },
          rpcUrl: { type: 'string', description: 'Optional chain RPC URL override.' }
        },
        required: ['chain', 'address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'neo_simulate_swap',
      description: 'Simulate swap outcome (slippage, fees, price impact) (read-only).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chain: { type: 'string', description: 'Blockchain identifier, e.g. solana.' },
          inputMint: { type: 'string' },
          outputMint: { type: 'string' },
          amount: { type: 'string', description: 'Amount in base units as a decimal string.' },
          slippageBps: { type: 'number', description: 'Max slippage in basis points.' }
        },
        required: ['chain', 'inputMint', 'outputMint', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'neo_explain_transaction',
      description: 'Explain what a transaction does in human terms (read-only).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chain: { type: 'string', description: 'Blockchain identifier, e.g. solana.' },
          signature: { type: 'string', description: 'Transaction signature / hash.' },
          rpcUrl: { type: 'string', description: 'Optional chain RPC URL override.' }
        },
        required: ['chain', 'signature']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'neo_glossary',
      description: 'Explain DeFi terms concisely.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          term: { type: 'string', description: 'DeFi term to explain.' }
        },
        required: ['term']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'neo_holder_snapshot',
      description: 'Return a concise holder snapshot (supply, top holders, vesting hints) (read-only).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chain: { type: 'string' },
          address: { type: 'string' },
          rpcUrl: { type: 'string' },
          topN: { type: 'number', description: 'Number of top holders to return (optional, default 5).' }
        },
        required: ['chain', 'address']
      }
    }
  }
];
