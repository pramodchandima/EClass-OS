-- Create quiz_sets table
CREATE TABLE quiz_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add quiz_set_id to polls
ALTER TABLE polls ADD COLUMN quiz_set_id UUID REFERENCES quiz_sets(id) ON DELETE CASCADE;

-- Enable RLS for quiz_sets
ALTER TABLE quiz_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON quiz_sets FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON quiz_sets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON quiz_sets FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON quiz_sets FOR DELETE USING (true);
