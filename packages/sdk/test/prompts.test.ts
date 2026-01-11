import { describe, it, expect } from 'vitest';
import { buildNeoHolderPrompt } from '../src/prompts';

describe('buildNeoHolderPrompt', () => {
  it('includes chain hint when provided', () => {
    const p = buildNeoHolderPrompt({ chainHint: 'solana' });
    expect(p).toContain('Prefer solana-first');
  });
});
