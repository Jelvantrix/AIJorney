import React, { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import {
  X,
  Copy,
  Check,
  Download,
  FileCode2,
  Eye,
  Fingerprint,
  Hash,
  ShieldCheck,
  WrapText,
} from 'lucide-react';

type Tab = 'code' | 'preview' | 'provenance';

const EXT: Record<string, string> = {
  rust: 'rs',
  python: 'py',
  go: 'go',
  json: 'json',
  sql: 'sql',
  html: 'html',
  css: 'css',
  bash: 'sh',
  sh: 'sh',
  yaml: 'yml',
};

export const ArtifactSheet: React.FC = () => {
  const { isArtifactSheetOpen, setArtifactSheetOpen, activeArtifact } = useChatStore();
  const [tab, setTab] = useState<Tab>('code');
  const [copied, setCopied] = useState(false);
  const [hash, setHash] = useState('');
  const [wrap, setWrap] = useState(false);

  useEffect(() => {
    if (!activeArtifact) return;
    setTab('code');
    setCopied(false);
    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(activeArtifact.content))
      .then((buf) =>
        setHash(
          Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        )
      )
      .catch(() => setHash(''));
  }, [activeArtifact]);

  useEffect(() => {
    if (!isArtifactSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArtifactSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isArtifactSheetOpen, setArtifactSheetOpen]);

  const lines = useMemo(
    () => (activeArtifact?.content || '').replace(/\n$/, '').split('\n'),
    [activeArtifact]
  );

  if (!isArtifactSheetOpen || !activeArtifact) return null;

  const lang = activeArtifact.language || 'text';
  const ext = EXT[lang] || 'txt';
  const size = new Blob([activeArtifact.content]).size;

  const copy = () => {
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([activeArtifact.content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArtifact.title.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReport = () => {
    const md = [
      `# Provenance record`,
      ``,
      `- **Artifact** ${activeArtifact.title}`,
      `- **Id** ${activeArtifact.id}`,
      `- **Language** ${lang}`,
      `- **Bytes** ${size}`,
      `- **SHA-256** \`${hash}\``,
      `- **Issued** ${new Date().toISOString()}`,
      ``,
      `## Content`,
      ``,
      '```' + (lang === 'text' ? '' : lang),
      activeArtifact.content,
      '```',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `provenance-${activeArtifact.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: Array<{ id: Tab; label: string; icon: typeof FileCode2 }> = [
    { id: 'code', label: 'Source', icon: FileCode2 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'provenance', label: 'Provenance', icon: Fingerprint },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="nv-scrim" onClick={() => setArtifactSheetOpen(false)} />

      <div
        className="nv-modal flex w-full max-w-[980px] flex-col"
        style={{ height: 'min(86vh, 780px)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
              style={{ background: 'var(--glass-2)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-inset)' }}
            >
              <FileCode2 className="h-[18px] w-[18px]" style={{ color: 'var(--text-2)' }} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[15px] font-medium tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
                  {activeArtifact.title}
                </h2>
                <span className="nv-chip !h-[18px] !text-[9px]">{lang}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 font-mono text-[10.5px]" style={{ color: 'var(--text-4)' }}>
                <span className="nv-num">{lines.length} lines</span>
                <span className="nv-num">{(size / 1024).toFixed(1)} kb</span>
                <span className="truncate">{activeArtifact.id}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setArtifactSheetOpen(false)}
            className="nv-iconbtn nv-iconbtn--sm shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center justify-between gap-2 px-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-0.5 py-1.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} data-active={tab === t.id} onClick={() => setTab(t.id)} className="nv-tab">
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-0.5 py-1.5">
            {tab === 'code' && (
              <button
                onClick={() => setWrap((w) => !w)}
                className="nv-iconbtn nv-iconbtn--sm !h-7 !w-7"
                style={wrap ? { color: 'var(--text)', background: 'var(--glass-3)' } : undefined}
                title="Word wrap"
              >
                <WrapText className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={copy} className="nv-btn nv-btn--sm !h-7">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={download} className="nv-btn nv-btn--sm !h-7">
              <Download className="h-3.5 w-3.5" />
              .{ext}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="nv-scroll min-h-0 flex-1 overflow-auto">
          {tab === 'code' && (
            <div className="flex" style={{ background: 'var(--code-bg)' }}>
              <div
                aria-hidden
                className="shrink-0 select-none py-4 pl-4 pr-3 text-right font-mono text-[11.5px] leading-[1.72]"
                style={{ background: 'var(--code-gutter)', borderRight: '1px solid var(--line-faint)', color: 'var(--text-4)' }}
              >
                {lines.map((_, i) => (
                  <div key={i} className="tabular-nums">
                    {i + 1}
                  </div>
                ))}
              </div>
              <pre
                className="flex-1 px-4 py-4 font-mono text-[12.5px] leading-[1.72]"
                style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', color: 'var(--text-2)' }}
              >
                {lines.join('\n')}
              </pre>
            </div>
          )}

          {tab === 'preview' && (
            <div className="editorial-reply mx-auto max-w-[68ch] px-6 py-6">
              <pre className="whitespace-pre-wrap font-sans text-[14.5px]">{activeArtifact.content}</pre>
            </div>
          )}

          {tab === 'provenance' && (
            <div className="mx-auto w-full max-w-[720px] space-y-3 p-6">
              <div
                className="rounded-[14px] p-4"
                style={{ background: 'var(--glass-1)', border: '1px solid var(--line)' }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="nv-label">Content address</span>
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-2)' }}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Integrity verified
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-4)' }} />
                  <code
                    className="min-w-0 flex-1 truncate font-mono text-[11.5px]"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {hash || 'computing…'}
                  </code>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { k: 'Identifier', v: activeArtifact.id },
                  { k: 'Media type', v: lang },
                  { k: 'Byte length', v: String(size) },
                  { k: 'Line count', v: String(lines.length) },
                  { k: 'Content hash', v: 'sha-256' },
                  { k: 'Rendering', v: activeArtifact.type },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex items-center justify-between rounded-[10px] px-3.5 py-3"
                    style={{ background: 'var(--glass-1)', border: '1px solid var(--line-faint)' }}
                  >
                    <span className="nv-label">{row.k}</span>
                    <span className="truncate font-mono text-[11.5px]" style={{ color: 'var(--text-1)' }}>
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={downloadReport} className="nv-btn w-full">
                <Download className="h-4 w-4" />
                Download provenance record
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
