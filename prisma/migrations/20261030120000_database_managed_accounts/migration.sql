-- Keep historical audit and planning relations attached to the existing AppUser rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim("email"))
    FROM "AppUser"
    GROUP BY lower(btrim("email"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize AppUser.email: duplicate addresses differ only by case or whitespace.';
  END IF;
END $$;

ALTER TABLE "AppUser"
  ALTER COLUMN "externalSubject" DROP NOT NULL,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

UPDATE "AppUser"
SET "email" = lower(btrim("email")),
    "updatedAt" = CURRENT_TIMESTAMP;
