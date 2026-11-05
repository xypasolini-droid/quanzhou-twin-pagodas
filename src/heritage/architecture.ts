import * as THREE from "three";
import { HeritageBuilder, type Point } from "./builder";
import type { SurfaceName } from "./materials";

/** Photo-informed exterior study of the Kaiyuan Temple stone pagodas.
 * Elevations are display units, not surveyed metres. Heights retain the
 * official 48.27 : 45.06 ratio; the inter-tower distance is compressed.
 * The low reliefs are an abstract interpretation, not copies of 160 icons.
 */
export const TOWERS = {
  west: { x: -17, height: 33 * 45.06 / 48.27, name: "仁寿塔" },
  east: { x: 17, height: 33, name: "镇国塔" },
} as const;
const H = Math.PI / 8;
const C = Math.cos(H);
const TAN = Math.tan(H);
const FLOOR_Y = [.86, 5.98, 10.68, 15.20, 19.48];
// First-floor apothem follows the published 46.40 m octagonal perimeter.
const WALL_A = [4.787, 4.60, 4.39, 4.18, 3.98];
const WALL_H = [3.55, 3.04, 2.86, 2.62, 2.08];
const EAVE_Y = [5.70, 10.40, 14.92, 19.20, 22.78];
const noise = (n: number) => { const x = Math.sin(n * 127.1 + 78.23) * 43758.5453; return x - Math.floor(x); };
const face = (x: number, y: number, z: number, a: number): Point => [x * Math.cos(a) + z * Math.sin(a), y, z * Math.cos(a) - x * Math.sin(a)];

class StoneTower {
  constructor(readonly b: HeritageBuilder, readonly east: boolean, readonly pedestal = false) {}
  get x() { return this.east ? 17 : -17; }
  get sy() { return this.east ? 1 : 45.06 / 48.27; }
  get sx() { return this.east ? 1 : this.pedestal ? 60.8 / 60 : 44.48 / 46.4; }
  point(p: Point): Point { return [this.x + p[0] * this.sx, p[1] * this.sy, p[2] * this.sx]; }
  add(g: THREE.BufferGeometry, m: SurfaceName, t: number, p: Point = [0, 0, 0], a = 0, options: { shade?: number; duration?: number; lift?: number; s?: Point; tint?: Point } = {}) {
    const s = options.s ?? [1, 1, 1];
    this.b.add(g, m, t, { p: this.point(p), r: [0, a, 0], s: [s[0] * this.sx, s[1] * this.sy, s[2] * this.sx], shade: options.shade ?? 1, tint: options.tint, duration: options.duration ?? .012, lift: (options.lift ?? .28) * this.sy });
  }
  box(size: Point, p: Point, m: SurfaceName, t: number, a = 0, shade = 1, lift = .25) {
    // Small masonry courses retain real joints without paying for 44-triangle bevels.
    if (size[1] < .33 || Math.min(...size) < .20) {
      const g = this.b.geo("kaiyuan-simple-block", () => new THREE.BoxGeometry(1, 1, 1));
      this.add(g, m, t, p, a, { s: size, shade, duration: .011, lift });
    } else {
      this.b.box([size[0] * this.sx, size[1] * this.sy, size[2] * this.sx], this.point(p), m, t, { r: [0, a, 0], shade, duration: .011, lift: lift * this.sy });
    }
  }
  atFace(size: Point, u: number, y: number, radius: number, a: number, m: SurfaceName, t: number, shade = 1) {
    this.box(size, face(u, y, radius, a), m, t, a, shade);
  }
  ellipsoid(p: Point, size: Point, m: SurfaceName, t: number, a = 0, shade = 1) {
    const sphere = this.b.geo("kaiyuan-relief-sphere", () => new THREE.SphereGeometry(1, 10, 7));
    this.add(sphere, m, t, p, a, { s: size, shade, lift: .15 });
  }
  tube(points: Point[], r: number, m: SurfaceName, t: number, segments = 8) {
    this.b.tube(points.map(p => this.point(p)), r * this.sx, m, t, { duration: .012, lift: .15 * this.sy }, segments);
  }
  ring(radius: number, y: number, height: number, m: SurfaceName, t: number, top = radius, shade = 1) {
    const g = this.b.geo(`kaiyuan-oct:${radius}:${height}:${top}`, () => {
      const g = new THREE.CylinderGeometry(top, radius, height, 8, 1, false, H);
      return g;
    });
    this.add(g, m, t, [0, y, 0], 0, { shade, lift: .18 });
  }
}

function band(q: StoneTower, a: number, y: number, h: number, m: SurfaceName, t: number, blocks = 4) {
  const width = 2 * a * TAN;
  for (let side = 0; side < 8; side++) {
    const angle = side * Math.PI / 4;
    for (let i = 0; i < blocks; i++) {
      const u = (i + .5) * width / blocks - width / 2;
      q.atFace([width / blocks - .012, h, .54], u, y, a - .12, angle, m, t + i * .0003 + side * .0001, .95 + noise(side * 7 + i) * .08);
    }
  }
}

