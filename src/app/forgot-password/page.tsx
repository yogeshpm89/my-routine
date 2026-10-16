'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Clock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(`Password reset email sent to ${email}. Please check your inbox and follow the instructions.`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code.includes('user-not-found')) {
        setError('No account found with this email address.');
      } else {
        setError(err?.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back Link */}
      <div className="w-full max-w-md mb-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-blue-500/10 relative z-10">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-xs text-slate-400">
              Enter your email to receive recovery instructions
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/30 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Account Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Sending recovery link...' : 'Send Recovery Email'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 pt-4 border-t border-white/5 flex justify-center text-xs text-slate-400">
          <Link href="/login" className="text-blue-400 font-semibold hover:underline">
            Remember your password? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
