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
  user_id: string;
  site: string;
  link: string;
  last_browsed: string;
  keywords: string;
  notes: string;
  created_at: string;
}

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

// Form types (without id, user_id, timestamps)
export type JobFormData = Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type JobBoardFormData = Omit<JobBoard, 'id' | 'user_id' | 'created_at'>;
export type SkillFormData = Omit<Skill, 'id' | 'user_id' | 'created_at'>;
