'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { QuickNote } from '@/types/database';

export default function QuickNotesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    // Close panel on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('quick_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (editingId) {
      // Update
      const { error } = await supabase
        .from('quick_notes')
        .update({ content: inputValue.trim() })
        .eq('id', editingId)
        .eq('user_id', userData.user.id);
      
      if (!error) {
        setNotes(notes.map(n => n.id === editingId ? { ...n, content: inputValue.trim() } : n));
      }
      setEditingId(null);
    } else {
      // Insert
      const { data, error } = await supabase
        .from('quick_notes')
        .insert([{ user_id: userData.user.id, content: inputValue.trim() }])
        .select()
        .single();
      
      if (!error && data) {
        setNotes([data, ...notes]);
      }
    }
    setInputValue('');
  };

  const handleEdit = (note: QuickNote) => {
    setEditingId(note.id);
    setInputValue(note.content);
  };

  const handleDelete = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from('quick_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id);
      
    if (!error) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" ref={panelRef}>
      {/* Panel */}
      <div 
        className={`mb-4 transition-all duration-300 origin-bottom-right ease-out glass-card overflow-hidden w-80 max-h-[500px] flex flex-col shadow-2xl ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-brand-600 px-4 py-3 flex justify-between items-center text-white">
          <h3 className="font-semibold flex items-center gap-2">
            <span>📝</span> Quick Notes
          </h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white/50 backdrop-blur-md">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No notes yet. Add your first job link or name below!
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map(note => (
                <li key={note.id} className="group bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 transition-colors">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{note.content}</div>
                  <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(note)}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(note.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSave} className="flex flex-col gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste a link or job title..."
              className="w-full text-sm rounded-lg border-gray-200 input-ring resize-none p-2.5"
              rows={2}
              autoFocus={isOpen}
            />
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={!inputValue.trim()}
                className="flex-1 btn-primary py-1.5 text-sm disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen ? 'bg-gray-800 text-white rotate-90' : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
        aria-label="Toggle Quick Notes"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        )}
      </button>
    </div>
  );
}
