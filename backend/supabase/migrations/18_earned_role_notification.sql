-- Migration: Add EARNED_ROLE to NotificationType enum
-- This supports the new role award notification system.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EARNED_ROLE';
