'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { type CompanyDisplay, type CompanyFormData, type Company } from '@/types/database';
import { formatDate, toInputDate, cn, formatUrl } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
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
  is_global: true,
};

type SortField = 'company_name' | 'interest_level' | 'last_reviewed' | 'sector' | 'location' | 'created_at';
type SortDir = 'asc' | 'desc';
type TabState = 'global' | 'myList';

export default function CompaniesPage() {
  const [activeTab, setActiveTab] = useState<TabState>('myList');
  
  const [myCompanies, setMyCompanies] = useState<CompanyDisplay[]>([]);
  const [globalCompanies, setGlobalCompanies] = useState<Company[]>([]);
  
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
  const [smartMode, setSmartMode] = useState(false);
  const [companyInput, setCompanyInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('');
  const [analyzingError, setAnalyzingError] = useState(false);
  const [editingMyCompany, setEditingMyCompany] = useState<CompanyDisplay | null>(null);
  const [editingGlobalCompany, setEditingGlobalCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CompanyDisplay | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Jobs state for "Jobs Applied" feature
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.jobs-expand-btn') || target.closest('.jobs-expanded-content')) {
        return;
      }
      setExpandedCompanyId(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const supabase = createClient();
  const { addToast } = useToast();

  const fetchCompanies = useCallback(async () => {
    // 1. Fetch My List
    const { data: myData, error: myError } = await supabase
      .from('user_companies')
      .select('*, companies(*)')
      .order('created_at', { ascending: false });
      
    if (myError) {
      addToast('Failed to load personal companies', 'error');
    }
    
    // 2. Fetch Global Database
    const { data: globalData, error: globalError } = await supabase
      .from('companies')
      .select('*')
      .eq('is_global', true)
      .order('created_at', { ascending: false });

    if (globalError) {
      addToast('Failed to load global companies', 'error');
    }
    
    const flattenedMyCompanies: CompanyDisplay[] = (myData || []).map((row: any) => ({
      user_company_id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      interest_level: row.interest_level,
      last_reviewed: row.last_reviewed,
      linkedin_connections: row.linkedin_connections,
      notes: row.notes,
      id: row.companies.id,
      company_name: row.companies.company_name,
      sector: row.companies.sector,
      website_link: row.companies.website_link,
      location: row.companies.location,
      is_global: row.companies.is_global,
      created_at: row.created_at, // Use the user_company created_at for sorting
      updated_at: row.updated_at,
    }));
    
    setMyCompanies(flattenedMyCompanies);
    setGlobalCompanies(globalData || []);
    
    // 3. Fetch user's jobs for the Jobs Applied column
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, status, company_id')
        .eq('user_id', user.id);
      setUserJobs(jobsData || []);
    }
    
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Derive unique sector and location values from BOTH lists for comprehensive filters
  const sectors = useMemo(() => {
    const combinedSectors = [...myCompanies.map(c => c.sector), ...globalCompanies.map(c => c.sector)].filter(Boolean);
    return Array.from(new Set(combinedSectors)).sort();
  }, [myCompanies, globalCompanies]);

  const locations = useMemo(() => {
    const combinedLocations = [...myCompanies.map(c => c.location), ...globalCompanies.map(c => c.location)].filter(Boolean);
    return Array.from(new Set(combinedLocations)).sort();
  }, [myCompanies, globalCompanies]);

  // Determine which list we are filtering and sorting based on active tab
  const activeList = activeTab === 'myList' ? myCompanies : globalCompanies;

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = [...activeList];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.company_name || '').toLowerCase().includes(q) ||
          (c.sector || '').toLowerCase().includes(q) ||
          (c.location || '').toLowerCase().includes(q)
      );
    }
    if (filterSector !== 'all') {
      result = result.filter((c) => c.sector === filterSector);
    }
    if (activeTab === 'myList' && filterInterest !== 'all') {
      result = result.filter((c: any) => c.interest_level === parseInt(filterInterest));
    }
    if (filterLocation !== 'all') {
      result = result.filter((c) => c.location === filterLocation);
    }
    // Sort
    result = result.sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [activeList, activeTab, search, filterSector, filterInterest, filterLocation, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditingMyCompany(null);
    setEditingGlobalCompany(null);
    setForm(EMPTY_FORM);
    setSmartMode(false);
    setCompanyInput('');
    setModalOpen(true);
  };

  const openSmartAdd = () => {
    setEditingMyCompany(null);
    setEditingGlobalCompany(null);
    setForm(EMPTY_FORM);
    setSmartMode(true);
    setCompanyInput('');
    setModalOpen(true);
  };

  const openEditMyCompany = (company: CompanyDisplay) => {
    setEditingMyCompany(company);
    setEditingGlobalCompany(null);
    setForm({
      company_name: company.company_name,
      sector: company.sector,
      website_link: company.website_link,
      location: company.location,
      interest_level: company.interest_level,
      last_reviewed: toInputDate(company.last_reviewed),
      linkedin_connections: company.linkedin_connections,
      notes: company.notes,
      is_global: company.is_global,
    });
    setModalOpen(true);
  };

  const openEditGlobalCompany = (company: Company) => {
    setEditingGlobalCompany(company);
    setEditingMyCompany(null);
    setForm({
      ...EMPTY_FORM,
      company_name: company.company_name,
      sector: company.sector,
      website_link: company.website_link,
      location: company.location,
      is_global: true,
    });
    setModalOpen(true);
  };

  const addToMyList = async (globalCompany: Company) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if it already exists in my list
    if (myCompanies.some(c => c.company_id === globalCompany.id)) {
      addToast('Company is already in your list', 'info');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: globalCompany.id,
          interest_level: 3,
          notes: '',
        });
      
      if (error) throw error;
      addToast(`Added ${globalCompany.company_name} to your list`);
      fetchCompanies();
    } catch (err: any) {
      addToast(err.message || 'Failed to add to list', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      let globalCompanyId = editingMyCompany?.id || editingGlobalCompany?.id;

      if (!globalCompanyId) {
        // Look up by name
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .ilike('company_name', form.company_name)
          .maybeSingle();

        if (existingCompany) {
          globalCompanyId = existingCompany.id;
        } else {
          // Create new company in master database
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({
              company_name: form.company_name,
              sector: form.sector,
              website_link: form.website_link,
              location: form.location,
              is_global: form.is_global,
            })
            .select()
            .single();
            
          if (createError) throw createError;
          globalCompanyId = newCompany.id;
        }
      } else {
        // Update global company data
        const { error: updateGlobalError } = await supabase
          .from('companies')
          .update({
            // If it is globally shared, only update sector, website link and location
            // Wait, if it wasn't global before, but the user is making it global now, we can update the name.
            company_name: (editingMyCompany?.is_global || editingGlobalCompany) ? undefined : form.company_name,
            sector: form.sector,
            website_link: form.website_link,
            location: form.location,
            is_global: form.is_global,
          })
          .eq('id', globalCompanyId);
          
        if (updateGlobalError) throw updateGlobalError;
      }

      // If we are explicitly saving a global company (and it's not in our list context),
      // we might not want to automatically add it to user_companies unless it's a new create.
      // But let's assume anytime a user creates/edits a company, it goes to their list if it's not already there.
      
      if (editingGlobalCompany && !editingMyCompany) {
        // We are editing a global company from the Global Tab. Just editing its details.
        addToast('Global company updated');
      } else {
        // Upsert user_companies
        if (editingMyCompany?.user_company_id) {
          const { error: userCoError } = await supabase
            .from('user_companies')
            .update({
              interest_level: form.interest_level,
              last_reviewed: form.last_reviewed,
              linkedin_connections: form.linkedin_connections,
              notes: form.notes
            })
            .eq('id', editingMyCompany.user_company_id);
            
          if (userCoError) throw userCoError;
          addToast('Company updated successfully');
        } else {
          // It's a new company
          const { error: insertUserCoError } = await supabase
            .from('user_companies')
            .insert({
              user_id: user.id,
              company_id: globalCompanyId,
              interest_level: form.interest_level,
              last_reviewed: form.last_reviewed,
              linkedin_connections: form.linkedin_connections,
              notes: form.notes
            });
            
          if (insertUserCoError) throw insertUserCoError;
          addToast('Company added successfully');
        }
      }

      setModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to save company', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!companyInput.trim()) {
      addToast('Please enter a company name or URL', 'error');
      return;
    }
    setAnalyzing(true);
    setAnalyzingError(false);
    setAnalyzingStatus('Analyzing input...');
    try {
      let textToAnalyze = companyInput;
      const isUrl = /^https?:\/\//i.test(companyInput.trim());
      
      if (isUrl) {
        setAnalyzingStatus('Scraping website...');
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: companyInput.trim() })
        });
        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          textToAnalyze = `URL: ${companyInput.trim()}\n\nContent:\n${scrapeData.text}`;
        }
      }

      setAnalyzingStatus('Extracting & Searching data...');
      
      const res = await fetch('/api/smart-add-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyInput: textToAnalyze })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze company');
      }

      const data = await res.json();
      
      setForm({
        ...EMPTY_FORM,
        company_name: data.company_name || '',
        sector: data.sector || '',
        location: data.location || '',
        website_link: data.website_link || (isUrl ? companyInput.trim() : ''),
        is_global: data.is_global !== undefined ? data.is_global : true,
      });

      setSmartMode(false);
      addToast('Company data extracted. Please verify and save.', 'success');
    } catch (err: any) {
      setAnalyzingError(true);
      setAnalyzingStatus(err.message || 'Analysis failed. Please try manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const { error } = await supabase.from('user_companies').delete().eq('id', deleteTarget.user_company_id);
      if (error) throw error;
      addToast('Company removed from your list');
      setDeleteTarget(null);
      fetchCompanies();
    } catch {
      addToast('Failed to remove company', 'error');
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

  const handleLinkClick = async (company: any) => {
    if (!company.user_company_id) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Optimistic UI update for My List
    setMyCompanies(prev => prev.map(c => 
      c.user_company_id === company.user_company_id 
        ? { ...c, last_reviewed: today } 
        : c
    ));

    try {
      await supabase
        .from('user_companies')
        .update({ last_reviewed: today })
        .eq('id', company.user_company_id);
    } catch (err) {
      console.error('Failed to auto-update last reviewed date', err);
    }
  };

  const isEditingGlobal = Boolean(editingGlobalCompany) || Boolean(editingMyCompany?.is_global);

  return (
    <div className="page-enter space-y-6 max-w-7xl mx-auto">
      {/* Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          
          {/* Tabs Control */}
          <div className="flex bg-gray-100 p-1 rounded-xl mt-4 w-fit">
            <button
              onClick={() => setActiveTab('myList')}
              className={cn(
                "px-5 py-2 text-sm font-semibold rounded-lg transition-all",
                activeTab === 'myList' 
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
              )}
            >
              My List
              <span className="ml-2 inline-flex items-center justify-center bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                {myCompanies.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={cn(
                "px-5 py-2 text-sm font-semibold rounded-lg transition-all",
                activeTab === 'global' 
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
              )}
            >
              Global Database
              <span className="ml-2 inline-flex items-center justify-center bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                {globalCompanies.length}
              </span>
            </button>
          </div>
        </div>
        <div className="self-end sm:self-auto flex items-center gap-2 pb-1">
          <Button onClick={openSmartAdd} variant="secondary" size="md">
            <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Smart Add
          </Button>
          <Button onClick={openCreate} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Company
          </Button>
        </div>
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
          {activeTab === 'myList' && (
            <div className="w-40">
              <Select
                label="Interest"
                options={[{ value: 'all', label: 'All' }, ...INTEREST_OPTIONS]}
                value={filterInterest}
                onChange={(e) => setFilterInterest(e.target.value)}
              />
            </div>
          )}
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
              {activeList.length === 0
                ? activeTab === 'myList' 
                    ? 'Start tracking companies you are interested in!' 
                    : 'The global database is empty.'
                : 'Try adjusting your filters or search term.'}
            </p>
          </div>
        ) : activeTab === 'myList' ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('company_name')}>Company <SortIcon field="company_name" /></th>
                  <th onClick={() => handleSort('sector')}>Sector <SortIcon field="sector" /></th>
                  <th onClick={() => handleSort('location')}>Location <SortIcon field="location" /></th>
                  <th onClick={() => handleSort('interest_level')}>Interest <SortIcon field="interest_level" /></th>
                  <th onClick={() => handleSort('last_reviewed')}>Last Reviewed <SortIcon field="last_reviewed" /></th>
                  <th>LinkedIn</th>
                  <th>Website</th>
                  <th>Jobs Applied</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company: any) => {
                  const companyJobs = userJobs.filter((j: any) => j.company_id === company.id);
                  const isExpanded = expandedCompanyId === company.id;
                  
                  return (
                    <React.Fragment key={company.user_company_id}>
                      <tr className={company.interest_level && company.interest_level >= 4 ? 'bg-emerald-50/40' : ''}>
                        <td>
                          <span className="font-medium text-gray-900">{company.company_name}</span>
                          {company.notes && (
                            <span className="block text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                              {company.notes}
                            </span>
                          )}
                        </td>
                        <td>
                          {company.sector ? <Badge bg="bg-violet-100" text="text-violet-700">{company.sector}</Badge> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-gray-600">{company.location || '—'}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {renderStars(company.interest_level)}
                            <Badge bg={interestBadge(company.interest_level).bg} text={interestBadge(company.interest_level).text}>
                              {interestBadge(company.interest_level).label}
                            </Badge>
                          </div>
                        </td>
                        <td className="text-gray-500 text-xs whitespace-nowrap">{formatDate(company.last_reviewed)}</td>
                        <td className="text-gray-600 text-sm">{company.linkedin_connections || '—'}</td>
                        <td>
                        {company.website_link ? (
                          <a 
                            href={formatUrl(company.website_link)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                            onClick={() => handleLinkClick(company)}
                          >
                            Open ↗
                          </a>
                        ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedCompanyId(isExpanded ? null : company.id);
                            }}
                            className={cn("jobs-expand-btn px-2 py-1 text-xs font-medium rounded-lg transition-colors", companyJobs.length > 0 ? "text-brand-700 bg-brand-50 hover:bg-brand-100" : "text-gray-500 bg-gray-50")}
                          >
                            {companyJobs.length} {companyJobs.length === 1 ? 'job' : 'jobs'}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEditMyCompany(company)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button onClick={() => setDeleteTarget(company)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Remove from List">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && companyJobs.length > 0 && (
                        <tr className="jobs-expanded-content">
                          <td colSpan={9} className="p-0 border-b-0">
                            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 shadow-inner">
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Applied Jobs</h4>
                              <div className="grid gap-2">
                                {companyJobs.map((job: any) => (
                                  <div key={job.id} className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-sm font-medium text-gray-900">{job.title}</span>
                                    <Badge bg="bg-gray-100" text="text-gray-700">
                                      {job.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('company_name')}>Company <SortIcon field="company_name" /></th>
                  <th onClick={() => handleSort('sector')}>Sector <SortIcon field="sector" /></th>
                  <th onClick={() => handleSort('location')}>Location <SortIcon field="location" /></th>
                  <th>Website</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company: any) => {
                  const isInMyList = myCompanies.some(mc => mc.id === company.id);
                  return (
                    <tr key={company.id}>
                      <td><span className="font-medium text-gray-900">{company.company_name}</span></td>
                      <td>{company.sector ? <Badge bg="bg-violet-100" text="text-violet-700">{company.sector}</Badge> : <span className="text-gray-300">—</span>}</td>
                      <td className="text-gray-600">{company.location || '—'}</td>
                      <td>
                        {company.website_link ? (
                          <a 
                            href={formatUrl(company.website_link)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                            onClick={() => {
                              const myCompanyMatch = myCompanies.find(mc => mc.id === company.id);
                              if (myCompanyMatch) handleLinkClick(myCompanyMatch);
                            }}
                          >
                            Open ↗
                          </a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {isInMyList ? (
                            <span className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg whitespace-nowrap">
                              Available on my list
                            </span>
                          ) : (
                            <button onClick={() => addToMyList(company)} className="px-2 py-1 text-xs font-medium rounded-lg text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors whitespace-nowrap" title="Add to My List">
                              Add to My List
                            </button>
                          )}
                          <button onClick={() => openEditGlobalCompany(company)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
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
        title={
          editingMyCompany 
            ? 'Edit My Tracking Details' 
            : editingGlobalCompany 
              ? 'Edit Global Company Details' 
              : 'Add New Company'
        }
        size="lg"
      >
        {smartMode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company Name or Website URL</label>
              <textarea
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="e.g. Tesla, or https://tesla.com"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring resize-none"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSmartMode(false)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Switch to Manual Entry
              </button>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={!companyInput.trim() || analyzing}
                className="min-w-[140px]"
              >
                {analyzing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{analyzingStatus || 'Analyzing...'}</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze Company
                  </>
                )}
              </Button>
            </div>
            {analyzingError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                An error occurred: {analyzingStatus}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Company Name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
                disabled={isEditingGlobal}
                placeholder="Google, Apple, etc."
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm input-ring",
                  isEditingGlobal ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"
                )}
                title={isEditingGlobal ? "Company name is locked for global companies" : ""}
              />
            </div>
            
            <Combobox
              label="Sector"
              options={sectors}
              value={form.sector}
              onChange={(val) => setForm({ ...form, sector: val })}
              placeholder="Tech, Finance, Healthcare..."
            />
            
            {/* The user requested location to be editable for global companies as well */}
            <Combobox
              label="Location"
              options={locations}
              value={form.location}
              onChange={(val) => setForm({ ...form, location: val })}
              placeholder="Berlin, Germany"
            />
            
            <Input
              label="Website Link"
              type="text"
              value={form.website_link}
              onChange={(e) => setForm({ ...form, website_link: e.target.value })}
              placeholder="https://..."
            />
            
            {(!editingGlobalCompany) && (
              <>
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
              </>
            )}
          </div>

          {(!editingGlobalCompany) && (
            <>
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
            </>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center">
            <input
              id="is_global_checkbox"
              type="checkbox"
              checked={form.is_global}
              onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
              className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
              disabled={isEditingGlobal}
            />
            <label htmlFor="is_global_checkbox" className="ml-2 text-sm text-gray-700">
              Make this company global (available to everyone in the database)
            </label>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingMyCompany || editingGlobalCompany ? 'Save Changes' : 'Add Company'}
            </Button>
          </div>
        </form>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Company"
        message={`Are you sure you want to stop tracking "${deleteTarget?.company_name}"?`}
        loading={deleting}
      />
    </div>
  );
}
