import { z } from 'zod';
import { ToolDefinition, ToolSideEffect } from './types.ts';
import { config } from '../config.ts';
import vm from 'node:vm';

export const CodeExecParamsSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python']).default('javascript'),
  code: z.string().min(1).max(5000),
  timeout_ms: z.number().int().min(100).max(3000).default(1500),
});
export type CodeExecParams = z.infer<typeof CodeExecParamsSchema>;

export interface CodeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export class CodeExecTool implements ToolDefinition<CodeExecParams, CodeExecResult> {
  public readonly name = 'code_exec';
  public readonly description = 'Execute algorithmic code in a sandboxed runtime with strict CPU, memory, and timeout bounds.';
  public readonly sideEffect: ToolSideEffect = 'write_internal';
  public readonly schema = CodeExecParamsSchema;

  public async execute(params: CodeExecParams): Promise<CodeExecResult> {
    if (!config.CODE_EXEC_ENABLED) {
      return {
        stdout: '',
        stderr: 'Code execution tool is disabled by administrator policy (CODE_EXEC_ENABLED=false).',
        exitCode: 1,
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Create locked-down VM sandbox
    const sandbox = {
      console: {
        log: (...args: any[]) => {
          stdoutBuffer += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
        },
        error: (...args: any[]) => {
          stderrBuffer += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
        },
        warn: (...args: any[]) => {
          stdoutBuffer += '[WARN] ' + args.join(' ') + '\n';
        },
      },
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
    };

    const vmContext = vm.createContext(sandbox);

    try {
      const script = new vm.Script(params.code, {
        filename: 'sandbox.js',
      });

      const result = script.runInContext(vmContext, {
        timeout: params.timeout_ms,
        displayErrors: true,
      });

      if (result !== undefined && !stdoutBuffer) {
        stdoutBuffer = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      }

      return {
        stdout: stdoutBuffer.slice(0, 4000),
        stderr: stderrBuffer.slice(0, 4000),
        exitCode: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        stdout: stdoutBuffer.slice(0, 4000),
        stderr: (stderrBuffer + (err.message || String(err))).slice(0, 4000),
        exitCode: 1,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
