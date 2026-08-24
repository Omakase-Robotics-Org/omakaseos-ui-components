/**
 * @file Hit-testing for direct manipulation — which handle, vertex or edge is
 * under a world-frame position, within a tolerance stated in METRES.
 *
 * The tolerance is metres and never pixels, and the conversion is the CALLER's
 * job. Only the renderer knows the current zoom: the 3D viewer's ground plane is
 * reached by raycasting a perspective camera, so "8 px" is a different distance
 * at the near edge of the floor than at the far edge, and the 2D view's scale
 * changes with the panel's width. A module that took pixels would have to be
 * told the camera to mean anything by them, which is the coupling this layer
 * exists to avoid. {@link toleranceMetres} is the one helper that crosses back,
 * and it crosses back on the CALLER's numbers: the renderer states its own
 * scale, and this module only does the multiplication and the fallback.
 */

import type { Vertex } from "./geometry";
import {
  closestPointOnSegment,
  pathSegments,
  ringEdges,
  signedArea,
} from "./geometry";

/** A candidate the pointer may have landed on. */
export type Handle = {
  /** Stable identity of the thing, carried straight back in the hit. */
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Heading in radians, in the world frame, when this handle has one. */
  readonly yaw?: number;
};

/** The nearest candidate and how far away it was. */
export type Hit = {
  readonly id: string;
  /** Distance from the probe to the candidate, in metres. */
  readonly distance: number;
};

/** The nearest ring vertex and how far away it was. */
export type VertexHit = {
  readonly index: number;
  readonly distance: number;
};

/** The nearest ring edge, the closest position on it, and the distance. */
export type EdgeHit = {
  /** Edge index as {@link ringEdges} reports it: the edge from vertex `index` to `index + 1`. */
  readonly index: number;
  /** The point on the edge nearest the probe, in world metres. */
  readonly at: Vertex;
  readonly distance: number;
};

/**
 * The nearest candidate within `toleranceM`, or `null`.
 *
 * Ties are broken by the earlier entry, so a stack of coincident points resolves
 * deterministically rather than by iteration order of a set.
 *
 * @param candidates The things that can be hit.
 * @param probe Where the operator pointed, in world metres.
 * @param toleranceM How far a hit may be, in metres.
 * @returns The nearest hit, or null when nothing is within tolerance.
 */
export function nearestHandle(
  candidates: readonly Handle[],
  probe: Vertex,
  toleranceM: number,
): Hit | null {
  const hits = candidates
    .map((candidate) => ({
      id: candidate.id,
      distance: Math.hypot(candidate.x - probe.x, candidate.y - probe.y),
    }))
    .filter((hit) => hit.distance <= toleranceM)
    .sort((left, right) => left.distance - right.distance);
  return hits[0] ?? null;
}

/**
 * The nearest ring vertex within `toleranceM`, or `null`.
 *
 * @param ring The ring.
 * @param probe Where the operator pointed, in world metres.
 * @param toleranceM How far a hit may be, in metres.
 * @returns The nearest vertex hit, or null.
 */
export function nearestVertex(
  ring: readonly Vertex[],
  probe: Vertex,
  toleranceM: number,
): VertexHit | null {
  const hits = ring
    .map((vertex, index) => ({ index, distance: Math.hypot(vertex.x - probe.x, vertex.y - probe.y) }))
    .filter((hit) => hit.distance <= toleranceM)
    .sort((left, right) => left.distance - right.distance);
  return hits[0] ?? null;
}

/**
 * The nearest ring edge within `toleranceM`, or `null`.
 *
 * Used for "insert a corner here": the operator clicks a side of the area and a
 * new vertex splits it at {@link EdgeHit.at}.
 *
 * @param ring The ring.
 * @param probe Where the operator pointed, in world metres.
 * @param toleranceM How far a hit may be, in metres.
 * @returns The nearest edge hit, or null.
 */
export function nearestRingEdge(
  ring: readonly Vertex[],
  probe: Vertex,
  toleranceM: number,
): EdgeHit | null {
  const hits = ringEdges(ring)
    .map((edge) => {
      const at = closestPointOnSegment(edge.a, edge.b, probe);
      return { index: edge.index, at, distance: Math.hypot(at.x - probe.x, at.y - probe.y) };
    })
    .filter((hit) => hit.distance <= toleranceM)
    .sort((left, right) => left.distance - right.distance);
  return hits[0] ?? null;
}

/**
 * The nearest open-polyline segment within `toleranceM`, or `null`.
 *
 * Unlike {@link nearestRingEdge}, this never tests a closing segment from the
 * last point back to the first. The returned index identifies the segment from
 * point `index` to point `index + 1`.
 *
 * @param points The open polyline points.
 * @param at Where the operator pointed, in world metres.
 * @param toleranceM How far a hit may be, in metres.
 * @returns The nearest segment hit, or null.
 */
