-- Seed the official Lokalhost AI bot profile used for @ngek mention replies.
-- This creates a profile-only bot identity; it is not intended for human login.

DO $$
DECLARE
  _bot_id UUID := '8c509753-984b-4e2d-85dc-dd6ed0b07a82';
  _existing_id UUID;
BEGIN
  SELECT "id" INTO _existing_id
  FROM public."profiles"
  WHERE "email" = 'ngek_the_bot@lokalhost.club'
     OR "username" = 'ngek'
  LIMIT 1;

  IF _existing_id IS NULL THEN
    INSERT INTO public."profiles" (
      "id", "username", "name", "displayName", "email",
      "rankId", "xp", "isOnboarded", "isVerified",
      "failedLoginAttempts", "isLocked",
      "createdAt", "updatedAt"
    ) VALUES (
      _bot_id, 'ngek', 'Ngek The Great Bot', 'Ngek The Great Bot',
      'ngek_the_bot@lokalhost.club',
      1, 0, true, true,
      0, false,
      now(), now()
    );
    _existing_id := _bot_id;
  ELSE
    UPDATE public."profiles"
    SET "username" = 'ngek',
        "name" = 'Ngek The Great Bot',
        "displayName" = 'Ngek The Great Bot',
        "email" = 'ngek_the_bot@lokalhost.club',
        "isOnboarded" = true,
        "isVerified" = true,
        "isLocked" = false,
        "failedLoginAttempts" = 0,
        "lockedUntil" = NULL,
        "updatedAt" = now()
    WHERE "id" = _existing_id;
  END IF;

  INSERT INTO public."account_links" (
    "id", "profileId", "provider", "providerAccountId", "email", "createdAt"
  ) VALUES (
    gen_random_uuid()::text, _existing_id, 'bot', 'ngek',
    'ngek_the_bot@lokalhost.club', now()
  )
  ON CONFLICT ("profileId", "provider") DO UPDATE SET
    "providerAccountId" = EXCLUDED."providerAccountId",
    "email" = EXCLUDED."email";
END $$;
