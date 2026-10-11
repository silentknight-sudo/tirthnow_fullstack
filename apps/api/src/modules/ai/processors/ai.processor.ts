import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { QUEUES, RoleAwareProcessor } from '../../../core/queue';
import { INDEX_JOB, KnowledgeService } from '../services/knowledge.service';

/** ai queue: document indexing (3 attempts). */
@Processor(QUEUES.ai, { autorun: false, concurrency: 2 })
export class AiProcessor extends RoleAwareProcessor {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly knowledge: KnowledgeService) {
    super();
  }

  async process(job: Job<{ documentId: string }>): Promise<string> {
    if (job.name === INDEX_JOB) return this.knowledge.index(job.data.documentId);
    this.logger.warn({ job: job.name }, 'unknown ai job');
    return 'ignored';
  }
}
