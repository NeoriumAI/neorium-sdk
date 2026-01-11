import * as vscode from 'vscode';
import { NeoriumClient, buildNeoSystemPrompt, buildNeoHolderPrompt, registerDeFiTools } from '@neorium/sdk';

const SECRET_KEY = 'neorium.apiKey';

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('neorium');
  return {
    baseUrl: cfg.get<string>('baseUrl', 'https://api.neorium.ai'),
    model: cfg.get<string>('model', 'neorium-1'),
    temperature: cfg.get<number>('temperature', 0.2),
    enableInlineCompletion: cfg.get<boolean>('enableInlineCompletion', true)
  };
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  const existing = await context.secrets.get(SECRET_KEY);
  if (existing) return existing;

  const value = await vscode.window.showInputBox({
    title: 'Neorium API Key',
    prompt: 'Enter your Neorium API key (stored securely).',
    password: true,
    ignoreFocusOut: true
  });
  if (!value) return undefined;
  await context.secrets.store(SECRET_KEY, value);
  return value;
}

function makeClient(apiKey: string): NeoriumClient {
  const cfg = getConfig();
  return new NeoriumClient({
    apiKey,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    userAgent: 'neorium-vscode'
  });
}

async function maybeInsertIntoEditor(content: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    await vscode.env.clipboard.writeText(content);
    return;
  }

  const choice = await vscode.window.showInformationMessage('Neorium response ready.', 'Insert', 'Copy');
  if (choice === 'Copy') {
    await vscode.env.clipboard.writeText(content);
    return;
  }
  if (choice === 'Insert') {
    await editor.edit((eb) => eb.insert(editor.selection.active, content));
  }
}

function getSelectedOrDocumentText(): { selection: string; full: string } {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return { selection: '', full: '' };
  const selection = editor.document.getText(editor.selection);
  const full = editor.document.getText();
  return { selection, full };
}

