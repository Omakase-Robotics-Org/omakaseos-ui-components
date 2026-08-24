/**
 * @file Direct-manipulation geometry for vertex editing, ring validity and
 * self-intersection, as pure functions over world-frame metres.
 *
 * Nothing here knows about three.js, canvas, React or the wire. A keep-out area
 * on a vendor SLAM scene and a hand-drawn region on a nav-autonomy map are the
 * same ring of `(x, y)` points to this module, which is what lets one editor
 * layer serve both map surfaces.
 *
 * Two conventions hold throughout:
 *
 *  - A ring is IMPLICITLY CLOSED. The last vertex joins the first; no duplicate
 *    closing vertex is stored, and {@link ringEdges} yields the wrap-around
 *    edge by closing via `% ring.length`. A payload that arrives with a
 *    duplicated first/last point is normalised by {@link normaliseRing}
 *    before it becomes a draft.
 *  - A ring with fewer than three DISTINCT vertices encloses no area and is
 *    therefore invalid — see {@link ringProblem}. The editor keeps such a ring
 *    in the draft (an operator mid-drawing has one or two vertices) and refuses
 *    to SAVE it, which is why validity is reported as a reason rather than
 *    enforced by the mutators.
 */

/** One ring vertex, in world-frame metres. */
export type Vertex = {
  readonly x: number;
  readonly y: number;
};

/** A directed ring edge, from {@link Edge.a} to {@link Edge.b}. */
export type Edge = {
  readonly a: Vertex;
  readonly b: Vertex;
  /** Index of {@link Edge.a} in the ring; the edge ends at `(index + 1) % n`. */
  readonly index: number;
};

/** Why a ring cannot be saved, or `null` when it can. */
export type RingProblem =
  | { readonly kind: "too-few-vertices"; readonly count: number }
  | { readonly kind: "self-intersecting"; readonly edges: readonly [number, number] };

/**
 * Two vertices closer together than this (metres) are treated as one point.
 *
 * A vendor scene's coordinates arrive at centimetre resolution and an operator
 * placing a vertex with a pointer cannot mean a sub-millimetre distinction, so
 * the tolerance is one millimetre: below it, a "distinct" vertex is a
 * double-click rather than an intention.
 */
export const VERTEX_EPSILON_M = 0.001;

/**
 * Whether two vertices are the same point within {@link VERTEX_EPSILON_M}.
 *
 * @param a One vertex.
 * @param b The other vertex.
 * @returns True when they coincide.
 */
export function sameVertex(a: Vertex, b: Vertex): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= VERTEX_EPSILON_M;
}

/**
 * Drop a duplicated closing vertex and any consecutive repeats.
 *
 * Vendor payloads spell a closed area either way; storing the closing duplicate
 * would make every vertex index off by one at the wrap-around and would show
 * the operator a vertex handle on top of another.
 *
 * The mutators below are generic over the vertex type so a caller may carry extra
 * per-vertex data — the editor attaches the vendor object a vertex was read from,
 * which is what makes the opaque-field round trip possible — without this module
 * knowing anything about it.
 *
 * @param ring The ring as it arrived.
 * @returns The ring with consecutive duplicates (including a closing one) removed.
 */
export function normaliseRing<V extends Vertex>(ring: readonly V[]): readonly V[] {
  const deduped = ring.filter((vertex, index) => {
    if (index === 0) {
      return true;
    }
    const previous = ring[index - 1];
    if (previous === undefined) {
      return true;
    }
    return !sameVertex(previous, vertex);
  });
  const first = deduped[0];
  const last = deduped[deduped.length - 1];
  if (deduped.length > 1 && first !== undefined && last !== undefined && sameVertex(first, last)) {
    return deduped.slice(0, -1);
  }
  return deduped;
}

/**
 * The edges of a closed ring, including the wrap-around from last vertex to
 * first. The closing edge is formed with `(index + 1) % ring.length`.
 *
 * @param ring The ring.
 * @returns One edge per vertex, or an empty list for a ring of fewer than two.
 */