function relief(q: StoneTower, a: number, u: number, y: number, radius: number, t: number, seed: number, size = 1) {
  // Distinct silhouettes are informed by the Quanzhou Heritage photographs:
  // armoured guardians, scripture-holding monks, haloed robes and staff bearers.
  // Placement/identity is interpretive, not an iconographic survey.
  const s = size, w = .66 * s, h = 1.72 * s, level = Math.floor(seed / 16), index = seed % 16;
  const pose = q.east ? (level === 0 ? "guardian" : level < 3 ? "monk" : "bodhisattva")
    : level === 1 ? "guardian" : level === 3 && index === 0 ? "staff" : level === 3 && index === 1 ? "prince" : level >= 3 ? "bodhisattva" : "monk";
  const variant = index % 3;
  const p = (x: number, yy: number, z = .20): Point => face(u + x * s, y + yy * s, radius + z * s, a);
  const line = (points: [number, number][], depth = .23, thickness = .013, material: SurfaceName = "jade") =>
    q.tube(points.map(([x, yy]) => p(x, yy, depth)), thickness * s, material, t + .005, Math.max(3, points.length + 1));
  q.atFace([w + .14, h + .14, .07], u, y + h / 2, radius, a, "jade", t, .93);
  q.atFace([w, h, .08], u, y + h / 2, radius + .052, a, "plaster", t, .98 + noise(seed) * .05);
  // Hairline moulding surrounding each relief panel.
  for (const sign of [-1, 1]) q.atFace([.035, h + .06, .035], u + sign * (w / 2 + .035), y + h / 2, radius + .115, a, "stone", t + .001, 1.06);
  const body = q.b.geo(`kaiyuan-sculpted-${pose}-${variant}`, () => {
    const shape = new THREE.Shape();
    if (pose === "guardian" || pose === "prince") {
      shape.moveTo(-.12, .13);shape.lineTo(-.25, .29);shape.lineTo(-.30, .69);shape.lineTo(-.22, 1.04);
      shape.quadraticCurveTo(-.35, 1.15, -.23, 1.27);shape.lineTo(-.10, 1.36);shape.lineTo(.12, 1.36);
      shape.lineTo(.28, 1.22);shape.quadraticCurveTo(.34, 1.10, .23, 1.02);shape.lineTo(.29, .68);
      shape.lineTo(.24, .27);shape.lineTo(.12, .13);shape.lineTo(.06, .53);shape.lineTo(-.06, .53);shape.closePath();
    } else if (pose === "staff") {
      shape.moveTo(-.23, .10);shape.lineTo(-.16, .56);shape.lineTo(-.23, .85);shape.lineTo(-.14, 1.32);
      shape.lineTo(.08, 1.36);shape.lineTo(.25, 1.10);shape.lineTo(.19, .70);shape.lineTo(.26, .28);
      shape.lineTo(.16, .13);shape.lineTo(.03, .56);shape.lineTo(-.04, .51);shape.lineTo(-.08, .08);shape.closePath();
    } else {
      shape.moveTo(-.29, .12);shape.quadraticCurveTo(-.20, .60, -.16, 1.20);
      shape.lineTo(-.09, 1.36);shape.lineTo(.10, 1.36);shape.lineTo(.20, 1.20);
      shape.quadraticCurveTo(.24, .57, .30, .13);shape.quadraticCurveTo(.08, .05, -.04, .11);
      shape.quadraticCurveTo(-.16, .02, -.29, .12);shape.closePath();
    }
    return new THREE.ExtrudeGeometry(shape, { depth: .10, bevelEnabled: true, bevelThickness: .018, bevelSize: .018, bevelSegments: 1, curveSegments: 3 });
  });
  q.add(body, "stone", t + .002, p(0, 0, .105), a, { s: [s, s, s], lift: .15, shade: 1.045 });
  const headX = pose === "staff" ? -.075 : 0;
  q.ellipsoid(p(headX, 1.50, .20), [.115 * s, .15 * s, .075 * s], "stone", t + .003, a, 1.07);
  q.ellipsoid(p(headX + (pose === "staff" ? -.065 : 0), 1.47, .275), [.043 * s, .04 * s, .037 * s], "plaster", t + .004, a, 1.02);
  // Shallow brows, eyes and mouth become legible when the relief camera approaches.
  for (const sign of [-1, 1]) line([[headX + sign * .025, 1.525], [headX + sign * .068, 1.53]], .275, .008);
  line([[headX - .035, 1.415], [headX + .035, 1.415]], .272, .008);
  if (pose === "monk" || pose === "bodhisattva") {
    const halo = q.b.geo("kaiyuan-relief-halo", () => new THREE.TorusGeometry(.215, .012, 4, 18));
    q.add(halo, "plaster", t + .001, p(0, 1.48, .13), a, { s: [s, s * 1.13, s], shade: 1.04, lift: .1 });
  }
  if (pose === "guardian" || pose === "prince") {
    // Crown, cuirass, scalloped skirt and a held weapon: broad, weighty poses.
    line([[-.13, 1.60], [-.10, 1.68], [0, 1.73], [.10, 1.68], [.13, 1.60]], .21, .024, "stone");
    for (const yy of [.73, .89, 1.07]) line([[-.20, yy + .03], [0, yy - .04], [.20, yy + .03]], .225, .018);
    for (const x of [-.14, -.07, 0, .07, .14]) line([[x, .28], [x * 1.24, .59]], .225, .010);
    if (variant === 1) {
      line([[-.21, 1.21], [-.29, 1.42], [-.21, 1.58]], .25, .042, "stone");
      line([[.22, 1.20], [.24, .98], [.05, .93]], .25, .042, "stone");
      line([[-.23, 1.54], [.12, .43]], .29, .021, "stone");
    } else {
      line([[-.24, 1.17], [-.19, .99], [.09, .91]], .25, .043, "stone");
      line([[.24, 1.17], [.15, .98], [-.04, .88]], .27, .043, "stone");
      line([[0, .18], [.01, 1.10]], .29, .025, "stone");
    }
    for (const sign of [-1, 1]) line([[sign * .21, 1.29], [sign * .31, 1.50], [sign * .25, 1.63]], .16, .014, "stone");
  } else if (pose === "staff") {
    // A long diagonal staff and stepped feet evoke the documented traveller pose.
    line([[-.24, .08], [.20, 1.66]], .29, .022, "stone");
    line([[-.20, 1.20], [-.10, .94], [.08, 1.07]], .25, .040, "stone");
    line([[.18, 1.17], [.12, .80], [-.03, .73]], .26, .040, "stone");
    line([[-.20, .39], [-.06, .64], [.15, .48]], .23, .014);
  } else {
    // Deep curved sleeve edges, diagonal folds and two different hand positions.
    for (const sign of [-1, 1]) line([[sign * .14, 1.27], [sign * .09, .86], [sign * .18, .39], [sign * .26, .16]], .225, .018);
    for (const x of [-.08, 0, .08]) line([[x, .19], [x * .70, .57], [x + .03, .88]], .223, .010);
    line([[-.11, 1.30], [.13, 1.00], [-.03, .75]], .226, .014);
    if (pose === "bodhisattva" && variant !== 2) {
      line([[-.17, 1.19], [-.23, 1.34], [-.20, 1.48]], .25, .036, "stone");
      line([[.19, 1.19], [.18, .94], [-.02, 1.01]], .25, .037, "stone");
      // Two tiny lotus pedestals beneath the feet, visible in the Guanyin reference.
      for (const sign of [-1, 1]) q.ellipsoid(p(sign * .12, .095, .19), [.13 * s, .055 * s, .07 * s], "plaster", t + .006, a, 1.04);
    } else {
      line([[-.19, 1.18], [-.17, .94], [.02, .98]], .25, .035, "stone");
      line([[.20, 1.17], [.17, .96], [.04, 1.03]], .26, .035, "stone");
      q.atFace([.14 * s, .36 * s, .07 * s], u + .05 * s, y + 1.02 * s, radius + .30 * s, a, "plaster", t + .006, 1.04);
    }
  }
  for (const sign of [-1, 1]) q.atFace([.17 * s, .075 * s, .13 * s], u + sign * .12 * s, y + .07 * s, radius + .18 * s, a, "stone", t + .003);
}

