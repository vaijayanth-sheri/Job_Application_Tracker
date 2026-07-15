'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { type Job } from '@/types/database';
import { statusLabel, cn } from '@/lib/utils';
import Select from '@/components/ui/Select';

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'rejected', label: 'Rejected' },
];

const NOTIFICATIONS = [
  {
    id: 'searchJobsFeature',
    title: 'Search jobs from top Jobboards.',
    message: 'Now, you can search for jobs with custom preferences across top job boards directly in this app. You can also add the jobs directly into your saved jobs.',
    createdAt: new Date('2026-07-15T10:00:00Z').toISOString(),
  },
  {
    id: 'recruiterFeature',
    title: 'Now add recruiter details to a Job.',
    message: 'A new column for recruiter details is added for jobs, also using smart add feature, AI will look and auto fill recruiter details if only available.',
    createdAt: new Date('2026-07-08T10:00:00Z').toISOString(),
  }
];

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 30) return `${diffInDays} days ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentMyCompanies, setRecentMyCompanies] = useState<any[]>([]);
  const [recentMyBoards, setRecentMyBoards] = useState<any[]>([]);
  const [recentGlobalCompanies, setRecentGlobalCompanies] = useState<any[]>([]);
  const [recentGlobalBoards, setRecentGlobalBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  
  // Header Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const unreadNotifications = NOTIFICATIONS.filter(n => !readNotifications.has(n.id)).length;
  
  // Fake user profile details for UI mockup
  const userProfile = {
    name: 'Vaijayanth Sheri',
    initials: 'VS'
  };

  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    fetchDashboardData();
    const saved = localStorage.getItem('readNotifications');
    if (saved) {
      try {
        setReadNotifications(new Set(JSON.parse(saved)));
      } catch (e) {}
    } else {
      // Migrate old setting
      const savedOld = localStorage.getItem('recruiterFeatureNotificationRead');
      if (savedOld === 'true') {
        const initialSet = new Set<string>();
        initialSet.add('recruiterFeature');
        setReadNotifications(initialSet);
        localStorage.setItem('readNotifications', JSON.stringify(['recruiterFeature']));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const [
      { data: jobsData },
      { data: myCompaniesData },
      { data: myBoardsData },
      { data: globalCompaniesData },
      { data: globalBoardsData }
    ] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('user_companies').select('*, companies(*)').gte('created_at', twoDaysAgo).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_job_boards').select('*, job_boards(*)').gte('last_browsed', twoDaysAgo).order('last_browsed', { ascending: false }).limit(5),
      supabase.from('companies').select('*').gte('created_at', twoDaysAgo).order('created_at', { ascending: false }).limit(5),
      supabase.from('job_boards').select('*').gte('created_at', twoDaysAgo).order('created_at', { ascending: false }).limit(5),
    ]);

    setJobs(jobsData || []);
    setRecentMyCompanies(myCompaniesData || []);
    setRecentMyBoards(myBoardsData || []);
    setRecentGlobalCompanies(globalCompaniesData || []);
    setRecentGlobalBoards(globalBoardsData || []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const counts = {
      total: jobs.length,
      wishlist: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    jobs.forEach((j) => {
      if (counts[j.status as keyof typeof counts] !== undefined) {
        counts[j.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [jobs]);

  const trends = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const getTrend = (current: number, previous: number) => {
      if (previous === 0) {
        if (current > 0) return { text: '↑ 100%', color: 'text-emerald-500' };
        return { text: '→ 0%', color: 'text-slate-400' };
      }
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct > 0) return { text: `↑ ${pct}%`, color: 'text-emerald-500' };
      if (pct < 0) return { text: `↓ ${Math.abs(pct)}%`, color: 'text-rose-500' };
      return { text: '→ 0%', color: 'text-slate-400' };
    };

    const curTotal = jobs.filter(j => j.created_at >= sevenDaysAgo).length;
    const prevTotal = jobs.filter(j => j.created_at >= fourteenDaysAgo && j.created_at < sevenDaysAgo).length;

    const getStatusTrend = (status: string) => {
      const cur = jobs.filter(j => j.status === status && j.updated_at >= sevenDaysAgo).length;
      const prev = jobs.filter(j => j.status === status && j.updated_at >= fourteenDaysAgo && j.updated_at < sevenDaysAgo).length;
      return getTrend(cur, prev);
    };

    return {
      total: getTrend(curTotal, prevTotal),
      applied: getStatusTrend('applied'),
      interview: getStatusTrend('interview'),
      offer: getStatusTrend('offer'),
      rejected: getStatusTrend('rejected'),
    };
  }, [jobs]);

  const wishlistJobs = useMemo(() => jobs.filter(j => j.status === 'wishlist'), [jobs]);
  
  const recentJobs = useMemo(() => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    return jobs.filter(j => j.created_at >= twoDaysAgo || j.applied_date >= twoDaysAgo).slice(0, 5);
  }, [jobs]);

  const statCards = [
    { 
      key: 'total', label: 'Total Jobs', icon: '📊', 
      trend: trends.total.text, trendColor: trends.total.color, 
      bg: 'bg-brand-100', text: 'text-brand-700',
      cardBg: 'bg-indigo-50/60', borderColor: 'border-indigo-100',
      sparkline: (
        <svg className="w-16 h-8 text-brand-300 stroke-current" fill="none" viewBox="0 0 100 40">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M0 30 Q 20 10, 40 20 T 80 10 T 100 5" />
        </svg>
      )
    },
    { 
      key: 'applied', label: 'Applied', icon: '📤', 
      trend: trends.applied.text, trendColor: trends.applied.color, 
      bg: 'bg-blue-100', text: 'text-blue-700',
      cardBg: 'bg-blue-50/60', borderColor: 'border-blue-100',
      sparkline: (
        <svg className="w-16 h-8 text-blue-300 stroke-current" fill="none" viewBox="0 0 100 40">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M0 35 L 20 25 L 40 28 L 70 15 L 100 10" />
        </svg>
      )
    },
    { 
      key: 'interview', label: 'Interviews', icon: '🎯', 
      trend: trends.interview.text, trendColor: trends.interview.color, 
      bg: 'bg-amber-100', text: 'text-amber-700',
      cardBg: 'bg-amber-50/60', borderColor: 'border-amber-100',
      sparkline: (
        <svg className="w-16 h-8 text-amber-300 stroke-current" fill="none" viewBox="0 0 100 40">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M0 20 L 30 20 L 70 20 L 100 20" />
        </svg>
      )
    },
    { 
      key: 'rejected', label: 'Rejected', icon: '❌', 
      trend: trends.rejected.text, trendColor: trends.rejected.color, 
      bg: 'bg-rose-100', text: 'text-rose-700',
      cardBg: 'bg-rose-50/60', borderColor: 'border-rose-100',
      sparkline: (
        <svg className="w-16 h-8 text-rose-300 stroke-current" fill="none" viewBox="0 0 100 40">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M0 10 L 30 15 L 60 25 L 100 35" />
        </svg>
      )
    },
    { 
      key: 'offer', label: 'Offers', icon: '🎉', 
      trend: trends.offer.text, trendColor: trends.offer.color, 
      bg: 'bg-emerald-100', text: 'text-emerald-700',
      cardBg: 'bg-emerald-50/60', borderColor: 'border-emerald-100',
      sparkline: (
        <svg className="w-16 h-8 text-emerald-300 stroke-current" fill="none" viewBox="0 0 100 40">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M0 35 Q 20 35, 40 30 T 100 25" />
        </svg>
      )
    },
  ];

  if (loading) {
    return (
      <div className="page-enter space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative page-enter max-w-[1400px] mx-auto pb-24 min-h-screen">

      <div className="relative z-10 space-y-8">
        
        {/* Header & Profile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Your job search at a glance</p>
          </div>

          <div className="flex items-center gap-6 relative">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfile(false);
                }}
                className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-bold text-slate-800">Notifications</h3>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto space-y-3">
                      {NOTIFICATIONS.map((notif) => {
                        const isRead = readNotifications.has(notif.id);
                        return (
                          <div key={notif.id} className={`flex gap-3 p-3 rounded-xl relative ${isRead ? 'opacity-70' : 'bg-brand-50/50 border border-brand-100/50'}`}>
                            {!isRead && <div className="absolute top-3 right-3 w-2 h-2 bg-brand-500 rounded-full"></div>}
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 pr-4 leading-tight">{notif.title}</p>
                              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{notif.message}</p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(notif.createdAt)}</p>
                                {!isRead && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReadNotifications(prev => {
                                        const next = new Set(prev);
                                        next.add(notif.id);
                                        localStorage.setItem('readNotifications', JSON.stringify(Array.from(next)));
                                        return next;
                                      });
                                    }}
                                    className="text-[11px] text-brand-600 font-semibold hover:text-brand-700 transition-colors"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <div 
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {userProfile.initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-slate-700 leading-tight">{userProfile.name}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {/* Profile Dropdown */}
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in p-2">
                    <div className="p-3 border-b border-slate-100 mb-2">
                      <p className="text-sm font-bold text-slate-800">{userProfile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Manage your profile</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
          {statCards.map((card, i) => (
            <div
              key={card.key}
              onClick={() => {
                if (card.key !== 'total') {
                  router.push(`/jobs?status=${card.key}`);
                } else {
                  router.push(`/jobs`);
                }
              }}
              className={cn(
                'relative border rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all overflow-hidden',
                card.cardBg,
                card.borderColor,
                `stagger-${i + 1}`
              )}
              style={{ animationFillMode: 'both' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", card.bg, card.text)}>
                  {card.icon}
                </div>
                <div className={cn("text-xs font-bold", card.trendColor)}>
                  {card.trend}
                </div>
              </div>
              
              <div className="relative z-10">
                <p className="text-3xl font-black text-slate-800 animate-count-up">
                  {stats[card.key as keyof typeof stats]}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{card.label}</p>
              </div>

              {/* Sparkline decoration */}
              <div className="absolute right-0 bottom-2 opacity-60">
                {card.sparkline}
              </div>
            </div>
          ))}
        </div>

        {/* Wishlist Reminder */}
        {wishlistJobs.length > 0 && (
          <div className="relative bg-gradient-to-r from-[#FFF9F0] to-[#FFF0E6] border border-[#FFE4C4] rounded-2xl p-6 shadow-sm transform transition-all hover:shadow-md overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <h2 className="text-lg font-bold text-amber-900">Action Required: Wishlist Jobs</h2>
                </div>
                <p className="text-sm font-medium text-amber-800/70">You have {wishlistJobs.length} job(s) sitting in your wishlist waiting to be applied to.</p>
              </div>

              <div className="flex-1 flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {wishlistJobs.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => router.push(`/jobs?jobId=${job.id}`)}
                    className="min-w-[240px] bg-white rounded-xl p-3.5 border border-amber-200 shadow-sm flex flex-col gap-1 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 truncate group-hover:text-brand-600 transition-colors">{job.title}</span>
                      <svg className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 truncate">{job.company || 'Unknown Company'}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Stylized Clipboard Graphic (Decorative) */}
            <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 w-32 h-32 opacity-40 mix-blend-multiply pointer-events-none">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="25" y="15" width="50" height="70" rx="4" fill="#FDE68A" stroke="#D97706" strokeWidth="3"/>
                <rect x="35" y="10" width="30" height="10" rx="2" fill="#FCD34D" stroke="#D97706" strokeWidth="3"/>
                <line x1="35" y1="35" x2="65" y2="35" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                <line x1="35" y1="45" x2="65" y2="45" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                <line x1="35" y1="55" x2="50" y2="55" stroke="#D97706" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="70" cy="70" r="16" fill="#F59E0B"/>
                <path d="M70 62L72.2451 66.5492L77.2654 67.279L73.6327 70.8208L74.4903 75.821L70 73.46L65.5097 75.821L66.3673 70.8208L62.7346 67.279L67.7549 66.5492L70 62Z" fill="white"/>
              </svg>
            </div>
          </div>
        )}



        {/* Recent Activity Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Global Recent Activity */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                 <span className="text-2xl">🌐</span> Global Ecosystem Updates
               </h3>
               <button 
                 onClick={() => router.push('/companies?tab=global')}
                 className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors"
               >
                 View all
               </button>
             </div>
             
             {recentGlobalCompanies.length === 0 && recentGlobalBoards.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="text-4xl mb-3 opacity-30">🌍</div>
                  <p className="text-sm font-medium text-slate-400">No new community additions in the last 48 hours.</p>
                </div>
             ) : (
               <div className="space-y-8">
                 {recentGlobalCompanies.length > 0 && (
                   <div>
                     <h4 
                      onClick={() => router.push('/companies?tab=global')}
                      className="text-[11px] font-black text-brand-700 uppercase tracking-widest mb-4 flex items-center gap-2 cursor-pointer hover:underline"
                     >
                       <span className="w-2 h-2 rounded-full bg-brand-500"></span> New Companies
                     </h4>
                     <ul className="flex flex-col gap-2">
                       {recentGlobalCompanies.map((c, i) => (
                         <li 
                           key={c.id} 
                           onClick={() => router.push('/companies?tab=global')}
                           className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all group"
                         >
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">{c.company_name}</span> 
                             <span className="text-xs text-slate-500 font-medium mt-0.5">{c.sector || 'Unknown sector'}</span>
                           </div>
                           <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-100 rounded-md">New</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                 {recentGlobalBoards.length > 0 && (
                   <div>
                     <h4 
                       onClick={() => router.push('/boards')}
                       className="text-[11px] font-black text-purple-700 uppercase tracking-widest mb-4 flex items-center gap-2 cursor-pointer hover:underline"
                     >
                       <span className="w-2 h-2 rounded-full bg-purple-500"></span> New Job Boards
                     </h4>
                     <ul className="flex flex-col gap-2">
                       {recentGlobalBoards.map((b, i) => (
                         <li 
                           key={b.id} 
                           onClick={() => router.push('/boards')}
                           className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all group"
                         >
                           <span className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{b.site}</span>
                           <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100 rounded-md">New</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             )}
          </div>

          {/* Personal Recent Activity */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                 <span className="text-2xl">👤</span> Your Recent Activity
               </h3>
               <button 
                 onClick={() => router.push('/jobs')}
                 className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors"
               >
                 View all
               </button>
             </div>
             
             {recentJobs.length === 0 && recentMyCompanies.length === 0 && recentMyBoards.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                 <div className="text-4xl mb-3 opacity-30">💤</div>
                 <p className="text-sm font-medium text-slate-400">No personal tracking activity in the last 48 hours.</p>
               </div>
             ) : (
               <div className="space-y-8">
                 {recentJobs.length > 0 && (
                   <div>
                     <h4 
                       onClick={() => router.push('/jobs')}
                       className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2 cursor-pointer hover:underline"
                     >
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Recent Jobs
                     </h4>
                     <ul className="flex flex-col gap-2">
                       {recentJobs.map((j, i) => {
                         const rawStatus = j.status;
                         const dotColor = rawStatus === 'applied' ? 'bg-blue-500' : 
                                          rawStatus === 'wishlist' ? 'bg-slate-500' : 
                                          rawStatus === 'interview' ? 'bg-amber-500' : 
                                          rawStatus === 'rejected' ? 'bg-rose-500' : 
                                          rawStatus === 'offer' ? 'bg-emerald-500' : 'bg-brand-500';

                         return (
                           <li 
                             key={j.id} 
                             onClick={() => router.push(`/jobs?jobId=${j.id}`)}
                             className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
                           >
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{j.title}</span>
                               <span className="text-xs text-slate-500 font-medium mt-0.5">at <span className="text-slate-600 font-semibold">{j.company || 'Unknown'}</span></span>
                             </div>
                             <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm">
                               <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                               {statusLabel(j.status)}
                             </div>
                           </li>
                         );
                       })}
                     </ul>
                   </div>
                 )}
                 {recentMyCompanies.length > 0 && (
                   <div>
                     <h4 
                       onClick={() => router.push('/companies')}
                       className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2 cursor-pointer hover:underline"
                     >
                       <span className="w-2 h-2 rounded-full bg-amber-500"></span> Tracked Companies
                     </h4>
                     <ul className="flex flex-col gap-2">
                       {recentMyCompanies.map((c, i) => (
                         <li 
                           key={c.id} 
                           onClick={() => router.push('/companies')}
                           className="flex items-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all group"
                         >
                           <span className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">{c.companies?.company_name}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

      </div>



    </div>
  );
}