export function ringEdges(ring: readonly Vertex[]): readonly Edge[] {
  if (ring.length < 2) {
    return [];
  }
  return ring.flatMap((a, index) => {
    const b = ring[(index + 1) % ring.length];
    if (b === undefined) {
      return [];
    }
    return [{ a, b, index }];
  });
}

/**
 * The segments of an open polyline, without a closing segment.
 *
 * @param points The polyline points.
 * @returns One segment per adjacent point pair, or an empty list for fewer than two points.
 */
export function pathSegments(points: readonly Vertex[]): readonly Edge[] {
  if (points.length < 2) {
    return [];
  }
  return points.flatMap((a, index) => {
    const b = points[index + 1];
    if (b === undefined) {
      return [];
    }
    return [{ a, b, index }];
  });
}

/**
 * The point on segment `a`–`b` nearest `probe`.
 *
 * @param a Segment start.
 * @param b Segment end.
 * @param probe The probe position.
 * @returns The closest point on the segment, clamped to its ends.
 */
export function closestPointOnSegment(a: Vertex, b: Vertex, probe: Vertex): Vertex {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return a;
  }
  const raw = ((probe.x - a.x) * dx + (probe.y - a.y) * dy) / lengthSquared;
  const t = Math.min(1, Math.max(0, raw));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/**
 * Append a vertex to the end of the ring.
 *
 * @param ring The ring.
 * @param vertex The vertex to append.
 * @returns A new ring.
 */
export function appendVertex<V extends Vertex>(ring: readonly V[], vertex: V): readonly V[] {
  return [...ring, vertex];
}

/**
 * Insert a vertex into the middle of one edge, splitting it in two.
 *
 * The index is the edge's index as {@link ringEdges} reports it, so inserting on
 * the wrap-around edge (`index === ring.length - 1`) appends, which is the same
 * ring an operator sees when they click that edge's midpoint.
 *
 * @param ring The ring.
 * @param edgeIndex The edge to split.
 * @param vertex The new vertex.
 * @returns A new ring, or the original when the edge index names no edge.
 */
export function insertVertexOnEdge<V extends Vertex>(
  ring: readonly V[],
  edgeIndex: number,
  vertex: V,
): readonly V[] {
  if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= ring.length) {
    return ring;
  }
  return [...ring.slice(0, edgeIndex + 1), vertex, ...ring.slice(edgeIndex + 1)];
}

/**
 * Move one vertex to a new position.
 *
 * @param ring The ring.
 * @param index The vertex to move.
 * @param vertex Its new position.
 * @returns A new ring, or the original when the index names no vertex.
 */
export function moveVertex<V extends Vertex>(ring: readonly V[], index: number, vertex: V): readonly V[] {
  if (ring[index] === undefined) {
    return ring;
  }
  return ring.map((existing, at) => (at === index ? vertex : existing));
}

/**
 * Remove one vertex.
 *
 * The result may be an invalid ring (two vertices enclose nothing). That is
 * deliberate: the operator is told so by {@link ringProblem} and can add a
 * vertex back, whereas a mutator that silently refused would look like a broken
 * click.
 *
 * @param ring The ring.
 * @param index The vertex to remove.
 * @returns A new ring, or the original when the index names no vertex.
 */
export function removeVertex<V extends Vertex>(ring: readonly V[], index: number): readonly V[] {
  if (ring[index] === undefined) {
    return ring;
  }
  return ring.filter((_vertex, at) => at !== index);
}

/** The number of pairwise-distinct vertices in a ring. */
function distinctCount(ring: readonly Vertex[]): number {
  return ring.filter(
    (vertex, index) => !ring.slice(0, index).some((earlier) => sameVertex(earlier, vertex)),
  ).length;
}

/** Cross product of `(b - a)` and `(c - a)`. */
function cross(a: Vertex, b: Vertex, c: Vertex): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Whether `point` lies on segment `a`–`b`, given the three are collinear. */
function onSegment(a: Vertex, b: Vertex, point: Vertex): boolean {
  return (
    point.x <= Math.max(a.x, b.x) + VERTEX_EPSILON_M &&
    point.x >= Math.min(a.x, b.x) - VERTEX_EPSILON_M &&
    point.y <= Math.max(a.y, b.y) + VERTEX_EPSILON_M &&
    point.y >= Math.min(a.y, b.y) - VERTEX_EPSILON_M
  );
}

