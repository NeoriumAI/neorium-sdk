import { describe, expect, it } from 'vitest';
import { NeoriumClient, NeoAuthError } from '../src/index.js';

describe('auth', () => {
  it('throws NeoAuthError when api key missing', () => {
    const prev = process.env.NEO_APIKEY;
    const prev2 = process.env.neo_apikey;
    delete process.env.NEO_APIKEY;
    delete process.env.neo_apikey;
    try {
      expect(() => new NeoriumClient({ baseUrl: 'http://localhost' })).toThrow(NeoAuthError);
    } finally {
      if (prev !== undefined) process.env.NEO_APIKEY = prev;
      if (prev2 !== undefined) process.env.neo_apikey = prev2;
    }
  });
});
