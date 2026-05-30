'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';

export default function ProfilePage() {
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setResumeText(data.resume_text || '');
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // upsert the user profile (will insert if not exists, update if exists because of unique user_id constraint)
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, resume_text: resumeText }, { onConflict: 'user_id' });
        
      if (error) throw error;
      addToast('Profile saved successfully');
    } catch (err: any) {
      addToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add your resume, skills, and background here. This information is used by the Smart Add AI to generate accurate match scores for job descriptions.
        </p>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Resume / Skills Summary</label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={20}
              placeholder="Paste your resume or list your skills and experience here..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm input-ring resize-none font-mono"
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" loading={saving} size="lg">
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
