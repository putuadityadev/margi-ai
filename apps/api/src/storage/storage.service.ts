import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, type OnModuleDestroy, Optional } from '@nestjs/common';
import { AppConfig } from '../config/app-config.service';

export const PRESIGN_DEFAULT_TTL_SECONDS = 300;
const S3_OPERATION_TIMEOUT_MS = 5_000;
const S3_HEALTH_TIMEOUT_MS = 3_000;

export interface PutObjectInput {
  readonly key: string;
  readonly body: Buffer | Uint8Array;
  readonly contentType: string;
  readonly bucket?: string;
}

/**
 * S3-compatible object storage service configured with `forcePathStyle: true` for MinIO (TDD §4, §9).
 */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly defaultUploadsBucket: string;
  private readonly s3: S3Client;

  constructor(config: AppConfig, @Optional() s3Client?: S3Client) {
    this.defaultUploadsBucket = config.storage.uploadsBucket;
    this.s3 =
      s3Client ??
      new S3Client({
        endpoint: config.storage.endpoint,
        region: config.storage.region,
        credentials: {
          accessKeyId: config.storage.accessKey,
          secretAccessKey: config.storage.secretKey,
        },
        forcePathStyle: true,
      });
  }

  /**
   * Stores an object in the configured bucket (defaults to private `user-uploads`).
   */
  async putObject(input: PutObjectInput): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: input.bucket ?? this.defaultUploadsBucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    });
    await this.s3.send(command, { abortSignal: AbortSignal.timeout(S3_OPERATION_TIMEOUT_MS) });
  }

  /**
   * Deletes an object by key from the configured bucket (defaults to `user-uploads`).
   */
  async deleteObject(key: string, bucket?: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket ?? this.defaultUploadsBucket,
      Key: key,
    });
    await this.s3.send(command, { abortSignal: AbortSignal.timeout(S3_OPERATION_TIMEOUT_MS) });
  }

  /**
   * Generates a short-lived presigned GET URL (`ttlSeconds` defaults to 300 s per TDD §9).
   */
  async presignGet(
    key: string,
    ttlSeconds: number = PRESIGN_DEFAULT_TTL_SECONDS,
    bucket?: string,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket ?? this.defaultUploadsBucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: ttlSeconds });
  }

  /**
   * Verifies that the configured uploads bucket exists and is reachable (`HeadBucket`).
   */
  async checkBucket(bucket?: string): Promise<void> {
    const command = new HeadBucketCommand({
      Bucket: bucket ?? this.defaultUploadsBucket,
    });
    await this.s3.send(command, { abortSignal: AbortSignal.timeout(S3_HEALTH_TIMEOUT_MS) });
  }

  onModuleDestroy(): void {
    this.s3.destroy();
  }
}
