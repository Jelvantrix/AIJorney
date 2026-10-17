import React, { useState } from 'react';
import {
  Code,
  FileText,
  Play,
  GitCompare,
  Activity,
  X,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ActiveArtifact, WorkspaceTab } from '../../types/client.ts';
import { MarkdownRenderer } from '../../lib/markdown.tsx';

interface WorkspacePanelProps {
  artifact: ActiveArtifact | null;
  isOpen: boolean;
  onClose: () => void;
  telemetry?: {
    t_route?: number;
    ms_first_token?: number;
    ms_total?: number;
    tokens_in?: number;
    tokens_out?: number;
    cached_tokens?: number;
  };
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  artifact,
  isOpen,
  onClose,
  telemetry,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('code');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!isOpen) return null;

  // Auto-select preview if artifact is preview type
  const currentTab = artifact?.type === 'preview' && activeTab === 'code' ? 'preview' : activeTab;

  const handleCopy = () => {
    if (artifact?.content) {
      navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!artifact) return;
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.toLowerCase().replace(/\s+/g, '_')}.${artifact.language || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Safe preview srcdoc with zero external network CSP
  const previewHtml = artifact
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #0A0A0A;
      color: #FAFAFA;
      box-sizing: border-box;
    }
    * { box-sizing: inherit; }
  </style>
</head>
<body>
  ${
    artifact.language === 'html' || artifact.type === 'preview'
      ? artifact.content
      : `<pre style="font-family: monospace; font-size: 13px; line-height: 1.5; color: #A3A3A3;">${escapeHtml(
          artifact.content
        )}</pre>`
  }
</body>
</html>`
    : '';

  return (
    <div
      className={`fixed md:static inset-y-0 right-0 z-40 bg-[var(--surface-1)] border-l border-[var(--border)] flex flex-col shrink-0 transition-all duration-200 ease-out ${
        expanded ? 'w-full md:w-[650px]' : 'w-full md:w-[420px]'
      }`}
    >
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
            Workspace
          </span>
          {artifact && (
            <span className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">
              · {artifact.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--surface-2)] hidden md:block"
            title={expanded ? 'Collapse width' : 'Expand width'}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded hover:bg-[var(--surface-2)]"
            title="Close workspace"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)] text-xs">
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            currentTab === 'code'
              ? 'bg-[var(--surface-1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Code</span>
        </button>

        <button
          onClick={() => setActiveTab('document')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            currentTab === 'document'
              ? 'bg-[var(--surface-1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            currentTab === 'preview'
              ? 'bg-[var(--surface-1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            currentTab === 'diff'
              ? 'bg-[var(--surface-1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Diff</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
            currentTab === 'telemetry'
              ? 'bg-[var(--surface-1)] text-[var(--text)] border border-[var(--border)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Telemetry</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--surface-1)]">
        {!artifact && currentTab !== 'telemetry' ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] p-6 space-y-2">
            <Code className="w-8 h-8 opacity-40 mb-2" />
            <div className="font-medium text-[var(--text)]">Workspace is empty</div>
            <p className="max-w-[240px]">
              Artifacts, code implementations, documents, and sandboxed previews generated in the chat appear here.
            </p>
          </div>
        ) : (
          <>
            {/* CODE TAB */}
            {currentTab === 'code' && artifact && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border)] font-mono">
                  <span>{artifact.language || 'text'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 hover:text-[var(--text)] transition-colors px-2 py-1 rounded bg-[var(--surface-2)]"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 hover:text-[var(--text)] transition-colors px-2 py-1 rounded bg-[var(--surface-2)]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)] p-3 overflow-x-auto">
                  <pre className="text-xs font-mono leading-relaxed text-[var(--text)]">
                    <code>{artifact.content}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* DOCUMENT TAB */}
            {currentTab === 'document' && artifact && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2">
                  {artifact.title}
                </h2>
                <MarkdownRenderer content={artifact.content} />
              </div>
            )}

            {/* SANDBOXED PREVIEW TAB */}
            {currentTab === 'preview' && artifact && (
              <div className="h-full flex flex-col space-y-2">
                <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between pb-1 border-b border-[var(--border)]">
                  <span>Isolated Sandbox Iframe</span>
                  <span className="font-mono text-[10px] text-emerald-500">CSP: STRICT</span>
                </div>
                <iframe
                  title="Sandboxed Preview"
                  sandbox="allow-scripts"
                  srcDoc={previewHtml}
                  className="w-full h-[520px] rounded-[6px] border border-[var(--border)] bg-[#0A0A0A]"
                />
              </div>
            )}

            {/* DIFF VIEW TAB */}
            {currentTab === 'diff' && artifact && (
              <div className="space-y-3">
                <div className="text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border)]">
                  Revision Diff (Structured comparison)
                </div>
                <div className="rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)] p-3 font-mono text-xs space-y-1">
                  <div className="text-emerald-400">+ [Generated Artifact: {artifact.title}]</div>
                  <div className="text-[var(--text-muted)] leading-relaxed">
                    {artifact.content.split('\n').slice(0, 15).map((l, idx) => (
                      <div key={idx} className="truncate">
                        {l}
                      </div>
                    ))}
                    {artifact.content.split('\n').length > 15 && (
                      <div className="text-[var(--text-muted)] italic">... ({artifact.content.split('\n').length - 15} more lines)</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TELEMETRY TAB */}
            {currentTab === 'telemetry' && (
              <div className="space-y-4 text-xs">
                <div className="font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2">
                  Turn Latency & Token Budget
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-1">Time to 1st Token</div>
                    <div className="text-lg font-semibold font-mono tabular-nums text-[var(--text)]">
                      {telemetry?.ms_first_token ? `${telemetry.ms_first_token}ms` : '--'}
                    </div>
                  </div>

                  <div className="p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-1">Total Duration</div>
                    <div className="text-lg font-semibold font-mono tabular-nums text-[var(--text)]">
                      {telemetry?.ms_total ? `${telemetry.ms_total}ms` : '--'}
                    </div>
                  </div>

                  <div className="p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-1">Router Latency</div>
                    <div className="text-lg font-semibold font-mono tabular-nums text-[var(--text)]">
                      {telemetry?.t_route ? `${telemetry.t_route}ms` : '< 1ms'}
                    </div>
                  </div>

                  <div className="p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="text-[11px] text-[var(--text-muted)] mb-1">Cached Tokens</div>
                    <div className="text-lg font-semibold font-mono tabular-nums text-emerald-400">
                      {telemetry?.cached_tokens || 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-[6px] bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                  <div className="text-[11px] font-semibold text-[var(--text)]">4-Block Prompt Architecture</div>
                  <div className="space-y-1 font-mono text-[11px] text-[var(--text-muted)]">
                    <div className="flex justify-between">
                      <span>Block 1: Constitution (v1)</span>
                      <span className="text-emerald-400">STATIC (Cached)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block 2: Role Module</span>
                      <span className="text-emerald-400">STATIC (Cached)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block 3: Session State</span>
                      <span>COMPACT JSON</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Block 4: Dynamic Turn</span>
                      <span>BOUNDED N=6</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
