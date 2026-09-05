-- =========================================================================
-- Vow: The Relationship Operating System
-- Target Database: Neon PostgreSQL (Serverless)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    relationship_status VARCHAR(20) DEFAULT 'single' CHECK (relationship_status IN ('single', 'coupled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(relationship_status);

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    birthdate DATE,
    gender VARCHAR(50),
    city VARCHAR(100),
    bio TEXT,
    looking_for VARCHAR(100) DEFAULT 'Long-term relationship',
    vouch_rating INT DEFAULT 100 CHECK (vouch_rating BETWEEN 0 AND 100),
    dating_resume_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER PHOTOS (3x2 Grid)
CREATE TABLE IF NOT EXISTS user_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    order_index INT DEFAULT 0 NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photos_user ON user_photos(user_id);

-- 4. USER INTERESTS
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interest VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interests_user ON user_interests(user_id);

-- 5. SWIPES (Single Mode)
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('like', 'pass', 'super_like')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_swipe UNIQUE (swiper_id, target_id)
);

-- 6. MATCHES
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_match_pair UNIQUE (user1_id, user2_id)
);

-- 7. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(30) DEFAULT 'single_match' NOT NULL CHECK (type IN ('single_match', 'couple')),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    relationship_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    media_url TEXT,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- 9. RELATIONSHIP INVITES / VOW PROPOSALS
CREATE TABLE IF NOT EXISTS relationship_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_invite_pair UNIQUE (sender_id, receiver_id),
    CONSTRAINT no_self_invite CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_invites_receiver ON relationship_invites(receiver_id, status);

-- 10. RELATIONSHIPS (Commitment Lock)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner1_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    partner2_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'terminated')),
    anniversary_date DATE,
    harmony_score INT DEFAULT 87 NOT NULL CHECK (harmony_score BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    terminated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_partners CHECK (partner1_id <> partner2_id)
);

-- 11. DAILY CHECKINS (Double-Blind Partner Ratings)
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
    prompt_question TEXT,
    prompt_answer TEXT,
    checkin_date DATE DEFAULT CURRENT_DATE NOT NULL,
    is_sealed BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_daily_checkin UNIQUE (relationship_id, user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_lookup ON daily_checkins(relationship_id, checkin_date);

-- 12. SHARED GOALS (Vows & Future Plans)
CREATE TABLE IF NOT EXISTS shared_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goals_rel ON shared_goals(relationship_id);

-- 13. TIMELINE MILESTONES (Couple Memory Book)
CREATE TABLE IF NOT EXISTS timeline_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestones_rel ON timeline_milestones(relationship_id, event_date);
