import { z } from 'zod';
import { ToolDefinition, ToolSideEffect } from './types.ts';

export const RetrievalParamsSchema = z.object({
  query: z.string().min(1),
  top_k: z.number().int().min(1).max(8).default(3),
  document_ids: z.array(z.string()).optional(),
});
export type RetrievalParams = z.infer<typeof RetrievalParamsSchema>;

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  chunkIndex: number;
}

// In-memory document index for session uploads
const uploadedDocs: Map<string, { id: string; name: string; content: string; chunks: DocumentChunk[] }> = new Map();

export function indexDocument(id: string, name: string, content: string): DocumentChunk[] {
  // Chunk by paragraphs / line count ~500 chars with 100 char overlap
  const chunks: DocumentChunk[] = [];
  const lines = content.split('\n');
  let currentChunk = '';
  let chunkIdx = 0;

  for (const line of lines) {
    if (currentChunk.length + line.length > 600 && currentChunk.length > 0) {
      chunks.push({
        id: `${id}_chunk_${chunkIdx}`,
        docId: id,
        docName: name,
        text: currentChunk.trim(),
        chunkIndex: chunkIdx++,
      });
      // Retain last 100 chars as overlap
      currentChunk = currentChunk.slice(-100) + '\n' + line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: `${id}_chunk_${chunkIdx}`,
      docId: id,
      docName: name,
      text: currentChunk.trim(),
      chunkIndex: chunkIdx,
    });
  }

  uploadedDocs.set(id, { id, name, content, chunks });
  return chunks;
}

export function getIndexedDocuments() {
  return Array.from(uploadedDocs.values()).map((d) => ({
    id: d.id,
    name: d.name,
    chunkCount: d.chunks.length,
    sizeBytes: d.content.length,
  }));
}

export class RetrievalTool implements ToolDefinition<RetrievalParams, Array<{ chunk: DocumentChunk; score: number }>> {
  public readonly name = 'retrieval';
  public readonly description = 'Retrieve relevant excerpts from uploaded documents via semantic term matching and lexical ranking.';
  public readonly sideEffect: ToolSideEffect = 'read';
  public readonly schema = RetrievalParamsSchema;

  public async execute(params: RetrievalParams): Promise<Array<{ chunk: DocumentChunk; score: number }>> {
    const queryTokens = params.query.toLowerCase().split(/\W+/).filter(Boolean);
    const scoredChunks: Array<{ chunk: DocumentChunk; score: number }> = [];

    for (const doc of uploadedDocs.values()) {
      if (params.document_ids && !params.document_ids.includes(doc.id)) {
        continue;
      }

      for (const chunk of doc.chunks) {
        const chunkText = chunk.text.toLowerCase();
        let score = 0;

        for (const token of queryTokens) {
          if (token.length < 3) continue;
          const occurrences = (chunkText.match(new RegExp(`\\b${token}`, 'g')) || []).length;
          score += occurrences * 1.5;
        }

        // Substring bonus
        if (chunkText.includes(params.query.toLowerCase())) {
          score += 5.0;
        }

        if (score > 0) {
          scoredChunks.push({ chunk, score });
        }
      }
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, params.top_k);
  }
}
