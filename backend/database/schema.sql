-- Vow: The Relationship Operating System Database Schema
-- Target Database: PostgreSQL

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birthdate DATE NOT NULL,
    gender VARCHAR(50),
    relationship_status VARCHAR(20) DEFAULT 'single' CHECK (relationship_status IN ('single', 'coupled')),
    vouch_rating INT DEFAULT 100 CHECK (vouch_rating BETWEEN 0 AND 100),
    dating_resume_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for authentication and lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(relationship_status);

-- 2. RELATIONSHIP INVITES TABLE
CREATE TABLE relationship_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_status VARCHAR(20) DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'rejected')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate pending/accepted invites between same users
    CONSTRAINT unique_invite_pair UNIQUE (sender_id, receiver_id),
    -- Prevent self-invitation
    CONSTRAINT no_self_invite CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_invites_receiver ON relationship_invites(receiver_id, invite_status);

-- 3. RELATIONSHIPS (COMMITMENT LOCK) TABLE
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_1_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    partner_2_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'terminated')),
    anniversary_date DATE,
    harmony_score NUMERIC(5,2) DEFAULT 100.00 CHECK (harmony_score BETWEEN 0.00 AND 100.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure partner ids are ordered to prevent duplicate bidirectional rows
    CONSTRAINT unique_partners CHECK (partner_1_id < partner_2_id)
);

CREATE INDEX idx_relationships_active ON relationships(partner_1_id, partner_2_id) WHERE status = 'active';

-- 4. PARTNER RATINGS (DOUBLE-BLIND SCORING) TABLE
CREATE TABLE partner_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comments TEXT,
    rating_date DATE DEFAULT CURRENT_DATE,
    is_sealed BOOLEAN DEFAULT TRUE, -- rating remains hidden until both partners complete the daily score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT rater_diff_ratee CHECK (rater_id <> ratee_id),
    -- Single rating per partner per day
    CONSTRAINT unique_daily_rating UNIQUE (relationship_id, rater_id, rating_date)
);

CREATE INDEX idx_ratings_lookup ON partner_ratings(relationship_id, rating_date);

-- 5. SHARED GOALS (FUTURE PLANS / VOWS) TABLE
CREATE TABLE shared_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goals_relationship ON shared_goals(relationship_id);
