-- Add psicotest and analysis columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS psicotest_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS psicotest_file_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS olympia_behavior_analysis TEXT;

-- Create agent_notes table for multiple meeting notes over time
CREATE TABLE IF NOT EXISTS agent_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    note_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for agent_notes
ALTER TABLE agent_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers have full access to agent_notes"
ON agent_notes
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'broker'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'broker'
    )
);