function carvedPanel(q: StoneTower, a: number, u: number, y: number, r: number, width: number, t: number) {
  const flower = q.b.geo("kaiyuan-panel-flower", () => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 24; i++) { const theta = i / 24 * Math.PI * 2, radius = .085 + .035 * Math.cos(theta * 4);const x = Math.cos(theta) * radius, yy = Math.sin(theta) * radius;if (i === 0) shape.moveTo(x, yy);else shape.lineTo(x, yy); }
    return new THREE.ExtrudeGeometry(shape, { depth: .018, bevelEnabled: false });
  });
  q.add(flower, "stone", t + .001, face(u, y, r, a), a, { shade: .97, lift: .10 });
  for (const sign of [-1, 1]) {
    const pts: Point[] = [];
    for (let j = 0; j <= 8; j++) { const v = j / 8;pts.push(face(u + sign * (.10 + v * Math.min(.40, width * .32)), y + Math.sin(v * Math.PI * 2) * .055, r + .018, a)); }
    q.tube(pts, .013, "stone", t + .002, 8);
  }
}

function foundation(q: StoneTower) {
  // Double moulded Xumi pedestal: broad foot, recessed waist and upper slab.
  q.ring(6.70, .06, .12, "jade", .008, 6.70, .95);
  q.ring(6.52, .19, .14, "stone", .016, 6.42);
  q.ring(6.42, .33, .14, "plaster", .022, 6.19);
  q.ring(6.18, .48, .16, "stone", .031, 6.18);
  q.ring(6.27, .62, .12, "plaster", .043, 6.48);
  q.ring(6.57, .76, .16, "stone", .052, 6.57);
  for (let side = 0; side < 8; side++) {
    const a = side * Math.PI / 4, width = 2 * 5.72 * TAN;
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) * width / 5;
      q.atFace([width / 5 - .055, .16, .10], u, .48, 5.75, a, "jade", .034 + i * .001, .98);
      // A relief band stands for the distinct narrative/floral pedestal carvings.
      carvedPanel(q, a, u, .49, 5.82, width / 5 - .08, .036);
    }
    // Eight crouched corner atlantes carry the projecting upper moulding.
    const ca = a + H, at = (x: number, yy: number, z = 6.35) => face(x, yy, z, ca);
    q.ellipsoid(at(0, .44), [.13, .12, .11], "stone", .041, ca, .98);
    q.ellipsoid(at(0, .57, 6.39), [.085, .085, .06], "plaster", .042, ca);
    for (const sign of [-1, 1]) {
      q.tube([at(sign * .09, .50), at(sign * .18, .55), at(sign * .19, .65)], .040, "stone", .043, 3);
      q.tube([at(sign * .06, .40), at(sign * .16, .33), at(sign * .20, .37)], .047, "stone", .043, 3);
    }
    // Double overlapping lotus petals give the Xumi base its scalloped profile.
    const petal = q.b.geo("kaiyuan-base-lotus-petal", () => {
      const sh = new THREE.Shape();sh.moveTo(-.095, 0);sh.quadraticCurveTo(-.10, .09, 0, .15);sh.quadraticCurveTo(.10, .09, .095, 0);sh.closePath();
      return new THREE.ExtrudeGeometry(sh, { depth: .035, bevelEnabled: false, curveSegments: 3 });
    });
    for (let i = 0; i < 20; i++) {
      const u = (i + .5) * width / 20 - width / 2;
      q.add(petal, "plaster", .027 + i * .0001, face(u, .255, 5.98, a), a, { shade: .95, lift: .12 });
      q.add(petal, "stone", .045 + i * .0001, face(u, .56, 5.91, a), a, { s: [1, .65, 1], shade: 1.04, lift: .12 });
    }
  }
  // Front / back stone staircases, visible full geometry.
  for (const a of [0, Math.PI]) {
    for (let step = 0; step < 4; step++) {
      const h = (step + 1) * .21;
      q.atFace([2.25, h, .48], 0, h / 2, 7.45 - step * .43, a, "stone", .017 + step * .007);
    }
    for (const side of [-1, 1]) {
      const start = face(side * 1.26, .22, 7.70, a), end = face(side * 1.26, 1.05, 6.04, a);
      const mid: Point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
      const length = Math.hypot(end[1] - start[1], end[2] - start[2], end[0] - start[0]);
      const g = q.b.geo("stair-cheek", () => new THREE.BoxGeometry(.19, .26, 1));
      const gv = g.clone();gv.scale(1, 1, length);gv.rotateX(a === 0 ? Math.atan2(end[1] - start[1], start[2] - end[2]) : -Math.atan2(end[1] - start[1], end[2] - start[2]));
      q.add(gv, "plaster", .07, mid, 0);gv.dispose();
    }
  }
  railing(q, .84, 5.98, .064, true);
}

