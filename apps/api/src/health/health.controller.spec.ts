import { Global, Module } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppConfig } from '../config/app-config.service';
import { configureApp } from '../configure-app';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthModule } from './health.module';

describe('HealthController (/api/health and /api/health/ready)', () => {
  let app: NestExpressApplication | undefined;
  let postgresUp = true;
  let redisUp = true;

  beforeAll(async () => {
    const fakeConfig = {
      version: '0.1.0',
      gitCommit: 'test-sha',
    } as unknown as AppConfig;

    const fakePrisma = {
      $queryRaw: jest.fn(() =>
        postgresUp ? Promise.resolve([{ '?column?': 1 }]) : Promise.reject(new Error('db down')),
      ),
    } as unknown as PrismaService;

    const fakeRedis = {
      ping: jest.fn(() =>
        redisUp ? Promise.resolve('PONG') : Promise.reject(new Error('redis down')),
      ),
    } as unknown as RedisService;

    @Global()
    @Module({
      providers: [
        { provide: AppConfig, useValue: fakeConfig },
        { provide: PrismaService, useValue: fakePrisma },
        { provide: RedisService, useValue: fakeRedis },
      ],
      exports: [AppConfig, PrismaService, RedisService],
    })
    class FakeInfraModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [FakeInfraModule, HealthModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    postgresUp = true;
    redisUp = true;
  });

  function getHttpServer(): Parameters<typeof request>[0] {
    if (!app) {
      throw new Error('Test Nest application was not initialized');
    }
    return app.getHttpServer();
  }

  it('returns 200 on /api/health even when Redis and Postgres are down', async () => {
    postgresUp = false;
    redisUp = false;

    const res = await request(getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      version: '0.1.0',
      commit: 'test-sha',
    });
  });

  it('returns 200 on /api/health/ready when Postgres and Redis succeed', async () => {
    const res = await request(getHttpServer()).get('/api/health/ready').expect(200);
    expect((res.body as { status: string }).status).toBe('ok');
  });

  it('returns 503 naming redis on /api/health/ready when Redis is stopped', async () => {
    redisUp = false;

    const res = await request(getHttpServer()).get('/api/health/ready').expect(503);
    const body = res.body as { error: { code: string; message: string; requestId: string } };
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toContain('redis');
  });
});
