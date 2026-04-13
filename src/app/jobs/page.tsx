'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { type Job, type JobStatus, type JobFormData } from '@/types/database';
import {
  formatDate,
  toInputDate,
  STATUS_COLORS,
  RELEVANCY_COLORS,
  statusLabel,
  cn,
} from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const STATUS_OPTIONS = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const RELEVANCY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const INTEREST_OPTIONS = [
  { value: '1', label: '1 — Low' },
  { value: '2', label: '2' },
  { value: '3', label: '3 — Medium' },
  { value: '4', label: '4' },
  { value: '5', label: '5 — High' },
];

const EMPTY_FORM: JobFormData = {
  title: '',
  company: '',
  applied_date: new Date().toISOString().split('T')[0],
  location: '',
  status: 'wishlist',
  relevancy: 'medium',
  interest_level: 3,
  interview_stage: '',
  job_link: '',
  notes: '',
};

type SortField = 'title' | 'company' | 'applied_date' | 'status' | 'relevancy' | 'interest_level' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRelevancy, setFilterRelevancy] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const { addToast } = useToast();

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      addToast('Failed to load jobs', 'error');
    }
    setJobs(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = jobs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      result = result.filter((j) => j.status === filterStatus);
    }
    if (filterRelevancy !== 'all') {
      result = result.filter((j) => j.relevancy === filterRelevancy);
    }
    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [jobs, search, filterStatus, filterRelevancy, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setForm({
      title: job.title,
      company: job.company,
      applied_date: toInputDate(job.applied_date),
      location: job.location,
      status: job.status,
      relevancy: job.relevancy,
      interest_level: job.interest_level,
      interview_stage: job.interview_stage,
      job_link: job.job_link,
      notes: job.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingJob) {
        const { error } = await supabase
          .from('jobs')
          .update(form)
          .eq('id', editingJob.id);
        if (error) throw error;
        addToast('Job updated successfully');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('jobs')
          .insert({ ...form, user_id: user!.id });
        if (error) throw error;
        addToast('Job added successfully');
      }
      setModalOpen(false);
      fetchJobs();
    } catch {
      addToast('Failed to save job', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Job deleted');
      setDeleteTarget(null);
      fetchJobs();
    } catch {
      addToast('Failed to delete job', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Inline status update
  const updateStatus = async (job: Job, newStatus: JobStatus) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', job.id);
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
      );
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-brand-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const renderStars = (level: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={cn('w-3.5 h-3.5', i <= level ? 'text-amber-400' : 'text-gray-200')}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-enter space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} of {jobs.length} jobs
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Job
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, company, location..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm input-ring"
              />
            </div>
          </div>
          <div className="w-40">
            <Select
              label="Status"
              options={[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Relevancy"
              options={[{ value: 'all', label: 'All' }, ...RELEVANCY_OPTIONS]}
              value={filterRelevancy}
              onChange={(e) => setFilterRelevancy(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-5xl mb-4">💼</div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">No jobs found</h3>
            <p className="text-sm text-gray-500">
              {jobs.length === 0
                ? 'Add your first job application to get started!'
                : 'Try adjusting your filters or search term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('title')}>
                    Title <SortIcon field="title" />
                  </th>
                  <th onClick={() => handleSort('company')}>
                    Company <SortIcon field="company" />
                  </th>
                  <th onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th onClick={() => handleSort('applied_date')}>
                    Applied <SortIcon field="applied_date" />
                  </th>
                  <th>Location</th>
                  <th onClick={() => handleSort('relevancy')}>
                    Relevancy <SortIcon field="relevancy" />
                  </th>
                  <th onClick={() => handleSort('interest_level')}>
                    Interest <SortIcon field="interest_level" />
                  </th>
                  <th>Link</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const statusClr = STATUS_COLORS[job.status];
                  const relClr = RELEVANCY_COLORS[job.relevancy];
                  return (
                    <tr key={job.id}>
                      <td>
                        <span className="font-medium text-gray-900">{job.title}</span>
                        {job.interview_stage && (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            Stage: {job.interview_stage}
                          </span>
                        )}
                      </td>
                      <td className="text-gray-600">{job.company || '—'}</td>
                      <td>
                        <select
                          value={job.status}
                          onChange={(e) => updateStatus(job, e.target.value as JobStatus)}
                          className={cn(
                            'badge border-0 cursor-pointer text-xs font-medium',
                            statusClr.bg,
                            statusClr.text
                          )}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(job.applied_date)}
                      </td>
                      <td className="text-gray-500">{job.location || '—'}</td>
                      <td>
                        <Badge bg={relClr.bg} text={relClr.text}>
                          {statusLabel(job.relevancy)}
                        </Badge>
                      </td>
                      <td>{renderStars(job.interest_level)}</td>
                      <td>
                        {job.job_link ? (
                          <a
                            href={job.job_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                          >
                            Open ↗
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(job)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(job)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingJob ? 'Edit Job' : 'Add New Job'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Software Engineer"
            />
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Google"
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Berlin, Germany"
            />
            <Input
              label="Applied Date"
              type="date"
              value={form.applied_date}
              onChange={(e) => setForm({ ...form, applied_date: e.target.value })}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
            />
            <Select
              label="Relevancy"
              options={RELEVANCY_OPTIONS}
              value={form.relevancy}
              onChange={(e) => setForm({ ...form, relevancy: e.target.value as 'low' | 'medium' | 'high' })}
            />
            <Select
              label="Interest Level"
              options={INTEREST_OPTIONS}
              value={String(form.interest_level)}
              onChange={(e) => setForm({ ...form, interest_level: parseInt(e.target.value) })}
            />
            <Input
              label="Interview Stage"
              value={form.interview_stage}
              onChange={(e) => setForm({ ...form, interview_stage: e.target.value })}
              placeholder="Phone screen, On-site..."
            />
          </div>
          <Input
            label="Job Link"
            type="url"
            value={form.job_link}
            onChange={(e) => setForm({ ...form, job_link: e.target.value })}
            placeholder="https://..."
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingJob ? 'Save Changes' : 'Add Job'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