function railing(q: StoneTower, y: number, radius: number, t: number, ground = false) {
  const w = radius * TAN * 2;
  for (let side = 0; side < 8; side++) {
    const a = side * Math.PI / 4;
    const divided = ground ? 4 : 3;
    for (let i = 0; i < divided; i++) {
      const u = -w / 2 + (i + .5) * w / divided;
      if (ground && (side === 0 || side === 4) && Math.abs(u) < 1.25) continue;
      const length = w / divided - .14;
      if (!ground) {
        q.atFace([length, .44, .15], u, y + .27, radius, a, "stone", t + .002, 1);
        q.atFace([length - .12, .28, .017], u, y + .27, radius + .085, a, "plaster", t + .003, .96);
        carvedPanel(q, a, u, y + .27, radius + .099, length - .12, t + .004);
      }
      q.atFace([length + .08, .12, .19], u, y + .65, radius, a, "plaster", t + .004);
      if (ground) q.atFace([length, .10, .14], u, y + .22, radius, a, "stone", t + .002);
    }
    for (let i = 0; i < divided; i++) {
      const u = -w / 2 + i * w / divided;
      if (ground && (side === 0 || side === 4) && Math.abs(u) < 1.08) continue;
      q.atFace([.19, .83, .21], u, y + .40, radius, a, "stone", t, 1.02);
      q.atFace([.24, .075, .25], u, y + .65, radius, a, "plaster", t + .002);
      q.atFace([.23, .09, .24], u, y + .85, radius, a, "stone", t + .004);
    }
  }
}

