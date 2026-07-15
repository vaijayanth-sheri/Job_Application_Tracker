export type JobStatus = "queued" | "running" | "completed" | "failed";

export type SourceOption = {
  id: string;
  label: string;
  available: boolean;
  reason?: string;
};

export type SearchMetadata = {
  source_counts: Record<string, number>;
  skipped_sources: Record<string, string>;
  source_errors: Record<string, string>;
  duplicates_removed: number;
  final_count: number;
  csv_filename: string | null;
  timed_out: boolean;
};

export type SearchStatus = {
  job_id: string;
  status: JobStatus;
  metadata: SearchMetadata | null;
  error: string | null;
};

export type JobRow = {
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  posting_date: string | null;
  job_url: string;
  source_website: string | null;
  employment_type: string | null;
};

export type SearchResults = {
  job_id: string;
  rows: JobRow[];
  metadata: SearchMetadata;
};

export type FormState = {
  keyword: string;
  location: string;
  distanceKm: number;
  resultsPerSource: number;
  freshnessValue: number;
  freshnessUnit: "hours" | "days";
  selectedSources: string[];
};
