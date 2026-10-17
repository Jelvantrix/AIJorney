import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  Plus,
  Sliders,
  Shield,
  BarChart2,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { Conversation, PublicLens } from '../../../packages/contracts/index.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onSelectLens: (lens: PublicLens) => void;
  onToggleTheme: () => void;
  onToggleConsent: () => void;
  onOpenEvals: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
  onNewChat,
  onSelectLens,
  onToggleTheme,
  onToggleConsent,
  onOpenEvals,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'new_chat',
      title: 'New Chat',
      category: 'Actions',
      icon: <Plus className="w-3.5 h-3.5" />,
      run: () => {
        onNewChat();
        onClose();
      },
    },
    {
      id: 'evals',
      title: 'Run Evaluation Harness & Benchmarks',
      category: 'System',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      run: () => {
        onOpenEvals();
        onClose();
      },
    },
    {
      id: 'consent',
      title: 'Toggle Privacy / Turn Logging Consent',
      category: 'Preferences',
      icon: <Shield className="w-3.5 h-3.5" />,
      run: () => {
        onToggleConsent();
        onClose();
      },
    },
    {
      id: 'theme',
      title: 'Toggle Dark / Light Theme',
      category: 'Preferences',
      icon: <Moon className="w-3.5 h-3.5" />,
      run: () => {
        onToggleTheme();
        onClose();
      },
    },
    {
      id: 'lens_eng',
      title: 'Switch Lens: Engineering',
      category: 'Lenses',
      icon: <Sliders className="w-3.5 h-3.5" />,
      run: () => {
        onSelectLens('Engineering');
        onClose();
      },
    },
    {
      id: 'lens_des',
      title: 'Switch Lens: Design',
      category: 'Lenses',
      icon: <Sliders className="w-3.5 h-3.5" />,
      run: () => {
        onSelectLens('Design');
        onClose();
      },
    },
    {
      id: 'lens_res',
      title: 'Switch Lens: Research',
      category: 'Lenses',
      icon: <Sliders className="w-3.5 h-3.5" />,
      run: () => {
        onSelectLens('Research');
        onClose();
      },
    },
    {
      id: 'lens_rea',
      title: 'Switch Lens: Reasoning',
      category: 'Lenses',
      icon: <Sliders className="w-3.5 h-3.5" />,
      run: () => {
        onSelectLens('Reasoning');
        onClose();
      },
    },
    {
      id: 'lens_wri',
      title: 'Switch Lens: Writing',
      category: 'Lenses',
      icon: <Sliders className="w-3.5 h-3.5" />,
      run: () => {
        onSelectLens('Writing');
        onClose();
      },
    },
  ];

  const matchedConversations = conversations
    .filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: 'Conversations',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      run: () => {
        onSelectConversation(c.id);
        onClose();
      },
    }));

  const matchedActions = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [...matchedActions, ...matchedConversations];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border)] rounded-[14px] shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="relative flex items-center px-3 border-b border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search conversations..."
            className="w-full py-3 px-3 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {allItems.length === 0 ? (
            <div className="py-6 text-center text-[var(--text-muted)]">No commands or chats found</div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.run}
                  className={`flex items-center justify-between px-3 py-2 rounded-[6px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--surface-2)] text-[var(--text)] font-medium border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[var(--signature-magenta)]">{item.icon}</span>
                    <span className="text-[var(--text)]">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