function doorArch(q: StoneTower, a: number, y: number, r: number, radius: number, spring: number, t: number) {
  const segments = 11;
  for (let i = 0; i < segments; i++) {
    const t0 = i * Math.PI / segments + .008, t1 = (i + 1) * Math.PI / segments - .008;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r + .18, t0, t1, false);
    shape.absarc(0, 0, r, t1, t0, true);shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: .60, bevelEnabled: false, curveSegments: 3 });g.translate(0, 0, -.30);
    q.add(g, "plaster", t + i * .0004, face(0, y + spring, radius, a), a, { shade: .95 + noise(i + a) * .07 });g.dispose();
  }
  for (const sign of [-1, 1]) {
    const rows = Math.ceil(spring / .31);
    for (let row = 0; row < rows; row++) q.atFace([.18, spring / rows - .008, .61], sign * (r + .09), y + (row + .5) * spring / rows, radius, a, "plaster", t - .025 + row * .002);
  }
  // Incised concentric bead line and plinths finish the dressed arch stones.
  const bead: Point[] = [];
  for (let i = 0; i <= 16; i++) { const theta = i / 16 * Math.PI;bead.push(face((r + .135) * Math.cos(theta), y + spring + (r + .135) * Math.sin(theta), radius + .311, a)); }
  q.tube(bead, .012, "jade", t + .006, 16);
  for (const sign of [-1, 1]) {
    q.atFace([.26, .15, .68], sign * (r + .09), y + .075, radius, a, "plaster", t - .024, 1.02);
    q.tube([face(sign * (r + .135), y + .15, radius + .311, a), face(sign * (r + .135), y + spring, radius + .311, a)], .011, "jade", t + .006, 2);
  }
  // A lintel behind the curved arch follows the photographed rectangular door.
  q.atFace([r * 1.85, .17, .30], 0, y + spring - .10, radius - .17, a, "jade", t + .002, .91);
}

function wallStorey(q: StoneTower, level: number, t: number) {
  const base = FLOOR_Y[level], aWall = WALL_A[level], height = WALL_H[level];
  const rows = level === 0 ? 12 : 10;
  const course = height / rows, width = aWall * TAN * 2;
  const rDoor = level === 0 ? .54 : .48, spring = level === 0 ? 1.72 : 1.47;
  // Core + floor plates give each level a support path, including intermediate poses.
  q.ring(aWall / C - .23, base - .075, .20, "stone", t, aWall / C - .23);
  for (let row = 0; row < rows; row++) {
    q.ring(1.33, base + (row + .5) * course, course - .008, "jade", t + .006 + row * .006, 1.33, .92);
  }
  for (let side = 0; side < 8; side++) {
    const angle = side * Math.PI / 4;
    const isDoor = side % 2 === level % 2;
    const openingBottom = isDoor ? 0 : .95;
    const openingTop = isDoor ? spring + rDoor : 1.83;
    const gapAt = (localY: number) => {
      if (localY < openingBottom || localY > openingTop) return 0;
      if (!isDoor) return .46;
      return localY <= spring ? rDoor : Math.sqrt(Math.max(0, rDoor * rDoor - (localY - spring) ** 2));
    };
    for (let row = 0; row < rows; row++) {
      const localY = (row + .5) * course;
      // Respect the highest point of the arch throughout the whole stone course.
      const gap = Math.max(gapAt(row * course + .01), gapAt((row + 1) * course - .01), gapAt(localY));
      const intervals: [number, number][] = gap > 0 ? [[-width / 2, -gap], [gap, width / 2]] : [[-width / 2, width / 2]];
      for (const [left, right] of intervals) {
        const count = Math.max(1, Math.ceil((right - left) / .79));
        const w = (right - left) / count;
        for (let col = 0; col < count; col++) {
          q.atFace([w - .012, course - .013, .56], left + (col + .5) * w, base + localY, aWall - .14, angle, "stone", t + .009 + row * .006 + col * .00025 + side * .00012, .94 + noise(level * 83 + row * 13 + col * 7 + side) * .11);
        }
      }
    }
    if (isDoor) {
      doorArch(q, angle, base, rDoor, aWall - .10, spring, t + .071);
      // Recessed gate slats only at ground entries, set behind the genuine opening.
      if (level === 0) {
        for (let bar = 0; bar < 7; bar++) q.atFace([.055, 1.52, .065], (bar - 3) * .135, base + .76, aWall - .45, angle, "bronze", t + .076, .80);
        q.atFace([rDoor * 2, .08, .07], 0, base + 1.45, aWall - .45, angle, "wood", t + .076);
      }
    } else {
      // Niches are shallow recesses with a dark rear surface, not holes through the core.
      q.atFace([.91, .91, .055], 0, base + 1.39, aWall - .45, angle, "recess", t + .070, 1);
      for (const sign of [-1, 1]) q.atFace([.13, 1.06, .61], sign * .52, base + 1.39, aWall - .13, angle, "plaster", t + .073);
      q.atFace([1.16, .16, .61], 0, base + 1.91, aWall - .13, angle, "plaster", t + .077);
      q.atFace([1.16, .14, .61], 0, base + .91, aWall - .13, angle, "plaster", t + .072);
    }
    const reliefY = base + (level === 0 ? .66 : .54);
    const reliefS = level === 0 ? 1.04 : .88;
    for (const sign of [-1, 1]) relief(q, angle, sign * (width * .33), reliefY, aWall + .16, t + .083, side * 2 + (sign + 1) / 2 + level * 16, reliefS);
    q.atFace([width - .10, .13, .16], 0, base + .36, aWall + .10, angle, "plaster", t + .080);
    q.atFace([width - .08, .20, .59], 0, base + height - .11, aWall - .08, angle, "jade", t + .087, .96);
    // Octagonal corner pilasters are built from courses, aligned with the walls.
    const corner = face(width / 2, 0, aWall, angle);
    // Three stone shaft sections with an inverted-bowl foot and projecting cap.
    for (let row = 0; row < 3; row++) {
      const h = height / 3;
      q.box([.30, h - .015, .30], [corner[0], base + (row + .5) * h, corner[2]], "plaster", t + .009 + row * .026, angle + H, .97 + noise(row) * .05);
    }
    const foot = q.b.geo("kaiyuan-column-foot", () => new THREE.CylinderGeometry(.17, .26, .18, 8));
    q.add(foot, "stone", t + .004, [corner[0], base + .09, corner[2]], angle + H, { shade: 1.03 });
    q.box([.45, .16, .45], [corner[0], base + height - .09, corner[2]], "plaster", t + .084, angle + H);
  }
  if (level > 0) railing(q, base + .15, aWall + .57, t + .079);
}

