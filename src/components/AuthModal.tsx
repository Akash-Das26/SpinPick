import React, { useState } from 'react';
import { UserProfile } from '../types';
import { authService } from '../utils/auth';
import { sound } from '../utils/audio';
import { useModalA11y } from '../hooks/useModalA11y';
import {
  X,
  Lock,
  Mail,
  User,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalRef = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await authService.signUp(email, password, name);
        if (res.success && res.user) {
          sound.playPop(true);
          setSuccessMsg('Account created successfully! Welcome to SpinPick.');
          setTimeout(() => {
            onAuthSuccess(res.user!);
            onClose();
          }, 700);
        } else {
          setError(res.error || 'Failed to sign up.');
          sound.playPop(false);
        }
      } else {
        const res = await authService.login(email, password);
        if (res.success && res.user) {
          sound.playPop(true);
          setSuccessMsg('Logged in successfully!');
          setTimeout(() => {
            onAuthSuccess(res.user!);
            onClose();
          }, 700);
        } else {
          setError(res.error || 'Invalid credentials.');
          sound.playPop(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="auth-modal-content"
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0a0a14]/95 border border-white/10 shadow-[0_0_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-6 sm:p-7 space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Sign In to SpinPick' : 'Create SpinPick Account'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'login'
                  ? 'Access your saved wheels and custom presets'
                  : 'Create an account to save and organize your wheels'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Your Name / Nickname
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              {mode === 'signup' && (
                <span className="text-[11px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
