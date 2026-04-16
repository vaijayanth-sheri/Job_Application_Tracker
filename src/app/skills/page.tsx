'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { type Skill, type SkillFormData, type SkillStatus, type SkillPriority } from '@/types/database';
import {
  PRIORITY_COLORS,
  SKILL_STATUS_COLORS,
  statusLabel,
  cn,
} from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const STATUS_OPTIONS = [
  { value: 'to_learn', label: 'To Learn' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'learned', label: 'Learned' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const EMPTY_FORM: SkillFormData = {
  skill_name: '',
  category: '',
  priority: 'medium',
  status: 'to_learn',
  notes: '',
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillFormData>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const { addToast } = useToast();

  const fetchSkills = useCallback(async () => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) addToast('Failed to load skills', 'error');
    setSkills(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Distinct values for smart suggestions
  const uniqueSkills = Array.from(new Set(skills.map((s) => s.skill_name).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)));

  const filtered = useMemo(() => {
    let result = skills;
    if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      result = result.filter((s) => s.priority === filterPriority);
    }
    return result;
  }, [skills, filterStatus, filterPriority]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    filtered.forEach((skill) => {
      const cat = skill.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    });
    return groups;
  }, [filtered]);

  const openCreate = () => {
    setEditingSkill(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({
      skill_name: skill.skill_name,
      category: skill.category,
      priority: skill.priority,
      status: skill.status,
      notes: skill.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update(form)
          .eq('id', editingSkill.id);
        if (error) throw error;
        addToast('Skill updated');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('skills')
          .insert({ ...form, user_id: user!.id });
        if (error) throw error;
        addToast('Skill added');
      }
      setModalOpen(false);
      fetchSkills();
    } catch {
      addToast('Failed to save skill', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('skills').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Skill deleted');
      setDeleteTarget(null);
      fetchSkills();
    } catch {
      addToast('Failed to delete skill', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Cycle status inline
  const cycleStatus = async (skill: Skill) => {
    const cycle: SkillStatus[] = ['to_learn', 'in_progress', 'learned'];
    const idx = cycle.indexOf(skill.status);
    const newStatus = cycle[(idx + 1) % cycle.length];
    const { error } = await supabase
      .from('skills')
      .update({ status: newStatus })
      .eq('id', skill.id);
    if (error) {
      addToast('Failed to update', 'error');
    } else {
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, status: newStatus } : s))
      );
    }
  };

  const progressPercent = (status: SkillStatus) => {
    if (status === 'to_learn') return 0;
    if (status === 'in_progress') return 50;
    return 100;
  };

  // Stats
  const skillStats = useMemo(() => {
    return {
      total: skills.length,
      to_learn: skills.filter((s) => s.status === 'to_learn').length,
      in_progress: skills.filter((s) => s.status === 'in_progress').length,
      learned: skills.filter((s) => s.status === 'learned').length,
    };
  }, [skills]);

  if (loading) {
    return (
      <div className="page-enter space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
          <p className="text-sm text-gray-500 mt-1">Track skill gaps from your job search</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Skill
        </Button>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: skillStats.total, color: 'bg-brand-50 text-brand-700' },
          { label: 'To Learn', value: skillStats.to_learn, color: 'bg-slate-50 text-slate-700' },
          { label: 'In Progress', value: skillStats.in_progress, color: 'bg-blue-50 text-blue-700' },
          { label: 'Learned', value: skillStats.learned, color: 'bg-emerald-50 text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl px-4 py-3', s.color)}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <Select
            label="Status"
            options={[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            label="Priority"
            options={[{ value: 'all', label: 'All' }, ...PRIORITY_OPTIONS]}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          />
        </div>
      </div>

      {/* Skill Cards by Category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="glass-card px-6 py-16 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No skills tracked yet</h3>
          <p className="text-sm text-gray-500">Start tracking skills you encounter in job listings.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, categorySkills]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySkills.map((skill) => {
                const prClr = PRIORITY_COLORS[skill.priority];
                const stClr = SKILL_STATUS_COLORS[skill.status];
                return (
                  <div
                    key={skill.id}
                    className="glass-card p-4 group hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{skill.skill_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge bg={prClr.bg} text={prClr.text}>
                            {statusLabel(skill.priority)}
                          </Badge>
                          <button
                            onClick={() => cycleStatus(skill)}
                            className="transition-transform hover:scale-105"
                            title="Click to cycle status"
                          >
                            <Badge bg={stClr.bg} text={stClr.text}>
                              {statusLabel(skill.status)}
                            </Badge>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(skill)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(skill)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-500',
                          skill.status === 'learned'
                            ? 'bg-emerald-500'
                            : skill.status === 'in_progress'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        )}
                        style={{ width: `${progressPercent(skill.status)}%` }}
                      />
                    </div>

                    {skill.notes && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-2">{skill.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSkill ? 'Edit Skill' : 'Add New Skill'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Combobox
            label="Skill Name *"
            options={uniqueSkills}
            value={form.skill_name}
            onChange={(val) => setForm({ ...form, skill_name: val })}
            required
            placeholder="TypeScript, Docker, etc."
          />
          <Combobox
            label="Category"
            options={uniqueCategories}
            value={form.category}
            onChange={(val) => setForm({ ...form, category: val })}
            placeholder="Frontend, DevOps, Soft Skills..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as SkillPriority })}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as SkillStatus })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Resources, links, progress..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingSkill ? 'Save Changes' : 'Add Skill'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Skill"
        message={`Are you sure you want to delete "${deleteTarget?.skill_name}"?`}
        loading={deleting}
      />
    </div>
  );
}
