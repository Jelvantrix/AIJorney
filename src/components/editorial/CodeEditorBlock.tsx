import React, { useMemo, useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { Copy, Check, FileCode, Maximize2, WrapText, ChevronRight } from 'lucide-react';

interface CodeEditorBlockProps {
  code: string;
  language?: string;
  title?: string;
}

type Token = { v: string; k: string };

const KEYWORDS = new RegExp(
  '^(?:const|let|var|function|return|import|export|from|default|class|interface|type|async|await|if|else|switch|case|break|continue|for|while|do|try|catch|finally|throw|new|typeof|instanceof|void|in|of|as|extends|implements|public|private|protected|static|readonly|fn|pub|struct|impl|enum|mut|match|where|use|crate|mod|trait|let|self|Self|def|elif|lambda|yield|with|pass|raise|None|package|func|go|defer|chan|map|range|select|table|insert|into|values|update|delete|create|where|join|group|order|by|limit)$'
);

const LITERALS = /^(?:true|false|null|undefined|None|Some|Ok|Err|NaN)$/;

function tokenize(line: string): Token[] {
  const trimmed = line.trimStart();
  if (/^(\/\/|#|--|\/\*|\*)/.test(trimmed)) {
    return [{ v: line, k: 'comment' }];
  }

  const re =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*$|\b[A-Za-z_$][\w$]*\b|\b\d[\d._]*\b|[{}()[\];,.:=+\-*/<>!&|?@]+|\s+)/g;

  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push({ v: line.slice(last, m.index), k: 'plain' });
    const t = m[0];

    if (/^["'`]/.test(t)) out.push({ v: t, k: 'string' });
    else if (/^\/\//.test(t)) out.push({ v: t, k: 'comment' });
    else if (KEYWORDS.test(t)) out.push({ v: t, k: 'keyword' });
    else if (LITERALS.test(t)) out.push({ v: t, k: 'literal' });
    else if (/^\d/.test(t)) out.push({ v: t, k: 'number' });
    else if (/^[{}()[\];,.:=+\-*/<>!&|?@]+$/.test(t)) out.push({ v: t, k: 'punct' });
    else if (/^[A-Z]/.test(t)) out.push({ v: t, k: 'type' });
    else if (line[m.index + t.length] === '(') out.push({ v: t, k: 'fn' });
    else out.push({ v: t, k: 'plain' });

    last = m.index + t.length;
  }
  if (last < line.length) out.push({ v: line.slice(last), k: 'plain' });
  return out;
}

const TOKEN_CLASS: Record<string, string> = {
  keyword: 'font-semibold',
  string: 'opacity-90',
  comment: 'italic',
  literal: 'font-medium opacity-90',
  number: 'font-medium opacity-90',
  type: 'font-medium',
  fn: 'font-medium',
  punct: 'opacity-45',
  plain: 'opacity-80',
};

function escapeHtml(s: string) {
  return s;
}

export const CodeEditorBlock: React.FC<CodeEditorBlockProps> = ({ code, language, title }) => {
  const { showLineNumbers, codeFontSize, setCodeFontSize, openArtifact } = useChatStore();
  const [copied, setCopied] = useState(false);
  const [isWrap, setIsWrap] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const cleanCode = code.replace(/\n$/, '');
  const lines = useMemo(() => cleanCode.split('\n'), [cleanCode]);

  const lang = (language || 'typescript').toLowerCase();
  const ext =
    lang === 'rust' ? 'rs' : lang === 'python' ? 'py' : lang === 'go' ? 'go'
    : lang === 'json' ? 'json' : lang === 'sql' ? 'sql' : lang === 'html' ? 'html'
    : lang === 'css' ? 'css' : lang === 'bash' || lang === 'sh' ? 'sh'
    : lang === 'yaml' ? 'yml' : 'ts';

  const filename = title || `synthesis.${ext}`;
  const path = `noevix/${ext === 'rs' ? 'systems' : ext === 'py' ? 'core' : 'lib'}/${filename}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleOpenSheet = () => {
    openArtifact({
      id: 'art_' + Date.now(),
      title: filename,
      language: lang,
      type: 'code',
      content: cleanCode,
    });
  };

  const size =
    codeFontSize === 'sm'
      ? { fontSize: '11.5px', lineHeight: '1.75' }
      : codeFontSize === 'lg'
        ? { fontSize: '14px', lineHeight: '1.7' }
        : { fontSize: '12.5px', lineHeight: '1.72' };

  return (
    <figure
      className="nv-edge group/code my-7 overflow-hidden rounded-[16px]"
      style={{
        background: 'var(--code-bg)',
        border: '1px solid transparent',
        boxShadow: 'var(--shadow-3)',
      }}
    >
      {/* ── Title bar ─────────────────────────────────────────────── */}
      <div
        className="flex h-11 items-center justify-between gap-3 px-3"
        style={{ background: 'var(--code-gutter)', borderBottom: '1px solid var(--line-faint)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-[6px] pl-1">
            {[0.28, 0.18, 0.12].map((o, i) => (
              <span
                key={i}
                className="h-[9px] w-[9px] rounded-full transition-transform duration-200 group-hover/code:scale-110"
                style={{
                  background: 'var(--glass-4)',
                  opacity: o + 0.5,
                  boxShadow: 'inset 0 1px 0 var(--highlight-top)',
                }}
              />
            ))}
          </div>

          <span className="h-4 w-px" style={{ background: 'var(--line)' }} />

          <div className="flex min-w-0 items-center gap-2">
            <FileCode className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-3)' }} />
            <span
              className="truncate font-mono text-[11.5px] font-medium tracking-[-0.01em]"
              style={{ color: 'var(--text)' }}
            >
              {filename}
            </span>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <ChevronRight className="h-3 w-3 shrink-0" style={{ color: 'var(--text-4)' }} />
            <span className="truncate font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
              {path}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setIsWrap((w) => !w)}
            className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
            style={isWrap ? { color: 'var(--text)', background: 'var(--glass-3)' } : undefined}
            title="Toggle word wrap"
          >
            <WrapText className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() =>
              setCodeFontSize(codeFontSize === 'sm' ? 'base' : codeFontSize === 'base' ? 'lg' : 'sm')
            }
            className="nv-btn nv-btn--ghost nv-btn--sm !h-7 !px-2 font-mono !text-[10.5px]"
            title="Cycle type size"
          >
            {codeFontSize === 'sm' ? '12' : codeFontSize === 'base' ? '13' : '14'}px
          </button>

          <span className="nv-chip mx-1 !h-[18px] !text-[9px]">{lang}</span>

          <button
            onClick={handleOpenSheet}
            className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
            title="Open in artifact sheet"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="nv-btn nv-btn--sm !h-7 !px-2.5 !text-[11px]"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" style={{ color: 'var(--text)' }} />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto">
        {showLineNumbers && (
          <div
            aria-hidden
            className="shrink-0 select-none py-4 pl-4 pr-3 text-right font-mono"
            style={{
              background: 'var(--code-gutter)',
              borderRight: '1px solid var(--line-faint)',
              fontSize: size.fontSize,
              lineHeight: size.lineHeight,
              color: 'var(--text-4)',
            }}
          >
            {lines.map((_, i) => (
              <div
                key={i}
                className="tabular-nums transition-colors duration-150"
                style={{ color: activeLine === i ? 'var(--text-2)' : undefined }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <pre
          className="nv-scroll-x flex-1 select-text overflow-x-auto px-4 py-4 font-mono"
          style={size}
        >
          <code>
            {lines.map((lineText, i) => (
              <div
                key={i}
                onMouseEnter={() => setActiveLine(i)}
                onMouseLeave={() => setActiveLine(null)}
                className="relative -mx-4 px-4 transition-colors duration-150"
                style={{
                  background: activeLine === i ? 'var(--glass-1)' : 'transparent',
                  whiteSpace: isWrap ? 'pre-wrap' : 'pre',
                  wordBreak: isWrap ? 'break-word' : 'normal',
                  color: 'var(--text-2)',
                }}
              >
                {tokenize(lineText).map((t, j) => (
                  <span
                    key={j}
                    className={TOKEN_CLASS[t.k]}
                    style={
                      t.k === 'keyword' || t.k === 'type'
                        ? { color: 'var(--text)' }
                        : t.k === 'comment'
                          ? { color: 'var(--text-3)' }
                          : t.k === 'literal' || t.k === 'number'
                            ? { color: 'var(--text-1)' }
                            : undefined
                    }
                  >
                    {escapeHtml(t.v)}
                  </span>
                ))}
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* ── Status bar ────────────────────────────────────────────── */}
      <div
        className="flex h-7 items-center justify-between px-4 font-mono text-[10px]"
        style={{
          background: 'var(--code-gutter)',
          borderTop: '1px solid var(--line-faint)',
          color: 'var(--text-4)',
        }}
      >
        <div className="flex items-center gap-4">
          <span className="nv-num">{lines.length} lines</span>
          <span className="nv-num">{cleanCode.length} chars</span>
          {activeLine !== null && <span className="nv-num">Ln {activeLine + 1}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>LF</span>
          <span className="uppercase" style={{ color: 'var(--text-3)' }}>
            {lang}
          </span>
        </div>
      </div>
    </figure>
  );
};
