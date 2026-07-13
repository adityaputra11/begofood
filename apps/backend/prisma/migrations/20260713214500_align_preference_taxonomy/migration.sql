-- Canonical research scope:
-- allergies: kacang, susu, telur, seafood
-- sensory: renyah, lembut, hangat, aromatik
-- tastes: spicy, sweet, sour, savory
ALTER TABLE "UserPreference"
  RENAME COLUMN "dislikedTags" TO "preferredTastes";

ALTER TABLE "UserPreference"
  ADD COLUMN "preferredSensory" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Normalize existing catalog data to the canonical research scope.
UPDATE "Menu"
SET "allergens" = ARRAY(
  SELECT DISTINCT value
  FROM unnest("allergens") AS value
  WHERE value IN ('kacang', 'susu', 'telur', 'seafood')
);

UPDATE "Menu"
SET "tags" = ARRAY(
  SELECT DISTINCT normalized
  FROM (
    SELECT CASE value
      WHEN 'pedas' THEN 'spicy'
      WHEN 'manis' THEN 'sweet'
      WHEN 'asam' THEN 'sour'
      WHEN 'asam_manis' THEN 'sour'
      WHEN 'gurih' THEN 'savory'
      ELSE value
    END AS normalized
    FROM unnest(
      "tags" || ARRAY(
        SELECT value FROM unnest("sensoryProfile") AS value
        WHERE value IN ('pedas', 'manis', 'asam', 'asam_manis', 'gurih')
      )
    ) AS value
  ) AS mapped
);

UPDATE "Menu"
SET "sensoryProfile" = ARRAY(
  SELECT DISTINCT normalized
  FROM (
    SELECT CASE
      WHEN value = 'renyah' THEN 'renyah'
      WHEN value IN ('lembut', 'empuk', 'creamy', 'juicy', 'kenyal', 'al_dente', 'ringan') THEN 'lembut'
      WHEN value = 'hangat' THEN 'hangat'
      WHEN value IN ('aromatik', 'smoky', 'pekat', 'segar') THEN 'aromatik'
      ELSE NULL
    END AS normalized
    FROM unnest("sensoryProfile") AS value
  ) AS mapped
  WHERE normalized IS NOT NULL
);

UPDATE "Menu"
SET "sensoryProfile" = ARRAY['aromatik']::TEXT[]
WHERE cardinality("sensoryProfile") = 0;
