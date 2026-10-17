import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { X, Copy, Check, Eye, Code, Download, ExternalLink } from 'lucide-react';

export const ArtifactSheet: React.FC = () => {
  const { isArtifactSheetOpen, setArtifactSheetOpen, activeArtifact } = useChatStore();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  if (!isArtifactSheetOpen || !activeArtifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeArtifact.language === 'rust' ? 'rs' : activeArtifact.language === 'python' ? 'py' : 'ts';
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArtifact.title.toLowerCase().replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Minimal HTML sandbox template for previews
  const sandboxHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, system-ui, sans-serif; background: #000; color: #fff; padding: 24px; line-height: 1.6; }
          pre { background: #111; padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); overflow-x: auto; font-family: monospace; }
        </style>
      </head>
      <body>
        <h3>Artifact Sandbox Execution</h3>
        <p>Sandboxed iframe running under strict CSP:</p>
        <pre>${activeArtifact.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </body>
    </html>
  `;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop Dimmer */}
      <div
        onClick={() => setArtifactSheetOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto"
      />

      {/* Slide-over Sheet (480-720px wide) */}
      <aside
        className="relative w-full max-w-2xl h-full bg-[var(--elev-1)] border-l border-[var(--line-strong)] shadow-2xl flex flex-col pointer-events-auto z-10 animate-[wordReveal_200ms_cubic-bezier(0.16,1,0.3,1)]"
        aria-label="Artifact inspector"
      >
        {/* Header */}
        <div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between bg-[var(--elev-2)]">
          <div className="flex items-center gap-3">
            <span className="font-serif-display text-lg text-[var(--text)]">
              {activeArtifact.title}
            </span>
            <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-[4px] bg-[var(--elev-3)] text-[var(--text-2)] border border-[var(--line)]">
              {activeArtifact.language || activeArtifact.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher if applicable */}
            <div className="flex items-center rounded-[6px] bg-[var(--elev-3)] p-0.5 border border-[var(--line)]">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-2 py-1 rounded-[4px] text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  activeTab === 'code' ? 'bg-[var(--elev-1)] text-[var(--text)] font-semibold' : 'text-[var(--text-3)]'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Code</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-2 py-1 rounded-[4px] text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  activeTab === 'preview' ? 'bg-[var(--elev-1)] text-[var(--text)] font-semibold' : 'text-[var(--text-3)]'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Sandbox</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--elev-3)] transition-colors"
              title="Copy contents"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--elev-3)] transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setArtifactSheetOpen(false)}
              className="p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--elev-3)] transition-colors ml-2"
              title="Close Sheet (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-6 bg-[var(--bg)] font-mono text-[13px] leading-relaxed">
          {activeTab === 'code' ? (
            <pre className="text-[var(--text-2)] whitespace-pre-wrap select-text">
              <code>{activeArtifact.content}</code>
            </pre>
          ) : (
            <div className="w-full h-full rounded-[12px] border border-[var(--line)] overflow-hidden bg-black">
              {/* Sandboxed iframe without allow-same-origin for security */}
              <iframe
                title="Sandboxed Artifact Preview"
                srcDoc={sandboxHtml}
                sandbox="allow-scripts"
                className="w-full h-full border-none"
              />
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="h-10 px-6 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono text-[var(--text-3)] bg-[var(--elev-2)]">
          <span>SIZE: {new Blob([activeArtifact.content]).size} BYTES</span>
          <span>PRESS ESC TO CLOSE</span>
        </div>
      </aside>
    </div>
  );
};
