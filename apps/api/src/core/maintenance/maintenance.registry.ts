import { Injectable, Logger } from '@nestjs/common';

export type MaintenanceTask = () => Promise<number>;

/**
 * Modules register periodic clean-up tasks here (expired tokens, keys, holds…) without
 * importing each other. The maintenance processor runs every task on a schedule.
 */
@Injectable()
export class MaintenanceRegistry {
  private readonly logger = new Logger(MaintenanceRegistry.name);
  private readonly tasks = new Map<string, MaintenanceTask>();

  register(name: string, task: MaintenanceTask): void {
    this.tasks.set(name, task);
  }

  async runAll(): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    for (const [name, task] of this.tasks) {
      try {
        results[name] = await task();
      } catch (err) {
        this.logger.error({ err, task: name }, 'maintenance task failed');
        results[name] = -1;
      }
    }
    return results;
  }
}
