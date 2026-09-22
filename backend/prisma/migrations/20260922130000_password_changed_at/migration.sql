-- Invalidation des tokens JWT émis avant un changement de mot de passe.
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
