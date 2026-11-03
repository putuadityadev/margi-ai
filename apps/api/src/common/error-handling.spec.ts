import { Body, Controller, Get, HttpStatus, Module, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { createZodDto } from 'nestjs-zod';
import request from 'supertest';
import { z } from 'zod';
import { configureApp } from '../configure-app';
import { AppException } from './app.exception';

class SamplePayloadDto extends createZodDto(
  z.object({
    count: z.number().int().positive(),
  }),
) {}

@Controller('probe')
class ProbeController {
  @Get('app-error')
  throwAppException(): never {
    throw new AppException('FORBIDDEN', 'Origin venue restricted', HttpStatus.FORBIDDEN);
  }

  @Get('unknown-error')
  throwUnknown(): never {
    throw new Error('sensitive internal stack detail');
  }

  @Post('validate')
  validateBody(@Body() body: SamplePayloadDto): { accepted: number } {
    return { accepted: body.count };
  }
}

@Module({
  controllers: [ProbeController],
})
class ProbeModule {}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

describe('Cross-cutting error envelope and request ID correlation', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('formats AppException with caller x-request-id and exact code', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/probe/app-error')
      .set('x-request-id', 'req-custom-42')
      .expect(403);

    expect(res.headers['x-request-id']).toBe('req-custom-42');
    expect(res.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Origin venue restricted',
        requestId: 'req-custom-42',
      },
    });
  });

  it('masks unknown errors as 500 INTERNAL without leaking details and attaches a generated requestId', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/probe/unknown-error').expect(500);

    const headerRequestId = res.headers['x-request-id'];
    expect(typeof headerRequestId).toBe('string');
    expect(res.text).not.toContain('sensitive internal stack detail');

    const body = res.body as ErrorBody;
    expect(body).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        requestId: headerRequestId,
      },
    });
  });

  it('maps ZodValidationPipe failures to 400 VALIDATION_FAILED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe/validate')
      .set('x-requested-with', 'margi-ai')
      .send({ count: -3 })
      .expect(400);

    const body = res.body as ErrorBody;
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.message).toContain('count');
    expect(body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('formats unmatched routes as 404 NOT_FOUND with requestId', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);

    const body = res.body as ErrorBody;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(res.headers['x-request-id']);
  });
});
