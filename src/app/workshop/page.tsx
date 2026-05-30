'use client';

import React, { useState, useEffect } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { createClient } from '@/lib/supabase';
import { Job, AISettings } from '@/types/database';
import LayoutShell from '@/components/LayoutShell';
import { useToast } from '@/components/ui/Toast';

export default function AIWorkshopPage() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [settings, setSettings] = useState<AISettings | null>(null);
  
  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/ai-workshop',
  });

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch AI Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (settingsData) {
        setSettings(settingsData);
      } else if (settingsError && settingsError.code !== 'PGRST116') {
        console.error("Failed to load AI settings", settingsError);
      }
    }
  };

  const handleGenerate = async () => {
    if (!settings || !settings.base_cv) {
      addToast("Please configure your Base CV in AI Settings first!", 'error');
      return;
    }
    if (!jobDescription.trim()) {
      addToast("Please paste a job description.", 'error');
      return;
    }

    try {
      await complete(jobDescription, {
        body: {
          base_cv: settings.base_cv,
          cover_letter_guidelines: settings.cover_letter_guidelines,
          formatting_rules: settings.formatting_rules,
          jobDescription: jobDescription,
        }
      });
    } catch (err: any) {
      addToast(err.message || "Failed to generate.", 'error');
    }
  };

  // Split completion into CV Suggestions and Cover Letter
  const parts = completion.split('### Cover Letter');
  const cvSuggestionsText = parts[0]?.replace('### CV Suggestions', '').trim() || '';
  const coverLetterText = parts[1]?.trim() || '';

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, 'success');
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
              Job Description
            </label>
            <textarea
              id="jd"
              rows={8}
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
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
        {completion && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Panel 1: CV Changes */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">CV Suggestions</h3>
                <button
                  onClick={() => copyToClipboard(cvSuggestionsText, 'CV Suggestions')}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-mono text-sm text-gray-700">
                {cvSuggestionsText || 'Generating suggestions...'}
              </div>
            </div>

            {/* Panel 2: Cover Letter */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Cover Letter</h3>
                <button
                  onClick={() => copyToClipboard(coverLetterText, 'Cover Letter')}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-mono text-sm text-gray-700">
                {coverLetterText || 'Generating cover letter...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
