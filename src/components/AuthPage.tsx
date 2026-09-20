import { useState, type FormEvent } from 'react';
import { Shield, TrendingUp, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // AuthContext listener will update automatically

      } else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() },
          },
        });
        if (error) throw error;
        setSuccessMsg('Account created! Check your email to confirm, then login.');
        setMode('login');

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg('Password reset email sent. Check your inbox.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1EA] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo & Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F0E5D3] to-[#E8D5B8] border border-[#DBC89A] shadow-md">
            <Shield className="w-7 h-7 text-[#DB9F35] fill-[#DB9F35]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1F1A16] tracking-tight">NH TRADERS</h1>
            <p className="text-xs text-[#786F66] font-medium mt-0.5">Discipline Today | Profits Tomorrow</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl shadow-lg overflow-hidden">
          
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-[#E7E0D6] bg-white/60">
            <div className="flex gap-1">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m as AuthMode); setError(null); setSuccessMsg(null); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    mode === m
                      ? 'bg-[#F3DFB8] border border-[#E5C68A] text-[#784A0E] shadow-xs'
                      : 'text-[#786F66] hover:text-[#1F1A16] hover:bg-[#EFE7DC]'
                  }`}
                >
                  {m === 'login' ? 'Login' : 'Create Account'}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {mode === 'forgot' && (
              <div className="flex items-center gap-2 p-3 bg-[#FAF0E1] border border-[#ECD9BE] rounded-xl text-xs text-[#7A541A]">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Enter your email to receive a password reset link.</span>
              </div>
            )}

            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1F1A16]">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Narendra"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E7E0D6] rounded-xl text-sm text-[#1F1A16] placeholder-[#9E958C] focus:border-[#DB9F35] focus:outline-none transition-colors shadow-xs"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1F1A16]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E7E0D6] rounded-xl text-sm text-[#1F1A16] placeholder-[#9E958C] focus:border-[#DB9F35] focus:outline-none transition-colors shadow-xs"
              />
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1F1A16]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#E7E0D6] rounded-xl text-sm text-[#1F1A16] placeholder-[#9E958C] focus:border-[#DB9F35] focus:outline-none transition-colors shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#9E958C] hover:text-[#1F1A16] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-[10px] text-[#786F66] hover:text-[#DB9F35] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-[#FEECEB] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="flex items-start gap-2 p-3 bg-[#EAF6ED] border border-[#B7ECC8] rounded-xl text-xs text-[#15803D]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#DB9F35] to-[#D49326] hover:from-[#C88B24] hover:to-[#BD801E] disabled:opacity-60 text-[#2A1F0D] font-black text-sm py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-[#2A1F0D]/30 border-t-[#2A1F0D] rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <Lock className="w-4 h-4" />
                  Login to NH TRADERS
                </>
              ) : mode === 'signup' ? (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Create Free Account
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Reset Email
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs text-[#786F66] hover:text-[#1F1A16] transition-colors"
              >
                ← Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-4 text-[10px] text-[#9E958C]">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#DB9F35]" /> RLS Secured
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#15803D]" /> Cloud Synced
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#786F66]" /> Private Data
            </span>
          </div>
          <p className="text-[9px] text-[#B5ACA3]">Powered by Supabase PostgreSQL</p>
        </div>
      </div>
    </div>
  );
}
