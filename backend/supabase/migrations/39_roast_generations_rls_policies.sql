-- 39_roast_generations_rls_policies.sql
-- Fix missing RLS policies for roast_generations and brand_analyses.
-- Migrations 35/36 created these tables and enabled RLS but never added
-- policies, so the default-deny behaviour caused all public reads to
-- return 0 rows. This broke the roast counter and the recent-roasts
-- marquee on the landing page.

-- public.roast_generations ------------------------------------------------
-- Allow anyone to read (roast stats, recent generations are public).
CREATE POLICY "roast_generations_public_read"
  ON public.roast_generations FOR SELECT USING (true);

-- Allow authenticated users to create their own generation records.
CREATE POLICY "roast_generations_auth_insert"
  ON public.roast_generations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own records.
CREATE POLICY "roast_generations_owner_update"
  ON public.roast_generations FOR UPDATE
  USING (auth.uid() = "profileId");

-- Allow users to delete their own records.
CREATE POLICY "roast_generations_owner_delete"
  ON public.roast_generations FOR DELETE
  USING (auth.uid() = "profileId");

-- public.brand_analyses -----------------------------------------------------
-- Allow anyone to read (brand stats, recent analyses are public).
CREATE POLICY "brand_analyses_public_read"
  ON public.brand_analyses FOR SELECT USING (true);

-- Allow authenticated users to create their own analysis records.
CREATE POLICY "brand_analyses_auth_insert"
  ON public.brand_analyses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own records.
CREATE POLICY "brand_analyses_owner_update"
  ON public.brand_analyses FOR UPDATE
  USING (auth.uid() = "profileId");

-- Allow users to delete their own records.
CREATE POLICY "brand_analyses_owner_delete"
  ON public.brand_analyses FOR DELETE
  USING (auth.uid() = "profileId");
