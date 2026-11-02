import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app-config.service';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const REDIS_CONNECT_TIMEOUT_MS = 3_000;
const REDIS_COMMAND_TIMEOUT_MS = 3_000;

/**
 * Shared Redis infrastructure service (TDD §4, §12, Clarification C-13).
 * Exposes one non-blocking command client and a `createBlockingClient()` factory for SSE `XREAD BLOCK`.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn({ err: error }, 'Redis command client connection error');
    });
  }

  /**
   * Creates an isolated duplicated connection for blocking commands such as `XREAD BLOCK`.
   * Callers MUST call `await client.quit()` (with fallback `disconnect()`) inside a `finally` block (C-13).
   */
  createBlockingClient(): Redis {
    const duplicate = this.client.duplicate({
      lazyConnect: true,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
    });

    duplicate.on('error', (error: Error) => {
      this.logger.warn({ err: error }, 'Redis blocking client connection error');
    });

    return duplicate;
  }

  /**
   * Executes a `PING` health probe, connecting lazily if not yet connected.
   */
  async ping(): Promise<string> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end' || this.client.status === 'wait') {
      this.client.disconnect();
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
