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
  private readonly recurring = new Map<string, { everyMs: number; task: MaintenanceTask }>();

  register(name: string, task: MaintenanceTask): void {
    this.tasks.set(name, task);
  }

  /** A task that runs on its own interval (job name `run-<name>` on the maintenance queue). */
  registerRecurring(name: string, everyMs: number, task: MaintenanceTask): void {
    this.recurring.set(name, { everyMs, task });
  }

  recurringTasks(): { name: string; everyMs: number }[] {
    return [...this.recurring.entries()].map(([name, r]) => ({ name, everyMs: r.everyMs }));
  }

  async runRecurring(name: string): Promise<number> {
    const r = this.recurring.get(name);
    if (!r) throw new Error(`Unknown recurring task ${name}`);
    return r.task();
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
