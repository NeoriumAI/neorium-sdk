import { describe, expect, it } from 'vitest';
import { parseSse } from '../src/sse.js';

function makeStream(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(text));
      controller.close();
    }
  });
}

describe('sse parser', () => {
  it('parses data events', async () => {
    const stream = makeStream('data: {"a":1}\n\n' + 'data: [DONE]\n\n');
    const events: string[] = [];
    for await (const ev of parseSse(stream)) events.push(ev.data);
    expect(events).toEqual(['{"a":1}', '[DONE]']);
  });
});
