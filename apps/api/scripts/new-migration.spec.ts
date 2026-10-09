import { stripRawObjectDrops } from './new-migration';

describe('stripRawObjectDrops', () => {
  it('removes DROP INDEX statements for rx_ objects only', () => {
    const sql = [
      '-- DropIndex',
      'DROP INDEX "rx_knowledge_chunks_embedding_hnsw";',
      '',
      '-- DropIndex',
      'DROP INDEX "users_email_key";',
      '',
      '-- AlterTable',
      'ALTER TABLE "users" ADD COLUMN "x" TEXT;',
    ].join('\n');
    const { kept, removed } = stripRawObjectDrops(sql);
    expect(removed).toEqual(['-- DropIndex\nDROP INDEX "rx_knowledge_chunks_embedding_hnsw";']);
    expect(kept).toContain('DROP INDEX "users_email_key"');
    expect(kept).toContain('ALTER TABLE "users"');
    expect(kept).not.toContain('rx_');
  });

  it('keeps statements that merely mention rx_ objects without dropping them', () => {
    const sql = '-- CreateIndex\nCREATE INDEX "rx_new" ON "t" ("c");';
    expect(stripRawObjectDrops(sql).removed).toEqual([]);
  });
});
