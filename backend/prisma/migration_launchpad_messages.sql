-- Migration: launchpad_messages table for in-event chat
-- Adds: launchpad_messages table + indexes
-- Soft-delete pattern (is_deleted flag) preserves message ordering

CREATE TABLE IF NOT EXISTS public.launchpad_messages (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  launchpad_event_id TEXT NOT NULL,
  author_id          UUID NOT NULL,
  body               TEXT NOT NULL,
  is_system          BOOLEAN NOT NULL DEFAULT false,
  is_deleted         BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT launchpad_messages_event_fk
    FOREIGN KEY (launchpad_event_id) REFERENCES public.launchpad_events(id) ON DELETE CASCADE,
  CONSTRAINT launchpad_messages_author_fk
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Composite index for the chat history query (event + chronological order)
CREATE INDEX IF NOT EXISTS launchpad_messages_event_created_idx
  ON public.launchpad_messages (launchpad_event_id, created_at ASC);

-- Index for finding a user's messages across events (moderation / profile)
CREATE INDEX IF NOT EXISTS launchpad_messages_author_idx
  ON public.launchpad_messages (author_id);
