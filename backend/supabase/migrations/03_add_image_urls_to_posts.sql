-- Migration: add imageUrls array column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] NOT NULL DEFAULT '{}';
