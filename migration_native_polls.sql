-- Add columns for Native Poll support and precise time tracking
ALTER TABLE polls ADD COLUMN telegram_poll_id TEXT UNIQUE;
ALTER TABLE polls ADD COLUMN actual_sent_at TIMESTAMP WITH TIME ZONE;
