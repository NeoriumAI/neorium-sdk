import { DEFAULT_NEO_SYSTEM_PROMPT, DEFAULT_NEO_HOLDER_PROMPT } from '@neorium/prompts';

export type BuildNeoSystemPromptOptions = {
  chainHint?: 'solana' | string;
  extraRules?: string[];
};

export function buildNeoSystemPrompt(options: BuildNeoSystemPromptOptions = {}): string {
  const extra: string[] = [];
  if (options.chainHint) {
    extra.push(`CHAIN CONTEXT: Prefer ${options.chainHint}-first details when applicable, but remain chain-agnostic in design.`);
  }
  if (options.extraRules && options.extraRules.length > 0) {
    extra.push('EXTRA RULES:');
    for (const r of options.extraRules) extra.push(`- ${r}`);
  }
  if (extra.length === 0) return DEFAULT_NEO_SYSTEM_PROMPT;
  return `${DEFAULT_NEO_SYSTEM_PROMPT}\n\n${extra.join('\n')}`;
}

export function buildNeoHolderPrompt(options: BuildNeoSystemPromptOptions = {}): string {
  const extra: string[] = [];
  if (options.chainHint) {
    extra.push(`CHAIN CONTEXT: Prefer ${options.chainHint}-first details when applicable, but remain chain-agnostic in design.`);
  }
  if (options.extraRules && options.extraRules.length > 0) {
    extra.push('EXTRA RULES:');
    for (const r of options.extraRules) extra.push(`- ${r}`);
  }
  if (extra.length === 0) return DEFAULT_NEO_HOLDER_PROMPT;
  return `${DEFAULT_NEO_HOLDER_PROMPT}\n\n${extra.join('\n')}`;
}