function brackets(q: StoneTower, level: number, start: number) {
  const aWall = WALL_A[level], y = FLOOR_Y[level] + WALL_H[level];
  const width = 2 * aWall * TAN;
  // The central octagonal core continues through the bracket band, carrying
  // the next storey's stone deck rather than leaving a hovering upper floor.
  const supportTop = level < 4 ? FLOOR_Y[level + 1] : EAVE_Y[level] + .28;
  const supportRows = Math.max(1, Math.ceil((supportTop - y) / .30));
  for (let row = 0; row < supportRows; row++) {
    const h = (supportTop - y) / supportRows;
    q.ring(1.33, y + (row + .5) * h, h - .008, "jade", start + row * .003, 1.33, .92);
  }
  // Main stone ties above the capitals.
  band(q, aWall + .10, y + .12, .28, "stone", start, 3);
  for (let side = 0; side < 8; side++) {
    const a = side * Math.PI / 4;
    const between = !q.east && level >= 2 ? 1 : 2;
    const slots = [-width / 2 + .10, ...Array.from({ length: between }, (_, i) => (i + 1) * width / (between + 1) - width / 2)];
    for (const u of slots) {
      // The three stacked stone arms create the photographed deep, open corbel grid.
      for (let step = 0; step < 3; step++) {
        const yy = y + .20 + step * .30, radius = aWall + .14 + step * .30;
        q.atFace([.30 + step * .025, .25, .58 + step * .25], u, yy, radius, a, "stone", start + .003 + step * .006, .95 + step * .025);
        q.atFace([.55 + step * .16, .15, .28], u, yy + .18, radius + .16, a, "plaster", start + .005 + step * .006, 1.01);
        // Stone ogee nose: its tail joins the arm, with a curved underside.
        const nose = q.b.geo("kaiyuan-corbel-ogee", () => {
          const sh = new THREE.Shape();sh.moveTo(-.20, .13);sh.lineTo(.24, .13);sh.lineTo(.25, .045);sh.bezierCurveTo(.15, .035, .21, -.15, .08, -.16);sh.lineTo(-.20, -.13);sh.closePath();
          const g = new THREE.ExtrudeGeometry(sh, { depth: .22, bevelEnabled: false, curveSegments: 4 });g.translate(0, 0, -.11);g.rotateY(-Math.PI / 2);return g;
        });
        q.add(nose, "stone", start + .005 + step * .006, face(u, yy - .05, radius + .31 + step * .10, a), a, { shade: .95 });
      }
    }
    // Continuous upper purlin behind bracket ends, with dark open bays below.
    q.atFace([width + .75, .23, .25], 0, y + 1.10, aWall + .89, a, "stone", start + .024, .98);
  }
  // Paired corner cantilevers point along the eight roof hips.
  for (let side = 0; side < 8; side++) {
    const a = side * Math.PI / 4 + H, r = aWall / C;
    for (let step = 0; step < 3; step++) q.atFace([.32, .27, .65 + step * .30], 0, y + .20 + step * .30, r + .11 + step * .28, a, "stone", start + .003 + step * .006, .99);
  }
}

