import { NEO_DEFI_TOOL_SCHEMAS } from '@neorium/prompts';
import { z } from 'zod';
import type { NeoToolHandler, NeoToolRegistry } from '../types.js';

export type RegisterDeFiToolsOptions = {
  // When true, returns only schemas (no handlers).
  schemasOnly?: boolean;
};

const ExplainTokenArgs = z
  .object({
    chain: z.string(),
    address: z.string(),
    rpcUrl: z.string().optional()
  })
  .strict();

const RiskScanArgs = z
  .object({
    chain: z.string(),
    address: z.string(),
    rpcUrl: z.string().optional()
  })
  .strict();

const SimulateSwapArgs = z
  .object({
    chain: z.string(),
    inputMint: z.string(),
    outputMint: z.string(),
    amount: z.string(),
    slippageBps: z.number().optional()
  })
  .strict();

const ExplainTxArgs = z
  .object({
    chain: z.string(),
    signature: z.string(),
    rpcUrl: z.string().optional()
  })
  .strict();

async function solanaRpc<T>(rpcUrl: string, method: string, params: unknown[], signal?: AbortSignal): Promise<T> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  };
  if (signal) init.signal = signal;
  const resp = await fetch(rpcUrl, init);
  if (!resp.ok) throw new Error(`Solana RPC error: ${resp.status}`);
  const json = (await resp.json()) as any;
  if (json.error) throw new Error(`Solana RPC error: ${json.error.message ?? 'unknown'}`);
  return json.result as T;
}

const DEFAULT_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const neo_explain_token: NeoToolHandler = async (args, ctx) => {
  const a = ExplainTokenArgs.parse(args);
  if (a.chain.toLowerCase() !== 'solana') {
    return {
      chain: a.chain,
      address: a.address,
      note: 'Chain not supported by default handler. Provide your own tool handler.'
    };
  }
  const rpcUrl = a.rpcUrl ?? DEFAULT_SOLANA_RPC;
  const supply = await solanaRpc<any>(rpcUrl, 'getTokenSupply', [a.address], ctx.signal);
  return {
    chain: 'solana',
    address: a.address,
    tokenSupply: supply
  };
};

const neo_risk_scan: NeoToolHandler = async (args, ctx) => {
  const a = RiskScanArgs.parse(args);
  if (a.chain.toLowerCase() !== 'solana') {
    return {
      chain: a.chain,
      address: a.address,
      note: 'Chain not supported by default handler. Provide your own tool handler.'
    };
  }
  const rpcUrl = a.rpcUrl ?? DEFAULT_SOLANA_RPC;
  const supply = await solanaRpc<any>(rpcUrl, 'getTokenSupply', [a.address], ctx.signal);
  // Heuristic-only checklist; no claims about legitimacy.
  return {
    chain: 'solana',
    address: a.address,
    checklist: {
      hasSupply: Boolean(supply?.value),
      decimals: supply?.value?.decimals,
      uiAmountString: supply?.value?.uiAmountString
    },
    disclaimer:
      'This is a read-only heuristic checklist. It cannot prove safety. Verify authorities, liquidity, and distribution using multiple sources.'
  };
};

const neo_simulate_swap: NeoToolHandler = async (args, ctx) => {
  const a = SimulateSwapArgs.parse(args);
  if (a.chain.toLowerCase() !== 'solana') {
    return {
      chain: a.chain,
      inputMint: a.inputMint,
      outputMint: a.outputMint,
      note: 'Chain not supported by default handler. Provide your own tool handler.'
    };
  }
  const slippageBps = a.slippageBps ?? 50;
  const url = new URL('https://quote-api.jup.ag/v6/quote');
  url.searchParams.set('inputMint', a.inputMint);
  url.searchParams.set('outputMint', a.outputMint);
  url.searchParams.set('amount', a.amount);
  url.searchParams.set('slippageBps', String(slippageBps));
  const init: RequestInit = {};
  if (ctx.signal) init.signal = ctx.signal;
  const resp = await fetch(url.toString(), init);
  if (!resp.ok) throw new Error(`Jupiter quote error: ${resp.status}`);
  return await resp.json();
};

const neo_explain_transaction: NeoToolHandler = async (args, ctx) => {
  const a = ExplainTxArgs.parse(args);
  if (a.chain.toLowerCase() !== 'solana') {
    return {
      chain: a.chain,
      signature: a.signature,
      note: 'Chain not supported by default handler. Provide your own tool handler.'
    };
  }
  const rpcUrl = a.rpcUrl ?? DEFAULT_SOLANA_RPC;
  const tx = await solanaRpc<any>(
    rpcUrl,
    'getTransaction',
    [a.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
    ctx.signal
  );
  return {
    chain: 'solana',
    signature: a.signature,
    transaction: tx
  };
};

const HolderSnapshotArgs = z
  .object({
    chain: z.string(),
    address: z.string(),
    rpcUrl: z.string().optional(),
    topN: z.number().optional()
  })
  .strict();

const neo_holder_snapshot: NeoToolHandler = async (args, ctx) => {
  const a = HolderSnapshotArgs.parse(args);
  if (a.chain.toLowerCase() !== 'solana') {
    return {
      chain: a.chain,
      address: a.address,
      note: 'Chain not supported by default handler. Provide your own tool handler.'
    };
  }
  const rpcUrl = a.rpcUrl ?? DEFAULT_SOLANA_RPC;
  const supply = await solanaRpc<any>(rpcUrl, 'getTokenSupply', [a.address], ctx.signal);
  // top holders via getTokenLargestAccounts
  let topHolders: any = null;
  try {
    const largest = await solanaRpc<any>(rpcUrl, 'getTokenLargestAccounts', [a.address], ctx.signal);
    topHolders = largest?.value?.slice(0, a.topN ?? 5) ?? [];
  } catch {
    topHolders = [];
  }
  return {
    chain: 'solana',
    address: a.address,
    tokenSupply: supply,
    topHolders,
    note: 'This is read-only snapshot data; do not treat as exhaustive.'
  };
};

export function registerDeFiTools(options: RegisterDeFiToolsOptions = {}): NeoToolRegistry {
  if (options.schemasOnly) {
    return { tools: NEO_DEFI_TOOL_SCHEMAS };
  }

  const handlers: Record<string, NeoToolHandler> = {
    neo_explain_token,
    neo_risk_scan,
    neo_simulate_swap,
    neo_explain_transaction,
    neo_holder_snapshot
  };

  return {
    tools: NEO_DEFI_TOOL_SCHEMAS,
    handlers
  };
}
