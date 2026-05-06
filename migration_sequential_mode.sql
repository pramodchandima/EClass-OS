-- Migration: Sequential Quiz Session Mode
-- 1. Create quiz_sets if not exists
CREATE TABLE IF NOT EXISTS quiz_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Modify polls to link to quiz_sets with ordering
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='polls' AND column_name='quiz_set_id') THEN
        ALTER TABLE polls ADD COLUMN quiz_set_id UUID REFERENCES quiz_sets(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='polls' AND column_name='order_index') THEN
        ALTER TABLE polls ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE quiz_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON quiz_sets;
CREATE POLICY "Allow anonymous read" ON quiz_sets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous insert" ON quiz_sets;
CREATE POLICY "Allow anonymous insert" ON quiz_sets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous update" ON quiz_sets;
CREATE POLICY "Allow anonymous update" ON quiz_sets FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow anonymous delete" ON quiz_sets;
CREATE POLICY "Allow anonymous delete" ON quiz_sets FOR DELETE USING (true);
