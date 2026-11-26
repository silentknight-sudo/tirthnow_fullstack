-- AlterTable
ALTER TABLE "products" ADD COLUMN     "subcategory" TEXT;

-- Move products onto the master catalogue keys.
UPDATE "products" SET "category" = CASE "category"
  WHEN 'pooja_thali' THEN 'puja_utensils'
  WHEN 'diya_dhoop' THEN 'puja_samagri'
  WHEN 'garland' THEN 'flowers_garland'
  WHEN 'prasad' THEN 'prasad_bhog'
  WHEN 'poshak' THEN 'krishna_shringar'
  WHEN 'tilak_mala' THEN 'mala_beads'
  WHEN 'idols' THEN 'idols_murtis'
  WHEN 'books' THEN 'books_music'
  ELSE "category" END
WHERE "category" IN ('pooja_thali','diya_dhoop','garland','prasad','poshak','tilak_mala','idols','books');
