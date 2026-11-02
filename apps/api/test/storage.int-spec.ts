import { Test } from '@nestjs/testing';
import { AppConfigModule } from '../src/config/config.module';
import { StorageModule } from '../src/storage/storage.module';
import { StorageService } from '../src/storage/storage.service';

describe('StorageService MinIO round-trip (integration)', () => {
  let storage: StorageService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, StorageModule],
    }).compile();

    storage = moduleRef.get(StorageService);
  });

  afterAll(() => {
    storage.onModuleDestroy();
  });

  it('puts, presigns, fetches, and deletes an object against local MinIO', async () => {
    const key = `int-test/${Date.now()}-probe.txt`;
    const content = Buffer.from('margi-ai-storage-roundtrip');

    await storage.putObject({
      key,
      body: content,
      contentType: 'text/plain',
    });

    const signedUrl = await storage.presignGet(key, 60);
    const getRes = await fetch(signedUrl, { signal: AbortSignal.timeout(5_000) });
    expect(getRes.status).toBe(200);
    const bodyText = await getRes.text();
    expect(bodyText).toBe('margi-ai-storage-roundtrip');

    await storage.deleteObject(key);

    const afterDeleteRes = await fetch(signedUrl, { signal: AbortSignal.timeout(5_000) });
    expect(afterDeleteRes.status).toBe(404);
  });
});
