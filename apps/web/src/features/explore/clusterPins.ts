/** A map pin projected to screen pixels at the current zoom. */
export interface ScreenPin {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Result of grouping: a pin drawn on its own, or several pins drawn as one cluster marker.
 * Cluster `ids` keep the input order, so the first id is the pin that seeded the group.
 */
export type PinGroup =
  | { readonly kind: 'single'; readonly id: string }
  | { readonly kind: 'cluster'; readonly ids: readonly string[] };

export interface ClusterPinsOptions {
  /** Pins closer than this many screen pixels to a group's seed join that group. */
  readonly radiusPx: number;
  /** Pins that must always render individually (focused or selected places). */
  readonly excludedIds: ReadonlySet<string>;
}

/**
 * Greedy screen-space grouping for overlapping map pins.
 *
 * Pins are visited in input order, so callers pass their priority order (for example nearest
 * to the traveller first). Each unassigned pin seeds a group and absorbs every later unassigned
 * pin within `radiusPx` of the seed. Excluded pins never seed or join a group. Groups with a
 * single member are returned as `single`. O(n^2), which is fine for a few hundred pins.
 */
export function clusterPins(
  pins: readonly ScreenPin[],
  { radiusPx, excludedIds }: ClusterPinsOptions,
): PinGroup[] {
  const assigned = new Set<string>();
  const groups: PinGroup[] = [];

  pins.forEach((seed, seedIndex) => {
    if (assigned.has(seed.id)) return;
    assigned.add(seed.id);
    if (excludedIds.has(seed.id)) {
      groups.push({ kind: 'single', id: seed.id });
      return;
    }

    const ids = [seed.id];
    for (const candidate of pins.slice(seedIndex + 1)) {
      if (assigned.has(candidate.id) || excludedIds.has(candidate.id)) continue;
      if (Math.hypot(candidate.x - seed.x, candidate.y - seed.y) < radiusPx) {
        assigned.add(candidate.id);
        ids.push(candidate.id);
      }
    }
    groups.push(ids.length === 1 ? { kind: 'single', id: seed.id } : { kind: 'cluster', ids });
  });

  return groups;
}
