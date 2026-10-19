import React, { useState } from 'react';
import { X, ArrowRight, Check, Github, Mail, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  authMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen = false,
  onClose = () => {},
  authMode = 'login',
}) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
    setTimeout(() => {
      onClose();
      setSent(false);
      setEmail('');
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="nv-scrim" onClick={onClose} />

      <div className="nv-modal w-full max-w-[420px] p-7">
        <button
          onClick={onClose}
          className="nv-iconbtn nv-iconbtn--sm absolute right-4 top-4"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <span className="nv-label">Noevix account</span>
          <h2 className="nv-display mt-2.5 text-[30px] leading-[1.05]">
            {authMode === 'login' ? 'Welcome back.' : 'Create your account.'}
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Your spaces stay on this device. An account syncs them, and unlocks shared mission control.
          </p>
        </div>

        {sent ? (
          <div
            className="anim-rise flex flex-col items-center gap-2 rounded-[14px] px-5 py-8 text-center"
            style={{ background: 'var(--glass-1)', border: '1px solid var(--line)' }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'var(--text)' }}
            >
              <Check className="h-5 w-5" style={{ color: 'var(--bg)' }} />
            </span>
            <div className="mt-1 text-[14px] font-medium" style={{ color: 'var(--text)' }}>
              Magic link dispatched
            </div>
            <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
              We sent a verification link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div>
              <label className="nv-label block mb-2">Work email</label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: 'var(--text-4)' }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="nv-input w-full !pl-10 !h-11 text-[13.5px]"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="nv-btn nv-btn--primary !h-11 w-full justify-center text-[13.5px]">
              Continue with Email
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute inset-x-0 h-px" style={{ background: 'var(--line)' }} />
              <span
                className="relative px-3 text-[10.5px] uppercase tracking-wider"
                style={{ background: 'var(--surface-modal)', color: 'var(--text-4)' }}
              >
                or
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setEmail('developer@company.com');
                setSent(true);
                setTimeout(() => {
                  onClose();
                  setSent(false);
                }, 1200);
              }}
              className="nv-btn nv-btn--ghost !h-11 w-full justify-center text-[13.5px]"
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </button>

            <div
              className="mt-6 flex items-center gap-2 border-t pt-4 text-[11px]"
              style={{ borderColor: 'var(--line)', color: 'var(--text-4)' }}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Private by constitution. Zero telemetry sold or shared.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
