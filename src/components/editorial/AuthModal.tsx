import React, { useState } from 'react';
import { useChatStore } from '../../lib/store.ts';
import { X, ArrowRight, Check, Github, Mail } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, authMode } = useChatStore();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setTimeout(() => {
        setAuthModalOpen(false);
        setSubmitted(false);
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-[wordReveal_180ms_ease-out]">
      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-[24px] bg-[var(--elev-1)] border border-[var(--line-strong)] dock-outer-glow shadow-2xl">
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-6 right-6 p-1.5 rounded-[6px] text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--elev-2)] transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
          <span className="font-mono-label block mb-2">NOEVIX AUTHENTICATION</span>
          <h2 className="font-serif-display text-3xl sm:text-4xl text-[var(--text)] font-normal">
            {authMode === 'login' ? 'Welcome back.' : 'Create your space.'}
          </h2>
          <p className="text-[14px] text-[var(--text-2)] mt-2">
            Sign in with email magic link or authorized developer accounts.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-[14px] bg-[var(--elev-2)] border border-[var(--line)] text-center space-y-2">
            <Check className="w-6 h-6 mx-auto text-[var(--text)]" />
            <h4 className="font-medium text-[15px]">Magic link dispatched</h4>
            <p className="text-[13px] text-[var(--text-2)]">
              Check {email} to finalize instant authentication.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email Magic Link Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-3)] block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@domain.com"
                    className="w-full px-4 py-3 rounded-[12px] bg-[var(--elev-2)] border border-[var(--line)] text-[14px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--text)] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-[9999px] bg-[var(--text)] text-[var(--bg)] text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>Send Magic Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="w-full h-[1px] bg-[var(--line)]" />
              <span className="absolute px-3 bg-[var(--elev-1)] font-mono text-[10px] text-[var(--text-3)] uppercase">
                Or Continue With
              </span>
            </div>

            {/* Monochrome OAuth Buttons (zero colored brand logos) */}
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setSubmitted(true);
                  setTimeout(() => setAuthModalOpen(false), 800);
                }}
                className="w-full py-2.5 px-4 rounded-[9999px] border border-[var(--line)] hover:bg-[var(--elev-2)] text-[13px] font-medium text-[var(--text)] transition-colors flex items-center justify-center gap-2.5"
              >
                <Github className="w-4 h-4" />
                <span>Continue with GitHub</span>
              </button>

              <button
                onClick={() => {
                  setSubmitted(true);
                  setTimeout(() => setAuthModalOpen(false), 800);
                }}
                className="w-full py-2.5 px-4 rounded-[9999px] border border-[var(--line)] hover:bg-[var(--elev-2)] text-[13px] font-medium text-[var(--text)] transition-colors flex items-center justify-center gap-2.5"
              >
                <Mail className="w-4 h-4" />
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
