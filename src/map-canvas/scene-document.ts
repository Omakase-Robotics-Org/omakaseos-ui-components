/**
 * @file The map editor's DOCUMENT: a chassis scene's road network, its
 * keep-out geometry and its typed zones, plus the pure CRUD every one of
 * those elements needs.
 *
 * ## Whose model this is
 *
 * It is not this library's invention. The on-robot console already owns this
 * scene end to end — `robot-status-server-app`'s
 * `src/lib/map-editor/road-graph.ts` (the vocabulary) and
 * `src/lib/map-editor/draft.ts` (the mutators) — and the vendor firmware owns
 * it above that. So this module MIRRORS those two files: the same four
 * element kinds, the same field names, the same numerals, the same refusals.
 * A second, cleverer shape for a keep-out would make the editor's picture and
 * the robot's scene two different scenes.
 *
 * Where the spellings differ, the difference is stated rather than smoothed
 * over:
 *
 *  - A vertex `type` is a NUMBER here (`2` / `100`) and a string numeral
 *    (`"2"` / `"100"`) in the console, because the fixture this editor opens
 *    was machine-parsed from `road_map.xml` into numbers
 *    (`cuc-1-north.fixture.ts`). The meanings are the vendor's either way and
 *    {@link POINT_TYPE_LABELS} carries its words verbatim.
 *  - An unnamed vertex carries NO `defineType` key at all (an absent
 *    property, not `""` and not `null`) — the console reads it as
 *    `string | null` because a read payload can carry an empty one; a
 *    document this editor authors never produces that state.
 *  - Three vendor fields the console carries are ABSENT here rather than
 *    quietly defaulted: `name` (which the vendor's own editor fills with the
 *    padded id), `autoType` (the approach style) and `code` (the controller a
 *    lift, door or doorbell station is wired to). The `road_map.xml` export
 *    this editor opens carries none of them, and an editor that invented
 *    values for them would be writing fields nobody stated. The vertex types
 *    that REQUIRE a `code` are, for the same reason, not among the two
 *    {@link RoadPointType} authors.
 *
 * ## Four element kinds, and what decides their meaning
 *
 *  - {@link RoadPoint} — a station (`type` {@link STATION_TYPE}, carrying an
 *    operator label in `defineType`) or a routing-only path point (`type`
 *    {@link PATH_POINT_TYPE}, carrying none). Both have a `yaw`.
 *  - {@link RoadEdge} — one drivable line, `src` → `dst`, with the vendor's
 *    `oneWay` and `single` numerals.
 *  - {@link KeepOutArea} — geometry the robot may not enter, stored as a bare
 *    list of world-metre points with NO type field: the POINT COUNT decides
 *    what it is. Exactly two points are a virtual wall, three or more a
 *    forbidden polygon ({@link keepOutKindOf}). There is no separate
 *    virtual-wall element, here or on the wire.
 *  - {@link SpliceArea} — a typed zone (ramp, lift, deceleration …), the same
 *    geometry plus a `type` numeral from the vendor's palette of eight
 *    ({@link SPLICE_AREA_TYPE_LABELS}).
 *
 * ## Every operation answers, and a refusal says why
 *
 * The console's mutators return the SAME draft when they decline, and pair
 * with a separate `…Problem()` query the chrome is expected to have called
 * first. That is one call shape too few for this workspace's fail-first rule:
 * a caller that forgets the query gets silence. So every mutator here answers
 * a {@link SceneEdit} — either the new document, or the reason it refused, in
 * words an operator can act on. Nothing degrades quietly, and the two lint
 * rules an editor must never let an operator violate
 * ({@link KEEP_OUT_DEGENERATE_RULE}, {@link SPLICE_TYPE_UNKNOWN_RULE}) are
 * enforced here rather than discovered later by the linter.
 *
 * ## Rounding
 *
 * A coordinate the operator CREATES is rounded to {@link SCENE_DECIMALS}
 * (millimetres), mirroring the console's `roundCoordinate`: it is the
 * resolution the vendor's own writer emits, and it is the resolution
 * `VERTEX_EPSILON_M` compares at when it decides that a corner placed on top
 * of the previous corner was the second half of a double click. A coordinate
 * a DRAG moves is left exactly where the gesture put it — the pointer layer
 * has already resolved it against the constraint and the magnet, and rounding
 * a resolved position would move a vertex off the geometry it just snapped
 * to.
 *
 * Pure functions and data only: no React, no DOM, no wire, no clock.
 */

/** A position in the scene's world frame, in metres. */
export type ScenePoint = {
  readonly x: number;
  readonly y: number;
};

/**
 * The two vertex types this editor writes.
 *
 * The firmware knows fifteen (see {@link POINT_TYPE_LABELS} in the console's
 * `road-graph.ts`); the eleven that require a controller `code`, a lift pair
 * or a door pair are not something a map canvas can author correctly on its
 * own, so this editor stays on the two that need nothing but a position: the
 * ordinary station and the path point.
 */
export type RoadPointType = 2 | 100;

/** A named vertex: a place the robot goes TO. */
export const STATION_TYPE = 2 satisfies RoadPointType;

/** An unnamed vertex: a coordinate the robot drives THROUGH. The vendor default. */
export const PATH_POINT_TYPE = 100 satisfies RoadPointType;

/** How an edge may be driven. The vendor's numerals, as strings. */
export type OneWay = "0" | "1" | "2";

/** How narrow an edge is, which the chassis uses to pick a passing strategy. */
export type Single = "0" | "1" | "2";

/** What a keep-out entry's vertex count makes it: a segment, or an area. */
export type KeepOutKind = "wall" | "polygon";

/**
 * One vertex of the road network.
 *
 * `id` is the vendor's own zero-padded spelling (`"0007"`), because it is
 * written back as the vertex's identity and referenced by every edge.
 */
export type RoadPoint = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Heading in radians, world frame: x east, counter-clockwise positive. */
  readonly yaw: number;
  readonly type: RoadPointType;
  /**
   * The human label a station carries (`"home"`, `"wc"`).
   *
   * ABSENT — not `""` — on a path point, and absent on a station the operator
   * has not named yet, which is the state the fixture's nine path points are
   * in and the state a freshly placed vertex starts in.
   */
  readonly defineType?: string;
};

