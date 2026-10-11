import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type KnowledgeDocument } from '@prisma/client';
import { type Queue } from 'bullmq';
import { extractText, getDocumentProxy } from 'unpdf';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { AppException, afterCursor, NEWEST_FIRST, pageSize, toPage } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from '../../../core/providers';
import { QUEUES } from '../../../core/queue';
import { CatalogFacade } from '../../catalog';
import { FilesFacade } from '../../files';
import { type CreateKnowledgeDocumentDto, type KnowledgeQueryDto } from '../dto/knowledge.dto';
import { chunkText } from './chunker';

export const INDEX_JOB = 'index-document';
const EMBED_BATCH = 64;

export interface RetrievedChunk {
  id: string;
  documentId: string;
  title: string;
  sourceRef: string | null;
  content: string;
  score: number;
}

const vectorLiteral = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;

/** Knowledge base for the AI guide: admin-approved documents → chunks → pgvector. */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesFacade,
    private readonly catalog: CatalogFacade,
    private readonly audit: AuditService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @InjectQueue(QUEUES.ai) private readonly queue: Queue,
  ) {}

  // ───────────── admin ─────────────

  async create(admin: AuthPrincipal, dto: CreateKnowledgeDocumentDto): Promise<KnowledgeDocument> {
    let mediaId: string;
    if (dto.sourceType === 'upload') {
      if (!dto.mediaId) throw AppException.badRequest('mediaId is required');
      mediaId = (
        await this.files.requireReady(dto.mediaId, {
          ownerUserId: admin.userId,
          purposes: ['knowledge_document'],
        })
      ).id;
    } else {
      const stored = await this.files.storeGenerated({
        ownerUserId: admin.userId,
        folder: 'knowledge',
        body: Buffer.from(dto.text ?? '', 'utf8'),
        mimeType: 'text/markdown',
        kind: 'document',
        bucket: 'private',
      });
      mediaId = stored.id;
    }
    if (dto.templeId && !(await this.catalog.templeExists(dto.templeId)))
      throw AppException.badRequest('Unknown templeId');
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        title: dto.title,
        sourceType: dto.sourceType,
        sourceRef: dto.sourceRef ?? null,
        mediaId,
        lang: dto.lang ?? 'en',
        cityId: dto.cityId ?? null,
        templeId: dto.templeId ?? null,
        status: 'pending_approval',
        uploadedById: admin.userId,
      },
    });
    await this.audit.record({
      actor: admin,
      action: 'knowledge.create',
      entityType: 'knowledge_document',
      entityId: doc.id,
      after: { title: doc.title },
    });
    return doc;
  }

  async list(q: KnowledgeQueryDto) {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.knowledgeDocument.findMany({
      where: { ...(q.status ? { status: q.status } : {}), ...afterCursor(q.cursor) },
      include: { _count: { select: { chunks: true } } },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    return toPage(rows, limit, (d) => ({ ...docResponse(d), chunkCount: d._count.chunks }));
  }

  /** Approval is the gate: only approved content is ever indexed and quoted to travellers. */
  async approve(admin: AuthPrincipal, id: string) {
    const doc = await this.get(id);
    if (doc.status === 'archived')
      throw AppException.badRequest('Archived documents cannot be approved');
    const updated = await this.prisma.knowledgeDocument.update({
      where: { id },
      data: { status: 'approved', approvedById: admin.userId },
    });
    await this.enqueue(id);
    await this.audit.record({
      actor: admin,
      action: 'knowledge.approve',
      entityType: 'knowledge_document',
      entityId: id,
    });
    return docResponse(updated);
  }

  async reindex(admin: AuthPrincipal, id: string) {
    const doc = await this.get(id);
    if (!['approved', 'indexed', 'failed'].includes(doc.status))
      throw AppException.badRequest(`Cannot reindex a ${doc.status} document`);
    await this.prisma.knowledgeDocument.update({
      where: { id },
      data: { status: 'approved', contentHash: null },
    });
    await this.enqueue(id);
    await this.audit.record({
      actor: admin,
      action: 'knowledge.reindex',
      entityType: 'knowledge_document',
      entityId: id,
    });
    return { queued: true };
  }

  async archive(admin: AuthPrincipal, id: string) {
    await this.get(id);
    await this.prisma.$transaction([
      this.prisma.knowledgeChunk.deleteMany({ where: { documentId: id } }),
      this.prisma.knowledgeDocument.update({ where: { id }, data: { status: 'archived' } }),
    ]);
    await this.audit.record({
      actor: admin,
      action: 'knowledge.archive',
      entityType: 'knowledge_document',
      entityId: id,
    });
    return { archived: true };
  }

  /**
   * Turn catalog temples (description, history, dress code) into approved CMS documents, so
   * the guide knows every temple without manual uploads. Idempotent per temple.
   */
  async syncCatalog(admin: AuthPrincipal | null): Promise<{ documents: number }> {
    const temples = await this.catalog.templeTexts();
    let count = 0;
    for (const t of temples) {
      const text = [
        `# ${t.name}`,
        t.description,
        t.history ? `## History\n\n${t.history}` : null,
        t.dressCode ? `## Dress code\n\n${t.dressCode}` : null,
        t.address ? `## Address\n\n${t.address}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');
      if (text.length < 40) continue;
      const sourceRef = `catalog:temple:${t.id}`;
      const existing = await this.prisma.knowledgeDocument.findFirst({
        where: { sourceRef, status: { not: 'archived' } },
      });
      const stored = await this.files.storeGenerated({
        ownerUserId: admin?.userId ?? null,
        folder: 'knowledge',
        body: Buffer.from(text, 'utf8'),
        mimeType: 'text/markdown',
        kind: 'document',
        bucket: 'private',
      });
      const doc = existing
        ? await this.prisma.knowledgeDocument.update({
            where: { id: existing.id },
            data: { mediaId: stored.id, title: t.name, status: 'approved' },
          })
        : await this.prisma.knowledgeDocument.create({
            data: {
              title: t.name,
              sourceType: 'cms',
              sourceRef,
              mediaId: stored.id,
              lang: 'en',
              cityId: t.cityId,
              templeId: t.id,
              status: 'approved',
              uploadedById: admin?.userId ?? null,
              approvedById: admin?.userId ?? null,
            },
          });
      await this.enqueue(doc.id);
      count++;
    }
    return { documents: count };
  }

  private async enqueue(documentId: string): Promise<void> {
    await this.queue.add(
      INDEX_JOB,
      { documentId },
      {
        jobId: `index-${documentId}-${String(Date.now())}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    );
  }

  private async get(id: string): Promise<KnowledgeDocument> {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) throw AppException.notFound('Document not found');
    return doc;
  }

  // ───────────── indexing (ai queue) ─────────────

  async index(documentId: string): Promise<string> {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id: documentId } });
    if (!doc || !['approved', 'failed', 'indexed'].includes(doc.status) || !doc.mediaId)
      return 'skipped';
    const media = await this.files.get(doc.mediaId);
    if (media?.status !== 'ready') return this.fail(doc.id, 'source file is not ready');
    let text: string;
    try {
      const body = await this.files.read(media);
      text = media.mimeType === 'application/pdf' ? await pdfText(body) : body.toString('utf8');
    } catch (err) {
      this.logger.warn({ err, documentId }, 'could not extract document text');
      return this.fail(doc.id, 'could not extract text');
    }
    const hash = createHash('sha256').update(text).digest('hex');
    if (doc.status === 'indexed' && doc.contentHash === hash) return 'unchanged';
    await this.prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: 'indexing' },
    });
    const chunks = chunkText(text);
    if (chunks.length === 0) return this.fail(doc.id, 'document has no text');
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      vectors.push(
        ...(await this.embeddings.embed(
          chunks.slice(i, i + EMBED_BATCH).map((c) => `${doc.title}\n${c.content}`),
        )),
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
      for (const [i, c] of chunks.entries()) {
        const meta = JSON.stringify({ heading: c.heading });
        await tx.$executeRaw`
          INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count, embedding, embedding_model, city_id, temple_id, lang, metadata)
          VALUES (${doc.id}::uuid, ${c.index}, ${c.content}, ${c.tokenCount}, ${vectorLiteral(vectors[i] ?? [])}::vector, ${this.embeddings.model},
                  ${doc.cityId}::uuid, ${doc.templeId}::uuid, ${doc.lang}, ${meta}::jsonb)`;
      }
      await tx.knowledgeDocument.update({
        where: { id: doc.id },
        data: { status: 'indexed', contentHash: hash, indexedAt: new Date() },
      });
    });
    this.logger.log({ documentId, chunks: chunks.length }, 'document indexed');
    return 'indexed';
  }

  private async fail(id: string, reason: string): Promise<string> {
    await this.prisma.knowledgeDocument.update({ where: { id }, data: { status: 'failed' } });
    this.logger.warn({ documentId: id, reason }, 'indexing failed');
    return `failed: ${reason}`;
  }

  // ───────────── retrieval ─────────────

  /** Top-k chunks by cosine similarity; city/temple filters keep answers local. */
  async search(
    query: string,
    filter: {
      cityId?: string | null;
      templeId?: string | null;
      k?: number;
      minScore?: number;
    } = {},
  ): Promise<RetrievedChunk[]> {
    const [vec] = await this.embeddings.embed([query]);
    if (!vec) return [];
    const k = filter.k ?? 8;
    const cityId = filter.cityId ?? null;
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        document_id: string;
        title: string;
        source_ref: string | null;
        content: string;
        score: number;
      }[]
    >`
      SELECT c.id, c.document_id, d.title, d.source_ref, c.content, 1 - (c.embedding <=> ${vectorLiteral(vec)}::vector) AS score
      FROM knowledge_chunks c JOIN knowledge_documents d ON d.id = c.document_id
      WHERE d.status = 'indexed' AND c.embedding IS NOT NULL
        AND (${cityId}::uuid IS NULL OR c.city_id IS NULL OR c.city_id = ${cityId}::uuid)
      ORDER BY c.embedding <=> ${vectorLiteral(vec)}::vector
      LIMIT ${k}`;
    const min = filter.minScore ?? 0.1;
    return rows
      .filter((r) => r.score >= min)
      .map((r) => ({
        id: r.id,
        documentId: r.document_id,
        title: r.title,
        sourceRef: r.source_ref,
        content: r.content,
        score: r.score,
      }));
  }
}

async function pdfText(body: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(body));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export function docResponse(d: KnowledgeDocument) {
  return {
    id: d.id,
    title: d.title,
    sourceType: d.sourceType,
    sourceRef: d.sourceRef,
    lang: d.lang,
    cityId: d.cityId,
    templeId: d.templeId,
    status: d.status,
    indexedAt: d.indexedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}
