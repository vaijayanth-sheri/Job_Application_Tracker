'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { AISettingsFormData } from '@/types/database';
import LayoutShell from '@/components/LayoutShell';
import { useToast } from '@/components/ui/Toast';

export default function AISettingsPage() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState<AISettingsFormData>({
    base_cv: '',
    cover_letter_guidelines: '',
    formatting_rules: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setFormData({
          base_cv: data.base_cv || '',
          cover_letter_guidelines: data.cover_letter_guidelines || '',
          formatting_rules: data.formatting_rules || '',
        });
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching AI settings:', error);
      }
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      addToast('User not authenticated', 'error');
      setIsSaving(false);
      return;
    }

    // Check if record exists first to decide insert vs update
    const { data: existing } = await supabase
      .from('ai_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let saveError;

    if (existing) {
      const { error } = await supabase
        .from('ai_settings')
        .update({
          base_cv: formData.base_cv,
          cover_letter_guidelines: formData.cover_letter_guidelines,
          formatting_rules: formData.formatting_rules,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      saveError = error;
    } else {
      const { error } = await supabase
        .from('ai_settings')
        .insert({
          user_id: user.id,
          base_cv: formData.base_cv,
          cover_letter_guidelines: formData.cover_letter_guidelines,
          formatting_rules: formData.formatting_rules,
        });
      saveError = error;
    }

    if (saveError) {
      console.error('Error saving AI settings:', saveError);
      addToast('Failed to save settings.', 'error');
    } else {
      addToast('Settings saved successfully!', 'success');
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your AI Persona</h2>
          <p className="text-sm text-gray-500 mt-1">
            Provide the foundational documents the AI will use to generate your tailored cover letters and CV tweaks.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          
          {/* Base CV */}
          <div>
            <label htmlFor="base_cv" className="block text-sm font-semibold text-gray-900 mb-2">
              Profile Info / Base CV
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Paste your comprehensive info document containing all projects, experience, skills, and capabilities. The AI will extract only the relevant parts for each specific job.
            </p>
            <textarea
              id="base_cv"
              rows={12}
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm font-mono"
              placeholder="Paste your full CV or profile details here..."
              value={formData.base_cv}
              onChange={(e) => setFormData({ ...formData, base_cv: e.target.value })}
            />
          </div>

          {/* Cover Letter Guidelines */}
          <div>
            <label htmlFor="cover_letter_guidelines" className="block text-sm font-semibold text-gray-900 mb-2">
              Cover Letter Guidelines
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Describe your preferred tone (e.g., confident, humble, energetic), paragraph structure, or key phrases you always want included.
            </p>
            <textarea
              id="cover_letter_guidelines"
              rows={4}
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
              placeholder="e.g., Keep it under 3 paragraphs. Be professional but enthusiastic. Highlight my leadership skills..."
              value={formData.cover_letter_guidelines}
              onChange={(e) => setFormData({ ...formData, cover_letter_guidelines: e.target.value })}
            />
          </div>

          {/* Formatting Rules */}
          <div>
            <label htmlFor="formatting_rules" className="block text-sm font-semibold text-gray-900 mb-2">
              Formatting Rules
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Specific instructions on how you want the AI to format the output.
            </p>
            <textarea
              id="formatting_rules"
              rows={4}
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
              placeholder="e.g., Keep bullet points under 2 lines. Do not use buzzwords like 'synergy'."
              value={formData.formatting_rules}
              onChange={(e) => setFormData({ ...formData, formatting_rules: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center rounded-xl border border-transparent bg-brand-600 py-2.5 px-6 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </LayoutShell>
  );
}
