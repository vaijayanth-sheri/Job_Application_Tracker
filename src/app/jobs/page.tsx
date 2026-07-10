'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { type Job, type JobStatus, type JobFormData, type CompanyFormData } from '@/types/database';
import {
  formatDate,
  toInputDate,
  STATUS_COLORS,
  getRelevancyColor,
  statusLabel,
  cn,
  formatUrl,
} from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

function normalizeUrl(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
}

const STATUS_OPTIONS = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

// Removed RELEVANCY_OPTIONS since relevancy is now an integer score

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
  relevancy: 50,
  interest_level: 3,
  interview_stage: '',
  job_link: '',
  notes: '',
  recruiter_details: '',
};

type SortField = 'title' | 'company' | 'applied_date' | 'status' | 'relevancy' | 'interest_level' | 'created_at';
type SortDir = 'asc' | 'desc';

function JobsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  const initialJobId = searchParams.get('jobId');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialStatus && STATUS_OPTIONS.some(o => o.value === initialStatus) ? initialStatus : 'all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Smart Add state
  const [smartMode, setSmartMode] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [scrapedDescription, setScrapedDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('');
  const [analyzingError, setAnalyzingError] = useState(false);
  const [smartCompanyData, setSmartCompanyData] = useState<{sector: string, website_link: string} | null>(null);

  // Company linking state
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingCompanyName, setPendingCompanyName] = useState('');
  const [companyForm, setCompanyForm] = useState<Partial<CompanyFormData>>({
    sector: '', website_link: '', location: '', interest_level: 3, notes: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Duplicate Company Prompt State
  const [duplicatePromptData, setDuplicatePromptData] = useState<{
    jobId: string;
    companyId: string;
    companyName: string;
    reason: string;
    newCompanyData: Partial<CompanyFormData>;
  } | null>(null);

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

  useEffect(() => {
    if (initialJobId && jobs.length > 0 && !modalOpen && !editingJob) {
      const job = jobs.find(j => j.id === initialJobId);
      if (job) {
        openEdit(job);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, initialJobId]);

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
  }, [jobs, search, filterStatus, sortField, sortDir]);

  // Distinct values for smart suggestions
  const uniqueCompanies = useMemo(() => Array.from(new Set(jobs.map((j) => j.company).filter(Boolean))), [jobs]);
  const uniqueLocations = useMemo(() => Array.from(new Set(jobs.map((j) => j.location).filter(Boolean))), [jobs]);
  const uniqueStages = useMemo(() => Array.from(new Set(jobs.map((j) => j.interview_stage).filter(Boolean))), [jobs]);

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
    setSmartMode(false);
    setJobDescription('');
    setScrapedDescription('');
    setModalOpen(true);
  };

  const openSmartAdd = () => {
    setEditingJob(null);
    setForm({ ...EMPTY_FORM, applied_date: '' });
    setSmartMode(true);
    setJobDescription('');
    setScrapedDescription('');
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
      recruiter_details: job.recruiter_details || '',
    });
    setScrapedDescription(job.job_description || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Convert empty strings to null for date/optional fields
      const payload = {
        ...form,
        applied_date: form.applied_date || null,
        job_description: scrapedDescription || null,
      };

      let savedJobId = editingJob?.id;

      if (editingJob) {
        const { error } = await supabase
          .from('jobs')
          .update(payload)
          .eq('id', editingJob.id);
        if (error) throw error;
        addToast('Job updated successfully');
      } else {
        const { data: insertedJob, error } = await supabase
          .from('jobs')
          .insert({ ...payload, user_id: user.id })
          .select('id')
          .single();
        if (error) throw error;
        savedJobId = insertedJob.id;
        addToast('Job added successfully');
      }
      
      setModalOpen(false);

      // Auto-link or prompt for company
      if (form.company && savedJobId) {
        const { data: allCompanies } = await supabase.from('companies').select('id, company_name, website_link');
        
        let foundCompanyId: string | null = null;
        let duplicateReason = '';
        let duplicateName = '';

        if (allCompanies) {
          const targetName = form.company.toLowerCase();
          const targetUrl = smartCompanyData?.website_link ? normalizeUrl(smartCompanyData.website_link) : '';

          for (const c of allCompanies) {
            const existingName = c.company_name.toLowerCase();
            const existingUrl = normalizeUrl(c.website_link);

            // 1. Exact Website Link Match
            if (targetUrl && existingUrl && targetUrl === existingUrl) {
              foundCompanyId = c.id;
              duplicateReason = 'exact website link match';
              duplicateName = c.company_name;
              break;
            }

            // 2. Fuzzy Link + Partial Name Match
            if (targetUrl && existingUrl && (targetUrl.includes(existingUrl) || existingUrl.includes(targetUrl))) {
              if (existingName.includes(targetName) || targetName.includes(existingName)) {
                foundCompanyId = c.id;
                duplicateReason = 'similar website link and partial name match';
                duplicateName = c.company_name;
                break;
              }
            }

            // 3. Fallback: Exact Name Match
            if (existingName === targetName) {
              foundCompanyId = c.id;
              duplicateReason = 'exact name match';
              duplicateName = c.company_name;
              // Don't break here, keep searching for a URL match just in case
            }
          }
        }

        if (foundCompanyId) {
          // If we found a duplicate, check if user already has it in user_companies
          const { data: userCompany } = await supabase
            .from('user_companies')
            .select('id')
            .eq('company_id', foundCompanyId)
            .eq('user_id', user.id)
            .maybeSingle();

          // If the reason was URL or Fuzzy matching (not exact name), or if we just want to prompt before adding ANY new company...
          // The instruction: "when such duplicates are found, prompt user before adding."
          if (duplicateReason !== 'exact name match' || !userCompany) {
            setDuplicatePromptData({
              jobId: savedJobId,
              companyId: foundCompanyId,
              companyName: duplicateName,
              reason: duplicateReason,
              newCompanyData: {
                company_name: form.company,
                sector: smartCompanyData?.sector || '',
                website_link: smartCompanyData?.website_link || '',
                location: form.location || '',
                interest_level: 3,
                notes: ''
              }
            });
            return; // Stop the flow and wait for user interaction
          }

          // If exact name match AND already linked to user, just auto-link the job silently
          await supabase.from('jobs').update({ company_id: foundCompanyId }).eq('id', savedJobId);
          fetchJobs();
        } else {
          // No duplicate found, trigger normal company save modal
          setPendingJobId(savedJobId);
          setPendingCompanyName(form.company);
          setCompanyForm({
            sector: smartCompanyData?.sector || '',
            website_link: smartCompanyData?.website_link || '',
            location: form.location || '',
            interest_level: 3,
            notes: ''
          });
          setCompanyModalOpen(true);
        }
      } else {
        fetchJobs();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to save job', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const globalCompanyId = crypto.randomUUID();
      const { error } = await supabase
        .from('companies')
        .insert({
          id: globalCompanyId,
          company_name: pendingCompanyName,
          sector: companyForm.sector,
          website_link: companyForm.website_link,
          location: companyForm.location,
          is_global: false,
        });
      if (error) throw error;

      const { error: ucError } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: globalCompanyId,
          interest_level: companyForm.interest_level || 3,
          notes: companyForm.notes || '',
        });
      if (ucError) throw ucError;

      if (pendingJobId) {
        await supabase.from('jobs').update({ company_id: globalCompanyId }).eq('id', pendingJobId);
      }

      addToast('Company saved and linked to job!');
      setCompanyModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      addToast(err.message || 'Failed to save company', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleDuplicateResolve = async (action: 'link' | 'create_new') => {
    if (!duplicatePromptData) return;
    
    if (action === 'link') {
      try {
        await supabase.from('jobs').update({ company_id: duplicatePromptData.companyId }).eq('id', duplicatePromptData.jobId);
        
        // Ensure user is tracking this company since they chose to link to it
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingUc } = await supabase
            .from('user_companies')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', duplicatePromptData.companyId)
            .maybeSingle();
            
          if (!existingUc) {
            await supabase.from('user_companies').insert({
              user_id: user.id,
              company_id: duplicatePromptData.companyId,
              interest_level: 3,
              notes: ''
            });
          }
        }
        addToast('Linked to existing company successfully');
        setDuplicatePromptData(null);
        fetchJobs();
      } catch (err: any) {
        addToast('Failed to link company: ' + err.message, 'error');
      }
    } else if (action === 'create_new') {
      // User explicitly wants a new duplicate entry
      setPendingJobId(duplicatePromptData.jobId);
      setPendingCompanyName(duplicatePromptData.newCompanyData.company_name || '');
      setCompanyForm({
        sector: duplicatePromptData.newCompanyData.sector || '',
        website_link: duplicatePromptData.newCompanyData.website_link || '',
        location: duplicatePromptData.newCompanyData.location || '',
        interest_level: 3,
        notes: ''
      });
      setDuplicatePromptData(null);
      setCompanyModalOpen(true);
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

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      addToast('Please enter a job description or URL', 'error');
      return;
    }
    setAnalyzing(true);
    setAnalyzingError(false);
    setAnalyzingStatus('Analyzing input...');
    try {
      let textToAnalyze = jobDescription;
      const isUrl = /^https?:\/\//i.test(jobDescription.trim());
      
      if (isUrl) {
        setAnalyzingStatus('Reading URL and scraping web...');
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: jobDescription.trim() })
        });
        if (!scrapeRes.ok) {
          const errData = await scrapeRes.json();
          throw new Error(errData.error || 'Failed to scrape URL');
        }
        const scrapeData = await scrapeRes.json();
        textToAnalyze = scrapeData.text;
        setAnalyzingStatus('Extracting JD...');
      }
      setScrapedDescription(textToAnalyze);

      const { data: { user } } = await supabase.auth.getUser();

      // Fetch profile from the frontend (has auth session, bypasses RLS)
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', user?.id)
        .maybeSingle();

      const res = await fetch('/api/smart-add-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobDescription: textToAnalyze, 
          userId: user?.id,
          resumeText: profileData?.resume_text || ''
        })
      });
      
      if (!res.ok) {
        let errMsg = 'Analysis failed';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          errMsg = await res.text() || errMsg;
        }
        throw new Error(errMsg);
      }
      
      const data = await res.json();
      
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        company: data.company || prev.company,
        location: data.location || prev.location,
        relevancy: typeof data.relevancy === 'number' ? data.relevancy : prev.relevancy,
        interest_level: typeof data.interest_level === 'number' ? data.interest_level : prev.interest_level,
        job_link: isUrl ? jobDescription.trim() : prev.job_link,
        notes: data.notes || prev.notes,
        recruiter_details: data.recruiter_details || prev.recruiter_details,
        // applied_date, status, and other fields are intentionally left untouched
      }));
      setSmartCompanyData({
        sector: data.company_sector || '',
        website_link: data.company_website || ''
      });
      setSmartMode(false);
      setAnalyzingStatus('');
      addToast('Job details extracted successfully');
    } catch (err: any) {
      setAnalyzingError(true);
      setAnalyzingStatus(err.message || 'Analysis failed');
      // No toast so the user focuses on the inline error
    } finally {
      setAnalyzing(false);
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
        <div className="flex items-center gap-3">
          <Button onClick={openSmartAdd} size="md" variant="secondary" className="bg-brand-50 text-brand-700 hover:bg-brand-100 border-0">
            ✨ Smart Add
          </Button>
          <Button onClick={openCreate} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Job
          </Button>
        </div>
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
          {/* Relevancy filter removed for brevity as it is now a score */}
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
                  const relClr = getRelevancyColor(job.relevancy);
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
                          {job.relevancy}% Match
                        </Badge>
                      </td>
                      <td>{renderStars(job.interest_level)}</td>
                      <td>
                        {job.job_link ? (
                          <a
                            href={formatUrl(job.job_link)}
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
        title={
          <div className="flex items-center justify-between pr-8">
            <span>{smartMode ? 'Smart Add Job' : (editingJob ? 'Edit Job' : 'Add New Job')}</span>
          </div>
        }
        size="lg"
      >
        {smartMode ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Paste Job Description or URL</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                placeholder="Paste a URL (https://...) or the full job description text here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring resize-none"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className={cn("text-sm font-medium", analyzingError ? "text-red-600" : "text-brand-600 animate-pulse")}>
                {analyzingStatus}
              </span>
              <Button type="button" onClick={handleAnalyze} loading={analyzing}>
                ✨ Analyze with AI
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Job Title *"
                value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Software Engineer"
            />
            <Combobox
              label="Company"
              options={uniqueCompanies}
              value={form.company}
              onChange={(val) => setForm({ ...form, company: val })}
              placeholder="Google, Microsoft..."
            />
            <Combobox
              label="Location"
              options={uniqueLocations}
              value={form.location}
              onChange={(val) => setForm({ ...form, location: val })}
              placeholder="Berlin, Remote..."
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
            <Input
              label="Relevancy (0-100)"
              type="number"
              min="0"
              max="100"
              value={String(form.relevancy)}
              onChange={(e) => setForm({ ...form, relevancy: parseInt(e.target.value) || 0 })}
            />
            <Select
              label="Interest Level"
              options={INTEREST_OPTIONS}
              value={String(form.interest_level)}
              onChange={(e) => setForm({ ...form, interest_level: parseInt(e.target.value) })}
            />
            <Combobox
              label="Interview Stage"
              options={uniqueStages}
              value={form.interview_stage}
              onChange={(val) => setForm({ ...form, interview_stage: val })}
              placeholder="Phone screen, On-site..."
            />
          </div>
          <Input
            label="Job Link"
            type="text"
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
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Recruiter Details</label>
            <textarea
              value={form.recruiter_details}
              onChange={(e) => setForm({ ...form, recruiter_details: e.target.value })}
              rows={2}
              placeholder="Recruiter name, email, phone number, etc."
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
        )}
      </Modal>

      {/* Save Company Modal */}
      <Modal
        isOpen={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        title="Save Company to Personal List"
        size="md"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            The company <strong>{pendingCompanyName}</strong> is not in your personal list. Would you like to track it?
          </p>
          <div className="space-y-3">
            <Input
              label="Sector"
              value={companyForm.sector}
              onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
              placeholder="Technology, Finance..."
            />
            <Input
              label="Website Link"
              type="text"
              value={companyForm.website_link}
              onChange={(e) => setCompanyForm({ ...companyForm, website_link: e.target.value })}
              placeholder="https://..."
            />
            <Input
              label="Location"
              value={companyForm.location}
              onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
              placeholder="City, Country"
            />
            <Select
              label="Interest Level"
              options={INTEREST_OPTIONS}
              value={String(companyForm.interest_level)}
              onChange={(e) => setCompanyForm({ ...companyForm, interest_level: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setCompanyModalOpen(false)}>
              Skip
            </Button>
            <Button type="submit" loading={savingCompany}>
              Save Company
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

      {/* Duplicate Company Confirm Modal */}
      <Modal
        isOpen={!!duplicatePromptData}
        onClose={() => setDuplicatePromptData(null)}
        title="Similar Company Found"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            We found a similar company in the database based on a <strong>{duplicatePromptData?.reason}</strong>.
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-sm">Existing Company: <strong>{duplicatePromptData?.companyName}</strong></p>
            <p className="text-sm mt-1">You Typed: <strong>{duplicatePromptData?.newCompanyData.company_name}</strong></p>
          </div>
          <p className="text-sm text-gray-700">
            Would you like to link this job to the existing company, or create a brand new entry?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => handleDuplicateResolve('create_new')}>
              Create New
            </Button>
            <Button onClick={() => handleDuplicateResolve('link')}>
              Link to Existing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="page-enter p-8 text-center text-gray-500">Loading jobs...</div>}>
      <JobsContent />
    </Suspense>
  );
}
