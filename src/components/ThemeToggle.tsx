import React, { useState, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Theme, getStoredTheme, setStoredTheme } from '../lib/theme.ts';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const handleSelect = (t: Theme) => {
    setTheme(t);
    setStoredTheme(t);
  };

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-[8px] bg-[var(--surface)] text-[12px] text-[var(--muted)]">
      <button
        onClick={() => handleSelect('light')}
        className={`flex items-center justify-center p-1.5 rounded-[6px] transition-colors ${
          theme === 'light'
            ? 'bg-[var(--surface-hover)] text-[var(--text)]'
            : 'hover:text-[var(--text)]'
        }`}
        title="Light theme"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleSelect('dark')}
        className={`flex items-center justify-center p-1.5 rounded-[6px] transition-colors ${
          theme === 'dark'
            ? 'bg-[var(--surface-hover)] text-[var(--text)]'
            : 'hover:text-[var(--text)]'
        }`}
        title="Dark theme"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleSelect('system')}
        className={`flex items-center justify-center p-1.5 rounded-[6px] transition-colors ${
          theme === 'system'
            ? 'bg-[var(--surface-hover)] text-[var(--text)]'
            : 'hover:text-[var(--text)]'
        }`}
        title="System theme"
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
