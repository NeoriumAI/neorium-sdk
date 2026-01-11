#!/usr/bin/env node
import { Command } from 'commander';
import {
  NeoriumClient,
  NeoAPIError,
  NeoAuthError,
  NeoNetworkError,
  NeoRateLimitError,
  buildNeoSystemPrompt,
  buildNeoHolderPrompt,
  registerDeFiTools
} from '@neorium/sdk';

function getEnv(name: string): string | undefined {
  return process.env[name] ?? process.env[name.toLowerCase()];
}

function getApiKeyFromEnv(): string | undefined {
  return process.env.NEO_APIKEY ?? process.env.neo_apikey;
}

function getClient(): NeoriumClient {
  const baseUrl = process.env.NEO_BASE_URL;
  const model = process.env.NEO_MODEL;
  const timeoutMs = process.env.NEO_TIMEOUT_MS ? Number(process.env.NEO_TIMEOUT_MS) : undefined;
  const opts: any = {
    userAgent: 'neorium-cli'
  };
  const apiKey = getApiKeyFromEnv();
  if (apiKey) opts.apiKey = apiKey;
  if (baseUrl) opts.baseUrl = baseUrl;
  if (model) opts.model = model;
  if (Number.isFinite(timeoutMs as any)) opts.timeoutMs = timeoutMs;
  return new NeoriumClient(opts);
}

