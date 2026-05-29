// =============================================
// Database Types for Supabase Tables
// =============================================

export type JobStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected';
export type Relevancy = 'low' | 'medium' | 'high';
export type SkillPriority = 'low' | 'medium' | 'high';
export type SkillStatus = 'to_learn' | 'in_progress' | 'learned';

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company: string;
  applied_date: string;
  location: string;
  status: JobStatus;
  relevancy: Relevancy;
  interest_level: number;
  interview_stage: string;
  job_link: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface JobBoard {
  id: string;
  site: string;
  link: string;
  created_at: string;
  updated_at: string;
}

export interface UserJobBoard {
  id: string;
  user_id: string;
  job_board_id: string;
  last_browsed: string;
  keywords: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type JobBoardDisplay = JobBoard & Omit<UserJobBoard, 'id' | 'created_at' | 'updated_at'> & { user_job_board_id: string };

export interface Skill {
  id: string;
  user_id: string;
  skill_name: string;
  category: string;
  priority: SkillPriority;
  status: SkillStatus;
  notes: string;
  created_at: string;
}

export interface Company {
  id: string;
  company_name: string;
  sector: string;
  website_link: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  interest_level: number;
  last_reviewed: string;
  linkedin_connections: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type CompanyDisplay = Company & Omit<UserCompany, 'id' | 'created_at' | 'updated_at'> & { user_company_id: string };

// Form types
export type JobFormData = Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type SkillFormData = Omit<Skill, 'id' | 'user_id' | 'created_at'>;

export type JobBoardFormData = {
  site: string;
  link: string;
  last_browsed: string;
  keywords: string;
  notes: string;
};

export type CompanyFormData = {
  company_name: string;
  sector: string;
  website_link: string;
  location: string;
  interest_level: number;
  last_reviewed: string;
  linkedin_connections: string;
  notes: string;
};
