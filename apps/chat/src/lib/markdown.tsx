import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownProps {
  content: string;
  onOpenArtifact?: (artifact: { type: 'code' | 'document' | 'preview'; title: string; content: string; language?: string }) => void;
}

export const MarkdownRenderer: React.FC<MarkdownProps> = React.memo(({ content, onOpenArtifact }) => {
  // Parse blocks (fenced code blocks vs standard text blocks)
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3 leading-relaxed text-[14px] text-[var(--text)]">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              language={block.language || 'text'}
              code={block.content}
              onOpenArtifact={onOpenArtifact}
            />
          );
        }

        if (block.type === 'table') {
          return <TableBlock key={idx} rows={block.tableRows || []} />;
        }

        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1 key={idx} className="text-lg font-semibold tracking-tight text-[var(--text)] pt-2 border-b border-[var(--border)] pb-1.5">
                {block.content}
              </h1>
            );
          }
          return (
            <h2 key={idx} className="text-base font-semibold tracking-tight text-[var(--text)] pt-1.5">
              {block.content}
            </h2>
          );
        }

        if (block.type === 'hr') {
          return <hr key={idx} className="border-t border-[var(--border)] my-3" />;
        }

        return (
          <p key={idx} className="whitespace-pre-wrap">
            {renderInlineMarkdown(block.content)}
          </p>
        );
      })}
    </div>
  );
});

interface Block {
  type: 'paragraph' | 'code' | 'table' | 'heading' | 'hr';
  content: string;
  language?: string;
  level?: number;
  tableRows?: string[][];
}

function parseMarkdownBlocks(rawText: string): Block[] {
  const blocks: Block[] = [];
  const lines = rawText.split('\n');
  let inCode = false;
  let codeLang = '';
  let codeBuffer: string[] = [];

  let tableBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code fence
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuffer = [];
      } else {
        inCode = false;
        blocks.push({
          type: 'code',
          language: codeLang,
          content: codeBuffer.join('\n'),
        });
        codeBuffer = [];
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Check for table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      tableBuffer.push(line);
      continue;
    } else if (tableBuffer.length > 0) {
      // Process table
      const rows = tableBuffer
        .filter((r) => !r.includes('---'))
        .map((r) =>
          r
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );
      blocks.push({ type: 'table', content: '', tableRows: rows });
      tableBuffer = [];
    }

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({ type: 'hr', content: '' });
      continue;
    }

    // Heading
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, content: line.slice(2) });
      continue;
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, content: line.slice(3) });
      continue;
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 2, content: line.slice(4) });
      continue;
    }

    // Standard paragraph or empty line
    if (line.trim()) {
      blocks.push({ type: 'paragraph', content: line });
    }
  }

  // Handle open code fence during streaming
  if (inCode && codeBuffer.length > 0) {
    blocks.push({
      type: 'code',
      language: codeLang,
      content: codeBuffer.join('\n'),
    });
  }

  if (tableBuffer.length > 0) {
    const rows = tableBuffer
      .filter((r) => !r.includes('---'))
      .map((r) =>
        r
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
      );
    blocks.push({ type: 'table', content: '', tableRows: rows });
  }

  return blocks;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Safe inline parsing: **bold**, `code`, *italic*
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-[var(--text)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 text-xs font-mono rounded-[4px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[var(--text)]">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

const CodeBlock: React.FC<{
  language: string;
  code: string;
  onOpenArtifact?: (artifact: { type: 'code' | 'preview'; title: string; content: string; language?: string }) => void;
}> = ({ language, code, onOpenArtifact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWorkspace = () => {
    if (onOpenArtifact) {
      const isPreview = ['html', 'tsx', 'jsx', 'svg'].includes(language.toLowerCase());
      onOpenArtifact({
        type: isPreview ? 'preview' : 'code',
        title: `${language.toUpperCase()} Snippet`,
        content: code,
        language,
      });
    }
  };

  return (
    <div className="relative group my-3 rounded-[8px] bg-[var(--surface-1)] border border-[var(--border)] overflow-hidden">
      {/* Code header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--surface-2)] border-b border-[var(--border)] text-xs text-[var(--text-muted)] font-mono">
        <span className="uppercase tracking-wider">{language || 'code'}</span>
        <div className="flex items-center gap-2">
          {onOpenArtifact && (
            <button
              onClick={handleOpenWorkspace}
              className="flex items-center gap-1 hover:text-[var(--text)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--surface-1)]"
              title="Open in Workspace panel"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-[var(--text)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--surface-1)]"
            title="Copy snippet"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code contents */}
      <pre className="p-3.5 overflow-x-auto text-[13px] font-mono leading-relaxed text-[var(--text)] whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TableBlock: React.FC<{ rows: string[][] }> = ({ rows }) => {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-[8px] border border-[var(--border)]">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[var(--surface-2)] border-b border-[var(--border)]">
          <tr>
            {header.map((col, idx) => (
              <th key={idx} className="p-2.5 font-medium text-[var(--text)]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-1)]">
          {body.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[var(--surface-2)]/50 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2.5 text-[var(--text-muted)] font-mono tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