function printError(err: unknown): void {
  if (err instanceof NeoAuthError) {
    console.error(`Auth error: ${err.message}`);
    return;
  }
  if (err instanceof NeoRateLimitError) {
    const ra = err.retryAfterMs ? ` (retryAfterMs=${err.retryAfterMs})` : '';
    console.error(`Rate limited: ${err.message}${ra}`);
    return;
  }
  if (err instanceof NeoNetworkError) {
    console.error(`Network error: ${err.message}`);
    return;
  }
  if (err instanceof NeoAPIError) {
    console.error(`API error: ${err.message}`);
    return;
  }
  if (err instanceof Error) {
    console.error(err.message);
    return;
  }
  console.error(String(err));
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('neorium')
    .description('NEORIUM (neo) — Your DeFi Co-Pilot.')
    .version('0.1.0');

  program
    .command('verify-env')
    .description('Verify NEO_APIKEY / neo_apikey is set')
    .action(() => {
      const key = getApiKeyFromEnv();
      if (!key) {
        console.error('Missing API key. Set NEO_APIKEY (alias: neo_apikey).');
        process.exitCode = 2;
        return;
      }
      console.log('OK: API key is set.');
      if (getEnv('NEO_BASE_URL')) console.log('NEO_BASE_URL is set.');
      if (getEnv('NEO_MODEL')) console.log('NEO_MODEL is set.');
      if (getEnv('NEO_TIMEOUT_MS')) console.log('NEO_TIMEOUT_MS is set.');
    });

  program
    .command('chat')
    .description('Chat with NEORIUM')
    .argument('<question>', 'Question to ask')
    .option('--stream', 'Stream tokens live')
    .option('--json', 'Output JSON')
    .action(async (question: string, options: { stream?: boolean; json?: boolean }) => {
      try {
        const client = getClient();
        const system = buildNeoSystemPrompt({ chainHint: 'solana' });
        const messages = [
          { role: 'system' as const, content: system },
          { role: 'user' as const, content: question }
        ];

        if (options.stream) {
          let full = '';
          for await (const chunk of client.chat.completions.stream({ messages })) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              process.stdout.write(delta);
            }
          }
          process.stdout.write('\n');
          if (options.json) {
            process.stdout.write(JSON.stringify({ content: full }, null, 2) + '\n');
          }
          return;
        }

        const resp = await client.chat.completions.create({ messages });
        if (options.json) {
          process.stdout.write(JSON.stringify(resp, null, 2) + '\n');
        } else {
          process.stdout.write((resp.choices?.[0]?.message?.content ?? '') + '\n');
        }
      } catch (e) {
        printError(e);
        process.exitCode = 1;
      }
    });

  program
    .command('explain-token')
    .description('Explain a token factually (read-only)')
    .requiredOption('--chain <chain>', 'Chain identifier (e.g. solana)')
    .requiredOption('--address <address>', 'Token mint / contract address')
    .action(async (options: { chain: string; address: string }) => {
      try {
        const client = getClient();
        const registry = registerDeFiTools();
        const resp = await client.chat.completions.create(
          {
            messages: [
              { role: 'system', content: buildNeoSystemPrompt({ chainHint: options.chain }) },
              {
                role: 'user',
                content:
                  `Explain this token factually. Include supply/decimals if available.\n\nchain=${options.chain}\naddress=${options.address}`
              }
            ],
            tools: registry.tools,
            tool_choice: { type: 'function', function: { name: 'neo_explain_token' } }
          },
          {
            ...(registry.handlers ? { toolHandlers: registry.handlers } : {})
          }
        );
        process.stdout.write((resp.choices?.[0]?.message?.content ?? '') + '\n');
      } catch (e) {
        printError(e);
        process.exitCode = 1;
      }
    });

  program
    .command('risk-scan')
    .description('Run a read-only risk checklist for an address')
    .requiredOption('--chain <chain>', 'Chain identifier (e.g. solana)')
    .requiredOption('--address <address>', 'Token mint / contract address')
    .action(async (options: { chain: string; address: string }) => {
      try {
        const client = getClient();
        const registry = registerDeFiTools();
        const resp = await client.chat.completions.create(
          {
            messages: [
              { role: 'system', content: buildNeoSystemPrompt({ chainHint: options.chain }) },
              {
                role: 'user',
                content:
                  `Perform a cautious, read-only risk scan checklist for:\nchain=${options.chain}\naddress=${options.address}\n\nDo not claim safety. State uncertainties.`
              }
            ],
            tools: registry.tools,
            tool_choice: { type: 'function', function: { name: 'neo_risk_scan' } }
          },
          {
            ...(registry.handlers ? { toolHandlers: registry.handlers } : {})
          }
        );
        process.stdout.write((resp.choices?.[0]?.message?.content ?? '') + '\n');
      } catch (e) {
        printError(e);
        process.exitCode = 1;
      }
    });

  program
    .command('holder-update')
    .description('Generate a concise holder-facing update for a token')
    .requiredOption('--chain <chain>', 'Chain identifier (e.g. solana)')
    .requiredOption('--address <address>', 'Token mint / contract address')
    .option('--topN <n>', 'Number of top holders to include (default 5)', (v) => Number(v), 5)
    .option('--json', 'Output JSON')
    .action(async (options: { chain: string; address: string; topN?: number; json?: boolean }) => {
      try {
        const client = getClient();
        const registry = registerDeFiTools();
        const system = buildNeoHolderPrompt({ chainHint: options.chain });
        const messages = [
          { role: 'system' as const, content: system },
          { role: 'user' as const, content: `Write a short investor-facing update for token ${options.address}. Include TL;DR (1 line), 3-6 bullets, explicit risks, and a single CTA.` }
        ];
        const resp = await client.chat.completions.create(
          {
            messages,
            tools: registry.tools,
            tool_choice: { type: 'function', function: { name: 'neo_holder_snapshot' } }
          },
          {
            ...(registry.handlers ? { toolHandlers: registry.handlers } : {})
          }
        );
        const out = resp.choices?.[0]?.message?.content ?? '';
        if (options.json) process.stdout.write(JSON.stringify({ content: out }, null, 2) + '\n');
        else process.stdout.write(out + '\n');
      } catch (e) {
        printError(e);
        process.exitCode = 1;
      }
    });

  program
    .command('glossary')
    .description('Explain a DeFi term concisely')
    .argument('<term>', 'Term to explain')
    .action(async (term: string) => {
      try {
        const client = getClient();
        const resp = await client.chat.completions.create({
          messages: [
            { role: 'system', content: buildNeoSystemPrompt({ chainHint: 'solana' }) },
            {
              role: 'user',
              content: `Define the DeFi term: ${term}. Be concise, include risks if relevant.`
            }
          ]
        });
        process.stdout.write((resp.choices?.[0]?.message?.content ?? '') + '\n');
      } catch (e) {
        printError(e);
        process.exitCode = 1;
      }
    });

  return program;
}

async function main() {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((e) => {
  printError(e);
  process.exitCode = 1;
});
