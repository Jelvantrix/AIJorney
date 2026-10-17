import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock.tsx';

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export const Markdown: React.FC<MarkdownProps> = React.memo(({ content, isStreaming }) => {
  return (
    <div className="prose-chat select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock
                  language={match ? match[1] : 'text'}
                  code={codeString}
                />
              );
            }

            return (
              <code
                className="font-mono text-[0.9em] bg-[var(--surface)] text-[var(--text)] px-[6px] py-[2px] rounded-[6px]"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 w-full">
                <table className="w-full text-left border-collapse">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="font-semibold text-[var(--text)] py-2 px-3 border-b border-[var(--border)]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="py-2.5 px-3 border-b border-[var(--border)] text-[var(--text)]">
                {children}
              </td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-[var(--border)] pl-4 my-4 text-[var(--muted)]">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-[2px] text-[var(--text)] hover:text-[var(--accent-text)] transition-colors duration-150"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="streaming-caret" aria-hidden="true" />}
    </div>
  );
});
