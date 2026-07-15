'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { type Job, type JobStatus, type JobFormData, type CompanyFormData } from '@/types/database';
import { toInputDate, STATUS_COLORS, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const STATUS_OPTIONS = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
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
  relevancy: 50,
  interest_level: 3,
  interview_stage: '',
  job_link: '',
  notes: '',
  recruiter_details: '',
};

function normalizeUrl(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
}

interface JobFormModalsProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: () => void;
  initialMode?: 'smart' | 'manual';
  initialData?: Partial<JobFormData>;
  autoAnalyzeUrl?: string;
  editingJob?: Job | null;
  uniqueCompanies?: string[];
  uniqueLocations?: string[];
  uniqueStages?: string[];
}

export default function JobFormModals({
  isOpen,
  onClose,
  onJobSaved,
  initialMode = 'manual',
  initialData,
  autoAnalyzeUrl,
  editingJob = null,
  uniqueCompanies = [],
  uniqueLocations = [],
  uniqueStages = [],
}: JobFormModalsProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);
  const [smartMode, setSmartMode] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [scrapedDescription, setScrapedDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Analyze state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('');
  const [analyzingError, setAnalyzingError] = useState(false);
  const [smartCompanyData, setSmartCompanyData] = useState<{sector: string, website_link: string} | null>(null);

  // Company link state
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingCompanyName, setPendingCompanyName] = useState('');
  const [companyForm, setCompanyForm] = useState<Partial<CompanyFormData>>({
    sector: '', website_link: '', location: '', interest_level: 3, notes: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Duplicate prompt state
  const [duplicatePromptData, setDuplicatePromptData] = useState<{
    jobId: string;
    companyId: string;
    companyName: string;
    reason: string;
    newCompanyData: Partial<CompanyFormData>;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingJob) {
        setSmartMode(false);
        setForm({
          title: editingJob.title,
          company: editingJob.company,
          applied_date: toInputDate(editingJob.applied_date),
          location: editingJob.location,
          status: editingJob.status,
          relevancy: editingJob.relevancy,
          interest_level: editingJob.interest_level,
          interview_stage: editingJob.interview_stage,
          job_link: editingJob.job_link,
          notes: editingJob.notes,
          recruiter_details: editingJob.recruiter_details || '',
        });
        setScrapedDescription(editingJob.job_description || '');
      } else {
        setSmartMode(initialMode === 'smart');
        setForm({ ...EMPTY_FORM, ...initialData });
        setJobDescription(autoAnalyzeUrl || '');
        setScrapedDescription('');
        setSmartCompanyData(null);
        setAnalyzingError(false);
        setAnalyzingStatus('');
        
        if (autoAnalyzeUrl && initialMode === 'smart') {
          // Immediately trigger analysis
          handleAnalyze(autoAnalyzeUrl);
        }
      }
    } else {
      // Reset Modals and States when closed completely
      setCompanyModalOpen(false);
      setDuplicatePromptData(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingJob, initialMode, autoAnalyzeUrl]);

  const handleAnalyze = async (urlToAnalyze?: string) => {
    const textOrUrl = typeof urlToAnalyze === 'string' ? urlToAnalyze : jobDescription;
    if (!textOrUrl.trim()) {
      addToast('Please enter a job description or URL', 'error');
      return;
    }
    setAnalyzing(true);
    setAnalyzingError(false);
    setAnalyzingStatus('Analyzing input...');
    try {
      let textToAnalyze = textOrUrl;
      const isUrl = /^https?:\/\//i.test(textOrUrl.trim());
      
      if (isUrl) {
        setAnalyzingStatus('Reading URL and scraping web...');
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: textOrUrl.trim() })
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
        job_link: isUrl ? textOrUrl.trim() : prev.job_link,
        notes: data.notes || prev.notes,
        recruiter_details: data.recruiter_details || prev.recruiter_details,
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
      // Do not close smart mode if we fail, just show the form with initial data
      setSmartMode(false);
      addToast('Failed to fetch AI analysis. Using initial data.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
      
      onClose(); // close main modal

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

            if (targetUrl && existingUrl && targetUrl === existingUrl) {
              foundCompanyId = c.id;
              duplicateReason = 'exact website link match';
              duplicateName = c.company_name;
              break;
            }

            if (targetUrl && existingUrl && (targetUrl.includes(existingUrl) || existingUrl.includes(targetUrl))) {
              if (existingName.includes(targetName) || targetName.includes(existingName)) {
                foundCompanyId = c.id;
                duplicateReason = 'similar website link and partial name match';
                duplicateName = c.company_name;
                break;
              }
            }

            if (existingName === targetName) {
              foundCompanyId = c.id;
              duplicateReason = 'exact name match';
              duplicateName = c.company_name;
            }
          }
        }

        if (foundCompanyId) {
          const { data: userCompany } = await supabase
            .from('user_companies')
            .select('id')
            .eq('company_id', foundCompanyId)
            .eq('user_id', user.id)
            .maybeSingle();

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
            return;
          }

          await supabase.from('jobs').update({ company_id: foundCompanyId }).eq('id', savedJobId);
          onJobSaved();
        } else {
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
        onJobSaved();
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
      onJobSaved();
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
        onJobSaved();
      } catch (err: any) {
        addToast('Failed to link company: ' + err.message, 'error');
      }
    } else if (action === 'create_new') {
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
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
              <Button type="button" onClick={() => handleAnalyze()} loading={analyzing}>
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
              <Button variant="secondary" type="button" onClick={onClose}>
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
    </>
  );
}