/** Sign of a cross product, with a zero band so collinearity is detectable. */
function orientation(a: Vertex, b: Vertex, c: Vertex): number {
  const value = cross(a, b, c);
  if (Math.abs(value) <= VERTEX_EPSILON_M * VERTEX_EPSILON_M) {
    return 0;
  }
  return Math.sign(value);
}

/**
 * Whether two segments properly cross.
 *
 * "Properly" excludes the shared endpoint two ADJACENT ring edges always have —
 * that contact is what makes a ring a ring, not a self-intersection. Adjacency
 * is settled by the caller ({@link selfIntersection}) rather than guessed from
 * the coordinates, because a ring may legitimately visit the same point twice.
 *
 * @param p1 First segment's start.
 * @param p2 First segment's end.
 * @param q1 Second segment's start.
 * @param q2 Second segment's end.
 * @returns True when the segments intersect at any point.
 */
export function segmentsIntersect(p1: Vertex, p2: Vertex, q1: Vertex, q2: Vertex): boolean {
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }
  if (o1 === 0 && onSegment(p1, p2, q1)) {
    return true;
  }
  if (o2 === 0 && onSegment(p1, p2, q2)) {
    return true;
  }
  if (o3 === 0 && onSegment(q1, q2, p1)) {
    return true;
  }
  if (o4 !== 0) {
    return false;
  }
  return onSegment(q1, q2, p2);
}

/** Whether two ring edge indices share a vertex by construction. */
function adjacentEdges(i: number, j: number, count: number): boolean {
  if (i === j) {
    return true;
  }
  return (i + 1) % count === j || (j + 1) % count === i;
}

/**
 * The first pair of non-adjacent edges that cross, or `null` for a simple ring.
 *
 * @param ring The ring.
 * @returns The two edge indices, lowest first, or null.
 */
export function selfIntersection(ring: readonly Vertex[]): readonly [number, number] | null {
  const edges = ringEdges(ring);
  const count = edges.length;
  const found = edges.flatMap((first) =>
    edges.flatMap((second) => {
      if (second.index <= first.index || adjacentEdges(first.index, second.index, count)) {
        return [];
      }
      if (!segmentsIntersect(first.a, first.b, second.a, second.b)) {
        return [];
      }
      return [[first.index, second.index] as const];
    }),
  );
  return found[0] ?? null;
}

/**
 * Why this ring may not be saved, or `null` when it is a valid simple polygon.
 *
 * @param ring The ring.
 * @returns The problem, or null.
 */
export function ringProblem(ring: readonly Vertex[]): RingProblem | null {
  const distinct = distinctCount(ring);
  if (distinct < 3) {
    return { kind: "too-few-vertices", count: distinct };
  }
  const crossing = selfIntersection(ring);
  if (crossing !== null) {
    return { kind: "self-intersecting", edges: crossing };
  }
  return null;
}

/**
 * An operator-facing sentence for a ring problem.
 *
 * The editor never disables a control without saying why (the fail-closed
 * discipline this whole layer is written under), so every problem has a
 * sentence and this is where it is spelled.
 *
 * @param problem The problem, or null.
 * @returns The sentence, or null when the ring is valid.
 */
export function ringProblemText(problem: RingProblem | null): string | null {
  if (problem === null) {
    return null;
  }
  if (problem.kind === "too-few-vertices") {
    return `An area needs at least 3 corners; this one has ${problem.count}.`;
  }
  return `This area crosses itself between corners ${problem.edges[0] + 1} and ${problem.edges[1] + 1}.`;
}

/** The signed area of a ring, positive counter-clockwise, in square metres. */
export function signedArea(ring: readonly Vertex[]): number {
  return (
    ringEdges(ring).reduce((sum, edge) => sum + (edge.a.x * edge.b.y - edge.b.x * edge.a.y), 0) / 2
  );
}
