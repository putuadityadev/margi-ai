import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_CROWD_PROFILE,
  isInBali,
  OpeningHoursSchema,
  type AdminPlace,
  type AdminPlaceInput,
  type AdminPlaceList,
  type AdminPlaceListQuery,
  type AdminPlaceUpdate,
  type Regency,
} from '@margi-ai/shared';
import { CatalogService } from '../catalog/catalog.service';
import { AppException } from '../common/app.exception';
import type { Prisma, Venue as VenueRow } from '../generated/prisma/client';
import { OpenRouterClient } from '../llm/openrouter.client';
import { PrismaService } from '../prisma/prisma.service';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'place'}-${randomBytes(3).toString('hex')}`;
}

/** Text a place is embedded from; mirrors scripts/embed-catalog.ts so vectors stay comparable. */
function embeddingText(place: {
  nameEn: string;
  category: string;
  vibeTags: readonly string[];
  descriptionEn: string;
  descriptionId: string;
}): string {
  return `${place.nameEn}. ${place.category.toLowerCase().replace(/_/g, ' ')}. Mood: ${place.vibeTags.join(', ')}. ${place.descriptionEn} ${place.descriptionId}`;
}

/**
 * Curator CRUD for destinations and local businesses. Writes go to Postgres, then the engine
 * catalogue is reloaded so the change shows up in explore, trips and the Copilot immediately.
 * "Delete" deactivates a place: saved plans may still point at it and it can be restored.
 */
@Injectable()
export class AdminPlacesService {
  private readonly logger = new Logger(AdminPlacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly llm: OpenRouterClient,
  ) {}

  async regencies(): Promise<Regency[]> {
    const rows = await this.prisma.regency.findMany({ orderBy: { nameEn: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      nameEn: row.nameEn,
      nameId: row.nameId,
      phrStatus: row.phrStatus,
    }));
  }

  async list(query: AdminPlaceListQuery): Promise<AdminPlaceList> {
    const where: Prisma.VenueWhereInput = {
      ...(query.status === 'all' ? {} : { isActive: query.status === 'active' }),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.review === 'pending' ? { reviewStatus: 'PENDING' as const } : {}),
      ...(query.regencyId ? { regencyId: query.regencyId } : {}),
      ...(query.search
        ? {
            OR: [
              { nameEn: { contains: query.search, mode: 'insensitive' } },
              { nameId: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { slug: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.venue.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toAdmin(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<AdminPlace> {
    return this.toAdmin(await this.require(id));
  }

  async create(input: AdminPlaceInput): Promise<AdminPlace> {
    this.assertValid(input.lat, input.lng, input.regencyId);
    this.assertMoods(input.kind, input.vibeTags);
    await this.assertRegency(input.regencyId);
    const crowd = input.crowd ?? DEFAULT_CROWD_PROFILE[input.kind];
    const row = await this.prisma.venue.create({
      data: {
        slug: slugify(input.nameEn),
        kind: input.kind,
        category: input.category,
        nameEn: input.nameEn,
        nameId: input.nameId,
        descriptionEn: input.descriptionEn,
        descriptionId: input.descriptionId,
        regencyId: input.regencyId,
        lat: input.lat,
        lng: input.lng,
        vibeTags: input.vibeTags,
        openingHours: input.openingHours,
        avgDwellMinutes: input.avgDwellMinutes,
        typicalPeakQueueMinutes: input.typicalPeakQueueMinutes,
        priceLevel: input.priceLevel ?? null,
        imageUrl: input.imageUrl,
        imageCredit: input.imageCredit ?? null,
        isHotspot: input.isHotspot,
        isBufferZone: input.kind === 'MSME',
        etiquetteTags: input.etiquetteTags,
        source: 'admin',
        crowdPeakHour: crowd.peakHour,
        crowdPeakBusyness: crowd.peakBusyness,
        crowdBaseBusyness: crowd.baseBusyness,
      },
    });
    const embedded = await this.embed(row);
    await this.catalog.reload();
    return this.toAdmin(embedded);
  }

  async update(id: string, input: AdminPlaceUpdate): Promise<AdminPlace> {
    const current = await this.require(id);
    if (input.lat !== undefined || input.lng !== undefined) {
      this.assertValid(
        input.lat ?? current.lat,
        input.lng ?? current.lng,
        input.regencyId ?? current.regencyId,
      );
    }
    if (input.regencyId) await this.assertRegency(input.regencyId);
    this.assertMoods(input.kind ?? current.kind, input.vibeTags ?? current.vibeTags);
    const { crowd, ...rest } = input;
    // Saving a learned place is a review: it leaves the pending list unless the curator says otherwise.
    const reviewStatus =
      rest.reviewStatus ?? (current.reviewStatus === 'PENDING' ? 'APPROVED' : undefined);
    const row = await this.prisma.venue.update({
      where: { id },
      data: {
        ...(rest.kind !== undefined ? { kind: rest.kind } : {}),
        ...(rest.category !== undefined ? { category: rest.category } : {}),
        ...(rest.nameEn !== undefined ? { nameEn: rest.nameEn } : {}),
        ...(rest.nameId !== undefined ? { nameId: rest.nameId } : {}),
        ...(rest.descriptionEn !== undefined ? { descriptionEn: rest.descriptionEn } : {}),
        ...(rest.descriptionId !== undefined ? { descriptionId: rest.descriptionId } : {}),
        ...(rest.regencyId !== undefined ? { regencyId: rest.regencyId } : {}),
        ...(rest.lat !== undefined ? { lat: rest.lat } : {}),
        ...(rest.lng !== undefined ? { lng: rest.lng } : {}),
        ...(rest.vibeTags !== undefined ? { vibeTags: rest.vibeTags } : {}),
        ...(rest.openingHours !== undefined ? { openingHours: rest.openingHours } : {}),
        ...(rest.avgDwellMinutes !== undefined ? { avgDwellMinutes: rest.avgDwellMinutes } : {}),
        ...(rest.typicalPeakQueueMinutes !== undefined
          ? { typicalPeakQueueMinutes: rest.typicalPeakQueueMinutes }
          : {}),
        ...(rest.priceLevel !== undefined ? { priceLevel: rest.priceLevel } : {}),
        ...(rest.imageUrl !== undefined ? { imageUrl: rest.imageUrl } : {}),
        ...(rest.imageCredit !== undefined ? { imageCredit: rest.imageCredit } : {}),
        ...(rest.isHotspot !== undefined ? { isHotspot: rest.isHotspot } : {}),
        ...(rest.etiquetteTags !== undefined ? { etiquetteTags: rest.etiquetteTags } : {}),
        ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
        ...(reviewStatus ? { reviewStatus } : {}),
        ...(rest.kind !== undefined ? { isBufferZone: rest.kind === 'MSME' } : {}),
        ...(crowd
          ? {
              crowdPeakHour: crowd.peakHour,
              crowdPeakBusyness: crowd.peakBusyness,
              crowdBaseBusyness: crowd.baseBusyness,
            }
          : {}),
      },
    });
    const meaningChanged =
      input.kind !== undefined ||
      input.nameEn !== undefined ||
      input.category !== undefined ||
      input.descriptionEn !== undefined ||
      input.descriptionId !== undefined ||
      input.vibeTags !== undefined;
    const result = meaningChanged || !row.embeddingJson ? await this.embed(row) : row;
    await this.catalog.reload();
    return this.toAdmin(result);
  }

  /** Deactivates a place (soft delete). Restore it with `update(id, { isActive: true })`. */
  async deactivate(id: string): Promise<void> {
    await this.require(id);
    const remaining = await this.prisma.venue.count({ where: { isActive: true, NOT: { id } } });
    if (remaining === 0) {
      throw new AppException(
        'CONFLICT',
        'At least one active place must remain',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.venue.update({ where: { id }, data: { isActive: false } });
    await this.catalog.reload();
  }

  /** Retries the embedding of one place, e.g. after the AI provider was down on save. */
  async reembed(id: string): Promise<AdminPlace> {
    const row = await this.embed(await this.require(id));
    await this.catalog.reload();
    return this.toAdmin(row);
  }

  private async require(id: string): Promise<VenueRow> {
    const row = await this.prisma.venue.findUnique({ where: { id } });
    if (!row) throw new AppException('NOT_FOUND', 'Place not found', HttpStatus.NOT_FOUND);
    return row;
  }

  private assertValid(lat: number, lng: number, _regencyId: string): void {
    if (!isInBali({ lat, lng })) {
      throw new AppException(
        'VALIDATION_FAILED',
        'Invalid input: lat, lng (outside Bali)',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Destinations and businesses need a mood to be found; places of kind OTHER do not. */
  private assertMoods(kind: string, vibeTags: readonly string[]): void {
    if (kind !== 'OTHER' && vibeTags.length === 0) {
      throw new AppException(
        'VALIDATION_FAILED',
        'Invalid input: vibeTags',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertRegency(regencyId: string): Promise<void> {
    const found = await this.prisma.regency.findUnique({ where: { id: regencyId } });
    if (!found) {
      throw new AppException(
        'VALIDATION_FAILED',
        'Invalid input: regencyId',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Embeds the place; when the provider fails the place is kept without a vector and flagged. */
  private async embed(row: VenueRow): Promise<VenueRow> {
    if (!this.llm.isConfigured) return row;
    try {
      const [vector] = await this.llm.embed([embeddingText(row)]);
      if (!vector) return row;
      return await this.prisma.venue.update({
        where: { id: row.id },
        data: { embeddingJson: vector, embeddingModel: this.llm.embeddingModel },
      });
    } catch (error: unknown) {
      this.logger.warn(
        { id: row.id, error: String(error) },
        'Embedding failed; place saved without one',
      );
      return row;
    }
  }

  private toAdmin(row: VenueRow): AdminPlace {
    return {
      id: row.id,
      slug: row.slug,
      kind: row.kind,
      category: row.category,
      nameEn: row.nameEn,
      nameId: row.nameId,
      descriptionEn: row.descriptionEn,
      descriptionId: row.descriptionId,
      regencyId: row.regencyId,
      lat: row.lat,
      lng: row.lng,
      vibeTags: row.vibeTags as AdminPlace['vibeTags'],
      openingHours: OpeningHoursSchema.parse(row.openingHours),
      avgDwellMinutes: row.avgDwellMinutes,
      typicalPeakQueueMinutes: row.typicalPeakQueueMinutes,
      priceLevel: row.priceLevel,
      imageUrl: row.imageUrl,
      imageCredit: row.imageCredit,
      isHotspot: row.isHotspot,
      crowd: {
        peakHour: row.crowdPeakHour,
        peakBusyness: row.crowdPeakBusyness,
        baseBusyness: row.crowdBaseBusyness,
      },
      etiquetteTags: row.etiquetteTags,
      source: row.source,
      learnedFrom: row.learnedFrom,
      reviewStatus: row.reviewStatus,
      isActive: row.isActive,
      hasEmbedding: row.embeddingJson !== null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
