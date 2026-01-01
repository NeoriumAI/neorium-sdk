import { describe, expect, it } from 'vitest';
import http from 'node:http';
import { NeoriumClient } from '../src/index.js';

function listen(server: http.Server): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((r) => server.close(() => r()))
      });
    });
  });
}

describe('retries', () => {
  it('retries on 5xx and eventually succeeds', async () => {
    let calls = 0;
    const server = http.createServer((req, res) => {
      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        calls++;
        if (calls < 3) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'temporary' }));
          return;
        }
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            id: 'x',
            object: 'chat.completion',
            created: Date.now(),
            model: 'neorium-1',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop'
              }
            ]
          })
        );
        return;
      }
      res.statusCode = 404;
      res.end();
    });

    const svc = await listen(server);
    try {
      const client = new NeoriumClient({ apiKey: 'test', baseUrl: svc.url, maxRetries: 3, timeoutMs: 2000 });
      const resp = await client.chat.completions.create({ messages: [{ role: 'user', content: 'hi' }] });
      expect(resp.choices[0]?.message?.content).toBe('ok');
      expect(calls).toBe(3);
    } finally {
      await svc.close();
    }
  });
});