function gridGeometry(nx: number, ny: number, fn: (u: number, v: number) => Point, reverse = false) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { pos.push(...fn(i / nx, j / ny));uv.push(i / nx, j / ny); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (reverse) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function stoneRoof(q: StoneTower, level: number, start: number) {
  const y = EAVE_Y[level], outer = WALL_A[level] + 1.48;
  const inner = level === 4 ? .58 : WALL_A[Math.min(4, level + 1)] - .12;
  const rise = level === 4 ? 2.70 : .48;
  const profile = (x: number, z: number) => {
    const t = (z - inner) / (outer - inner);
    const edge = Math.abs(x) / Math.max(.1, z * TAN);
    return y + rise * Math.pow(1 - t, 1.55) + .31 * Math.pow(edge, 8) * Math.pow(t, 3) + .035 * Math.pow(t, 5);
  };
  for (let side = 0; side < 8; side++) {
    const a = side * Math.PI / 4;
    const surface = (u: number, v: number, offset = 0): Point => { const z = inner + v * (outer - inner), x = (u * 2 - 1) * z * TAN;return face(x, profile(x, z) + offset, z, a); };
    for (const [offset, reverse, material] of [[0, false, "tile"], [-.17, true, "jade"]] as const) {
      const g = gridGeometry(12, 6, (u, v) => surface(u, v, offset), reverse);q.add(g, material, start, [0, 0, 0], 0, { lift: .22 });g.dispose();
    }
    const front = gridGeometry(18, 1, (u, v) => { const x = (u * 2 - 1) * outer * TAN;return face(x, profile(x, outer) - .17 + v * .17, outer, a); }, true);
    q.add(front, "plaster", start + .002);front.dispose();
    // Continuous carved stone roofing strips, documented in Sohu figures 21–22.
    // Each whole member imitates the rib of a tiled roof; there are no loose tiles.
    const cols = Math.ceil(outer * 2 * TAN / .24);
    for (let col = 0; col <= cols; col++) {
      const x = -outer * TAN + col * outer * 2 * TAN / cols;
      const minZ = Math.max(inner, Math.abs(x) / TAN + .01);
      const rows = 1;
      for (let row = 0; row < rows; row++) {
        const zFront = outer, zBack = minZ;
        if (zFront - zBack < .05) continue;
        const tile = gridGeometry(5, level === 4 ? 8 : 4, (u, v) => {
          const theta = u * Math.PI, xx = x + Math.cos(theta) * .10, z = zBack + v * (zFront - zBack);
          return face(xx, profile(xx, z) + .05 + Math.sin(theta) * .075, z, a);
        }, true);
        q.add(tile, "tile", start + .003 + row * .0013 + col * .00006, [0, 0, 0], 0, { shade: .94 + noise(col + row * 7 + side * 31) * .12, duration: .009, lift: .19 });tile.dispose();
      }
      if (Math.abs(x) < outer * TAN - .10) {
        const cap = q.b.geo("kaiyuan-tile-end", () => { const g = new THREE.CylinderGeometry(.103, .103, .10, 8);g.rotateX(Math.PI / 2);return g; });
        const capP = face(x, profile(x, outer) + .075, outer + .035, a);
        q.add(cap, "plaster", start + .012, capP, a, { lift: .18, shade: .97 });
        // Recessed circular bosses reproduce the concentric cut-stone end motif.
        const boss = q.b.geo("kaiyuan-tile-end-boss", () => { const g = new THREE.CylinderGeometry(.057, .057, .008, 8);g.rotateX(Math.PI / 2);return g; });
        q.add(boss, "jade", start + .013, face(x, profile(x, outer) + .075, outer + .089, a), a, { lift: .18, shade: 1.025 });
      }
    }
    // Slender upturned hip and a small stone terminal; restrained curvature.
    const hipPoints: Point[] = [];
    for (let k = 0; k <= 7; k++) { const z = inner + (outer - inner) * k / 7, x = z * TAN;hipPoints.push(face(x, profile(x, z) + .09, z, a)); }
    const tip = face((outer + .08) * TAN, profile(outer * TAN, outer) + .27, outer + .08, a);hipPoints.push(tip);
    q.tube(hipPoints, .085, "plaster", start + .012, 10);
    q.ellipsoid([tip[0], tip[1] + .05, tip[2]], [.09, .16, .09], "stone", start + .014, 0, 1.02);
    // Corner bell hangs below the eave tip.
    const bellP = face(outer * TAN * .96, profile(outer * TAN, outer) - .28, outer * .96, a);
    q.tube([[bellP[0], bellP[1] + .12, bellP[2]], bellP], .017, "bronze", start + .014, 2);
    const bell = q.b.geo("kaiyuan-bell", () => new THREE.CylinderGeometry(.045, .10, .16, 8, 1, true));
    q.add(bell, "bronze", start + .015, [bellP[0], bellP[1] - .08, bellP[2]], 0, { lift: .12, tint: [.73, 1.46, 1.38] });
    q.ellipsoid([bellP[0], bellP[1] - .18, bellP[2]], [.025, .04, .025], "bronze", start + .016);
  }
  if (level === 4) q.ring(.71, y + rise - .015, .18, "stone", start + .013, .71);
}

function finial(q: StoneTower) {
  const base = 25.48;
  const finialScale = (33 - base) / (33 - 26.48);
  const fy = (y: number) => base + (y - 26.48) * finialScale;
  // Dark patinated iron finial, the nine discs and bead silhouette from photos.
  const profiles = [
    { y: base, h: .35 * finialScale, r0: .66, r1: .57 },
    { y: base + .35 * finialScale, h: .40 * finialScale, r0: .50, r1: .33 },
    { y: base + .75 * finialScale, h: .40 * finialScale, r0: .31, r1: .48 },
    { y: base + 1.15 * finialScale, h: .36 * finialScale, r0: .48, r1: .37 },
  ];
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i], g = q.b.geo(`finial-base:${i}`, () => new THREE.CylinderGeometry(p.r1, p.r0, p.h, 16));
    q.add(g, "bronze", .904 + i * .005, [0, p.y + p.h / 2, 0], 0, { lift: .45 });
  }
  const stem = q.b.geo("finial-stem", () => new THREE.CylinderGeometry(.09, .19, 3.50 * finialScale, 12));
  q.add(stem, "bronze", .924, [0, fy(29.64), 0], 0, { lift: .80, duration: .021 });
  for (let i = 0; i < 9; i++) {
    const radius = .51 - i * .027, yy = fy(28.10 + i * .36);
    const disk = q.b.geo(`finial-disc:${i}`, () => {
      const pts = [[0, -.14], [radius * .54, -.14], [radius, -.055], [radius, .025], [radius * .56, .15], [0, .15]].map(([r, y]) => new THREE.Vector2(r, y));
      return new THREE.LatheGeometry(pts, 16);
    });
    q.add(disk, "bronze", .934 + i * .003, [0, yy, 0], 0, { lift: .4, duration: .012, shade: .97 + i * .006 });
  }
  q.ellipsoid([0, fy(31.62), 0], [.28, .40 * finialScale, .28], "bronze", .966);
  q.ellipsoid([0, fy(32.20), 0], [.23, .27 * finialScale, .23], "bronze", .972);
  q.ellipsoid([0, fy(32.66), 0], [.18, .24 * finialScale, .18], "bronze", .977);
  const tip = q.b.geo("finial-tip", () => new THREE.ConeGeometry(.12, .30 * finialScale, 12));
  q.add(tip, "bronze", .981, [0, fy(32.85), 0], 0, { lift: .25, duration: .012 });
  const outer = WALL_A[4] + 1.48;
  // Eight flexible anchor chains. Their near-anchor links are individually modeled.
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + H, r = outer / C;
    const pts: Point[] = [];
    for (let j = 0; j <= 16; j++) {
      const u = j / 16, rr = r * u;
      pts.push([Math.sin(a) * rr, fy(31.56) + (23.14 - fy(31.56)) * u - .20 * Math.sin(Math.PI * u), Math.cos(a) * rr]);
    }
    q.tube(pts, .011, "bronze", .976 + i * .0004, 20);
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const link = q.b.geo("kaiyuan-anchor-chain-link", () => new THREE.TorusGeometry(.036, .008, 3, 6));
    // Fine interlocking loops at both fittings read in the close eaves view;
    // the long distant span remains a continuous low-cost chain silhouette.
    for (let j = 0; j < 18; j++) {
      const u = j < 6 ? .012 + j * .010 : .85 + (j - 6) * .012;
      const point = curve.getPoint(u), tangent = curve.getTangent(u);
      const g = link.clone();g.scale(1, 1.55, 1);g.rotateY(j % 2 ? Math.PI / 2 : 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent));
      q.add(g, "bronze", .977 + i * .0004, [point.x, point.y, point.z], 0, { lift: .15 });g.dispose();
    }
  }
}

export function buildArchitecture(b: HeritageBuilder) {
  for (const east of [false, true]) {
    const q = new StoneTower(b, east);
    foundation(new StoneTower(b, east, true));
    for (let level = 0; level < 5; level++) {
      const start = .10 + level * .16;
      wallStorey(q, level, start);
      brackets(q, level, start + .098);
      stoneRoof(q, level, start + .130);
    }
    finial(q);
  }
}

export function courtyard(b: HeritageBuilder) {
  // Quiet exhibition ground: the temple plan is deliberately not invented here.
  b.box([59, .32, 21.8], [0, -.18, 0], "plaster", -1, { lift: 0, shade: 1.09 });
  b.box([59.15, .12, 21.95], [0, -.40, 0], "jade", -1, { lift: 0, shade: .94 });
  // A few long joints carry the scale of the granite apron without visual clutter.
  for (let x = -28; x <= 28; x += 2) b.box([.018, .012, 21.5], [x, -.012, 0], "jade", -1, { lift: 0, shade: 1.08 });
  for (let z = -10; z <= 10; z += 2) b.box([58.7, .012, .018], [0, -.012, z], "jade", -1, { lift: 0, shade: 1.08 });
}
