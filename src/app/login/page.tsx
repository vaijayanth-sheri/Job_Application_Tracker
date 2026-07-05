'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [globalCompanyCount, setGlobalCompanyCount] = useState<number | null>(null);
  const [globalJobBoardCount, setGlobalJobBoardCount] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [compRes, boardRes] = await Promise.all([
          supabase.from('companies').select('*', { count: 'exact', head: true }),
          supabase.from('job_boards').select('*', { count: 'exact', head: true })
        ]);
        if (compRes.count !== null) setGlobalCompanyCount(compRes.count);
        if (boardRes.count !== null) setGlobalJobBoardCount(boardRes.count);
      } catch (err) {
        console.error('Failed to fetch public stats', err);
      }
    };
    fetchCounts();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('login');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: 'AI Smart Add',
      description: 'Drop a URL and let Gemini AI scrape the page or search Google to instantly fill out your job and company trackers.',
      icon: '⚡',
    },
    {
      title: 'AI Workshop',
      description: 'Store your candidate profile and use integrated AI to instantly generate tailored cover letters and CVs for any role.',
      icon: '🤖',
    },
    {
      title: 'Visual Dashboard',
      description: 'Get instant clarity on your job search funnel. Track applications from wishlist to offer with powerful analytics.',
      icon: '📊',
    },
    {
      title: 'Global Directories',
      description: 'Tap into global company databases and job boards. Add your private tracking notes without affecting others.',
      icon: '🌐',
    },
    {
      title: 'Skill Gap Analysis',
      description: 'Identify missing skills across job descriptions, prioritize learning, and track your progress systematically.',
      icon: '🎯',
    },
    {
      title: 'Duplicate Detection',
      description: 'Built-in fuzzy matching prevents database clutter by automatically catching duplicate companies and job postings.',
      icon: '🛡️',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      
      {/* Left Side: Product Information */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="max-w-2xl mx-auto w-full">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 shadow-lg shadow-brand-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">JobTracker</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
            The complete operating system for your career.
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Replace scattered spreadsheets with a powerful, unified workspace. JobTracker helps you manage applications, master required skills, and generate tailored documents all in one place.
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center transform transition-transform hover:-translate-y-1">
              <div className="text-3xl font-extrabold text-brand-600 mb-1">
                {globalCompanyCount !== null ? globalCompanyCount : '...'}
              </div>
              <div className="text-sm font-medium text-brand-800">
                Global Companies
              </div>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center transform transition-transform hover:-translate-y-1">
              <div className="text-3xl font-extrabold text-violet-600 mb-1">
                {globalJobBoardCount !== null ? globalJobBoardCount : '...'}
              </div>
              <div className="text-sm font-medium text-violet-800">
                Job Boards Tracked
              </div>
            </div>
          </div>

          <hr className="border-gray-200 mb-10" />

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-xl text-brand-600 border border-brand-100">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Login Panel */}
      <div className="w-full lg:w-[480px] xl:w-[560px] flex-shrink-0 bg-gradient-to-br from-brand-950 via-brand-900 to-violet-950 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden border-t lg:border-t-0 lg:border-l border-white/10 shadow-2xl z-10">
        
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm mx-auto animate-scale-in">
          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 ring-1 ring-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-white/60 text-sm mb-8">
              {mode === 'login' ? 'Sign in to access your dashboard' : 'Join today and accelerate your job search'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-medium text-white/90">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 text-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-sm font-medium text-white/90">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 text-sm transition-all"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-sm text-emerald-200">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full !py-3.5 !text-sm !font-semibold !rounded-xl !bg-gradient-to-r !from-brand-500 !to-violet-600 hover:!from-brand-600 hover:!to-violet-700 !shadow-lg !shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-white/50 hover:text-white/90 transition-colors font-medium"
              >
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
