-- 1. සිසුන්ගේ වගුව (Students Table)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS සැකසුම් (RLS Policies)
-- Admin Dashboard එකට දත්ත කියවීමට ඉඩ ලබා දීම
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON students FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON students FOR INSERT WITH CHECK (true);

-- 2. නිබන්ධන වගුව (Materials Table)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON materials FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON materials FOR DELETE USING (true);

-- 3. ප්‍රශ්නාවලිය වගුව (Polls Table)
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON polls FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON polls FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON polls FOR UPDATE USING (true);

-- 3.1 Quiz Sets වගුව (Quiz Sets Table)
ALTER TABLE quiz_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON quiz_sets FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON quiz_sets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON quiz_sets FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON quiz_sets FOR DELETE USING (true);

-- 4. පිළිතුරු වගුව (Poll Answers Table)
ALTER TABLE poll_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON poll_answers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON poll_answers FOR INSERT WITH CHECK (true);

-- 5. නිබන්ධන වගුව (Materials Table) - අලුත් අවශ්‍යතාවය අනුව 'category' එකක් එකතු කර ඇත.
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- උදා: 'Mechanics', 'Thermal Physics'
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.1 Quiz Sets Table
CREATE TABLE quiz_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ප්‍රශ්නාවලි වගුව (Polls / Quizzes Table)
-- Admin ට ප්‍රශ්න සාදා Schedule කිරීමට අවශ්‍ය Columns ඇතුළත් කර ඇත.
CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_set_id UUID REFERENCES quiz_sets(id) ON DELETE CASCADE,
    telegram_message_id BIGINT UNIQUE, -- ප්‍රශ්නය චැනල් එකට යැවූ පසු මෙයට අගයක් වැටේ
    telegram_poll_id TEXT UNIQUE,      -- Native Poll ID (for poll_answer updates)
    question_text TEXT NOT NULL,       -- ප්‍රශ්නය
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,      -- නිවැරදි පිළිබුර ('A', 'B', 'C', හෝ 'D')
    scheduled_for TIMESTAMP WITH TIME ZONE, -- ප්‍රශ්නය යැවිය යුතු වෙලාව (Schedule time)
    actual_sent_at TIMESTAMP WITH TIME ZONE, -- ඇත්තටම චැනල් එකට ගිය වෙලාව (For precise scoring)
    quiz_set_name TEXT DEFAULT 'Independent', -- Group grouping (Legacy)
    order_index INTEGER DEFAULT 0,            -- Sequence order
    is_published BOOLEAN DEFAULT FALSE,     -- චැනල් එකට යැවූ පසු මෙය TRUE වේ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ළමයින්ගේ පිළිතුරු සහ ලකුණු වගුව (Poll Answers Table)
-- එක් ළමයෙකුට එක් ප්‍රශ්නයකට දිය හැක්කේ එකම පිළිතුරක් පමණක් බව UNIQUE constraint එකෙන් තහවුරු කරයි.
CREATE TABLE poll_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL,       -- ළමයා තේරූ පිළිතුර ('A', 'B', 'C', 'D')
    time_taken_seconds NUMERIC NOT NULL, -- පිළිතුරු දීමට ගතවූ කාලය (තත්පර)
    earned_points INTEGER NOT NULL,      -- තත්පර 15-10 නීතිය අනුව ලැබුණු ලකුණු
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, student_id) 
);

-- 5. Leaderboard View (බෝනස් විශේෂාංගයක්)
-- Admin පුවරුවට සහ /profile විධානයට ඉතා පහසුවෙන් ළමයින්ගේ මුළු ලකුණු සහ Rank එක ලබා ගැනීමට මෙය උපකාරී වේ.
CREATE VIEW leaderboard AS
SELECT 
    s.id AS student_id,
    s.telegram_id,
    s.full_name,
    COALESCE(SUM(pa.earned_points), 0) AS total_points
FROM 
    students s
LEFT JOIN 
    poll_answers pa ON s.id = pa.student_id
GROUP BY 
    s.id, s.telegram_id, s.full_name
ORDER BY 
    total_points DESC;