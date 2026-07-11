-- Enrich the research menu dataset with traceable restaurant, sensory, and safety metadata.
ALTER TABLE "Menu"
  ADD COLUMN "cluster" TEXT NOT NULL DEFAULT 'western_indonesian',
  ADD COLUMN "restaurant" TEXT NOT NULL DEFAULT 'Begofood Kitchen',
  ADD COLUMN "hiddenIngredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sensoryProfile" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "crossContaminationRisk" TEXT,
  ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
  ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "prepMinutes" INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "priceStatus" TEXT NOT NULL DEFAULT 'simulated';

CREATE UNIQUE INDEX "Menu_name_key" ON "Menu"("name");
CREATE INDEX "Menu_cluster_idx" ON "Menu"("cluster");
CREATE INDEX "Menu_category_idx" ON "Menu"("category");
