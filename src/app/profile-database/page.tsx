'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import LayoutShell from '@/components/LayoutShell';
import { useToast } from '@/components/ui/Toast';
import { 
  ProfileCore, 
  ProfileExperience, 
  ProfileProject, 
  ProfileEducation, 
  ProfileSkill 
} from '@/types/database';

type Tab = 'core' | 'experience' | 'projects' | 'education' | 'skills';

export default function ProfileDatabasePage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('core');
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [core, setCore] = useState<Partial<ProfileCore>>({ professional_summary: '', career_interests: '', cover_letter_guidelines: '' });
  const [experiences, setExperiences] = useState<ProfileExperience[]>([]);
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [education, setEducation] = useState<ProfileEducation[]>([]);
  const [skills, setSkills] = useState<ProfileSkill[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const [
        { data: coreData },
        { data: expData },
        { data: projData },
        { data: eduData },
        { data: skillData }
      ] = await Promise.all([
        supabase.from('profile_core').select('*').eq('user_id', user.id).single(),
        supabase.from('profile_experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        supabase.from('profile_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profile_education').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        supabase.from('profile_skills').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
      ]);

      if (coreData) setCore(coreData);
      if (expData) setExperiences(expData);
      if (projData) setProjects(projData);
      if (eduData) setEducation(eduData);
      if (skillData) setSkills(skillData);
    }
    setIsLoading(false);
  };

  const handleSaveCore = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profile_core')
      .upsert({
        user_id: user.id,
        professional_summary: core.professional_summary,
        career_interests: core.career_interests,
        cover_letter_guidelines: core.cover_letter_guidelines,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      addToast(error.message, 'error');
    } else {
      addToast('Core Profile saved!', 'success');
    }
  };

  const handleDelete = async (table: string, id: string, setter: any, items: any[]) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const supabase = createClient();
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      addToast(error.message, 'error');
    } else {
      setter(items.filter(item => item.id !== id));
      addToast('Deleted successfully.', 'success');
    }
  };

  // Generic fast-add function for simple entities without opening a full modal MVP
  const addProject = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('profile_projects').insert({
      user_id: user.id,
      name: 'New Project',
      description: 'Project details...',
      technologies_used: '',
      business_relevance: '',
      transferable_value: ''
    }).select().single();
    if (data) setProjects([data, ...projects]);
  };

  const addExperience = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('profile_experiences').insert({
      user_id: user.id,
      company: 'Company',
      title: 'Title',
      start_date: '2023',
      end_date: 'Present',
      description: 'Responsibilities and achievements...'
    }).select().single();
    if (data) setExperiences([data, ...experiences]);
  };

  const addEducation = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('profile_education').insert({
      user_id: user.id,
      institution: 'University',
      degree: 'Degree',
      field_of_study: 'Field'
    }).select().single();
    if (data) setEducation([data, ...education]);
  };

  const addSkill = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('profile_skills').insert({
      user_id: user.id,
      skill_name: 'New Skill',
      category: 'General'
    }).select().single();
    if (data) setSkills([...skills, data]);
  };

  // Field Updater
  const updateField = async (table: string, id: string, field: string, value: string, setter: any, items: any[]) => {
    const newItems = items.map(item => item.id === id ? { ...item, [field]: value } : item);
    setter(newItems);

    const supabase = createClient();
    await supabase.from(table).update({ [field]: value }).eq('id', id);
  };


  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Candidate Database</h2>
          <p className="text-sm text-gray-500 mt-1">
            Build your modular profile. The AI will retrieve the most relevant blocks for each application.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-200">
          {(['core', 'experience', 'projects', 'education', 'skills'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-brand-500 text-brand-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[500px]">
          
          {/* CORE PROFILE */}
          {activeTab === 'core' && (
            <form onSubmit={handleSaveCore} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Professional Summary (Always Loaded)</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                  value={core.professional_summary || ''}
                  onChange={(e) => setCore({...core, professional_summary: e.target.value})}
                  placeholder="A strong, overarching professional summary..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Career Interests & Domains</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                  value={core.career_interests || ''}
                  onChange={(e) => setCore({...core, career_interests: e.target.value})}
                  placeholder="e.g. Renewable Energy, Smart Grids, Data Analytics..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Cover Letter Tone & Guidelines</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                  value={core.cover_letter_guidelines || ''}
                  onChange={(e) => setCore({...core, cover_letter_guidelines: e.target.value})}
                  placeholder="e.g. Keep it concise, 3 paragraphs, highly professional but passionate..."
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-brand-700">
                  Save Core Profile
                </button>
              </div>
            </form>
          )}

          {/* EXPERIENCES */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={addExperience} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                  + Add Experience
                </button>
              </div>
              {experiences.map(exp => (
                <div key={exp.id} className="p-4 border border-gray-200 rounded-xl space-y-4 bg-gray-50 relative">
                  <button onClick={() => handleDelete('profile_experiences', exp.id, setExperiences, experiences)} className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 text-sm">Delete</button>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="rounded-lg border-gray-300 text-sm font-semibold" value={exp.title} onChange={(e) => updateField('profile_experiences', exp.id, 'title', e.target.value, setExperiences, experiences)} placeholder="Job Title" />
                    <input className="rounded-lg border-gray-300 text-sm" value={exp.company} onChange={(e) => updateField('profile_experiences', exp.id, 'company', e.target.value, setExperiences, experiences)} placeholder="Company" />
                    <input className="rounded-lg border-gray-300 text-sm" value={exp.start_date || ''} onChange={(e) => updateField('profile_experiences', exp.id, 'start_date', e.target.value, setExperiences, experiences)} placeholder="Start Date" />
                    <input className="rounded-lg border-gray-300 text-sm" value={exp.end_date || ''} onChange={(e) => updateField('profile_experiences', exp.id, 'end_date', e.target.value, setExperiences, experiences)} placeholder="End Date" />
                  </div>
                  <textarea rows={4} className="w-full rounded-lg border-gray-300 text-sm" value={exp.description || ''} onChange={(e) => updateField('profile_experiences', exp.id, 'description', e.target.value, setExperiences, experiences)} placeholder="Describe responsibilities and achievements. The AI will extract 3 tailored bullets from this." />
                </div>
              ))}
            </div>
          )}

          {/* PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">The AI will select the 3 most relevant projects for each job.</p>
                <button onClick={addProject} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                  + Add Project
                </button>
              </div>
              {projects.map(proj => (
                <div key={proj.id} className="p-4 border border-gray-200 rounded-xl space-y-4 bg-gray-50 relative">
                  <button onClick={() => handleDelete('profile_projects', proj.id, setProjects, projects)} className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 text-sm">Delete</button>
                  <input className="w-full rounded-lg border-gray-300 text-sm font-semibold" value={proj.name} onChange={(e) => updateField('profile_projects', proj.id, 'name', e.target.value, setProjects, projects)} placeholder="Project Name" />
                  
                  <textarea rows={3} className="w-full rounded-lg border-gray-300 text-sm" value={proj.description} onChange={(e) => updateField('profile_projects', proj.id, 'description', e.target.value, setProjects, projects)} placeholder="Project Description (What did you do?)" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-semibold uppercase">Technologies Used</label>
                      <input className="w-full rounded-lg border-gray-300 text-sm mt-1" value={proj.technologies_used || ''} onChange={(e) => updateField('profile_projects', proj.id, 'technologies_used', e.target.value, setProjects, projects)} placeholder="Python, React..." />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-semibold uppercase">Business Relevance</label>
                      <input className="w-full rounded-lg border-gray-300 text-sm mt-1" value={proj.business_relevance || ''} onChange={(e) => updateField('profile_projects', proj.id, 'business_relevance', e.target.value, setProjects, projects)} placeholder="Why did this matter?" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-semibold uppercase">Transferable Value</label>
                      <input className="w-full rounded-lg border-gray-300 text-sm mt-1" value={proj.transferable_value || ''} onChange={(e) => updateField('profile_projects', proj.id, 'transferable_value', e.target.value, setProjects, projects)} placeholder="What did you learn?" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EDUCATION */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={addEducation} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                  + Add Education
                </button>
              </div>
              {education.map(edu => (
                <div key={edu.id} className="p-4 border border-gray-200 rounded-xl space-y-4 bg-gray-50 relative">
                  <button onClick={() => handleDelete('profile_education', edu.id, setEducation, education)} className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 text-sm">Delete</button>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="rounded-lg border-gray-300 text-sm font-semibold" value={edu.institution} onChange={(e) => updateField('profile_education', edu.id, 'institution', e.target.value, setEducation, education)} placeholder="Institution" />
                    <input className="rounded-lg border-gray-300 text-sm" value={edu.degree} onChange={(e) => updateField('profile_education', edu.id, 'degree', e.target.value, setEducation, education)} placeholder="Degree/Certificate" />
                    <input className="rounded-lg border-gray-300 text-sm" value={edu.field_of_study || ''} onChange={(e) => updateField('profile_education', edu.id, 'field_of_study', e.target.value, setEducation, education)} placeholder="Field of Study" />
                    <div className="flex space-x-2">
                      <input className="w-full rounded-lg border-gray-300 text-sm" value={edu.start_date || ''} onChange={(e) => updateField('profile_education', edu.id, 'start_date', e.target.value, setEducation, education)} placeholder="Start Year" />
                      <input className="w-full rounded-lg border-gray-300 text-sm" value={edu.end_date || ''} onChange={(e) => updateField('profile_education', edu.id, 'end_date', e.target.value, setEducation, education)} placeholder="End Year" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Add the skills you want the AI to consider for your CV.</p>
                <button onClick={addSkill} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                  + Add Skill
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map(skill => (
                  <div key={skill.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <input className="flex-1 rounded-md border-gray-300 text-sm py-1 px-2" value={skill.skill_name} onChange={(e) => updateField('profile_skills', skill.id, 'skill_name', e.target.value, setSkills, skills)} placeholder="Skill" />
                    <input className="w-24 rounded-md border-gray-300 text-sm py-1 px-2 text-gray-500" value={skill.category || ''} onChange={(e) => updateField('profile_skills', skill.id, 'category', e.target.value, setSkills, skills)} placeholder="Category" />
                    <button onClick={() => handleDelete('profile_skills', skill.id, setSkills, skills)} className="text-gray-400 hover:text-rose-500">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
