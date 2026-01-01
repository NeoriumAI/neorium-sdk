# @neorium/sdk

NEORIUM (neo) — Your DeFi Co-Pilot.

TypeScript AI SDK with:
- OpenAI-like chat messages
- Streaming (SSE chunks)
- Tool calling + safe tool loop (bounded iterations, strict validation)
- Retries (exponential backoff) + timeouts + AbortSignal support
- Typed errors

## Install
```bash
npm i @neorium/sdk
```

## Environment
Required:
- `NEO_APIKEY` (alias: `neo_apikey`)

Optional:
- `NEO_BASE_URL` (default: `https://api.neorium.ai`)
- `NEO_MODEL` (default: `neorium-1`)
- `NEO_TIMEOUT_MS`

## Usage
```ts
import { NeoriumClient, buildNeoSystemPrompt } from '@neorium/sdk';

const neo = new NeoriumClient({ apiKey: process.env.NEO_APIKEY });

const resp = await neo.chat.completions.create({
  messages: [
    { role: 'system', content: buildNeoSystemPrompt({ chainHint: 'solana' }) },
    { role: 'user', content: 'Explain impermanent loss in 5 bullets.' }
  ]
});

console.log(resp.choices[0].message.content);
```

## Streaming
```ts
for await (const chunk of neo.chat.completions.stream({ messages })) {
  const delta = chunk.choices?.[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
```

## Tools + Safe Tool Loop
```ts
import { registerDeFiTools } from '@neorium/sdk';

const registry = registerDeFiTools();

const resp = await neo.chat.completions.create(
  {
    messages,
    tools: registry.tools,
    tool_choice: { type: 'function', function: { name: 'neo_risk_scan' } }
  },
  { toolHandlers: registry.handlers, maxToolIterations: 5 }
);
```

## Errors
- `NeoError` (base)
- `NeoAuthError`
- `NeoRateLimitError`
- `NeoNetworkError`
- `NeoAPIError`
