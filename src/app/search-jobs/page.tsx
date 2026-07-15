"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Briefcase } from "lucide-react";
import { SearchForm } from "./components/SearchForm";
import { ResultsTable } from "./components/ResultsTable";
import JobFormModals from "@/components/JobFormModals";
import {
  FormState,
  JobRow,
  SearchMetadata,
  SearchResults,
  SourceOption,
} from "./types";

const defaultForm: FormState = {
  keyword: "Energy Data Analyst",
  location: "Munich, Germany",
  distanceKm: 50,
  resultsPerSource: 25,
  freshnessValue: 24,
  freshnessUnit: "hours",
  selectedSources: [
    "linkedin",
    "indeed",
  ],
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    throw new Error(typeof detail === "string" ? detail : "Request failed.");
  }
  return response.json() as Promise<T>;
}

export default function SearchJobsPage() {
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [jobId, setJobId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null);
  const [rows, setRows] = useState<JobRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Job add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

  const hoursOld = useMemo(() => {
    return form.freshnessUnit === "days"
      ? form.freshnessValue * 24
      : form.freshnessValue;
  }, [form.freshnessUnit, form.freshnessValue]);

  useEffect(() => {
    fetchJson<{ sources: SourceOption[] }>("/api/py/sources")
      .then((data) => setSources(data.sources))
      .catch(() => setMessage("Could not load source options. Make sure the Python backend is running."));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setRows([]);
    setMetadata(null);
    setIsSubmitting(true);

    try {
      const response = await fetchJson<SearchResults>(
        "/api/py/searches",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: form.keyword,
            location: form.location,
            sources: form.selectedSources,
            results_per_source: form.resultsPerSource,
            distance_km: form.distanceKm,
            hours_old: hoursOld,
          }),
        }
      );
      setJobId(response.job_id);
      setMetadata(response.metadata);
      setRows(response.rows);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Search failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownloadCSV() {
    if (rows.length === 0) return;
    const headers = ["job_title", "company_name", "location", "posting_date", "job_url", "source_website", "employment_type"];
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        headers.map(header => {
          let val = (row as any)[header];
          if (val === null || val === undefined) val = "";
          const str = String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jobs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleAddJob(row: JobRow) {
    setSelectedJob(row);
    setIsModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 text-brand-600 mb-2">
            <div className="bg-brand-100 p-2 rounded-lg">
              <Briefcase size={20} />
            </div>
            <span className="font-semibold tracking-wide uppercase text-sm">
              JobSpy Search Engine
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight sm:text-4xl">
            Live Job Collector
          </h1>
          <p className="mt-2 text-lg text-gray-600 max-w-2xl">
            Pull active job postings directly from multiple job boards using the Python integration.
          </p>
        </div>

        {/* Global Notices */}
        {message && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex gap-3">
            <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{message}</p>
          </div>
        )}

        {/* Search Form */}
        <SearchForm
          form={form}
          setForm={setForm}
          sources={sources}
          onSubmit={handleSubmit}
          isSearching={isSubmitting}
          isSubmitting={isSubmitting}
        />

        {/* Summary & Download Band */}
        <SummaryBand metadata={metadata} onDownload={handleDownloadCSV} />

        {/* Source Errors */}
        <SourceErrorsPanel metadata={metadata} />

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Results{" "}
              {metadata?.final_count !== undefined && (
                <span className="text-gray-500 text-lg font-normal ml-2">
                  ({metadata.final_count})
                </span>
              )}
            </h2>
          </div>
          <ResultsTable rows={rows} onAddJob={handleAddJob} />
        </div>
      </div>

      <JobFormModals
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobSaved={() => {
          // You could optionally mark the row as "Added" here if you track it in the rows state.
        }}
        initialMode="smart"
        autoAnalyzeUrl={selectedJob?.job_url}
        initialData={selectedJob ? {
          title: selectedJob.job_title ?? '',
          company: selectedJob.company_name ?? '',
          location: selectedJob.location ?? '',
          job_link: selectedJob.job_url ?? '',
        } : undefined}
      />
    </div>
  );
}

function SummaryBand({
  metadata,
  onDownload,
}: {
  metadata: SearchMetadata | null;
  onDownload: () => void;
}) {
  if (!metadata) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-6">
      <div className="flex flex-wrap gap-x-8 gap-y-4 flex-1">
        <Metric label="LinkedIn" value={metadata?.source_counts.linkedin ?? "-"} />
        <Metric label="Indeed" value={metadata?.source_counts.indeed ?? "-"} />
        <Metric label="Jobvector" value={metadata?.source_counts.jobvector ?? "-"} />
        <Metric label="Agentur" value={metadata?.source_counts.arbeitsagentur ?? "-"} />
        <Metric label="EnglishJobs" value={metadata?.source_counts.englishjobs ?? "-"} />
        <Metric label="DevJobs" value={metadata?.source_counts.devjobs ?? "-"} />
        
        <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
        
        <Metric label="Duplicates" value={metadata?.duplicates_removed ?? "-"} />
        <Metric label="Exported" value={metadata?.final_count ?? "-"} highlighted />
      </div>

      {metadata.final_count > 0 && (
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium shadow hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <Download size={18} />
          <span>Download CSV</span>
        </button>
      )}
    </div>
  );
}

function Metric({ label, value, highlighted = false }: { label: string; value: string | number; highlighted?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className={`text-xl font-bold ${highlighted ? "text-brand-600" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function SourceErrorsPanel({ metadata }: { metadata: SearchMetadata | null }) {
  if (!metadata) return null;

  const errorSources = Object.entries(metadata.source_errors);
  const skippedSources = Object.entries(metadata.skipped_sources);

  if (errorSources.length === 0 && skippedSources.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="text-amber-600 w-5 h-5" />
        <h3 className="text-amber-900 font-semibold">Scraping Notices</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {errorSources.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-2">Errors</h4>
            <ul className="space-y-2">
              {errorSources.map(([source, error]) => (
                <li key={source} className="text-sm text-amber-700 flex gap-2">
                  <span className="font-semibold capitalize min-w-[80px]">{source}:</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {skippedSources.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-2">Skipped</h4>
            <ul className="space-y-2">
              {skippedSources.map(([source, reason]) => (
                <li key={source} className="text-sm text-amber-700 flex gap-2">
                  <span className="font-semibold capitalize min-w-[80px]">{source}:</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
