export type SseEvent = { data: string };

// Minimal SSE parser: supports `data:` lines and blank-line delimiters.
export async function* parseSse(readable: ReadableStream<Uint8Array>): AsyncIterable<SseEvent> {
  const decoder = new TextDecoder('utf-8');
  const reader = readable.getReader();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf('\n\n');
      if (idx === -1) break;
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = rawEvent.split(/\r?\n/);
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trimStart());
      }
      const data = dataLines.join('\n');
      if (data.length === 0) continue;
      yield { data };
    }
  }

  // trailing buffer without delimiter is ignored (common when server terminates cleanly)
}
