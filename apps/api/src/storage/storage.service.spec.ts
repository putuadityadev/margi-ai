import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import type { AppConfig } from '../config/app-config.service';
import { PRESIGN_DEFAULT_TTL_SECONDS, StorageService } from './storage.service';

function createFakeConfig(): AppConfig {
  return {
    storage: {
      endpoint: 'http://127.0.0.1:9000',
      region: 'us-east-1',
      accessKey: 'minioadmin',
      secretKey: 'minioadmin_secret',
      uploadsBucket: 'user-uploads',
      publicBucket: 'public-venues',
    },
  } as unknown as AppConfig;
}

describe('StorageService', () => {
  it('sends PutObject, DeleteObject, and HeadBucket commands to the default uploads bucket', async () => {
    const sentCommands: unknown[] = [];
    const fakeS3 = {
      send: jest.fn((cmd: unknown) => {
        sentCommands.push(cmd);
        return Promise.resolve({});
      }),
      destroy: jest.fn(),
    } as unknown as S3Client;

    const service = new StorageService(createFakeConfig(), fakeS3);

    await service.putObject({
      key: 'u-1/a-1.webp',
      body: Buffer.from('webp-bytes'),
      contentType: 'image/webp',
    });
    await service.checkBucket();
    await service.deleteObject('u-1/a-1.webp');
    service.onModuleDestroy();

    expect(sentCommands[0]).toBeInstanceOf(PutObjectCommand);
    expect((sentCommands[0] as PutObjectCommand).input.Bucket).toBe('user-uploads');
    expect((sentCommands[0] as PutObjectCommand).input.Key).toBe('u-1/a-1.webp');

    expect(sentCommands[1]).toBeInstanceOf(HeadBucketCommand);
    expect((sentCommands[1] as HeadBucketCommand).input.Bucket).toBe('user-uploads');

    expect(sentCommands[2]).toBeInstanceOf(DeleteObjectCommand);
    expect((sentCommands[2] as DeleteObjectCommand).input.Key).toBe('u-1/a-1.webp');
  });

  it('generates path-style presigned GET URLs with 300s default TTL for MinIO', async () => {
    const service = new StorageService(createFakeConfig());
    const url = await service.presignGet('user-1/analysis-1.webp');
    service.onModuleDestroy();

    const parsed = new URL(url);
    expect(parsed.origin).toBe('http://127.0.0.1:9000');
    expect(parsed.pathname).toBe('/user-uploads/user-1/analysis-1.webp');
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe(String(PRESIGN_DEFAULT_TTL_SECONDS));
  });
});
