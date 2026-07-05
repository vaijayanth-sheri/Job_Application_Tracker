'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { type Job, type JobStatus } from '@/types/database';
import { formatDate, STATUS_COLORS, STAT_GRADIENTS, statusLabel, cn } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentMyCompanies, setRecentMyCompanies] = useState<any[]>([]);
  const [recentMyBoards, setRecentMyBoards] = useState<any[]>([]);
  const [recentGlobalCompanies, setRecentGlobalCompanies] = useState<any[]>([]);
  const [recentGlobalBoards, setRecentGlobalBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
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

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (statusFilter !== 'all') {
      result = result.filter((j) => j.status === statusFilter);
    }
    if (dateFrom) {
      result = result.filter((j) => j.applied_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((j) => j.applied_date <= dateTo);
    }
    return result;
  }, [jobs, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const counts = {
      total: filteredJobs.length,
      wishlist: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    filteredJobs.forEach((j) => {
      if (counts[j.status as keyof typeof counts] !== undefined) {
        counts[j.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [filteredJobs]);

  const wishlistJobs = useMemo(() => jobs.filter(j => j.status === 'wishlist'), [jobs]);
  
  const recentJobs = useMemo(() => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    return jobs.filter(j => j.created_at >= twoDaysAgo || j.applied_date >= twoDaysAgo).slice(0, 5);
  }, [jobs]);

  const statCards = [
    { key: 'total', label: 'Total Jobs', icon: '📊' },
    { key: 'applied', label: 'Applied', icon: '📤' },
    { key: 'interview', label: 'Interviews', icon: '🎯' },
    { key: 'rejected', label: 'Rejected', icon: '❌' },
    { key: 'offer', label: 'Offers', icon: '🎉' },
  ];

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your job search at a glance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.key}
            className={cn(
              'stat-card bg-gradient-to-br',
              STAT_GRADIENTS[card.key],
              `stagger-${i + 1}`
            )}
            style={{ animationFillMode: 'both' }}
          >
            <div className="relative z-10">
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-3xl font-bold animate-count-up">
                {stats[card.key as keyof typeof stats]}
              </p>
              <p className="text-sm text-white/80 font-medium mt-1">{card.label}</p>
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      {/* Wishlist Reminder */}
      {wishlistJobs.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm transform transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">⭐</div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Action Required: Wishlist Jobs</h2>
              <p className="text-sm text-amber-800">You have {wishlistJobs.length} job(s) sitting in your wishlist waiting to be applied to.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
            {wishlistJobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl p-3 border border-amber-100 shadow-sm flex flex-col gap-1 hover:border-amber-300 transition-colors">
                <span className="font-semibold text-gray-900 truncate">{job.title}</span>
                <span className="text-sm text-gray-600 truncate">{job.company || 'Unknown Company'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring"
            />
          </div>
          {(statusFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium pb-2.5"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Global Recent Activity */}
        <div className="glass-card p-5 lg:p-6 flex flex-col bg-slate-50/50">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3">
             <span className="text-2xl">🌐</span> Global Ecosystem Updates
           </h3>
           
           {recentGlobalCompanies.length === 0 && recentGlobalBoards.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div className="text-3xl mb-2 opacity-50">🌍</div>
                <p className="text-sm text-gray-500">No new community additions in the last 48 hours.</p>
              </div>
           ) : (
             <div className="space-y-6">
               {recentGlobalCompanies.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-blue-500"></span> New Companies
                   </h4>
                   <ul className="flex flex-col rounded-xl overflow-hidden border border-blue-100">
                     {recentGlobalCompanies.map((c, i) => (
                       <li key={c.id} className={`flex flex-col px-4 py-3 ${i % 2 === 0 ? 'bg-blue-50/70' : 'bg-white'}`}>
                         <span className="text-sm font-semibold text-blue-900">{c.company_name}</span> 
                         <span className="text-xs text-blue-600/80 font-medium">{c.sector || 'Unknown sector'}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
               {recentGlobalBoards.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2 mt-6">
                     <span className="w-2 h-2 rounded-full bg-purple-500"></span> New Job Boards
                   </h4>
                   <ul className="flex flex-col rounded-xl overflow-hidden border border-purple-100">
                     {recentGlobalBoards.map((b, i) => (
                       <li key={b.id} className={`flex items-center px-4 py-3 ${i % 2 === 0 ? 'bg-purple-50/70' : 'bg-white'}`}>
                         <span className="text-sm font-semibold text-purple-900">{b.site}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Personal Recent Activity */}
        <div className="glass-card p-5 lg:p-6 flex flex-col bg-slate-50/50">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3">
             <span className="text-2xl">👤</span> Your Recent Activity
           </h3>
           
           {recentJobs.length === 0 && recentMyCompanies.length === 0 && recentMyBoards.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
               <div className="text-3xl mb-2 opacity-50">💤</div>
               <p className="text-sm text-gray-500">No personal tracking activity in the last 48 hours.</p>
             </div>
           ) : (
             <div className="space-y-6">
               {recentJobs.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Recent Jobs
                   </h4>
                   <ul className="flex flex-col rounded-xl overflow-hidden border border-emerald-100">
                     {recentJobs.map((j, i) => (
                       <li key={j.id} className={`flex flex-col px-4 py-3 ${i % 2 === 0 ? 'bg-emerald-50/70' : 'bg-white'}`}>
                         <span className="text-sm font-semibold text-emerald-900">{j.title}</span>
                         <span className="text-xs text-emerald-600/80 font-medium">at {j.company || 'Unknown'}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
               {recentMyCompanies.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2 mt-6">
                     <span className="w-2 h-2 rounded-full bg-amber-500"></span> Tracked Companies
                   </h4>
                   <ul className="flex flex-col rounded-xl overflow-hidden border border-amber-100">
                     {recentMyCompanies.map((c, i) => (
                       <li key={c.id} className={`flex items-center px-4 py-3 ${i % 2 === 0 ? 'bg-amber-50/70' : 'bg-white'}`}>
                         <span className="text-sm font-semibold text-amber-900">{c.companies?.company_name}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
               {recentMyBoards.length > 0 && (
                 <div>
                   <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-2 mt-6">
                     <span className="w-2 h-2 rounded-full bg-rose-500"></span> Browsed Portals
                   </h4>
                   <ul className="flex flex-col rounded-xl overflow-hidden border border-rose-100">
                     {recentMyBoards.map((b, i) => (
                       <li key={b.id} className={`flex items-center px-4 py-3 ${i % 2 === 0 ? 'bg-rose-50/70' : 'bg-white'}`}>
                         <span className="text-sm font-semibold text-rose-900">{b.job_boards?.site}</span>
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
  );
}
