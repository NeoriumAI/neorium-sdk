import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/index.js';

describe('cli args', () => {
  it('shows help without crashing', async () => {
    const program = createProgram();
    program.exitOverride();
    await expect(program.parseAsync(['node', 'neorium', '--help'])).rejects.toBeTruthy();
  });
});
