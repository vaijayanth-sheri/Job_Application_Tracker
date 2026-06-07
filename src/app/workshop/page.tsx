'use client';

import React, { useState, useEffect } from 'react';

import { createClient } from '@/lib/supabase';
import { Job, AISettings } from '@/types/database';
import LayoutShell from '@/components/LayoutShell';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export default function AIWorkshopPage() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [hasCoreProfile, setHasCoreProfile] = useState<boolean | null>(null);
  
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState('');
  const [scrapingError, setScrapingError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job) {
        if (job.job_description) {
          setJobDescription(job.job_description);
        } else if (job.job_link) {
          setJobDescription(job.job_link);
        } else {
          setJobDescription('');
        }
      }
    } else {
      setJobDescription('');
    }
  }, [selectedJobId, jobs]);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Fetch jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (jobsData) setJobs(jobsData);

      // Check if user has core profile
      const { data: coreData } = await supabase
        .from('profile_core')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      setHasCoreProfile(!!coreData);
    }
  };

  const handleGenerate = async () => {
    if (!hasCoreProfile) {
      addToast("Please configure your Core Profile in the Profile Database first!", 'error');
      return;
    }
    if (!jobDescription.trim()) {
      addToast("Please paste a job description.", 'error');
      return;
    }

    setIsLoading(true);
    setCompletion('');
    setError(null);
    setScrapingError(false);
    setScrapingStatus('');

    try {
      let textToAnalyze = jobDescription;
      const isUrl = /^https?:\/\//i.test(jobDescription.trim());
      
      if (isUrl) {
        setScrapingStatus('Reading URL and scraping web...');
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
        setScrapingStatus('Analyzing candidate database...');
      }

      const res = await fetch('/api/ai-workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: textToAnalyze,
        })
      });

      if (!res.ok) {
        let errorMessage = `Error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) errorMessage = errData.error;
        } catch (e) {
          errorMessage = await res.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          text += decoder.decode(value, { stream: true });
          
          if (text.includes('NOT_A_JOB_POSTING')) {
            throw new Error('The provided link or text does not appear to be a specific job description. Please provide a direct link to a job posting.');
          }

          setCompletion(text);
        }
      }
    } catch (err: any) {
      setScrapingError(true);
      setScrapingStatus(err.message || "Failed to generate.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!completion) return;
    navigator.clipboard.writeText(completion);
    addToast('Content copied to clipboard!', 'success');
  };

  return (
    <LayoutShell>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Input Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Application Workshop</h2>
              <p className="text-sm text-gray-500 mt-1">Select a job and paste the description to generate tailored assets.</p>
            </div>
          </div>

          <div>
            <label htmlFor="job-select" className="block text-sm font-semibold text-gray-900 mb-2">
              Target Job
            </label>
            <select
              id="job-select"
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-white"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="">-- Select a job (Optional) --</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.company ? `at ${job.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="jd" className="block text-sm font-semibold text-gray-900 mb-2">
              Job Description or URL
            </label>
            <textarea
              id="jd"
              rows={8}
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
              placeholder="Paste a URL (https://...) or the full job description text here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className={cn("text-sm font-medium", scrapingError ? "text-red-600" : "text-brand-600 animate-pulse")}>
              {scrapingStatus}
            </span>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !jobDescription.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-brand-600 py-2.5 px-6 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate Assets
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              An error occurred: {error.message}
            </div>
          )}
        </div>

        {/* Output Section */}
        {(completion || isLoading) && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-fade-in relative min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Tailored Application Assets</h3>
              <button
                onClick={copyToClipboard}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-brand-50 px-3 py-1.5 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All
              </button>
            </div>
            {isLoading && !completion && (
              <div className="flex flex-col items-center justify-center h-48 space-y-4 text-brand-600">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium animate-pulse">{scrapingStatus || 'Analyzing candidate database and extracting evidence...'}</p>
              </div>
            )}
            <div className="prose prose-brand max-w-none text-gray-800 text-sm whitespace-pre-wrap font-mono">
              {completion}
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
