import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { haversineKm, isInBali, type GeoPoint } from '@margi-ai/shared';
import { getCatalog } from '@margi-ai/shared/engine';
import { CatalogService } from '../catalog/catalog.service';
import type { Venue as VenueRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PlaceCandidate } from './place-resolver.service';
import { foldText } from './place-query';

/** Same name within this distance is the same place (a re-run search, a second provider). */
const SAME_PLACE_KM = 0.1;
const GENERIC_IMAGE = '/images/place-generic.svg';

/** Opening hours are unknown for a learned place; the engine never reports it open or closed. */
function openAllWeek(): Record<string, [string, string][]> {
  const hours: Record<string, [string, string][]> = {};
  for (let day = 0; day < 7; day += 1) hours[String(day)] = [['00:00', '23:59']];
  return hours;
}

function slugOf(name: string, ref: string): string {
  const base = foldText(name).replace(/ /g, '-').slice(0, 50) || 'place';
  return `learned-${base}-${createHash('sha1').update(ref).digest('hex').slice(0, 6)}`;
}

/**
 * Keeps places that travellers asked for and the catalogue lacked. A learned place is a normal
 * venue of kind OTHER, so plans, saved trips and the route engine treat it like any stop; it has
 * no crowd forecast and waits as PENDING until a curator reviews it in the console.
 * Only named places are saved: streets and house addresses never are.
 */
@Injectable()
export class LearnedPlacesService {
  private readonly logger = new Logger(LearnedPlacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  /** A place a curator removed must not come back from the next search. */
  async isBlocked(externalRef: string): Promise<boolean> {
    const row = await this.prisma.venue.findUnique({
      where: { externalRef },
      select: { isActive: true },
    });
    return row !== null && !row.isActive;
  }

  /** Saves a provider result, or returns the place already stored for it. */
  async learn(candidate: PlaceCandidate): Promise<VenueRow | null> {
    if (!candidate.isPoi || !isInBali(candidate)) return null;
    const existing = await this.findExisting(candidate.externalRef, candidate);
    if (existing) return existing.isActive ? existing : null;
    return this.create({
      name: candidate.name,
      address: candidate.address,
      point: candidate,
      learnedFrom: candidate.source,
      externalRef: candidate.externalRef,
      regencyName: candidate.regencyName,
      source: candidate.source === 'osm' ? 'OpenStreetMap' : 'TomTom',
      sourceUrl: candidate.sourceUrl,
    });
  }

  /** Saves a point the traveller marked on the map. */
  async learnPin(name: string, point: GeoPoint): Promise<VenueRow | null> {
    if (!isInBali(point)) return null;
    const label = name.replace(/\s+/g, ' ').trim();
    const ref = `pin:${point.lat.toFixed(4)},${point.lng.toFixed(4)}:${foldText(label)}`;
    const existing = await this.findExisting(ref, { name: label, ...point });
    if (existing) return existing.isActive ? existing : null;
    const area = this.catalog.reverse(point);
    return this.create({
      name: label,
      address: `Marked on the map near ${area?.area.nameEn ?? 'Bali'}`,
      point,
      learnedFrom: 'pin',
      externalRef: ref,
      regencyName: null,
      source: 'traveller',
      sourceUrl: null,
    });
  }

  private async findExisting(
    externalRef: string,
    candidate: { name: string } & GeoPoint,
  ): Promise<VenueRow | null> {
    const byRef = await this.prisma.venue.findUnique({ where: { externalRef } });
    if (byRef) return byRef;
    const wanted = foldText(candidate.name);
    const twin = getCatalog().places.find(
      (place) =>
        foldText(place.venue.nameEn) === wanted &&
        haversineKm(place.venue, candidate) < SAME_PLACE_KM,
    );
    return twin ? this.prisma.venue.findUnique({ where: { id: twin.venue.id } }) : null;
  }

  private async create(input: {
    name: string;
    address: string;
    point: GeoPoint;
    learnedFrom: string;
    externalRef: string;
    regencyName: string | null;
    source: string;
    sourceUrl: string | null;
  }): Promise<VenueRow> {
    const regencyId = this.regencyFor(input.regencyName, input.point);
    const description =
      input.address.length >= 10 ? input.address : `${input.name}, ${input.address}`;
    const row = await this.prisma.venue.create({
      data: {
        slug: slugOf(input.name, input.externalRef),
        kind: 'OTHER',
        category: 'OTHER',
        nameEn: input.name,
        nameId: input.name,
        descriptionEn: description,
        descriptionId: description,
        regencyId,
        lat: input.point.lat,
        lng: input.point.lng,
        openingHours: openAllWeek(),
        avgDwellMinutes: 30,
        imageUrl: GENERIC_IMAGE,
        etiquetteTags: [],
        vibeTags: [],
        source: input.source,
        sourceUrl: input.sourceUrl,
        learnedFrom: input.learnedFrom,
        externalRef: input.externalRef,
        reviewStatus: 'PENDING',
      },
    });
    this.catalog.register(row);
    this.logger.log({ ref: input.externalRef, from: input.learnedFrom }, 'Learned a new place');
    return row;
  }

  /** Regency by the provider's name for it; otherwise the regency of the nearest known place. */
  private regencyFor(regencyName: string | null, point: GeoPoint): string {
    const catalog = getCatalog();
    if (regencyName) {
      const wanted = foldText(regencyName)
        .replace(/^(kabupaten|kab|kota|regency|city of|city)\s+/, '')
        .replace(/\s+(regency|city)$/, '')
        .trim();
      const match = catalog.regencies.find(
        (regency) => foldText(regency.nameEn) === wanted || foldText(regency.nameId) === wanted,
      );
      if (match) return match.id;
    }
    let best: { id: string; km: number } | null = null;
    for (const place of catalog.places) {
      const km = haversineKm(point, place.venue);
      if (!best || km < best.km) best = { id: place.venue.regencyId, km };
    }
    return best?.id ?? (catalog.regencies[0]?.id as string);
  }
}