/** One drivable line between two vertices. */
export type RoadEdge = {
  /**
   * Identity within this editing session.
   *
   * NOT a vendor field: an edge has no id on the wire, so this is a session
   * key ({@link newKey}) for anything the operator creates and the source
   * payload's own ordinal for anything read.
   */
  readonly id: string;
  readonly src: string;
  readonly dst: string;
  readonly oneWay: OneWay;
  readonly single: Single;
};

/**
 * One keep-out entry: a virtual wall segment, or a forbidden polygon.
 *
 * There is no `kind` field. The firmware stores neither, and inventing one
 * here would let a document say "wall" about three points; ask
 * {@link keepOutKindOf} instead, which is the same derivation the console
 * makes (`road-graph.ts`'s `keepOutKindOf`).
 */
export type KeepOutArea = {
  /** Identity within this editing session; keep-out entries carry no vendor id. */
  readonly id: string;
  readonly points: readonly ScenePoint[];
};

/** One typed zone: a ramp, a lift car, a deceleration band, and so on. */
export type SpliceArea = {
  /** Identity within this editing session; splice areas carry no vendor id. */
  readonly id: string;
  /** The zone type numeral — see {@link SPLICE_AREA_TYPE_LABELS}. */
  readonly type: string;
  readonly points: readonly ScenePoint[];
};

/**
 * The whole editable scene.
 *
 * `sequence` is the session's allocation counter: it only ever goes up, so a
 * key handed out for an element the operator later deleted is never handed
 * out again — including across an undo, because the counter travels inside
 * the document the timeline stores.
 */
export type SceneDocument = {
  readonly points: readonly RoadPoint[];
  readonly edges: readonly RoadEdge[];
  readonly keepOuts: readonly KeepOutArea[];
  readonly spliceAreas: readonly SpliceArea[];
  readonly sequence: number;
};

/**
 * What one operation did, or why it declined.
 *
 * `created` names the element the operation made — a vertex id, a session key
 * — so the caller can select the thing it just placed without re-deriving
 * which id the allocator handed out. `null` when the operation created
 * nothing.
 */
export type SceneEdit =
  | { readonly ok: true; readonly document: SceneDocument; readonly created: string | null }
  | { readonly ok: false; readonly reason: string };

/** One element, named the way this document names it. */
export type SceneRef =
  | { readonly kind: "point"; readonly id: string }
  | { readonly kind: "edge"; readonly id: string }
  | { readonly kind: "keep-out"; readonly id: string }
  | { readonly kind: "splice"; readonly id: string }
  | { readonly kind: "ring-vertex"; readonly entityId: string; readonly index: number };

/** One point's new position, for a move that must land as ONE edit. */
export type SceneMove =
  | { readonly kind: "point"; readonly id: string; readonly at: ScenePoint }
  | {
      readonly kind: "ring-vertex";
      readonly entityId: string;
      readonly index: number;
      readonly at: ScenePoint;
    };

// ---------------------------------------------------------------------------
// The vendor's words
// ---------------------------------------------------------------------------

/** What each vertex `type` numeral means, in the vendor's own English. */
export const POINT_TYPE_LABELS: Readonly<Record<RoadPointType, string>> = {
  2: "Normal",
  100: "Path Point",
};

/** What each edge `oneWay` numeral means. */
export const ONE_WAY_LABELS: Readonly<Record<OneWay, string>> = {
  "0": "Bidirectional",
  "1": "One way, source to destination",
  "2": "One way, destination to source",
};

/** What each edge `single` numeral means. */
export const SINGLE_LABELS: Readonly<Record<Single, string>> = {
  "0": "Non-narrow",
  "1": "Short narrow",
  "2": "Long narrow",
};

/** What each splice-area `type` numeral means. The whole vendor palette. */
export const SPLICE_AREA_TYPE_LABELS: Readonly<Record<string, string>> = {
  "3": "Ramp / slope",
  "4": "Lift / elevator",
  "5": "Deceleration",
  "6": "Strong light",
  "7": "Stop on obstacle",
  "8": "Narrow",
  "9": "Non-inspection",
  "10": "Following",
};

/** Every splice-area type the vendor accepts, in palette order. */
export const SPLICE_AREA_TYPES: readonly string[] = ["3", "4", "5", "6", "7", "8", "9", "10"];

/** The lint rule a malformed keep-out entry trips. Stated so a refusal can name it. */
export const KEEP_OUT_DEGENERATE_RULE = "geometry.keepout-degenerate";

/** The lint rule an out-of-palette splice type trips. */
export const SPLICE_TYPE_UNKNOWN_RULE = "keepout.splice-type-unknown";

/** How many decimals a created coordinate keeps: millimetres. */
export const SCENE_DECIMALS = 3;

/** The width of the vendor's zero-padded vertex ids. */
export const POINT_ID_WIDTH = 4;

/**
 * Two created points closer than this (metres) are the same point.
 *
 * The same millimetre the direct-manipulation kernel's `VERTEX_EPSILON_M`
 * uses, restated here so this module needs no dependency on the editing
 * kernel: it is the resolution {@link SCENE_DECIMALS} rounds to, which is
 * what makes the two agree.
 */
export const SAME_POINT_EPSILON_M = 0.001;

/**
 * Whether a vertex type is a STATION — a place with a purpose — rather than a
 * coordinate the chassis merely drives through.
 *
 * @param type The vertex type.
 * @returns True for everything except the path point.
 */
export function isStationType(type: RoadPointType): boolean {
  return type !== PATH_POINT_TYPE;
}

/**
 * The vendor's name for a vertex type.
 *
 * @param type The vertex type.
 * @returns The label.
 */
export function pointTypeLabel(type: RoadPointType): string {
  return POINT_TYPE_LABELS[type];
}

/**
 * The vendor's name for a splice-area type, or a legible fallback for one this
 * firmware knows and the palette above does not.
 *
 * @param type The splice-area type numeral.
 * @returns The label.
 */
