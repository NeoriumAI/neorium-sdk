import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      '@neorium/prompts': fileURLToPath(new URL('../prompts/src/index.ts', import.meta.url))
    }
  }
});
