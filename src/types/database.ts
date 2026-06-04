// =============================================
// Database Types for Supabase Tables
// =============================================

export type JobStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected';
export type Relevancy = number;
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
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickNote {
  id: string;
  user_id: string;
  content: string;
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
export type QuickNoteFormData = Omit<QuickNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

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
  is_global: boolean;
};

export interface AISettings {
  id: string;
  user_id: string;
  base_cv: string;
  cover_letter_guidelines: string;
  formatting_rules: string;
  updated_at: string;
}

export type AISettingsFormData = Omit<AISettings, 'id' | 'user_id' | 'updated_at'>;

// =============================================
// Candidate Profile Database Types
// =============================================

export interface ProfileCore {
  id: string;
  user_id: string;
  professional_summary: string;
  career_interests: string;
  cover_letter_guidelines: string;
  created_at: string;
  updated_at: string;
}

export type ProfileCoreFormData = Omit<ProfileCore, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface ProfileExperience {
  id: string;
  user_id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type ProfileExperienceFormData = Omit<ProfileExperience, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface ProfileProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  technologies_used: string;
  business_relevance: string;
  transferable_value: string;
  created_at: string;
  updated_at: string;
}

export type ProfileProjectFormData = Omit<ProfileProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface ProfileEducation {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export type ProfileEducationFormData = Omit<ProfileEducation, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface ProfileSkill {
  id: string;
  user_id: string;
  skill_name: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export type ProfileSkillFormData = Omit<ProfileSkill, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
