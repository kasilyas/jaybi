-- Existing Jaybi installations offered comparison before the persisted feature
-- switch existed. Preserve that behaviour only when no explicit choice exists.
UPDATE "app_config"
SET "tiers" = "tiers" || jsonb_build_object(
  '__features',
  COALESCE("tiers"->'__features', '{}'::jsonb) || jsonb_build_object('comparisonEnabled', true)
)
WHERE "tiers" #> '{__features,comparisonEnabled}' IS NULL;
