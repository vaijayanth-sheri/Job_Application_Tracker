-- Run this script in your Supabase SQL Editor

-- 1. Profile Core
CREATE TABLE IF NOT EXISTS profile_core (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_summary TEXT,
    career_interests TEXT,
    cover_letter_guidelines TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_core_profile_per_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE profile_core ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile core." ON profile_core FOR ALL USING (auth.uid() = user_id);

-- 2. Profile Experiences
CREATE TABLE IF NOT EXISTS profile_experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own experiences." ON profile_experiences FOR ALL USING (auth.uid() = user_id);

-- 3. Profile Projects
CREATE TABLE IF NOT EXISTS profile_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    technologies_used TEXT,
    business_relevance TEXT,
    transferable_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own projects." ON profile_projects FOR ALL USING (auth.uid() = user_id);

-- 4. Profile Education
CREATE TABLE IF NOT EXISTS profile_education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own education." ON profile_education FOR ALL USING (auth.uid() = user_id);

-- 5. Profile Skills (CV specific)
CREATE TABLE IF NOT EXISTS profile_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cv skills." ON profile_skills FOR ALL USING (auth.uid() = user_id);
