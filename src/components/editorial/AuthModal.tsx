import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { X, ArrowRight, Check, Github, Mail, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, authMode } = useChatStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  if (!isAuthModalOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
    setTimeout(() => {
      setAuthModalOpen(false);
      setSent(false);
      setEmail('');
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="nv-scrim" onClick={() => setAuthModalOpen(false)} />

      <div className="nv-modal w-full max-w-[420px] p-7">
        <button
          onClick={() => setAuthModalOpen(false)}
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
              Open {email} to finish signing in.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3">
              <label className="nv-label block">Email</label>
              <div className="nv-field h-11">
                <Mail className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="!text-[14px]"
                />
              </div>
              <button type="submit" className="nv-btn nv-btn--primary w-full">
                Send magic link
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="relative my-6 flex items-center">
              <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
              <span className="nv-label px-3 !text-[9px]">or continue with</span>
              <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
            </div>

            <div className="space-y-2">
              {[
                { icon: Github, label: 'Continue with GitHub' },
                { icon: Mail, label: 'Continue with Google' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => {
                    setSent(true);
                    setTimeout(() => {
                      setAuthModalOpen(false);
                      setSent(false);
                    }, 900);
                  }}
                  className="nv-btn w-full justify-start !px-4"
                >
                  <Icon className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                  {label}
                </button>
              ))}
            </div>

            <div
              className="mt-6 flex items-center gap-2 border-t pt-4 text-[11px]"
              style={{ borderColor: 'var(--line)', color: 'var(--text-4)' }}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Zero tracking. Private by constitution.
            </div>
          </>
        )}
      </div>
    </div>
  );
};