export function spliceAreaTypeLabel(type: string): string {
  return SPLICE_AREA_TYPE_LABELS[type] ?? `Zone type ${type}`;
}

/**
 * What a run of keep-out vertices IS: two points bound a wall segment, three
 * or more bound an area.
 *
 * @param points The vertices.
 * @returns The kind.
 */
export function keepOutKindOf(points: readonly ScenePoint[]): KeepOutKind {
  return points.length <= 2 ? "wall" : "polygon";
}

/**
 * A coordinate at the resolution the vendor's writer emits.
 *
 * @param value The coordinate in metres.
 * @returns The same coordinate rounded to {@link SCENE_DECIMALS} decimals.
 */
export function roundCoordinate(value: number): number {
  return Number(value.toFixed(SCENE_DECIMALS));
}

/**
 * A created position, at the resolution the vendor's writer emits.
 *
 * @param at The position in metres.
 * @returns The rounded position.
 */
export function roundedPoint(at: ScenePoint): ScenePoint {
  return { x: roundCoordinate(at.x), y: roundCoordinate(at.y) };
}

/**
 * A vertex id in the vendor's zero-padded spelling.
 *
 * @param numericId The number.
 * @returns The padded id, e.g. `"0022"`.
 */
export function formatPointId(numericId: number): string {
  return String(numericId).padStart(POINT_ID_WIDTH, "0");
}

/**
 * The next free vertex id: one past the highest the scene holds.
 *
 * Highest-plus-one and not count-plus-one, so deleting `"0021"` and placing a
 * vertex does not hand out an id an edge somewhere else still names.
 *
 * @param document The document.
 * @returns The id, e.g. `"0022"` for a scene holding `"0000"`…`"0021"`.
 */
export function nextPointId(document: SceneDocument): string {
  const highest = document.points.reduce((best, point) => {
    const numeric = Number(point.id);
    return Number.isFinite(numeric) && numeric > best ? numeric : best;
  }, -1);
  return formatPointId(highest + 1);
}

/**
 * The session-local identity of something the operator CREATED.
 *
 * The console's spelling (`road-graph.ts`'s `newKey`), so a key means the same
 * thing in both editors' logs and readouts.
 *
 * @param kind What is being keyed.
 * @param sequence The document's allocation counter.
 * @returns The key.
 */
export function newKey(kind: string, sequence: number): string {
  return `new:${kind}:${String(sequence)}`;
}

// ---------------------------------------------------------------------------
// The ring proxy: how a two-point entity becomes something a pointer can hit
// ---------------------------------------------------------------------------
//
// The editing grammar offers a committed area's ring vertices only once the
// AREA is armed, and it arms an area by hit-testing the area's INTERIOR. A
// two-point keep-out has no interior, so a virtual wall drawn on the map would
// be a thing an operator could see and never click.
//
// So a two-point entity is presented to the grammar as a PATH of two handles
// instead — a line, which the grammar hit-tests, and which this host's
// declared `edges` capability makes selectable. Three-or-more-point entities
// are presented as areas, exactly as before. The two presentations are
// disjoint (a point count is one or the other), so no position is ever offered
// twice, and the ids below are how a returned intent is routed back to the
// entity it named.
//
// `#` is the separator because an entity id already contains colons
// (`new:keepout:0`), and the vendor never writes `#` in an id.

/** The prefix every ring-proxy id carries. */
const RING_PREFIX = "ring:";

/**
 * The path id under which a two-point entity's segment is offered.
 *
 * @param entityId The keep-out or splice area's id.
 * @returns The path id.
 */
export function ringPathId(entityId: string): string {
  return `${RING_PREFIX}${entityId}`;
}

/**
 * The handle id under which one corner of a two-point entity is offered.
 *
 * @param entityId The keep-out or splice area's id.
 * @param index Which corner.
 * @returns The handle id.
 */
export function ringHandleId(entityId: string, index: number): string {
  return `${RING_PREFIX}${entityId}#${String(index)}`;
}

/**
 * The entity a ring-proxy PATH id names, or null when the id is not one.
 *
 * @param id The path id.
 * @returns The entity id, or null.
 */
export function parseRingPathId(id: string): string | null {
  if (!id.startsWith(RING_PREFIX) || id.includes("#")) {
    return null;
  }
  return id.slice(RING_PREFIX.length);
}

/**
 * The entity and corner a ring-proxy HANDLE id names, or null when the id is
 * not one.
 *
 * @param id The handle id.
 * @returns The entity id and corner index, or null.
 */