class RateLimiter {
  private lastAt = 0;
  constructor(private readonly minIntervalMs: number) {}
  canRun(): boolean {
    const now = Date.now();
    if (now - this.lastAt < this.minIntervalMs) return false;
    this.lastAt = now;
    return true;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Neorium');
  output.appendLine('NEORIUM (neo) — Your DeFi Co-Pilot. Extension activated.');

  const limiter = new RateLimiter(800);

  async function runChat(prompt: string, token?: vscode.CancellationToken): Promise<string | undefined> {
    if (!limiter.canRun()) return undefined;
    const apiKey = await getApiKey(context);
    if (!apiKey) return undefined;
    const client = makeClient(apiKey);

    const callOpts = token?.isCancellationRequested ? { signal: AbortSignal.abort() } : {};
    const resp = await client.chat.completions.create(
      {
      messages: [
        { role: 'system', content: buildNeoSystemPrompt({ chainHint: 'solana' }) },
        { role: 'user', content: prompt }
      ],
      temperature: getConfig().temperature
      },
      callOpts
    );
    return resp.choices?.[0]?.message?.content ?? '';
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('neorium.askDefiCopilot', async () => {
      try {
        const q = await vscode.window.showInputBox({
          title: 'Neorium: Ask DeFi Copilot',
          prompt: 'Ask a DeFi question (no private keys / no signing).',
          ignoreFocusOut: true
        });
        if (!q) return;
        output.appendLine('askDefiCopilot: request');
        const content = await runChat(q);
        if (!content) return;
        output.appendLine('askDefiCopilot: response ready');
        await maybeInsertIntoEditor(content);
      } catch (e: any) {
        output.appendLine(`Error: ${e?.message ?? String(e)}`);
        vscode.window.showErrorMessage('Neorium request failed. See OutputChannel: Neorium.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('neorium.explainSelection', async () => {
      try {
        const { selection } = getSelectedOrDocumentText();
        if (!selection) {
          vscode.window.showWarningMessage('Select text to explain.');
          return;
        }
        const prompt = `Explain this selected text for a developer/analyst. Be factual, note risks/assumptions:\n\n${selection}`;
        output.appendLine('explainSelection: request');
        const content = await runChat(prompt);
        if (!content) return;
        await maybeInsertIntoEditor(content);
      } catch (e: any) {
        output.appendLine(`Error: ${e?.message ?? String(e)}`);
        vscode.window.showErrorMessage('Neorium request failed. See OutputChannel: Neorium.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('neorium.riskScanAddress', async () => {
      try {
        const address = await vscode.window.showInputBox({
          title: 'Neorium: Risk Scan Address',
          prompt: 'Enter token mint / contract address.',
          ignoreFocusOut: true
        });
        if (!address) return;
        const apiKey = await getApiKey(context);
        if (!apiKey) return;
        const client = makeClient(apiKey);
        const registry = registerDeFiTools();
        output.appendLine('riskScanAddress: request');
        const resp = await client.chat.completions.create(
          {
            messages: [
              { role: 'system', content: buildNeoSystemPrompt({ chainHint: 'solana' }) },
              {
                role: 'user',
                content: `Perform a cautious read-only risk scan for:\nchain=solana\naddress=${address}`
              }
            ],
            tools: registry.tools,
            tool_choice: { type: 'function', function: { name: 'neo_risk_scan' } }
          },
          {
            ...(registry.handlers ? { toolHandlers: registry.handlers } : {})
          }
        );
        const content = resp.choices?.[0]?.message?.content ?? '';
        await maybeInsertIntoEditor(content);
      } catch (e: any) {
        output.appendLine(`Error: ${e?.message ?? String(e)}`);
        vscode.window.showErrorMessage('Neorium request failed. See OutputChannel: Neorium.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('neorium.generateHolderUpdate', async () => {
      try {
        const address = await vscode.window.showInputBox({
          title: 'Neorium: Generate Holder Update',
          prompt: 'Enter token mint / contract address.',
          ignoreFocusOut: true
        });
        if (!address) return;
        const chain = await vscode.window.showInputBox({ title: 'Chain (e.g. solana)', value: 'solana', ignoreFocusOut: true });
        const apiKey = await getApiKey(context);
        if (!apiKey) return;
        const client = makeClient(apiKey);
        const registry = registerDeFiTools();
        output.appendLine('generateHolderUpdate: request');
        const resp = await client.chat.completions.create(
          {
            messages: [
              { role: 'system', content: buildNeoHolderPrompt({ chainHint: chain ?? 'solana' }) },
              {
                role: 'user',
                content: `Generate a concise investor-facing update for token ${address}: TL;DR (1 line), 3-6 bullets, explicit risks, and a single CTA.`
              }
            ],
            tools: registry.tools,
            tool_choice: { type: 'function', function: { name: 'neo_holder_snapshot' } }
          },
          {
            ...(registry.handlers ? { toolHandlers: registry.handlers } : {})
          }
        );
        const content = resp.choices?.[0]?.message?.content ?? '';
        await maybeInsertIntoEditor(content);
      } catch (e: any) {
        output.appendLine(`Error: ${e?.message ?? String(e)}`);
        vscode.window.showErrorMessage('Neorium request failed. See OutputChannel: Neorium.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('neorium.generateDefiScript', async () => {
      try {
        const goal = await vscode.window.showInputBox({
          title: 'Neorium: Generate DeFi Script (TypeScript)',
          prompt: 'Describe the TypeScript DeFi script you want.',
          ignoreFocusOut: true
        });
        if (!goal) return;
        const prompt = `Generate a TypeScript script (no private keys, no signing) to: ${goal}\n\nOutput only code.`;
        output.appendLine('generateDefiScript: request');
        const content = await runChat(prompt);
        if (!content) return;
        await maybeInsertIntoEditor(content);
      } catch (e: any) {
        output.appendLine(`Error: ${e?.message ?? String(e)}`);
        vscode.window.showErrorMessage('Neorium request failed. See OutputChannel: Neorium.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('neorium.fixCodeUsingNeo', async () => {
      try {
        const { selection, full } = getSelectedOrDocumentText();
        const target = selection || full;
        if (!target) {
          vscode.window.showWarningMessage('Open a file or select code to fix.');
          return;
        }
        const prompt = `Fix this code carefully. Preserve intent. Explain changes briefly, then output the corrected code.\n\n${target}`;
        output.appendLine('fixCodeUsingNeo: request');
        const content = await runChat(prompt);
        if (!content) return;
        await maybeInsertIntoEditor(content);
      } catch (e: any) {
        output.appendLine(`Error: ${e?.message ?? String(e)}`);
        vscode.window.showErrorMessage('Neorium request failed. See OutputChannel: Neorium.');
      }
    })
  );

  // Inline completion provider (TS/JS/Rust/Markdown)
  const provider: vscode.InlineCompletionItemProvider = {
    provideInlineCompletionItems: async (document, position, _context, token) => {
      const cfg = getConfig();
      if (!cfg.enableInlineCompletion) return [];
      if (token.isCancellationRequested) return [];
      if (!limiter.canRun()) return [];

      const apiKey = await getApiKey(context);
      if (!apiKey) return [];
      const client = makeClient(apiKey);

      const startLine = Math.max(0, position.line - 30);
      const range = new vscode.Range(startLine, 0, position.line, position.character);
      const prefix = document.getText(range);
      const suffix = document.getText(new vscode.Range(position, new vscode.Position(Math.min(position.line + 5, document.lineCount - 1), 0)));

      const prompt =
        `You are helping with inline code completion.\n` +
        `Return only the completion text to insert at the cursor.\n` +
        `Language: ${document.languageId}\n\n` +
        `PREFIX:\n${prefix}\n\nSUFFIX:\n${suffix}`;

      try {
        const resp = await client.chat.completions.create(
          {
            messages: [
              { role: 'system', content: buildNeoSystemPrompt({ chainHint: 'solana' }) },
              { role: 'user', content: prompt }
            ],
            temperature: cfg.temperature
          },
          token.isCancellationRequested ? { signal: AbortSignal.abort() } : {}
        );

        const text = resp.choices?.[0]?.message?.content ?? '';
        if (!text.trim()) return [];
        return [new vscode.InlineCompletionItem(text)];
      } catch {
        return [];
      }
    }
  };

  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      [{ language: 'typescript' }, { language: 'javascript' }, { language: 'rust' }, { language: 'markdown' }],
      provider
    )
  );
}

export function deactivate() {}
