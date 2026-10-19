import { ToolDefinition, ToolExecutionRecord } from './types.ts';
import { WebSearchTool } from './web_search.ts';
import { RetrievalTool } from './retrieval.ts';
import { CodeExecTool } from './code_exec.ts';

class ToolRegistryClass {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.register(new WebSearchTool());
    this.register(new RetrievalTool());
    this.register(new CodeExecTool());
  }

  public register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async invoke(name: string, rawParams: unknown): Promise<ToolExecutionRecord> {
    const tool = this.tools.get(name);
    const startTime = Date.now();

    if (!tool) {
      return {
        tool: name,
        params: {},
        output: `Error: Unknown tool "${name}"`,
        status: 'error',
        durationMs: 0,
      };
    }

    try {
      const validatedParams = tool.schema.parse(rawParams);
      const result = await tool.execute(validatedParams);
      return {
        tool: name,
        params: validatedParams,
        output: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
        status: 'end',
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        tool: name,
        params: (rawParams as Record<string, unknown>) || {},
        output: `Tool execution failed: ${err.message || String(err)}`,
        status: 'error',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export const ToolRegistry = new ToolRegistryClass();
