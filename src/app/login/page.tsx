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
      description: 'Drop a URL or search Google. AI instantly extracts job and company details.',
      icon: '✨',
    },
    {
      title: 'AI Workshop',
      description: 'Create tailored cover letters and CVs in seconds for any role or industry.',
      icon: '🤖',
    },
    {
      title: 'Visual Dashboard',
      description: 'Track your job search pipeline with powerful analytics and real-time insights.',
      icon: '📊',
    },
    {
      title: 'Global Directories',
      description: 'Explore global company databases and job boards with private notes.',
      icon: '🌐',
    },
    {
      title: 'Skill Gap Analysis',
      description: 'Identify missing skills and get personalized recommendations to level up faster.',
      icon: '🎯',
    },
    {
      title: 'Duplicate Detection',
      description: 'Automatically spot and merge duplicate entries to keep your tracking clean.',
      icon: '🛡️',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FAFAFC] overflow-hidden">
      
      {/* Left Side: Product Information */}
      <div className="relative w-full lg:w-[60%] flex flex-col justify-center px-8 py-12 lg:px-16 xl:px-24 z-10">
        
        {/* Subtle dot pattern background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 z-0"
          style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        {/* Mountain Graphic - Absolute positioned to float on the right edge of left panel */}
        <div className="hidden xl:block absolute right-[-100px] top-1/2 -translate-y-1/2 w-[550px] opacity-90 z-0 pointer-events-none mix-blend-multiply">
          <img src="/hero_mountain.png" alt="Mountain Illustration" className="w-full h-auto object-contain" />
        </div>

        <div className="relative z-10 max-w-2xl w-full">
          {/* Logo & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">JobTracker</h1>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold self-start sm:self-auto">
              <span className="text-brand-500">✨</span> Built for job seekers. Powered by AI.
            </div>
          </div>
          
          <h2 className="text-5xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
            The complete operating<br/>system for <span className="text-brand-600 relative inline-block">your career.<svg className="absolute -bottom-2 left-0 w-full h-3 text-emerald-400 opacity-80" viewBox="0 0 200 20" preserveAspectRatio="none"><path d="M0,15 Q100,0 200,10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></span>
          </h2>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-xl">
            Replace scattered spreadsheets with a powerful, unified workspace. JobTracker helps you manage applications, master required skills, and generate tailored documents — all in one place.
          </p>

          {/* Stats Cards */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <div className="flex-1 bg-brand-50 border border-brand-100/60 rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xl mb-3">
                🌐
              </div>
              <div className="text-4xl font-bold text-brand-600 mb-1">
                {globalCompanyCount !== null ? globalCompanyCount : '...'}
              </div>
              <div className="text-sm font-semibold text-slate-900">
                Global Companies
              </div>
              <div className="text-xs text-slate-500 mt-0.5">in our database</div>
            </div>
            
            <div className="flex-1 bg-emerald-50 border border-emerald-100/60 rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl mb-3">
                💼
              </div>
              <div className="text-4xl font-bold text-emerald-600 mb-1">
                {globalJobBoardCount !== null ? globalJobBoardCount : '...'}
              </div>
              <div className="text-sm font-semibold text-slate-900">
                Job Boards Tracked
              </div>
              <div className="text-xs text-slate-500 mt-0.5">and growing</div>
            </div>
          </div>

          <hr className="border-slate-200/60 mb-10 w-3/4" />

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10">
            {features.map((feature, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl text-brand-600">
                  {feature.icon}
                </div>
                <h3 className="text-[15px] font-bold text-slate-900">{feature.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed pr-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Login Panel */}
      <div className="w-full lg:w-[40%] flex-shrink-0 bg-gradient-to-b from-[#2D2B52] to-[#1E1B4B] flex flex-col justify-center items-center p-8 sm:p-12 relative overflow-hidden z-20 shadow-2xl">

        {/* Landscape Graphic */}
        <div className="absolute inset-0 z-0 opacity-90 mix-blend-screen pointer-events-none">
          <img src="/night_landscape.png" alt="Night Landscape" className="w-full h-full object-cover object-center" />
        </div>

        <div className="relative w-full max-w-[360px] mx-auto z-10">
          <h2 className="text-3xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome back 👋' : 'Create an account 🚀'}
          </h2>
          <p className="text-indigo-200 text-sm mb-10">
            {mode === 'login' ? 'Sign in to access your dashboard' : 'Join today and accelerate your job search'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-medium text-indigo-100">Email address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  ✉️
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white border border-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm font-medium transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-sm font-medium text-indigo-100">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔒
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white border border-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm font-medium transition-all shadow-sm"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input id="remember-me" type="checkbox" className="w-4 h-4 text-brand-500 bg-white border-gray-300 rounded focus:ring-brand-500 focus:ring-offset-[#2D2B52]" />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-indigo-200">
                    Remember me
                  </label>
                </div>
                <a href="#" className="text-xs font-medium text-brand-300 hover:text-brand-200">
                  Forgot password?
                </a>
              </div>
            )}

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
              className="w-full mt-2 !py-3.5 !text-sm !font-bold !rounded-xl !bg-brand-500 hover:!bg-brand-400 !text-white !shadow-lg !shadow-brand-500/30 transition-all hover:-translate-y-0.5"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccess('');
              }}
              className="text-sm text-indigo-200 hover:text-white transition-colors"
            >
              {mode === 'login' ? (
                <>Don&apos;t have an account? <span className="font-semibold text-brand-300 hover:text-brand-200">Sign up</span></>
              ) : (
                <>Already have an account? <span className="font-semibold text-brand-300 hover:text-brand-200">Sign in</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
