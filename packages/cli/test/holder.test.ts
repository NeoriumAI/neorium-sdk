import { describe, it, expect } from 'vitest';
import { createProgram } from '../src/index';

describe('CLI commands', () => {
  it('registers holder-update command', () => {
    const program = createProgram();
    const has = program.commands.some((c: any) => c.name && c.name() === 'holder-update');
    expect(has).toBeTruthy();
  });
});
