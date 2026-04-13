'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { type JobBoard, type JobBoardFormData } from '@/types/database';
import { formatDate, toInputDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const EMPTY_FORM: JobBoardFormData = {
  site: '',
  link: '',
  last_browsed: new Date().toISOString().split('T')[0],
  keywords: '',
  notes: '',
};

export default function BoardsPage() {
  const [boards, setBoards] = useState<JobBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<JobBoard | null>(null);
  const [form, setForm] = useState<JobBoardFormData>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<JobBoard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const { addToast } = useToast();

  const fetchBoards = useCallback(async () => {
    const { data, error } = await supabase
      .from('job_boards')
      .select('*')
      .order('last_browsed', { ascending: false });
    if (error) addToast('Failed to load boards', 'error');
    setBoards(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const filtered = boards.filter(
    (b) =>
      b.site.toLowerCase().includes(search.toLowerCase()) ||
      b.keywords.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingBoard(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (board: JobBoard) => {
    setEditingBoard(board);
    setForm({
      site: board.site,
      link: board.link,
      last_browsed: toInputDate(board.last_browsed),
      keywords: board.keywords,
      notes: board.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingBoard) {
        const { error } = await supabase
          .from('job_boards')
          .update(form)
          .eq('id', editingBoard.id);
        if (error) throw error;
        addToast('Board updated');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('job_boards')
          .insert({ ...form, user_id: user!.id });
        if (error) throw error;
        addToast('Board added');
      }
      setModalOpen(false);
      fetchBoards();
    } catch {
      addToast('Failed to save board', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('job_boards').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Board deleted');
      setDeleteTarget(null);
      fetchBoards();
    } catch {
      addToast('Failed to delete board', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Mark as browsed today
  const markBrowsed = async (board: JobBoard) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('job_boards')
      .update({ last_browsed: today })
      .eq('id', board.id);
    if (error) {
      addToast('Failed to update', 'error');
    } else {
      setBoards((prev) =>
        prev.map((b) => (b.id === board.id ? { ...b, last_browsed: today } : b))
      );
      addToast('Marked as browsed today');
    }
  };

  if (loading) {
    return (
      <div className="page-enter space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
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
          <h1 className="text-2xl font-bold text-gray-900">Job Boards</h1>
          <p className="text-sm text-gray-500 mt-1">Your go-to job search sites</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Board
        </Button>
      </div>

      {/* Search */}
      {boards.length > 0 && (
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards or keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm input-ring"
          />
        </div>
      )}

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card px-6 py-16 text-center">
          <div className="text-5xl mb-4">🌐</div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No job boards yet</h3>
          <p className="text-sm text-gray-500">Add the sites you browse for job listings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((board) => (
            <div
              key={board.id}
              className="glass-card p-5 flex flex-col gap-3 group hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center text-lg font-bold text-brand-700">
                    {board.site.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{board.site}</h3>
                    <p className="text-xs text-gray-400">Last: {formatDate(board.last_browsed)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(board)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(board)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Keywords */}
              {board.keywords && (
                <div className="flex flex-wrap gap-1.5">
                  {board.keywords.split(',').map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium"
                    >
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {board.notes && (
                <p className="text-xs text-gray-500 line-clamp-2">{board.notes}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-2">
                {board.link && (
                  <a
                    href={board.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Visit Site
                  </a>
                )}
                <button
                  onClick={() => markBrowsed(board)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ✓ Browsed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBoard ? 'Edit Board' : 'Add New Board'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Site Name *"
            value={form.site}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
            required
            placeholder="LinkedIn, Indeed, etc."
          />
          <Input
            label="Link"
            type="url"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://..."
          />
          <Input
            label="Last Browsed"
            type="date"
            value={form.last_browsed}
            onChange={(e) => setForm({ ...form, last_browsed: e.target.value })}
          />
          <Input
            label="Keywords"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            placeholder="React, Senior, Remote (comma-separated)"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Any notes about this board..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingBoard ? 'Save Changes' : 'Add Board'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteTarget?.site}"?`}
        loading={deleting}
      />
    </div>
  );
}
