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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    setJobs(data || []);
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

  const recentJobs = useMemo(() => filteredJobs.slice(0, 10), [filteredJobs]);

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

      {/* Recent Activity */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">Your latest job entries</p>
        </div>

        {recentJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-gray-500">No jobs found. Start by adding your first job application!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => {
                  const colors = STATUS_COLORS[job.status];
                  return (
                    <tr key={job.id}>
                      <td className="font-medium text-gray-900">{job.title}</td>
                      <td className="text-gray-600">{job.company || '—'}</td>
                      <td>
                        <Badge bg={colors.bg} text={colors.text} dot={colors.dot}>
                          {statusLabel(job.status)}
                        </Badge>
                      </td>
                      <td className="text-gray-500 text-xs">{formatDate(job.applied_date)}</td>
                      <td className="text-gray-500">{job.location || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