export function parseRingHandleId(
  id: string,
): { readonly entityId: string; readonly index: number } | null {
  if (!id.startsWith(RING_PREFIX)) {
    return null;
  }
  const separator = id.lastIndexOf("#");
  if (separator < RING_PREFIX.length) {
    return null;
  }
  const index = Number(id.slice(separator + 1));
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  return { entityId: id.slice(RING_PREFIX.length, separator), index };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * One vertex, by its vendor id.
 *
 * @param document The document.
 * @param id The vendor id.
 * @returns The vertex, or undefined.
 */
export function pointById(document: SceneDocument, id: string): RoadPoint | undefined {
  return document.points.find((point) => point.id === id);
}

/**
 * One line, by its session key.
 *
 * @param document The document.
 * @param id The session key.
 * @returns The line, or undefined.
 */
export function edgeById(document: SceneDocument, id: string): RoadEdge | undefined {
  return document.edges.find((edge) => edge.id === id);
}

/**
 * One keep-out entry, by its session key.
 *
 * @param document The document.
 * @param id The session key.
 * @returns The entry, or undefined.
 */
export function keepOutById(document: SceneDocument, id: string): KeepOutArea | undefined {
  return document.keepOuts.find((area) => area.id === id);
}

/**
 * One typed zone, by its session key.
 *
 * @param document The document.
 * @param id The session key.
 * @returns The zone, or undefined.
 */
export function spliceAreaById(document: SceneDocument, id: string): SpliceArea | undefined {
  return document.spliceAreas.find((area) => area.id === id);
}

/**
 * The ring of whichever entity holds this id, or null when nothing does.
 *
 * Keep-outs and typed zones are the same geometry with different meanings, so
 * every vertex operation below is written once against this.
 *
 * @param document The document.
 * @param entityId The keep-out or splice area's id.
 * @returns The ring and which list it came from, or null.
 */
export function ringOf(
  document: SceneDocument,
  entityId: string,
): { readonly kind: "keep-out" | "splice"; readonly points: readonly ScenePoint[] } | null {
  const keepOut = keepOutById(document, entityId);
  if (keepOut !== undefined) {
    return { kind: "keep-out", points: keepOut.points };
  }
  const splice = spliceAreaById(document, entityId);
  if (splice !== undefined) {
    return { kind: "splice", points: splice.points };
  }
  return null;
}

/**
 * The lines that would go with a vertex if it were removed.
 *
 * @param document The document.
 * @param id The vertex's vendor id.
 * @returns The lines that end on it.
 */
export function edgesAtPoint(document: SceneDocument, id: string): readonly RoadEdge[] {
  return document.edges.filter((edge) => edge.src === id || edge.dst === id);
}

/**
 * The vertex a created position lands ON, or null when it lands on open floor.
 *
 * This is what makes the pen able to JOIN two existing vertices rather than
 * only ever placing new ones: the magnet resolves a click near a vertex to
 * that vertex's exact position, and a placement at that position means the
 * vertex, not a duplicate on top of it. It is a resolution rule and not a
 * fallback — the position either coincides within
 * {@link SAME_POINT_EPSILON_M} or it does not, and both answers are stated.
 *
 * @param document The document.
 * @param at The position in metres.
 * @returns The vertex it coincides with, or null.
 */
export function pointAt(document: SceneDocument, at: ScenePoint): RoadPoint | null {
  return (
    document.points.find(
      (point) => Math.hypot(point.x - at.x, point.y - at.y) <= SAME_POINT_EPSILON_M,
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// The two lint rules an editor must not let an operator violate
// ---------------------------------------------------------------------------

/** The greatest distance between any two of a run's points. */
function runExtent(points: readonly ScenePoint[]): number {
  let extent = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    if (a === undefined) {
      continue;
    }
    for (let j = i + 1; j < points.length; j += 1) {
      const b = points[j];
      if (b === undefined) {
        continue;
      }
      extent = Math.max(extent, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return extent;
}

/**
 * Why this run of points cannot be a keep-out entry or a typed zone, or null
 * when it can.
 *
 * The three shapes {@link KEEP_OUT_DEGENERATE_RULE} reports, in the linter's
 * own order: too few points, a coordinate that is not a finite number, and a
 * run whose points are all the same coordinate (zero extent). An editor that
 * let any of them be committed would be writing a scene the linter then
 * refuses to save, which is a worse place to find out.
 *
 * @param points The run, in world metres.
 * @returns The reason, stated for an operator, or null.
 */
export function runProblem(points: readonly ScenePoint[]): string | null {
  if (points.length < 2) {
    return (
      `${KEEP_OUT_DEGENERATE_RULE}: this run holds ${String(points.length)} point(s). ` +
      "A virtual wall needs exactly 2 and a forbidden polygon 3 or more."
    );
  }
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    return `${KEEP_OUT_DEGENERATE_RULE}: this run has a coordinate that is not a finite number.`;
  }
  if (runExtent(points) <= 0) {
    return (
      `${KEEP_OUT_DEGENERATE_RULE}: this run has zero length — all ` +
      `${String(points.length)} of its points are the same coordinate.`
    );
  }
  return null;
}

/**
 * Why this splice-area type is not one, or null when it is.
 *
 * @param type The type numeral.
 * @returns The reason, stated for an operator, or null.
 */
export function spliceTypeProblem(type: string): string | null {
  if (SPLICE_AREA_TYPES.includes(type)) {
    return null;
  }
  return (
    `${SPLICE_TYPE_UNKNOWN_RULE}: "${type}" is not in the vendor palette ` +
    "(3 ramp, 4 lift, 5 deceleration, 6 strong light, 7 stop-on-obstacle, 8 narrow, " +
    "9 non-inspection, 10 following)."
  );
}

/**
 * Why a line between these two vertices is refused, or null when it is not.
 *
 * The console's three refusals, verbatim in substance: a line may not start
 * and end at the same vertex, both ends must exist, and one pair of vertices
 * holds only one line whichever way round it is stated.
 *
 * @param document The document.
 * @param src The source vertex's vendor id.
 * @param dst The destination vertex's vendor id.
 * @returns The reason, stated for an operator, or null.
 */
export function edgeProblem(document: SceneDocument, src: string, dst: string): string | null {
  if (src === dst) {
    return `Vertex ${src} cannot be joined to itself.`;
  }
  const from = pointById(document, src);
  const to = pointById(document, dst);
  if (from === undefined || to === undefined) {
    return `Vertex ${from === undefined ? src : dst} is not in this scene.`;
  }
  if (document.edges.some((edge) => joinsSamePair(edge, src, dst))) {
    return `Vertices ${src} and ${dst} are already joined by a line.`;
  }
  return null;
}

/** Whether a line joins this pair of vertices, in either direction. */
function joinsSamePair(edge: RoadEdge, src: string, dst: string): boolean {
  if (edge.src === src && edge.dst === dst) {
    return true;
  }
  return edge.src === dst && edge.dst === src;
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

function done(document: SceneDocument, created: string | null = null): SceneEdit {
  return { ok: true, document, created };
}

function refuse(reason: string): SceneEdit {
  return { ok: false, reason };
}

// ---------------------------------------------------------------------------
// Vertices
// ---------------------------------------------------------------------------

/** What else the operator stated about a vertex they are placing. */
export type NewPointOptions = {
  /** A station's operator label. Omitted, or `""`, leaves the key absent. */
  readonly defineType?: string;
  /** The heading in radians. Zero when unstated. */
  readonly yaw?: number;
};

/**
 * Place a vertex.
 *
 * @param document The document.
 * @param at Where the operator pressed, in world metres.
 * @param type The vertex type. The vendor's own default is
 *   {@link PATH_POINT_TYPE}.
 * @param options What else the operator stated about it.
 * @returns The document with the vertex last in `points`, and its new id.
 */
export function addPoint(
  document: SceneDocument,
  at: ScenePoint,
  type: RoadPointType,
  options: NewPointOptions = {},
): SceneEdit {
  if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) {
    return refuse("A vertex needs a finite position; this one had none.");
  }
  const rounded = roundedPoint(at);
  const label = options.defineType;
  const point: RoadPoint = {
    id: nextPointId(document),
    x: rounded.x,
    y: rounded.y,
    yaw: options.yaw ?? 0,
    type,
    ...(type === STATION_TYPE && label !== undefined && label !== "" ? { defineType: label } : {}),
  };
  return done({ ...document, points: [...document.points, point] }, point.id);
}

/**
 * Turn a vertex's facing.
 *
 * @param document The document.
 * @param id The vertex's vendor id.
 * @param yaw The heading in radians.
 * @returns The document, or the refusal.
 */
export function setPointYaw(document: SceneDocument, id: string, yaw: number): SceneEdit {
  if (pointById(document, id) === undefined) {
    return refuse(`Vertex ${id} is not in this scene.`);
  }
  if (!Number.isFinite(yaw)) {
    return refuse(`A heading must be a finite number of radians; vertex ${id} was given none.`);
  }
  return done({
    ...document,
    points: document.points.map((point) => (point.id === id ? { ...point, yaw } : point)),
  });
}

/**
 * Change a vertex between a station and a path point.
 *
 * A path point carries no label and no meaningful facing, so becoming one
 * DROPS both — stated here rather than left for the writer to notice, because
 * a path point that still carried a name would read as a station everywhere
 * the name is what identifies it.
 *
 * @param document The document.
 * @param id The vertex's vendor id.
 * @param type The vertex type.
 * @returns The document, or the refusal.
 */
export function setPointType(
  document: SceneDocument,
  id: string,
  type: RoadPointType,
): SceneEdit {
  const current = pointById(document, id);
  if (current === undefined) {
    return refuse(`Vertex ${id} is not in this scene.`);
  }
  if (current.type === type) {
    return done(document);
  }
  const next: RoadPoint =
    type === PATH_POINT_TYPE
      ? { id: current.id, x: current.x, y: current.y, yaw: 0, type }
      : { ...current, type };
  return done({
    ...document,
    points: document.points.map((point) => (point.id === id ? next : point)),
  });
}

/**
 * Name a station, or take its name away.
 *
 * @param document The document.
 * @param id The vertex's vendor id.
 * @param defineType The label; `""` removes the key entirely.
 * @returns The document, or the refusal.
 */
export function setPointLabel(
  document: SceneDocument,
  id: string,
  defineType: string,
): SceneEdit {
  const current = pointById(document, id);
  if (current === undefined) {
    return refuse(`Vertex ${id} is not in this scene.`);
  }
  if (current.type !== STATION_TYPE) {
    return refuse(
      `Vertex ${id} is a path point, which carries no name. Make it a station first — ` +
        "the two are different things to the chassis, not two spellings of one.",
    );
  }
  const trimmed = defineType.trim();
  const clash = document.points.find(
    (point) => point.id !== id && trimmed !== "" && point.defineType === trimmed,
  );
  if (clash !== undefined) {
    return refuse(`Station ${clash.id} is already named "${trimmed}".`);
  }
  const next: RoadPoint =
    trimmed === ""
      ? { id: current.id, x: current.x, y: current.y, yaw: current.yaw, type: current.type }
      : { ...current, defineType: trimmed };
  return done({
    ...document,
    points: document.points.map((point) => (point.id === id ? next : point)),
  });
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

/**
 * Join two vertices with a line.
 *
 * @param document The document.
 * @param src The source vertex's vendor id.
 * @param dst The destination vertex's vendor id.
 * @returns The document and the new line's key, or the refusal.
 */
export function addEdge(document: SceneDocument, src: string, dst: string): SceneEdit {
  const problem = edgeProblem(document, src, dst);
  if (problem !== null) {
    return refuse(problem);
  }
  const edge: RoadEdge = {
    id: newKey("edge", document.sequence),
    src,
    dst,
    oneWay: "0",
    single: "0",
  };
  return done(
    { ...document, edges: [...document.edges, edge], sequence: document.sequence + 1 },
    edge.id,
  );
}

/**
 * Set which way a line may be driven.
 *
 * @param document The document.
 * @param id The line's session key.
 * @param oneWay The direction rule.
 * @returns The document, or the refusal.
 */
export function setEdgeOneWay(document: SceneDocument, id: string, oneWay: OneWay): SceneEdit {
  if (edgeById(document, id) === undefined) {
    return refuse(`Line ${id} is not in this scene.`);
  }
  return done({
    ...document,
    edges: document.edges.map((edge) => (edge.id === id ? { ...edge, oneWay } : edge)),
  });
}

/**
 * Set how narrow a line is.
 *
 * @param document The document.
 * @param id The line's session key.
 * @param single The narrowness class.
 * @returns The document, or the refusal.
 */
export function setEdgeSingle(document: SceneDocument, id: string, single: Single): SceneEdit {
  if (edgeById(document, id) === undefined) {
    return refuse(`Line ${id} is not in this scene.`);
  }
  return done({
    ...document,
    edges: document.edges.map((edge) => (edge.id === id ? { ...edge, single } : edge)),
  });
}

/**
 * Split a line at a position: what "add a point to a way" means to a road
 * graph.
 *
 * The line becomes two lines meeting at a new path point, and both halves
 * inherit the original's `oneWay` and `single` — a corridor that was one-way
 * before an operator added a vertex to it is still one-way after, in the same
 * direction, because `src` order is preserved across the split.
 *
 * @param document The document.
 * @param id The line's session key.
 * @param at Where the new vertex goes, in world metres.
 * @returns The document and the new vertex's id, or the refusal.
 */
export function splitEdge(document: SceneDocument, id: string, at: ScenePoint): SceneEdit {
  const edge = edgeById(document, id);
  if (edge === undefined) {
    return refuse(`Line ${id} is not in this scene.`);
  }
  const placed = addPoint(document, at, PATH_POINT_TYPE);
  if (!placed.ok) {
    return placed;
  }
  const insertedId = placed.created;
  if (insertedId === null) {
    return refuse("A split needs a new vertex, and the allocator produced none.");
  }
  const first: RoadEdge = {
    id: newKey("edge", placed.document.sequence),
    src: edge.src,
    dst: insertedId,
    oneWay: edge.oneWay,
    single: edge.single,
  };
  const second: RoadEdge = {
    id: newKey("edge", placed.document.sequence + 1),
    src: insertedId,
    dst: edge.dst,
    oneWay: edge.oneWay,
    single: edge.single,
  };
  return done(
    {
      ...placed.document,
      edges: placed.document.edges.flatMap((candidate) =>
        candidate.id === id ? [first, second] : [candidate],
      ),
      sequence: placed.document.sequence + 2,
    },
    insertedId,
  );
}

// ---------------------------------------------------------------------------
// Keep-out entries and typed zones
// ---------------------------------------------------------------------------

/**
 * A run with its coincident neighbours collapsed and its coordinates rounded.
 *
 * Collapsing is what lets a double click end a run without leaving a
 * duplicate corner behind: the second of its two clicks lands on the first,
 * and two corners a millimetre apart are one corner.
 */
function preparedRun(points: readonly ScenePoint[]): readonly ScenePoint[] {
  const prepared: ScenePoint[] = [];
  for (const point of points) {
    const rounded = roundedPoint(point);
    const previous = prepared[prepared.length - 1];
    if (
      previous !== undefined &&
      Math.hypot(previous.x - rounded.x, previous.y - rounded.y) <= SAME_POINT_EPSILON_M
    ) {
      continue;
    }
    prepared.push(rounded);
  }
  const first = prepared[0];
  const last = prepared[prepared.length - 1];
  if (
    prepared.length > 2 &&
    first !== undefined &&
    last !== undefined &&
    Math.hypot(first.x - last.x, first.y - last.y) <= SAME_POINT_EPSILON_M
  ) {
    // A ring is CLOSED by being a ring, not by repeating its first corner.
    prepared.pop();
  }
  return prepared;
}

/**
 * Add a keep-out entry from a run the operator drew.
 *
 * Two points make a virtual wall and three or more a forbidden polygon; the
 * firmware stores both as the same list, so this is ONE operation and
 * {@link keepOutKindOf} reports which one the run turned out to be.
 *
 * @param document The document.
 * @param points The run, in world metres.
 * @returns The document and the new entry's key, or the refusal.
 */
export function addKeepOut(document: SceneDocument, points: readonly ScenePoint[]): SceneEdit {
  const run = preparedRun(points);
  const problem = runProblem(run);
  if (problem !== null) {
    return refuse(problem);
  }
  const area: KeepOutArea = { id: newKey("keepout", document.sequence), points: run };
  return done(
    { ...document, keepOuts: [...document.keepOuts, area], sequence: document.sequence + 1 },
    area.id,
  );
}

/**
 * Add a virtual wall: a keep-out entry of exactly two points.
 *
 * @param document The document.
 * @param from One end, in world metres.
 * @param to The other end, in world metres.
 * @returns The document and the new entry's key, or the refusal.
 */
export function addKeepOutWall(
  document: SceneDocument,
  from: ScenePoint,
  to: ScenePoint,
): SceneEdit {
  return addKeepOut(document, [from, to]);
}

/**
 * Add a forbidden polygon: a keep-out entry of three or more points.
 *
 * @param document The document.
 * @param points The ring, in world metres.
 * @returns The document and the new entry's key, or the refusal.
 */
export function addKeepOutPolygon(
  document: SceneDocument,
  points: readonly ScenePoint[],
): SceneEdit {
  const run = preparedRun(points);
  if (run.length < 3) {
    return refuse(
      `${KEEP_OUT_DEGENERATE_RULE}: a forbidden polygon needs 3 corners or more; this run ` +
        `holds ${String(run.length)}. Two points are a virtual wall — finish the run to make one.`,
    );
  }
  return addKeepOut(document, run);
}

/**
 * Add a typed zone from a run the operator drew.
 *
 * @param document The document.
 * @param type The zone type numeral.
 * @param points The run, in world metres.
 * @returns The document and the new zone's key, or the refusal.
 */
export function addSpliceArea(
  document: SceneDocument,
  type: string,
  points: readonly ScenePoint[],
): SceneEdit {
  const typeProblem = spliceTypeProblem(type);
  if (typeProblem !== null) {
    return refuse(typeProblem);
  }
  const run = preparedRun(points);
  const problem = runProblem(run);
  if (problem !== null) {
    return refuse(problem);
  }
  const area: SpliceArea = { id: newKey("splice", document.sequence), type, points: run };
  return done(
    {
      ...document,
      spliceAreas: [...document.spliceAreas, area],
      sequence: document.sequence + 1,
    },
    area.id,
  );
}

/**
 * Retype a zone.
 *
 * @param document The document.
 * @param id The zone's session key.
 * @param type The zone type numeral.
 * @returns The document, or the refusal.
 */
export function setSpliceAreaType(
  document: SceneDocument,
  id: string,
  type: string,
): SceneEdit {
  if (spliceAreaById(document, id) === undefined) {
    return refuse(`Zone ${id} is not in this scene.`);
  }
  const problem = spliceTypeProblem(type);
  if (problem !== null) {
    return refuse(problem);
  }
  return done({
    ...document,
    spliceAreas: document.spliceAreas.map((area) => (area.id === id ? { ...area, type } : area)),
  });
}

/** One entity's ring replaced, with the run validated before it is written. */
function withRing(
  document: SceneDocument,
  entityId: string,
  change: (points: readonly ScenePoint[]) => readonly ScenePoint[],
): SceneEdit {
  const held = ringOf(document, entityId);
  if (held === null) {
    return refuse(`Keep-out entry ${entityId} is not in this scene.`);
  }
  const next = change(held.points);
  const problem = runProblem(next);
  if (problem !== null) {
    return refuse(problem);
  }
  if (held.kind === "keep-out") {
    return done({
      ...document,
      keepOuts: document.keepOuts.map((area) =>
        area.id === entityId ? { ...area, points: next } : area,
      ),
    });
  }
  return done({
    ...document,
    spliceAreas: document.spliceAreas.map((area) =>
      area.id === entityId ? { ...area, points: next } : area,
    ),
  });
}

/**
 * Carry one corner of a keep-out entry or a zone to a new position.
 *
 * @param document The document.
 * @param entityId The entry's session key.
 * @param index Which corner.
 * @param at Its new world position.
 * @returns The document, or the refusal.
 */
export function moveRingVertex(
  document: SceneDocument,
  entityId: string,
  index: number,
  at: ScenePoint,
): SceneEdit {
  const held = ringOf(document, entityId);
  if (held === null) {
    return refuse(`Keep-out entry ${entityId} is not in this scene.`);
  }
  if (held.points[index] === undefined) {
    return refuse(
      `Keep-out entry ${entityId} has no corner ${String(index)} — it holds ` +
        `${String(held.points.length)}.`,
    );
  }
  return withRing(document, entityId, (points) =>
    points.map((point, at_) => (at_ === index ? { x: at.x, y: at.y } : point)),
  );
}

/**
 * Add a corner to a keep-out entry or a zone, part-way along one of its sides.
 *
 * A wall has two sides in the closed-ring reading the geometry kernel uses, so
 * adding a corner to one turns it into a three-point area. That is the honest
 * outcome — the firmware stores both as the same list of points, and a wall
 * with a corner in the middle IS an area.
 *
 * @param document The document.
 * @param entityId The entry's session key.
 * @param edgeIndex Which side, as the ring geometry numbers them.
 * @param at Where the new corner goes, in world metres.
 * @returns The document, or the refusal.
 */
export function insertRingVertex(
  document: SceneDocument,
  entityId: string,
  edgeIndex: number,
  at: ScenePoint,
): SceneEdit {
  const held = ringOf(document, entityId);
  if (held === null) {
    return refuse(`Keep-out entry ${entityId} is not in this scene.`);
  }
  if (edgeIndex < 0 || edgeIndex >= held.points.length) {
    return refuse(
      `Keep-out entry ${entityId} has no side ${String(edgeIndex)} — it holds ` +
        `${String(held.points.length)}.`,
    );
  }
  const inserted = roundedPoint(at);
  return withRing(document, entityId, (points) => [
    ...points.slice(0, edgeIndex + 1),
    inserted,
    ...points.slice(edgeIndex + 1),
  ]);
}

/**
 * Remove one corner of a keep-out entry or a zone.
 *
 * Refused when it would leave fewer than two corners: the firmware has no
 * reading for an entry of one point, so emptying an entry out corner by corner
 * has to become {@link removeMany} of the whole entry — a decision the
 * operator states. Three corners down to two is allowed and turns the polygon
 * back into a wall, which is the same rule read the other way.
 *
 * @param document The document.
 * @param entityId The entry's session key.
 * @param index Which corner.
 * @returns The document, or the refusal.
 */
export function removeRingVertex(
  document: SceneDocument,
  entityId: string,
  index: number,
): SceneEdit {
  const held = ringOf(document, entityId);
  if (held === null) {
    return refuse(`Keep-out entry ${entityId} is not in this scene.`);
  }
  if (held.points[index] === undefined) {
    return refuse(
      `Keep-out entry ${entityId} has no corner ${String(index)} — it holds ` +
        `${String(held.points.length)}.`,
    );
  }
  return withRing(document, entityId, (points) =>
    points.filter((_point, at) => at !== index),
  );
}

// ---------------------------------------------------------------------------
// Removal, as one edit
// ---------------------------------------------------------------------------

/**
 * Remove a set of elements as ONE edit, or refuse the whole set.
 *
 * All-or-nothing on purpose. A delete that took the four targets it could and
 * silently left the fifth would be the quiet degradation this workspace
 * refuses; the operator gets one reason and a document that still says what it
 * said.
 *
 * Vertices cascade: removing one takes every line that ended on it, which is
 * what a road graph means by removing a place. Ring corners are removed from
 * the highest index down, so the indices in the set stay the ones the caller
 * named.
 *
 * @param document The document.
 * @param refs What to remove.
 * @returns The document, or the first refusal.
 */
export function removeMany(document: SceneDocument, refs: readonly SceneRef[]): SceneEdit {
  if (refs.length === 0) {
    return refuse("Nothing was selected, so there is nothing to remove.");
  }
  const gonePoints = new Set(refs.flatMap((ref) => (ref.kind === "point" ? [ref.id] : [])));
  const goneEdges = new Set(refs.flatMap((ref) => (ref.kind === "edge" ? [ref.id] : [])));
  const goneKeepOuts = new Set(refs.flatMap((ref) => (ref.kind === "keep-out" ? [ref.id] : [])));
  const goneSplices = new Set(refs.flatMap((ref) => (ref.kind === "splice" ? [ref.id] : [])));

  for (const id of gonePoints) {
    if (pointById(document, id) === undefined) {
      return refuse(`Vertex ${id} is not in this scene.`);
    }
  }
  for (const id of goneEdges) {
    if (edgeById(document, id) === undefined) {
      return refuse(`Line ${id} is not in this scene.`);
    }
  }
  for (const id of goneKeepOuts) {
    if (keepOutById(document, id) === undefined) {
      return refuse(`Keep-out entry ${id} is not in this scene.`);
    }
  }
  for (const id of goneSplices) {
    if (spliceAreaById(document, id) === undefined) {
      return refuse(`Zone ${id} is not in this scene.`);
    }
  }

  let next: SceneDocument = {
    ...document,
    points: document.points.filter((point) => !gonePoints.has(point.id)),
    edges: document.edges.filter(
      (edge) =>
        !goneEdges.has(edge.id) && !gonePoints.has(edge.src) && !gonePoints.has(edge.dst),
    ),
    keepOuts: document.keepOuts.filter((area) => !goneKeepOuts.has(area.id)),
    spliceAreas: document.spliceAreas.filter((area) => !goneSplices.has(area.id)),
  };

  const vertexRefs = refs.flatMap((ref) => (ref.kind === "ring-vertex" ? [ref] : []));
  const byEntity = new Map<string, number[]>();
  for (const ref of vertexRefs) {
    if (goneKeepOuts.has(ref.entityId) || goneSplices.has(ref.entityId)) {
      // The whole entry is going; its corners are not a second decision.
      continue;
    }
    byEntity.set(ref.entityId, [...(byEntity.get(ref.entityId) ?? []), ref.index]);
  }
  for (const [entityId, indices] of byEntity) {
    const descending = [...new Set(indices)].sort((a, b) => b - a);
    for (const index of descending) {
      const step = removeRingVertex(next, entityId, index);
      if (!step.ok) {
        return step;
      }
      next = step.document;
    }
  }
  return done(next);
}

/**
 * Move a set of points as ONE edit, or refuse the whole set.
 *
 * One gesture is one undo step, so a drag that carried a station, a path point
 * and a keep-out corner writes one document and not three.
 *
 * @param document The document.
 * @param moves Where each point went.
 * @returns The document, or the first refusal.
 */
export function moveMany(document: SceneDocument, moves: readonly SceneMove[]): SceneEdit {
  if (moves.length === 0) {
    return refuse("A move needs at least one point to carry.");
  }
  const pointMoves = moves.flatMap((move) => (move.kind === "point" ? [move] : []));
  for (const move of pointMoves) {
    if (pointById(document, move.id) === undefined) {
      return refuse(`Vertex ${move.id} is not in this scene.`);
    }
    if (!Number.isFinite(move.at.x) || !Number.isFinite(move.at.y)) {
      return refuse(`Vertex ${move.id} was moved to a position that is not a finite point.`);
    }
  }
  let next: SceneDocument = {
    ...document,
    points: document.points.map((point) => {
      const move = pointMoves.find((candidate) => candidate.id === point.id);
      return move === undefined ? point : { ...point, x: move.at.x, y: move.at.y };
    }),
  };
  for (const move of moves) {
    if (move.kind !== "ring-vertex") {
      continue;
    }
    const step = moveRingVertex(next, move.entityId, move.index, move.at);
    if (!step.ok) {
      return step;
    }
    next = step.document;
  }
  return done(next);
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** The name a row, a readout and a map label all use for one vertex. */
export function pointLabel(point: RoadPoint): string {
  if (point.defineType !== undefined && point.defineType !== "") {
    return point.defineType;
  }
  return `${isStationType(point.type) ? "station" : "point"} ${point.id}`;
}

/** The name a row and a readout use for one line. */
export function edgeLabel(document: SceneDocument, edge: RoadEdge): string {
  const from = pointById(document, edge.src);
  const to = pointById(document, edge.dst);
  const arrow = edge.oneWay === "0" ? "↔" : edge.oneWay === "1" ? "→" : "←";
  return `${from === undefined ? edge.src : pointLabel(from)} ${arrow} ${
    to === undefined ? edge.dst : pointLabel(to)
  }`;
}

/** The name a row and a readout use for one keep-out entry. */
export function keepOutLabel(area: KeepOutArea, index: number): string {
  const kind = keepOutKindOf(area.points) === "wall" ? "wall" : "polygon";
  return `keep-out ${kind} ${String(index + 1)} (${String(area.points.length)} pts)`;
}

/** The name a row and a readout use for one typed zone. */
export function spliceAreaLabel(area: SpliceArea, index: number): string {
  return `${spliceAreaTypeLabel(area.type)} ${String(index + 1)} (${String(
    area.points.length,
  )} pts)`;
}

/** The centre of a run's bounding box: where a zone's own name is drawn. */
export function runCentre(points: readonly ScenePoint[]): ScenePoint | null {
  const first = points[0];
  if (first === undefined) {
    return null;
  }
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/**
 * The side of a ring an "add a corner" control should act on, and where.
 *
 * The LONGEST side, and its midpoint. A contextual control has to name one
 * side without the operator pointing at it, and the longest side is both the
 * one with the most room for a new corner and a choice that does not move
 * while the pointer does — a rule that read the pointer would make the same
 * button mean something different on every frame.
 *
 * Sides are numbered as the ring geometry numbers them: side `i` runs from
 * corner `i` to corner `(i + 1) % n`, so a two-point run has two sides (out
 * and back) and adding a corner to either makes it a three-point area.
 *
 * @param points The ring.
 * @returns The side index and its midpoint, or null for a run with no side.
 */
export function widestRingSide(
  points: readonly ScenePoint[],
): { readonly edgeIndex: number; readonly at: ScenePoint } | null {
  if (points.length < 2) {
    return null;
  }
  let best: { readonly edgeIndex: number; readonly at: ScenePoint; readonly span: number } | null =
    null;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    if (a === undefined || b === undefined) {
      continue;
    }
    const span = Math.hypot(a.x - b.x, a.y - b.y);
    if (best === null || span > best.span) {
      best = { edgeIndex: index, at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, span };
    }
  }
  return best === null ? null : { edgeIndex: best.edgeIndex, at: best.at };
}

/**
 * The midpoint of a line, in world metres: where an "add a point to this line"
 * control puts its vertex.
 *
 * @param document The document.
 * @param id The line's session key.
 * @returns The midpoint, or null when either end is missing.
 */
export function edgeMidpoint(document: SceneDocument, id: string): ScenePoint | null {
  const edge = edgeById(document, id);
  if (edge === undefined) {
    return null;
  }
  const from = pointById(document, edge.src);
  const to = pointById(document, edge.dst);
  if (from === undefined || to === undefined) {
    return null;
  }
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}
