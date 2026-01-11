import { describe, it, expect } from 'vitest';
import { DEFAULT_NEO_HOLDER_PROMPT } from '../src/index';

describe('DEFAULT_NEO_HOLDER_PROMPT', () => {
  it('contains holder guidance and TL;DR instruction', () => {
    expect(DEFAULT_NEO_HOLDER_PROMPT).toContain('AUDIENCE: Token holders');
    expect(DEFAULT_NEO_HOLDER_PROMPT).toMatch(/TL;DR/i);
  });
});
