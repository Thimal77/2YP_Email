-- Migration: Add status column to Organizer table
ALTER TABLE Organizer ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
