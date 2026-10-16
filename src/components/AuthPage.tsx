import { useState, type FormEvent } from 'react';
import { TrendingUp, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Mail, Shield, Zap, RefreshCw, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthPage() {
  const { loginAsLocalUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unconfirmedEmailNotice, setUnconfirmedEmailNotice] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setUnconfirmedEmailNotice(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword 
        });

        if (signInError) {
          const msg = signInError.message.toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
            setError('Invalid email or password.');
            setUnconfirmedEmailNotice(
              'If this account was created earlier when email confirmation was required, your email might not be verified yet. You can click "Forgot password" below to set a new password, or click "Continue in Offline / Local Mode" for instant access.'
            );
            return;
          }
          if (msg.includes('email not confirmed')) {
            setError('Email not confirmed.');
            setUnconfirmedEmailNotice(
              'Please check your inbox & spam folder for the confirmation email, or reset your password below.'
            );
            return;
          }
          throw signInError;
        }

      } else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (cleanPassword.length < 6) throw new Error('Password must be at least 6 characters.');

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: { name: name.trim() },
          },
        });

        if (signUpError) {
          const msg = signUpError.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user_already_exists')) {
            setError('This email is already registered! Please log in with your password, or click "Forgot password" to reset it.');
            setMode('login');
            return;
          }
          if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
            throw new Error(
              'Email rate limit exceeded by Supabase. Please click "Continue in Offline / Local Mode" below to access TradeFlow instantly.'
            );
          }
          throw signUpError;
        }

        // If auto-confirmed by Supabase (session present)
        if (data.session) {
          setSuccessMsg('Account created and verified! Redirecting to TradeFlow...');
          return;
        }

        // If email was already taken
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists. Please log in or click "Forgot password".');
          setMode('login');
          return;
        }

        // When email verification is required by Supabase
        setSuccessMsg(`Account created for ${cleanEmail}!`);
        setUnconfirmedEmailNotice(
          'Account created! You can now log in with your email and password.'
        );
        setMode('login');

      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSuccessMsg('Password reset email sent. Check your inbox & spam folder.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email above to resend confirmation.');
      return;
    }
    setIsResending(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });
      if (resendError) {
        if (resendError.message.toLowerCase().includes('rate limit')) {
          throw new Error('Email rate limit exceeded by Supabase. Turn off "Confirm email" in Supabase Dashboard to log in without email verification.');
        }
        throw resendError;
      }
      setSuccessMsg(`Confirmation email resent to ${email.trim()}! Please check your inbox and spam folder.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend confirmation.';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1EA] dark:bg-[#0B0E14] flex items-center justify-center p-4 font-sans text-[#1F1A16] dark:text-[#F0F4F8] transition-colors">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        
        {/* Logo & Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center">
            <img 
              src="/tradeflow-logo.jpg" 
              alt="TradeFlow Logo" 
              className="w-20 h-20 rounded-2xl shadow-xl border-2 border-[#E7E0D6] dark:border-[#283244] object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              Trade<span className="text-[#10B981]">Flow</span>
            </h1>
            <p className="text-[10px] tracking-widest text-[#786F66] dark:text-[#94A3B8] font-bold uppercase mt-1">
              Journal • Review • Improve
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl shadow-xl overflow-hidden transition-colors">
          
          {/* Card Header Switcher */}
          <div className="px-6 py-3.5 border-b border-[#E7E0D6] dark:border-[#242D3D] bg-white/70 dark:bg-[#1A2230]/70 flex items-center justify-between">
            <div className="flex gap-1.5">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  onClick={() => { 
                    setMode(m as AuthMode); 
                    setError(null); 
                    setSuccessMsg(null); 
                    setUnconfirmedEmailNotice(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === m
                      ? 'bg-[#10B981]/15 text-[#059669] dark:text-[#34D399] border border-[#10B981]/40 shadow-xs'
                      : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                  }`}
                >
                  {m === 'login' ? 'Login' : 'Create Account'}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-mono text-[#10B981] font-bold">
              v2.0 Cloud
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {mode === 'forgot' && (
              <div className="flex items-center gap-2 p-3 bg-[#FAF0E1] dark:bg-[#251E14] border border-[#ECD9BE] dark:border-[#523E23] rounded-xl text-xs text-[#7A541A] dark:text-[#FBBF24]">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Enter your registered email to receive a password reset link.</span>
              </div>
            )}

            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Narendra"
                  required
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-sm focus:border-[#10B981] focus:outline-none transition-colors shadow-xs"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmail((prev) => prev.trim().toLowerCase())}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-sm focus:border-[#10B981] focus:outline-none transition-colors shadow-xs"
              />
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full px-3.5 py-2.5 pr-10 bg-white dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-sm focus:border-[#10B981] focus:outline-none transition-colors shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#9E958C] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); setUnconfirmedEmailNotice(null); }}
                    className="text-[10px] text-[#786F66] dark:text-[#94A3B8] hover:text-[#10B981] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {/* Unconfirmed Email Notice Banner */}
            {unconfirmedEmailNotice && (
              <div className="p-3.5 bg-[#FAF2E6] dark:bg-[#251E14] border border-[#ECD9BE] dark:border-[#523E23] rounded-xl text-xs space-y-2 text-[#7A541A] dark:text-[#FBBF24] animate-fade-in">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                  <span className="leading-relaxed">{unconfirmedEmailNotice}</span>
                </div>
                {email && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Sending...' : 'Resend Confirmation Email'}
                  </button>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-[#FEECEB] dark:bg-[#321B1B] border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-xl text-xs text-[#DC2626] dark:text-[#F87171]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-start gap-2 p-3 bg-[#EAF6ED] dark:bg-[#132A1C] border border-[#B7ECC8] dark:border-[#1E4D30] rounded-xl text-xs text-[#15803D] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <Lock className="w-4 h-4" />
                  Login to TradeFlow
                </>
              ) : mode === 'signup' ? (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Create Free Account
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Password Reset Link
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E7E0D6] dark:border-[#242D3D]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-[#9E958C] dark:text-[#64748B]">
                <span className="bg-[#FAF6EE] dark:bg-[#131822] px-2">OR</span>
              </div>
            </div>

            {/* Instant Offline / Local Mode Button */}
            <button
              type="button"
              onClick={loginAsLocalUser}
              className="w-full py-2.5 px-3.5 bg-white dark:bg-[#1A2230] hover:bg-[#F2ECE1] dark:hover:bg-[#242E40] border border-[#D5CBBE] dark:border-[#333F54] rounded-xl text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
            >
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Continue in Offline / Local Mode (Instant Access)</span>
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs text-[#786F66] dark:text-[#94A3B8] hover:text-[#10B981] transition-colors cursor-pointer text-center"
              >
                ← Back to Login
              </button>
            )}
          </form>
        </div>

        {/* Footer Security Badges */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-4 text-[10px] text-[#9E958C] dark:text-[#64748B]">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#10B981]" /> Row Level Security
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#10B981]" /> Cloud Synchronized
            </span>
          </div>
          <p className="text-[9px] text-[#B5ACA3] dark:text-[#475569]">Powered by Supabase PostgreSQL Database</p>
        </div>
      </div>
    </div>
  );
}
