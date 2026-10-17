import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { getStoredTheme } from '../lib/theme.ts';

interface CodeBlockProps {
  language: string;
  code: string;
}

// Lazy-loaded shiki highlighter singleton
let shikiPromise: Promise<any> | null = null;
let shikiInstance: any = null;

async function getHighlighter() {
  if (shikiInstance) return shikiInstance;
  if (!shikiPromise) {
    shikiPromise = (async () => {
      try {
        const { createHighlighter } = await import('shiki');
        const h = await createHighlighter({
          themes: ['github-dark', 'github-light'],
          langs: ['typescript', 'javascript', 'python', 'json', 'bash', 'html', 'css', 'sql', 'markdown'],
        });
        shikiInstance = h;
        return h;
      } catch (err) {
        console.warn('Shiki lazy-load warning:', err);
        return null;
      }
    })();
  }
  return shikiPromise;
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  const cleanLang = (language || 'text').toLowerCase();

  useEffect(() => {
    let cancelled = false;

    getHighlighter().then((highlighter) => {
      if (cancelled || !highlighter) return;

      try {
        const isDark = document.documentElement.classList.contains('dark');
        const theme = isDark ? 'github-dark' : 'github-light';
        const langToUse = highlighter.getLoadedLanguages().includes(cleanLang) ? cleanLang : 'text';

        const html = highlighter.codeToHtml(code, {
          lang: langToUse,
          theme,
        });

        // Extract just the inner content or style appropriately
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch {
        // Fallback to plain text
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, cleanLang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] dark:border-transparent overflow-hidden">
      {/* Header bar 36px */}
      <div className="h-[36px] px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] text-[12px] text-[var(--muted)] select-none">
        <span className="font-mono lowercase">{cleanLang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-150"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--text)]" />
              <span className="text-[var(--text)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body 14px JetBrains Mono, 1.6 line height, 16px padding */}
      {highlightedHtml ? (
        <div
          className="p-4 overflow-x-auto text-[14px] leading-[1.6] font-mono [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 [&>pre>code]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="p-4 overflow-x-auto text-[14px] leading-[1.6] font-mono text-[var(--text)] whitespace-pre">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
});