export function nearestPathSegment(
  points: readonly Vertex[],
  at: Vertex,
  toleranceM: number,
): EdgeHit | null {
  const hits = pathSegments(points)
    .map((segment) => {
      const closest = closestPointOnSegment(segment.a, segment.b, at);
      return {
        index: segment.index,
        at: closest,
        distance: Math.hypot(closest.x - at.x, closest.y - at.y),
      };
    })
    .filter((hit) => hit.distance <= toleranceM)
    .sort((left, right) => left.distance - right.distance);
  return hits[0] ?? null;
}

/**
 * The world position of a handle's heading knob, or `null` when it has no yaw.
 *
 * @param handle The handle whose heading is being edited.
 * @param armLengthM Distance from the handle to the knob, in metres.
 * @returns The knob position, or null when `handle.yaw` is undefined.
 */
export function headingKnobAt(handle: Handle, armLengthM: number): Vertex | null {
  if (handle.yaw === undefined) {
    return null;
  }
  return {
    x: handle.x + armLengthM * Math.cos(handle.yaw),
    y: handle.y + armLengthM * Math.sin(handle.yaw),
  };
}

/**
 * Whether a probe lies inside a ring, by the even-odd (crossing-number) rule.
 *
 * Used to decide which AREA an operator selected when they click its interior
 * rather than one of its handles.
 *
 * @param ring The ring.
 * @param probe The probe position.
 * @returns True when the probe is inside.
 */
export function insideRing(ring: readonly Vertex[], probe: Vertex): boolean {
  if (ring.length < 3) {
    return false;
  }
  return ringEdges(ring).reduce((inside, edge) => {
    const straddles = edge.a.y > probe.y !== edge.b.y > probe.y;
    if (!straddles) {
      return inside;
    }
    const t = (probe.y - edge.a.y) / (edge.b.y - edge.a.y);
    const crossingX = edge.a.x + t * (edge.b.x - edge.a.x);
    if (probe.x < crossingX) {
      return !inside;
    }
    return inside;
  }, false);
}

/** A unit vector, or null when the input is degenerate. */
function normaliseVector(vector: Vertex): Vertex | null {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return null;
  }
  return { x: vector.x / length, y: vector.y / length };
}

/** The outward unit normal of a directed edge under the ring's winding. */
function outwardNormal(a: Vertex, b: Vertex, counterClockwise: boolean): Vertex | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return null;
  }
  if (counterClockwise) {
    return { x: dy / length, y: -dx / length };
  }
  return { x: -dy / length, y: dx / length };
}

/**
 * A deterministic delete-badge anchor for a ring.
 *
 * The highest vertex is chosen, with the rightmost highest vertex breaking a
 * tie. Its two adjacent edge normals are averaged and pushed outward from the
 * ring. A collinear or otherwise degenerate pair falls back to one available
 * outward edge normal.
 *
 * @param ring The ring, which must contain at least one vertex.
 * @param offsetM Distance to push the badge anchor outward, in metres.
 * @returns The badge anchor in world-frame metres.
 */
export function areaBadgeAnchor(ring: readonly Vertex[], offsetM: number): Vertex {
  if (ring.length === 0) {
    throw new RangeError("Cannot place an area badge on an empty ring.");
  }

  const anchorIndex = ring.reduce(
    (bestIndex, vertex, index) => {
      const best = ring[bestIndex];
      if (best === undefined || vertex.y > best.y || (vertex.y === best.y && vertex.x > best.x)) {
        return index;
      }
      return bestIndex;
    },
    0,
  );
  const anchor = ring[anchorIndex];
  if (anchor === undefined) {
    throw new RangeError("Cannot place an area badge on an empty ring.");
  }

  const previous = ring[(anchorIndex + ring.length - 1) % ring.length];
  const next = ring[(anchorIndex + 1) % ring.length];
  if (previous === undefined || next === undefined) {
    return anchor;
  }

  const counterClockwise = signedArea(ring) >= 0;
  const incoming = outwardNormal(previous, anchor, counterClockwise);
  const outgoing = outwardNormal(anchor, next, counterClockwise);
  const bisector =
    incoming !== null && outgoing !== null
      ? normaliseVector({ x: incoming.x + outgoing.x, y: incoming.y + outgoing.y })
      : null;
  const direction = bisector ?? incoming ?? outgoing;
  if (direction === null) {
    return anchor;
  }
  return { x: anchor.x + offsetM * direction.x, y: anchor.y + offsetM * direction.y };
}

/**
 * A hit tolerance in metres for a pointer target of `radiusPx` pixels.
 *
 * @param metresPerPixel The renderer's current scale, or null when unknown.
 * @param radiusPx The pointer target radius in pixels.
 * @param fallbackM The tolerance to use when the scale is unknown.
 * @returns The tolerance in metres.
 */
export function toleranceMetres(
  metresPerPixel: number | null,
  radiusPx: number,
  fallbackM: number,
): number {
  if (metresPerPixel === null || !Number.isFinite(metresPerPixel) || metresPerPixel <= 0) {
    return fallbackM;
  }
  return metresPerPixel * radiusPx;
}
