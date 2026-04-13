'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { type Company, type CompanyFormData } from '@/types/database';
import { formatDate, toInputDate, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const INTEREST_OPTIONS = [
  { value: '1', label: '1 — Low' },
  { value: '2', label: '2' },
  { value: '3', label: '3 — Medium' },
  { value: '4', label: '4' },
  { value: '5', label: '5 — High' },
];

const EMPTY_FORM: CompanyFormData = {
  company_name: '',
  sector: '',
  website_link: '',
  location: '',
  interest_level: 3,
  last_reviewed: new Date().toISOString().split('T')[0],
  linkedin_connections: '',
  notes: '',
};

type SortField = 'company_name' | 'interest_level' | 'last_reviewed' | 'sector' | 'location' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterInterest, setFilterInterest] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();
  const { addToast } = useToast();

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      addToast('Failed to load companies', 'error');
    }
    setCompanies(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Derive unique sector and location values for filter dropdowns
  const sectors = useMemo(() => {
    const unique = [...new Set(companies.map((c) => c.sector).filter(Boolean))].sort();
    return unique;
  }, [companies]);

  const locations = useMemo(() => {
    const unique = [...new Set(companies.map((c) => c.location).filter(Boolean))].sort();
    return unique;
  }, [companies]);

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = companies;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }
    if (filterSector !== 'all') {
      result = result.filter((c) => c.sector === filterSector);
    }
    if (filterInterest !== 'all') {
      result = result.filter((c) => c.interest_level === parseInt(filterInterest));
    }
    if (filterLocation !== 'all') {
      result = result.filter((c) => c.location === filterLocation);
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
  }, [companies, search, filterSector, filterInterest, filterLocation, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({
      company_name: company.company_name,
      sector: company.sector,
      website_link: company.website_link,
      location: company.location,
      interest_level: company.interest_level,
      last_reviewed: toInputDate(company.last_reviewed),
      linkedin_connections: company.linkedin_connections,
      notes: company.notes,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(form)
          .eq('id', editingCompany.id);
        if (error) throw error;
        addToast('Company updated successfully');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('companies')
          .insert({ ...form, user_id: user!.id });
        if (error) throw error;
        addToast('Company added successfully');
      }
      setModalOpen(false);
      fetchCompanies();
    } catch {
      addToast('Failed to save company', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const { error } = await supabase.from('companies').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Company deleted');
      setDeleteTarget(null);
      fetchCompanies();
    } catch {
      addToast('Failed to delete company', 'error');
    } finally {
      setDeleting(false);
    }
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

  const interestBadge = (level: number) => {
    if (level >= 4) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'High' };
    if (level >= 3) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' };
    return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' };
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-brand-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="page-enter space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} of {companies.length} companies
          </p>
        </div>
        <Button onClick={openCreate} size="md">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Company
        </Button>
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
                placeholder="Search name, sector, location..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm input-ring"
              />
            </div>
          </div>
          <div className="w-40">
            <Select
              label="Sector"
              options={[{ value: 'all', label: 'All' }, ...sectors.map((s) => ({ value: s, label: s }))]}
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Interest"
              options={[{ value: 'all', label: 'All' }, ...INTEREST_OPTIONS]}
              value={filterInterest}
              onChange={(e) => setFilterInterest(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              label="Location"
              options={[{ value: 'all', label: 'All' }, ...locations.map((l) => ({ value: l, label: l }))]}
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">No companies found</h3>
            <p className="text-sm text-gray-500">
              {companies.length === 0
                ? 'Start tracking companies you are interested in!'
                : 'Try adjusting your filters or search term.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('company_name')}>
                    Company <SortIcon field="company_name" />
                  </th>
                  <th onClick={() => handleSort('sector')}>
                    Sector <SortIcon field="sector" />
                  </th>
                  <th onClick={() => handleSort('location')}>
                    Location <SortIcon field="location" />
                  </th>
                  <th onClick={() => handleSort('interest_level')}>
                    Interest <SortIcon field="interest_level" />
                  </th>
                  <th onClick={() => handleSort('last_reviewed')}>
                    Last Reviewed <SortIcon field="last_reviewed" />
                  </th>
                  <th>LinkedIn</th>
                  <th>Website</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => {
                  const badge = interestBadge(company.interest_level);
                  return (
                    <tr key={company.id} className={company.interest_level >= 4 ? 'bg-emerald-50/40' : ''}>
                      <td>
                        <span className="font-medium text-gray-900">{company.company_name}</span>
                        {company.notes && (
                          <span className="block text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                            {company.notes}
                          </span>
                        )}
                      </td>
                      <td>
                        {company.sector ? (
                          <Badge bg="bg-violet-100" text="text-violet-700">
                            {company.sector}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-gray-600">{company.location || '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {renderStars(company.interest_level)}
                          <Badge bg={badge.bg} text={badge.text}>
                            {badge.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(company.last_reviewed)}
                      </td>
                      <td className="text-gray-600 text-sm">
                        {company.linkedin_connections || '—'}
                      </td>
                      <td>
                        {company.website_link ? (
                          <a
                            href={company.website_link}
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
                            onClick={() => openEdit(company)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(company)}
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
        title={editingCompany ? 'Edit Company' : 'Add New Company'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              required
              placeholder="Google, Apple, etc."
            />
            <Input
              label="Sector"
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              placeholder="Tech, Finance, Healthcare..."
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Berlin, Germany"
            />
            <Input
              label="Website"
              type="url"
              value={form.website_link}
              onChange={(e) => setForm({ ...form, website_link: e.target.value })}
              placeholder="https://..."
            />
            <Select
              label="Interest Level"
              options={INTEREST_OPTIONS}
              value={String(form.interest_level)}
              onChange={(e) => setForm({ ...form, interest_level: parseInt(e.target.value) })}
            />
            <Input
              label="Last Reviewed"
              type="date"
              value={form.last_reviewed}
              onChange={(e) => setForm({ ...form, last_reviewed: e.target.value })}
            />
          </div>
          <Input
            label="LinkedIn Connections"
            value={form.linkedin_connections}
            onChange={(e) => setForm({ ...form, linkedin_connections: e.target.value })}
            placeholder="3 connections, John Doe (PM)..."
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Why you're interested, culture, open roles..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingCompany ? 'Save Changes' : 'Add Company'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${deleteTarget?.company_name}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
