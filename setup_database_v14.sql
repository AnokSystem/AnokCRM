-- =====================================================
-- Chat Messages and Media Storage System
-- =====================================================

-- 1. Chats Table - Store chat metadata
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL, -- WhatsApp instance identifier
  remote_jid TEXT NOT NULL, -- Contact/Group JID
  contact_name TEXT,
  profile_picture_url TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  last_message_content TEXT,
  unread_count INTEGER DEFAULT 0,
  is_group BOOLEAN DEFAULT FALSE,
  column_id TEXT DEFAULT 'leads-novos', -- Kanban column
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, instance_name, remote_jid)
);

-- 2. Messages Table - Store all messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- WhatsApp message ID
  remote_jid TEXT NOT NULL,
  from_me BOOLEAN DEFAULT FALSE,
  sender_jid TEXT, -- Sender in group chats
  message_type TEXT DEFAULT 'text', -- text, image, video, audio, document, sticker, etc
  content TEXT, -- Text content
  quoted_message_id TEXT, -- If replying to another message
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'sent', -- sent, delivered, read
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, message_id, remote_jid)
);

-- 3. Media Files Table - Store media metadata
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL, -- image, video, audio, document
  file_name TEXT,
  mime_type TEXT,
  file_size BIGINT, -- in bytes
  file_url TEXT, -- URL to stored file (Supabase Storage)
  thumbnail_url TEXT, -- For images/videos
  duration INTEGER, -- For audio/video in seconds
  width INTEGER, -- For images/videos
  height INTEGER, -- For images/videos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Kanban Columns Table - Store custom columns
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL, -- Unique identifier for frontend
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0, -- Order in UI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, column_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_instance_name ON chats(instance_name);
CREATE INDEX IF NOT EXISTS idx_chats_remote_jid ON chats(remote_jid);
CREATE INDEX IF NOT EXISTS idx_chats_column_id ON chats(column_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_time ON chats(last_message_time DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_remote_jid ON messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_me ON messages(from_me);

CREATE INDEX IF NOT EXISTS idx_media_files_message_id ON media_files(message_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON media_files(file_type);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_user_id ON kanban_columns(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_position ON kanban_columns(position);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
CREATE POLICY "Users can view their own chats" ON chats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
CREATE POLICY "Users can insert their own chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
CREATE POLICY "Users can update their own chats" ON chats
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
CREATE POLICY "Users can delete their own chats" ON chats
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for media_files
DROP POLICY IF EXISTS "Users can view their own media" ON media_files;
CREATE POLICY "Users can view their own media" ON media_files
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own media" ON media_files;
CREATE POLICY "Users can insert their own media" ON media_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own media" ON media_files;
CREATE POLICY "Users can delete their own media" ON media_files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for kanban_columns
DROP POLICY IF EXISTS "Users can view their own columns" ON kanban_columns;
CREATE POLICY "Users can view their own columns" ON kanban_columns
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own columns" ON kanban_columns;
CREATE POLICY "Users can insert their own columns" ON kanban_columns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own columns" ON kanban_columns;
CREATE POLICY "Users can update their own columns" ON kanban_columns
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own columns" ON kanban_columns;
CREATE POLICY "Users can delete their own columns" ON kanban_columns
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for chats
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default Kanban column for existing users (if any)
-- This will be done via application code for new users

COMMENT ON TABLE chats IS 'Stores WhatsApp chat metadata with Kanban column assignment';
COMMENT ON TABLE messages IS 'Stores all WhatsApp messages with full metadata';
COMMENT ON TABLE media_files IS 'Stores media file metadata and storage URLs';
COMMENT ON TABLE kanban_columns IS 'Stores user-defined Kanban columns for chat organization';
