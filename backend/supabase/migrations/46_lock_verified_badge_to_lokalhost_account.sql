-- Migration 46: Lock the profile verified badge to the official lokalhost.club account
UPDATE public."profiles"
SET "isVerified" = CASE
  WHEN "id" = '1efb2d7c-adf9-4c34-a292-72566f9271bc' THEN true
  ELSE false
END;
