import * as THREE from "three";
import type { HeritageBuilder, Point } from "./builder";
import type { SurfaceName } from "./materials";
import type { SculptureRecord, FigureGesture } from "./sculptureTypes";

/** Geometry is a reading of the documented forms, not a measured scan.
 * All coordinates are local to the stone panel, with the viewer's right +X.
 * Evidence controls variations; catalogue position never supplies random poses.
 */
export type SculptureSurface = {
  b: HeritageBuilder;
  add(g: THREE.BufferGeometry, m: SurfaceName, t: number, p?: Point, a?: number,
    options?: { shade?: number; duration?: number; lift?: number; s?: Point; tint?: Point }): void;
  atFace(size: Point, u: number, y: number, radius: number, a: number, m: SurfaceName, t: number, shade?: number): void;
  ellipsoid(p: Point, size: Point, m: SurfaceName, t: number, a?: number, shade?: number): void;
  tube(points: Point[], r: number, m: SurfaceName, t: number, segments?: number): void;
};
export type SculpturePlacement = { angle: number; u: number; y: number; radius: number; time: number; size: number };
type XY = [number, number];
type Arm = { shoulder: XY; elbow: XY; wrist: XY };

const sideSign = (side: "left" | "right" | "center") => side === "left" ? -1 : side === "right" ? 1 : 0;
const specialReader = (id: string) => id === "W-5-07";
const specialTraveller = (id: string) => id === "W-4-11";

class Carver {
  readonly strong: boolean;
  readonly seated: boolean;
  readonly mounted: boolean;
  readonly short: boolean;
  readonly robe: boolean;
  readonly turn: number;
  readonly lean: number;
  readonly bodyZ: number;
  readonly headY: number;
  readonly key: string;
  readonly features: Set<string>;
  constructor(readonly q: SculptureSurface, readonly at: SculpturePlacement, readonly record: SculptureRecord) {
    this.features = new Set(record.details);
    this.strong = ["armoured", "bare"].includes(record.body) || specialTraveller(record.id);
    this.mounted = record.body === "mounted" || record.pose === "mounted";
    this.seated = this.mounted || record.body === "seated" || record.pose === "seated" || specialReader(record.id);
    this.short = record.body === "short-robe" || specialTraveller(record.id);
    this.robe = ["robe", "official", "seated", "mounted", "short-robe"].includes(record.body);
    this.turn = record.pose === "turned-left" ? -1 : record.pose === "turned-right" ? 1 : 0;
    this.lean = record.pose === "lean-left" ? -.055 : record.pose === "lean-right" ? .055 : 0;
    this.bodyZ = this.strong ? .132 : .105;
    this.headY = specialReader(record.id) ? 1.40 : 1.49;
    // Every record-controlled field is part of a geometry key. Primitive keys
    // additionally contain their full outlines, depths and subdivision values.
    this.key = JSON.stringify({ id: record.id, evidence: record.evidence, body: record.body,
      head: record.head, halo: record.halo, pose: record.pose, hands: record.hands,
      objects: record.objects, support: record.support, companions: record.companions, details: record.details });
  }
  has(...features: string[]) { return features.some(feature => this.features.has(feature)); }
  x(x: number, y: number) { return x + this.lean * Math.max(0, y - .12) + this.turn * .025 * Math.max(0, y - .72); }
  p(x: number, y: number, z = .12): Point {
    const { angle: a, u, y: base, radius, size: s } = this.at;
    const xx = u + this.x(x, y) * s, zz = radius + z * s;
    return [xx * Math.cos(a) + zz * Math.sin(a), base + y * s, zz * Math.cos(a) - xx * Math.sin(a)];
  }
  add(g: THREE.BufferGeometry, x = 0, y = 0, z = .07, scale: Point = [1, 1, 1], shade = 1.015, phase = .004) {
    const s = this.at.size;
    this.q.add(g, "stone", this.at.time + phase, this.p(x, y, z), this.at.angle,
      { s: [s * scale[0], s * scale[1], s * scale[2]], shade, lift: .15 });
  }
  form(name: string, points: XY[], depth = .025, z = .075, bevel = .009, shade = 1.015) {
    // Apply lean to the outline before extruding; do not shift a whole figure
    // independently of the support or the hand/prop attachment points.
    const outline = points.map(([x, y]) => [this.x(x, y), y] as XY);
    const parameters = JSON.stringify([name, outline, depth, bevel, 1, 4]);
    const g = this.q.b.geo(`sculpture:${this.key}:${parameters}`, () => {
      const sh = new THREE.Shape();
      outline.forEach(([x, y], i) => { if (i) sh.lineTo(x, y); else sh.moveTo(x, y); });
      sh.closePath();
      return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel,
        bevelSize: bevel, bevelSegments: 1, curveSegments: 4 });
    });
    this.add(g, 0, 0, z, [1, 1, 1], shade);
  }
  curve(name: string, commands: (['M'|'L', number, number] | ['Q', number, number, number, number])[], depth: number, z = .065, bevel = .012) {
    const segments=name === "draped-sleeve"?4:5;
    const g = this.q.b.geo(`sculpture:${this.key}:${JSON.stringify([name, commands, depth, z, bevel, 2, segments])}`, () => {
      const sh = new THREE.Shape();
      for (const cmd of commands) {
        if (cmd[0] === 'M') sh.moveTo(this.x(cmd[1], cmd[2]), cmd[2]);
        else if (cmd[0] === 'L') sh.lineTo(this.x(cmd[1], cmd[2]), cmd[2]);
        else if (cmd[0] === 'Q') sh.quadraticCurveTo(this.x(cmd[1], cmd[2]), cmd[2], this.x(cmd[3], cmd[4]), cmd[4]);
      }
      sh.closePath();
      return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: .018, bevelSegments: 2, curveSegments: segments });
    });
    this.add(g, 0, 0, z, [1, 1, 1], 1.015, .002);
  }
  line(points: XY[], z = .14, width = .010, segments?: number) {
    this.q.tube(points.map(([x, y]) => this.p(x, y, z)), width * this.at.size, "stone", this.at.time + .005, segments ?? Math.max(3, points.length + 1));
  }
  volume(x: number, y: number, z: number, scale: Point, shade = 1.015) {
    const small = Math.max(...scale) < .08;
    const g=this.q.b.geo(`sculpture-ellipsoid:${small?8:10}:${small?5:7}`,()=>new THREE.SphereGeometry(1,small?8:10,small?5:7));
    this.add(g,x,y,z,scale,shade);
  }
  band(points: XY[], width: number, z: number, depth = .018) {
    // Flattened, connected cloth or blade instead of a free-floating round cord.
    const left: XY[] = [], right: XY[] = [];
    points.forEach(([x, y], i) => {
      const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
      const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy) || 1;
      left.push([x - dy / length * width, y + dx / length * width]);
      right.push([x + dy / length * width, y - dx / length * width]);
    });
    this.form("ribbon", [...left, ...right.reverse()], depth, z, .006);
  }
}

function panel(c: Carver, boardWidth=.66) {
  const { q, at } = c, { size: s, u, y, radius, angle: a, time: t } = at;
  const width = boardWidth * s, height = 1.72 * s;
  q.atFace([width + .14, height + .14, .055], u, y + height / 2, radius, a, "stone", t, .93);
  q.atFace([width, height, .045], u, y + height / 2, radius + .032, a, "stone", t, .975);
  for (const sign of [-1, 1]) q.atFace([.025, height + .06, .026], u + sign * (width / 2 + .035), y + height / 2, radius + .056, a, "stone", t + .001, 1.0);
}

function body(c: Carver) {
  const r = c.record;
  if (specialReader(r.id)) {
    c.curve("seated-reader", [['M',-.25,.12],['Q',-.25,.45,-.20,.68],['Q',-.17,.81,-.04,.88],['L',-.15,1.10],['L',-.09,1.25],['L',.10,1.27],['L',.20,1.05],['L',.15,.89],['Q',.29,.79,.17,.69],['L',.04,.64],['Q',-.02,.36,-.03,.13],['Q',-.12,.08,-.25,.12]], .045);
    c.line([[-.04,.84],[.12,.77],[-.05,.63],[-.17,.19]], .119, .008);
    c.line([[-.12,.66],[-.19,.34],[-.22,.16]], .115, .006);
  } else if (c.seated) {
    const bottom = c.mounted ? .65 : .20, lap = c.mounted ? .81 : .52;
    c.curve("seated", [['M',-.28,bottom],['Q',-.34,lap,-.15,1.02],['L',-.17,1.19],['L',-.09,1.36],['L',.11,1.36],['L',.19,1.14],['L',.13,1.0],['Q',.34,lap,.28,bottom],['Q',.02,bottom-.08,-.28,bottom]], .045);
    c.line([[-.25,lap],[-.10,lap+.07],[.13,lap+.01],[.25,bottom+.03]], .117, .008);
    c.line([[-.12,1.27],[-.06,1.03],[.18,bottom+.03]], .115, .007);
  } else if (r.body === "armoured") {
    c.curve("armour-body", [['M',-.12,.13],['L',-.25,.29],['L',-.29,.69],['L',-.21,1.04],['Q',-.33,1.15,-.23,1.27],['L',-.10,1.36],['L',.12,1.36],['L',.28,1.22],['Q',.33,1.10,.23,1.02],['L',.29,.68],['L',.24,.27],['L',.12,.13],['L',.06,.53],['L',-.06,.53]], .065, .065, .018);
    c.form("cuirass", [[-.21,1.18],[-.10,1.27],[0,1.17],[.11,1.27],[.22,1.16],[.17,.94],[0,.89],[-.18,.96]], .025, .130);
    for (const sign of [-1, 1]) c.form("skirt", [[sign*.025,.83],[sign*.20,.87],[sign*.27,.53],[sign*.18,.47],[sign*.05,.59]], .027, .142);
    for (const y of [.73,.89]) c.line([[-.20,y+.03],[0,y-.04],[.20,y+.03]], .163, .011);
    for (const x of [-.14,-.07,0,.07,.14]) c.line([[x,.29],[x*1.24,.57]], .163, .006);
  } else if (r.body === "bare") {
    const bent = c.has("屈膝") || c.turn !== 0 || c.lean !== 0;
    c.curve("bare-lower-body", [['M',-.25,.13],['L',-.25,.30],['L',bent?-.13:-.18,.56],['L',-.22,.73],['Q',-.15,.87,-.08,.91],['L',.10,.91],['L',.27,.60],['L',bent?.15:.22,.40],['L',.25,.13],['L',.09,.11],['L',.06,.42],['L',-.01,.61],['L',-.13,.31],['L',-.12,.13]], .060, .065, .018);
    c.curve("bare-back", [['M',-.10,.84],['Q',-.14,1.00,-.18,1.15],['Q',-.22,1.25,-.075,1.32],['L',.075,1.32],['Q',.22,1.25,.18,1.15],['Q',.10,.97,.11,.84]], .026, .070, .016);
    c.volume(-.060,1.18,.106,[.114,.141,.045]);
    c.volume(.063,1.18,.106,[.112,.141,.043]);
    c.volume(.010,1.005,.100,[.112,.163,.037]);
    c.line([[-.12,1.29],[-.03,1.26],[.10,1.28]],.139,.005);
    c.form("waist-cloth", [[-.14,.90],[.15,.92],[.24,.64],[.15,.58],[.02,.72],[-.14,.55],[-.24,.66]], .025, .143);
  } else if (c.short) {
    const traveller = specialTraveller(r.id);
    c.curve("short-garment", [['M',-.23,.13],['L',-.22,.42],['L',-.25,.52],['L',-.18,1.01],['L',-.18,1.22],['L',-.10,1.36],['L',.10,1.36],['L',.18,1.22],['L',.18,1.01],['L',.25,traveller?.68:.52],['L',.20,.43],['L',.23,.13],['L',.08,.12],['L',.04,.44],['L',-.04,.44],['L',-.08,.12]], traveller?.065:.045);
    c.line([[-.16,1.29],[-.05,1.10],[.13,1.02]], c.bodyZ+.012, .007);
    c.line([[-.18,.87],[0,.81],[.18,.86]], c.bodyZ+.011, .010);
    for (const x of [-.13,-.04,.06,.15]) c.line([[x,.78],[x*.9,.63],[x*1.1,.49]], c.bodyZ+.010, .006);
  } else {
    const unknown = r.body === "unknown", official = r.body === "official";
    const hem = unknown ? .20 : official ? .27 : .29;
    c.curve("long-garment", [['M',-hem,.12],['Q',-.20,.60,-.16,1.20],['L',-.09,1.36],['L',.10,1.36],['L',.20,1.20],['Q',.24,.57,hem,.13],['Q',.08,.05,-.04,.11],['Q',-.16,.02,-hem,.12]], .045);
    if (!unknown) {
      for (const sign of [-1,1]) c.line([[sign*.14,1.27],[sign*.09,.86],[sign*.18,.39],[sign*.26,.16]], .116, .010);
      for (const x of [-.08,0,.08]) c.line([[x,.19],[x*.7,.57],[x+.03,.88]], .113, .005);
      c.line([[-.11,1.30],[.13,1.0],[-.03,.75]], .115, .007);
      if (official) c.band([[-.18,.91],[.03,.88],[.19,.92]], .022, .115, .008);
      if(c.has("胸部外露","袒胸")) {
        c.volume(0,1.17,.105,[.100,.16,.025]);
        c.band([[-.13,1.30],[-.08,1.04],[.13,.95],[.18,1.13]],.020,.122,.010);
      }
    }
  }
  if (c.has("圆腹")) c.volume(0, .98, .132, [.18,.21,.063]);
  if(c.has("裙甲宽"))for(const sign of [-1,1])c.form("wide-skirt-side",[[sign*.12,.85],[sign*.24,.78],[sign*.30,.52],[sign*.18,.48]],.018,.144);
  if (!c.seated) for (const sign of [-1,1]) {
    const front = c.has(sign === 1 ? "右脚前迈" : "左脚前迈") ? .035 : 0;
    c.volume(sign*.12,.09,.104+front,[.088,.045,c.strong?.073:.040]);
    if (c.strong || c.has("靴")) c.line([[sign*.14,.13],[sign*.18,.32],[sign*.13,.49]], .151, .025);
  }
}

function head(c: Carver, x = 0, y = c.headY, scale = 1, secondary = false) {
  const r = c.record, strong = c.strong, turned = c.turn * .026;
  const width = (strong ? .103 : .096) * scale * (c.turn ? .90 : 1);
  const z = strong ? .112 : .087;
  c.volume(x, y-.115*scale, .090, [.043*scale,.078*scale,.032]);
  c.volume(x, y, z, [width,(strong?.145:.137)*scale,strong?.035:.034], 1.025);
  if (r.head !== "unknown") {
    c.volume(x+turned,y-.012*scale,strong?.149:.119,[.018*scale,.036*scale,strong?.017:.012],1.02);
    if (strong) {
      for (const sign of [-1,1]) c.form("brow",[[x+turned+sign*.018*scale,y+.036*scale],[x+sign*.071*scale,y+.048*scale],[x+sign*.077*scale,y+.037*scale],[x+turned+sign*.018*scale,y+.029*scale]],.004,.139,.002);
      c.volume(x+turned,y-.079*scale,.137,[.045*scale,.026*scale,.010]);
      if(c.has("张口")) {
        c.line([[x+turned-.022,y-.058],[x+turned,y-.069],[x+turned+.022,y-.058]],.148,.005);
        c.line([[x+turned-.019,y-.050],[x+turned,y-.046],[x+turned+.019,y-.050]],.149,.004);
      }
    }
    if(c.has("笑面"))c.line([[x-.030,y-.054],[x,y-.064],[x+.030,y-.054]],.122,.004);
  }
  if (secondary) return;
  if (r.halo === "round") {
    const g = c.q.b.geo("sculpture-halo:0.205:0.006:4:20", () => new THREE.TorusGeometry(.205,.006,4,20));
    c.add(g,x,y-.01,.060,[1,1.10,1],1.01,.001);
  }
  const top = y+.105;
  if (r.head === "crown") {
    c.form("crown", [[x-.13,top],[x-.11,top+.08],[x-.065,top+.045],[x,top+.125],[x+.065,top+.045],[x+.11,top+.08],[x+.13,top]], .024, strong?.137:.098);
    c.line([[x-.12,top+.008],[x,top-.002],[x+.12,top+.008]],strong?.164:.128,.010);
  } else if (r.head === "cap" || c.has("头盔")) {
    c.form("cap", [[x-.11,top-.015],[x-.085,top+.11],[x+.075,top+.11],[x+.11,top-.015]], .026, strong?.126:.087);
    if (c.has("头盔")) {
      c.band([[x-.09,top],[x-.14,y-.05],[x-.13,y-.13]],.025,.107,.018);
      c.band([[x+.09,top],[x+.14,y-.05],[x+.13,y-.13]],.025,.107,.018);
    }
  } else if (r.head === "hood") {
    c.band([[x-.12,y-.13],[x-.14,y+.08],[x-.07,y+.19],[x+.07,y+.19],[x+.14,y+.07],[x+.12,y-.13]], .026, .073, .020);
    c.line([[x-.12,y-.10],[x-.16,y-.29],[x-.11,y-.37]], .110, .012);
    c.line([[x+.12,y-.10],[x+.15,y-.29],[x+.10,y-.37]], .110, .012);
  } else if (r.head === "topknot" || c.has("双髻")) {
    if (c.has("双髻")) for (const sign of [-1,1]) c.volume(x+sign*.113,y+.12,.105,[.045,.039,.017]);
    else c.volume(x,y+.157,.107,[.049,.056,.030]);
  } else if (r.head === "curled") {
    c.form("curled-hair", [[x-.102,top-.024],[x-.117,top+.01],[x-.082,top+.036],[x-.091,top+.066],[x-.045,top+.08],[x,top+.11],[x+.045,top+.08],[x+.091,top+.066],[x+.082,top+.036],[x+.117,top+.01],[x+.102,top-.024]], .026, .096, .010);
  } else if (r.head === "monkey") {
    c.volume(x-.018,y-.051,.183,[.066,.042,.023]);
    for (const sign of [-1,1]) c.volume(x+sign*.110,y-.004,.116,[.028,.041,.024]);
    c.line([[x-.075,y+.11],[x,y+.15],[x+.078,y+.11]], .142, .016);
  }
  if (c.has("三头六臂")) {
    head(c,-.164,y-.015,.65,true);
    head(c,.164,y-.015,.65,true);
  }
  if (c.has("长须")) c.form("beard", [[x-.065,y-.06],[x,y-.075],[x+.065,y-.06],[x+.045,y-.22],[x,y-.28],[x-.038,y-.22]], .016, .128);
}

function objectGrip(c: Carver, object: SculptureRecord['objects'][number]): XY {
  const sign = sideSign(object.side), long = ["staff","sword","vajra","banner","whisk","broom","bow","axe"].includes(object.kind);
  if (specialTraveller(c.record.id) && object.kind === "sword") return [.045,.79];
  if (specialReader(c.record.id) && ["book","scroll"].includes(object.kind)) return [-.055,1.05];
  if(c.has("垂剑") && object.kind === "sword")return [0,1.01];
  if (long) {
    if(object.orientation === "horizontal")return [sign*.05,1.05];
    if(object.orientation === "diagonal")return object.side === "center" ? [longDirection(c,object)*-.04,.96] : [sign*.07,.89];
    return [sign*(["bow","axe"].includes(object.kind)?.13:.22),.99];
  }
  const gesture = sign < 0 ? c.record.hands.left : sign > 0 ? c.record.hands.right : "chest";
  const y = gesture === "raised" ? 1.40 : gesture === "down" ? .78 : gesture === "waist" ? .92 : 1.08;
  if(c.has("三头六臂") && (object.kind === "sun" || object.kind === "moon"))return [object.kind === "sun"?-.29:.29,1.59];
  return [sign * (gesture === "raised" ? .22 : sign === 0 ? 0 : .17),y];
}

function longDirection(c:Carver, object:SculptureRecord['objects'][number]) {
  if(c.record.id === "W-3-03" && object.kind === "staff")return 1;
  if(object.kind === "staff" && c.has("斜杖向左上"))return -1;
  if(object.kind === "staff" && c.has("斜杖向右上"))return 1;
  const side=sideSign(object.side);
  if(side)return side;
  if(c.record.hands.left === "raised" && c.record.hands.right !== "raised")return -1;
  if(c.record.hands.right === "raised" && c.record.hands.left !== "raised")return 1;
  return c.turn === 1?-1:1;
}

function armPath(c: Carver, sign: number, gesture: FigureGesture): Arm {
  const shoulder: XY = [sign*(c.strong?.19:.15),c.seated?1.23:1.24];
  if (specialReader(c.record.id)) return sign < 0 ? { shoulder:[-.12,1.15],elbow:[-.22,1.05],wrist:[-.15,1.02] } : { shoulder:[.16,1.12],elbow:[.12,.94],wrist:[-.025,1.03] };
  if (specialTraveller(c.record.id) && sign < 0) return { shoulder:[-.17,1.18],elbow:[-.25,.96],wrist:[.02,.79] };
  let objects = c.record.objects.filter(o => sideSign(o.side) === sign || o.side === "center");
  if(!objects.length && c.record.objects.length === 1 && c.record.hands.left === "holding" && c.record.hands.right === "holding")objects=c.record.objects;
  if (gesture === "holding" && objects.length) return { shoulder, elbow:[sign*.23,1.02], wrist:objectGrip(c,objects[0]) };
  switch (gesture) {
    case "raised": return {shoulder,elbow:[sign*.25,1.34],wrist:[sign*.22,1.49]};
    case "open": return {shoulder,elbow:[sign*.25,1.02],wrist:[sign*.30,1.13]};
    case "chest": return {shoulder,elbow:[sign*.20,1.03],wrist:[sign*.065,1.13]};
    case "joined": return {shoulder,elbow:[sign*.17,1.03],wrist:[sign*.021,1.16]};
    case "waist": return {shoulder,elbow:[sign*.22,1.04],wrist:[sign*.070,.91]};
    case "down": return {shoulder,elbow:[sign*.22,1.00],wrist:[sign*.22,.77]};
    case "holding": return {shoulder,elbow:[sign*.20,1.02],wrist:[sign*.12,1.02]};
    default: return {shoulder,elbow:[sign*.18,1.06],wrist:[sign*.16,.93]};
  }
}

function arm(c: Carver, sign: number, gesture: FigureGesture, override?: Arm) {
  const {shoulder:s,elbow:e,wrist:w} = override ?? armPath(c,sign,gesture);
  const naked = c.record.body === "bare" || c.has("裸臂") || c.record.body === "armoured";
  const z = c.strong ? .160 : .128;
  if (naked) {
    c.line([s,e,w], z, c.strong?.036:.028, 6);
    if (c.record.body === "armoured") {
      c.form("armour-shoulder", [[s[0]-sign*.06,s[1]+.045],[s[0]+sign*.065,s[1]-.01],[e[0]+sign*.04,e[1]+.06],[e[0]-sign*.045,e[1]+.05]], .023, .154);
      c.line([[e[0]-sign*.028,e[1]+.01],[e[0]+sign*.025,e[1]-.02]], .192, .012);
    }
  } else {
    // A shallow sleeve mass joins the torso, elbow and wrist; its lower hem
    // hangs below the forearm instead of becoming a disconnected noodle.
    const drape = c.short ? .10 : .20;
    c.curve("draped-sleeve", [['M',s[0]-sign*.045,s[1]+.02],['Q',s[0]+sign*.080,s[1]-.025,e[0]+sign*.055,e[1]-.055],['Q',e[0]+sign*.067,e[1]-.10,w[0]+sign*.039,w[1]-.035],['L',w[0]-sign*.036,w[1]-.065],['Q',e[0]-sign*.015,e[1]-drape-.04,e[0]-sign*.020,e[1]-drape],['Q',s[0]-sign*.080,s[1]-.25,s[0]-sign*.065,s[1]-.17]], .027, .082, .010);
    c.line([[s[0],s[1]-.02],[e[0],e[1]-.075],[w[0],w[1]-.015]], .121, .007, 5);
    c.line([[e[0]-sign*.015,e[1]-.13],[w[0]-sign*.025,w[1]-.04]], .119, .006, 3);
  }
  if (gesture !== "unknown") {
    c.volume(w[0],w[1],z+.017,[gesture==='joined'?.022:.033,gesture==='raised'||gesture==='joined'?.060:.039,c.strong?.027:.020]);
  }
}

function arms(c: Carver) {
  arm(c,-1,c.record.hands.left);
  arm(c,1,c.record.hands.right);
  if (c.has("三头六臂")) {
    for (const sign of [-1,1]) {
      arm(c,sign,"raised",{shoulder:[sign*.16,1.19],elbow:[sign*.29,1.34],wrist:[sign*.30,1.59]});
      arm(c,sign,"joined",{shoulder:[sign*.17,1.12],elbow:[sign*.20,.94],wrist:[sign*.025,1.06]});
    }
  }
  if (c.has("披带","腰间披带")) {
    c.band([[-.20,1.23],[-.30,1.45],[-.25,1.60]],.019,.071,.015);
    c.band([[.19,1.15],[.30,.97],[.26,.68],[.31,.51]],.017,.071,.014);
  }
}

function objects(c: Carver) {
  c.record.objects.forEach((object, index) => {
    let [gx,gy] = objectGrip(c,object);
    const sign = longDirection(c,object);
    const long = ["staff","sword","vajra","banner","whisk","broom","bow","axe","hammer","torch","rope"].includes(object.kind);
    const unknown = object.orientation === "unknown";
    const downSword=object.kind === "sword" && c.has("垂剑");
    const rightDownSword=object.kind === "sword" && c.has("剑尖朝观察者右下");
    const angle = downSword?Math.PI:rightDownSword?Math.PI-.49:!long || unknown ? 0 : object.orientation === "diagonal" ? sign*.46 : object.orientation === "horizontal" ? sign*Math.PI/2 : 0;
    const extent = unknown && long ? .50 : object.orientation === "horizontal" && long ? .43 : object.kind === "staff" && object.orientation === "diagonal" ? .84 : 1;
    const attachedStaff=c.record.objects.find(o=>o.kind === "staff");
    if(attachedStaff && ((object.kind === "flask" && (c.has("杆端悬葫芦") || c.record.id === "W-4-12")) || (object.kind === "whisk" && c.has("杆端悬拂尘")))) {
      const [sx,sy]=objectGrip(c,attachedStaff),a=attachedStaff.orientation==='diagonal'?longDirection(c,attachedStaff)*.46:0;
      gx=sx+.49*Math.sin(a);gy=sy+.49*Math.cos(a)-.12;
      c.line([[sx+.49*Math.sin(a),sy+.49*Math.cos(a)],[gx,gy+.06]],c.strong?.19:.15,.008);
    }
    const xy = (x:number,y:number):XY => [gx + x*Math.cos(angle) + y*Math.sin(angle)*extent,gy - x*Math.sin(angle) + y*Math.cos(angle)*extent];
    const z = c.strong ? .199 : .161;
    const f = (name:string,points:XY[],depth=.016) => c.form(`object-${index}-${name}`,points.map(([x,y])=>xy(x,y)),depth,z,.006);
    const l = (points:XY[],width=.011) => c.line(points.map(([x,y])=>xy(x,y)),z+.012,width);
    const v = (x:number,y:number,size:Point) => {const at=xy(x,y);c.volume(at[0],at[1],z+.010,size);};
    const disc = (x:number,y:number,r:number) => {
      const points:XY[]=[];
      for(let i=0;i<20;i++){const a=i*Math.PI/10;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}
      f("disc",points,.012);
    };
    switch(object.kind) {
      case "staff":
        if(c.record.id === "W-5-08") {
          c.line([[-.30,1.21],[.02,1.36],[.30,1.48]],.155,.016,4);
          break;
        }
        l([[0,-.76],[0,.60]],.016);
        if(c.has("长矛","长枪"))f("spear-tip",[[-.027,.55],[0,.70],[.027,.55],[0,.58]],.016);
        else if(c.has("长柄戟"))f("halberd-tip",[[0,.58],[-.030,.65],[0,.73],[.025,.64],[.020,.56],[.09,.62],[.10,.52],[.025,.49]],.017);
        else if(c.has("锡杖","环杖")) {
          const ring:XY[]=[];for(let i=0;i<=16;i++){const a=i*Math.PI/8;ring.push([Math.cos(a)*.047,.57+Math.sin(a)*.060]);}l(ring,.009);
        }
        break;
      case "sword":
        if (specialTraveller(c.record.id)) {
          c.form("traveller-curved-blade", [[.02,.77],[-.29,1.47],[-.30,1.59],[-.20,1.52],[.10,.82]], .022, .210,.007);
          c.line([[.01,.73],[.12,.86]],.220,.021);
          c.line([[-.03,.66],[.06,.79]],.220,.022);
        } else {
          f("sword-blade",[[-.025,.06],[-.032,downSword?.65:.48],[0,downSword?.79:.61],[.032,downSword?.65:.48],[.025,.06]],.019);
          l([[0,-.16],[0,.05]],.019);l([[-.075,.035],[.075,.035]],.015);
        }
        break;
      case "vajra":
        l([[0,-.52],[0,.58]],.022);
        for(const end of [-.52,.58]) f("vajra-finial",[[-.022,end-.045],[-.046,end],[-.025,end+.075],[0,end+.11],[.025,end+.075],[.046,end],[.022,end-.045]],.019);
        break;
      case "axe":
        l([[0,-.48],[0,.52]],.019);
        f("axe-head",[[0,.32],[-.13,.29],[-.18,.37],[-.16,.51],[-.03,.48],[.025,.43]],.025);
        break;
      case "hammer":
        l([[0,-.36],[0,.34]],.018);
        f("hammer-head",[[-.11,.28],[.11,.28],[.11,.40],[-.11,.40]],.037);
        break;
      case "bow":
        l([[0,-.43],[.13,-.23],[.16,0],[.13,.25],[0,.43]],.017);
        l([[0,-.43],[0,.43]],.006);
        l([[-.18,-.26],[.18,.34]],.009);
        f("arrowhead",[[.14,.28],[.18,.37],[.21,.29]],.010);
        break;
      case "bowl":
        f("bowl",[[-.10,.04],[.10,.04],[.077,-.035],[.035,-.063],[-.035,-.063],[-.077,-.035]],.034);
        l([[-.10,.04],[0,.025],[.10,.04]],.009);
        break;
      case "book":
      case "scroll": {
        if(specialReader(c.record.id)) {
          c.form("reader-open-scroll",[[-.28,1.13],[-.08,1.06],[.08,1.10],[.04,.99],[-.09,.98],[-.26,1.05]],.017,.165,.005);
          break;
        }
        const horizontal=object.orientation === "horizontal", w=horizontal?.13:.075,h=horizontal?.055:.15;
        f("book",[[-w,h],[-.01,h*.82],[w,h], [w,-h],[-.01,-h*.84],[-w,-h]],.020);
        l([[-.01,-h*.80],[-.01,h*.80]],.005);
        if(object.kind === "scroll") for(const side of [-1,1])l([[side*w,-h],[side*w,h]],.014);
        break;
      }
      case "rosary": {
        for(let j=0;j<11;j++){const phi=-.2+j/10*Math.PI*1.75;const at=xy(Math.cos(phi)*.085,-.06+Math.sin(phi)*.13);c.volume(at[0],at[1],z,[.013,.017,.010]);}
        break;
      }
      case "flask":
        v(0,-.035,[.060,.076,.033]);
        f("flask-neck",[[-.022,.01],[-.020,.11],[.022,.11],[.025,.01]],.020);
        l([[-.033,.10],[.033,.10]],.010);
        break;
      case "flower":
        if(c.has("柳枝")) {
          l([[0,-.15],[.015,.05],[.045,.26]],.006);
          for(const [xx,yy,sign] of [[.005,-.03,-1],[.02,.06,1],[.03,.15,-1]] as [number,number,number][])f("willow-leaf",[[xx,yy],[xx+sign*.055,yy+.06],[xx+sign*.063,yy+.10],[xx+sign*.015,yy+.055]],.007);
        } else {
          l([[0,-.16],[0,.14]],.009);
          for(let j=0;j<5;j++){const phi=j*Math.PI*2/5;f("flower-petal",[[0,.15],[Math.cos(phi)*.070,.15+Math.sin(phi)*.070],[Math.cos(phi+.6)*.035,.15+Math.sin(phi+.6)*.035]],.012);}
        }
        if(c.has("莲上小佛")) {
          f("small-seated-figure",[[-.032,.20],[-.043,.24],[-.020,.31],[.020,.31],[.044,.24],[.030,.20]],.015);
          v(0,.34,[.025,.030,.017]);
        }
        break;
      case "censer":
        v(0,-.015,[.075,.055,.036]);
        f("censer-lid",[[-.075,.025],[0,.08],[.075,.025]],.018);
        for(const side of [-1,1])l([[side*.07,.015],[side*.105,.06],[side*.075,.085]],.010);
        l([[0,.07],[0,.11]],.011);
        if(c.has("长柄香炉") || c.record.id === "W-3-08")l([[-.23,-.01],[-.075,-.01]],.014);
        break;
      case "tablet":
        f("tablet",[[-.038,-.15],[-.041,.14],[0,.18],[.041,.14],[.038,-.15]],.020);
        break;
      case "banner":
        l([[0,-.50],[0,.57]],.014);
        f("banner-cloth",[[0,.52],[.14,.50],[.12,.23],[.16,.08],[.04,.15],[0,.12]],.013);
        l([[.035,.46],[.05,.23],[.08,.17]],.005);
        break;
      case "seal":
        f("seal",[[-.052,-.036],[.052,-.036],[.052,.046],[-.052,.046]],.039);
        v(0,.063,[.022,.020,.019]);
        break;
      case "ruyi":
        l([[-.04,-.17],[0,-.05],[.025,.12]],.016);
        f("ruyi-head",[[.025,.10],[-.025,.13],[-.040,.18],[0,.21],[.025,.19],[.055,.21],[.09,.18],[.075,.13]],.023);
        break;
      case "stupa":
        f("stupa-base",[[-.08,-.08],[.08,-.08],[.07,-.04],[-.07,-.04]],.025);
        for(let tier=0;tier<3;tier++){const yy=-.025+tier*.064,w=.065-tier*.012;f("stupa-tier",[[-w,yy],[-w*.70,yy+.025],[w*.70,yy+.025],[w,yy],[w*.70,yy-.009],[-w*.70,yy-.009]],.024);}
        l([[0,.12],[0,.20]],.010);
        break;
      case "whisk":
        l([[0,-.23],[0,.17]],.016);
        f("whisk",[[-.028,.12],[-.065,.26],[-.05,.39],[.015,.43],[.07,.34],[.05,.16]],.014);
        for(const x of [-.035,0,.035])l([[x,.16],[x*.8,.28],[x*.5+.015,.39]],.005);
        break;
      case "broom":
        l([[0,-.25],[0,.30]],.014);
        f("broom-head",[[-.028,.23],[-.06,.46],[-.02,.56],[.045,.52],[.062,.43],[.027,.23]],.017);
        for(const x of [-.03,0,.03])l([[x*.6,.26],[x,.47]],.004);
        break;
      case "cloth":
        f("cloth",[[-.09,.10],[.07,.07],[.04,-.13],[.075,-.23],[-.025,-.19],[-.09,-.11]],.013);
        l([[-.04,.05],[-.02,-.10],[.025,-.19]],.005);
        break;
      case "sun":
        disc(0,.035,.073);v(0,.035,[.032,.032,.010]);
        break;
      case "moon":
        // The source specifies a moon disc, not a crescent. Unreadable interior
        // rabbit/tree emblems are deliberately not invented at this scale.
        disc(0,.035,.073);
        break;
      case "pearl":
        v(0,.025,[.056,.056,.034]);
        break;
      case "bell":
        f("bell",[[-.058,-.055],[-.035,.04],[0,.071],[.035,.04],[.058,-.055]],.025);
        l([[0,.065],[0,.14]],.011);v(0,-.055,[.016,.020,.014]);
        break;
      case "cage":
        f("cage-bottom",[[-.09,-.10],[.09,-.10],[.09,-.08],[-.09,-.08]],.020);
        l([[-.09,-.08],[-.085,.07],[0,.14],[.085,.07],[.09,-.08]],.010);
        for(const x of [-.045,0,.045])l([[x,-.08],[x,.09]],.006);
        break;
      case "fan":
        if(c.has("圆扇"))disc(0,.065,.081);
        else if(c.has("矩形扇"))f("rectangular-fan",[[-.070,-.005],[-.070,.155],[.070,.155],[.070,-.005]],.013);
        else f("fan",[[0,-.06],[-.12,.05],[-.095,.13],[0,.16],[.095,.13],[.12,.05]],.012);
        if(!c.has("圆扇","矩形扇"))for(const x of [-.075,0,.075])l([[0,-.045],[x,.12]],.004);
        l([[0,-.11],[0,-.04]],.010);
        break;
      case "drum":
        v(0,0,[.095,.080,.039]);
        l([[-.08,-.05],[-.09,.04],[.08,.05],[.09,-.04]],.010);
        l([[.08,-.07],[.13,.10]],.009);
        break;
      case "torch":
        l([[0,-.28],[0,.16]],.016);
        f("flame",[[-.028,.12],[-.058,.22],[-.028,.31],[.01,.27],[.04,.36],[.062,.22],[.032,.12]],.016);
        break;
      case "rope":
        l([[0,-.32],[-.05,-.22],[.05,-.12],[-.05,.02],[.04,.14],[0,.25]],.011);
        break;
      case "other":
        // An unidentified held shape stays a small undifferentiated mass.
        v(0,0,[.045,.065,.022]);
        break;
    }
  });
  if (c.has("布袋")) {
    c.form("cloth-bag",[[.10,.77],[.15,.95],[.25,.92],[.29,.75],[.26,.51],[.12,.54]],.043,.104,.014);
    c.line([[.15,.92],[.19,.84],[.24,.91]],.160,.010);
  }
}

function support(c: Carver) {
  const kind=c.record.support;
  if(kind === "lotus") {
    if(c.has("双莲台")) {
      for(const center of [-.14,.14]) {
        c.form("double-lotus-plinth",[[center-.13,.035],[center+.13,.035],[center+.11,.085],[center-.11,.085]],.021,.071);
        for(const dx of [-.08,0,.08])c.curve("double-lotus-petal",[['M',center+dx-.045,.065],['Q',center+dx-.04,.13,center+dx,.16],['Q',center+dx+.04,.13,center+dx+.045,.065]],.018,.079,.005);
      }
    } else {
      c.form("lotus-plinth",[[-.28,.035],[.28,.035],[.24,.09],[-.24,.09]],.022,.071);
      for(const x of [-.20,-.10,0,.10,.20])c.curve("lotus-petal",[['M',x-.055,.065],['Q',x-.052,.13,x,.16],['Q',x+.052,.13,x+.055,.065]],.018,.079,.006);
    }
  } else if(kind === "rock") {
    if(specialReader(c.record.id)) c.form("reader-rock",[[.09,.16],[.29,.15],[.27,.35],[.32,.48],[.23,.66],[.30,.79],[.12,.84],[.08,.61]],.040,.060,.012,.98);
    else c.form("rock",[[-.28,.035],[-.25,.13],[-.13,.17],[-.04,.12],[.12,.19],[.27,.13],[.29,.035]],.035,.066,.011,.99);
  } else if(kind === "cloud") {
    c.curve("cloud",[['M',-.29,.045],['Q',-.31,.12,-.23,.13],['Q',-.23,.20,-.13,.17],['Q',-.05,.24,.02,.16],['Q',.12,.22,.18,.13],['Q',.30,.15,.29,.045]],.021,.066,.008);
    c.line([[-.22,.09],[-.14,.12],[-.06,.08],[.04,.12],[.16,.08],[.24,.09]],.099,.007);
  } else if(kind === "lion" || kind === "elephant") {
    const elephant=kind === "elephant";
    const floor=c.mounted?.14:.045, top=c.mounted?.67:.27, cy=(floor+top)/2;
    c.curve("mount",[['M',-.27,floor+.12],['L',-.27,top-.09],['Q',-.15,top+.03,.18,top],['L',.29,top-.11],['L',.28,floor+.13],['Q',0,floor+.04,-.27,floor+.12]],.050,.075,.013);
    for(const sign of [-1,1]) {
      const x=sign*.18;
      c.curve("mount-bent-leg",[['M',x-.040,cy+.055],['Q',x-.060,floor+.14,x-.050,floor+.045],['Q',x-.038,floor-.005,x+.040,floor+.010],['L',x+.057,floor+.065],['Q',x+.025,floor+.17,x+.046,cy+.045]],.028,.108,.010);
      c.volume(x,cy+.065,.114,[.073,.095,.029]);
    }
    if(elephant) {
      c.volume(.23,top-.13,.139,[.103,.125,.048]);
      c.form("elephant-ear",[[.15,top-.03],[.24,top-.03],[.23,top-.24],[.13,top-.20]],.027,.145);
      c.line([[.29,top-.11],[.31,cy-.02],[.29,floor+.04],[.23,floor+.06]],.172,.030);
      c.line([[.27,top-.20],[.33,top-.27],[.33,top-.32]],.177,.010);
    } else {
      c.volume(-.23,top-.14,.139,[.113,.115,.047]);
      c.volume(-.27,top-.17,.176,[.067,.048,.022]);
      for(let i=0;i<5;i++){const phi=-.8+i*.6;c.line([[-.22+Math.cos(phi)*.09,top-.13+Math.sin(phi)*.11],[-.20+Math.cos(phi)*.12,top-.13+Math.sin(phi)*.13]],.140,.011);}
      c.line([[.25,cy],[.32,cy+.08],[.28,top-.04]],.115,.012);
    }
  }
  if(c.has("踏芦苇")) {
    for(const x of [-.20,-.07,.08,.21]) {
      c.line([[x-.04,.035],[x,.11],[x+.08,.19]],.073,.006);
      c.form("reed-leaf",[[x,.10],[x+.03,.17],[x+.10,.20],[x+.04,.13]],.007,.072,.003);
    }
  }
}

function companion(c: Carver, kind:SculptureRecord['companions'][number], sign:number, sequence:number) {
  const x=sign*.25, z=.088;
  // Companion position is taken from a precise detail when supplied. Without
  // one, use a restrained lower-margin silhouette, not an invented interaction.
  if(kind === "tree") {
    const trunk=specialReader(c.record.id)?.25:x;
    c.line([[trunk,.24],[trunk*.92,.82],[trunk,1.21],[trunk*.88,1.48],[sign*.31,1.66]],.068,.018);
    c.line([[trunk*.94,1.31],[sign*.10,1.59],[sign*-.015,1.65]],.068,.012);
    if(!specialReader(c.record.id))c.line([[trunk,.90],[sign*.14,1.09],[sign*.10,1.17]],.068,.010);
  } else if(kind === "child") {
    const yy=.30+sequence*.05;
    c.curve("child-robe",[['M',x-.060,.085],['L',x-.046,yy+.12],['L',x+.045,yy+.12],['L',x+.067,.085]],.027,z,.007);
    c.volume(x,yy+.20,.113,[.045,.056,.027]);
    c.line([[x-sign*.037,yy+.10],[x-sign*.07,yy+.02],[x-sign*.04,yy+.06]],.139,.012);
    c.line([[x+sign*.037,yy+.10],[x+sign*.07,yy-.01]],.132,.011);
  } else if(kind === "skeleton") {
    if(c.record.id === "W-5-08") {
      // The text describes a small bent, drooping figure at the shoulder pole.
      // The attachment itself is unclear: no invented rope, bones or bindings.
      c.curve("drooping-companion",[['M',.18,1.43],['Q',.22,1.46,.28,1.40],['L',.29,1.33],['Q',.24,1.36,.20,1.32],['L',.17,1.35]],.021,.149,.006);
      c.volume(.18,1.31,.167,[.032,.043,.020]);
      c.line([[.20,1.36],[.16,1.24],[.17,1.18]],.166,.010);
      c.line([[.24,1.37],[.22,1.22],[.24,1.17]],.161,.010);
      c.line([[.28,1.38],[.31,1.26],[.29,1.19]],.159,.011);
      return;
    }
    c.volume(x,.48,.111,[.042,.052,.024]);
    c.line([[x,.43],[x,.20]],.117,.013);
    for(const y of [.39,.35,.31])c.line([[x-.045,y+.012],[x,y-.01],[x+.045,y+.012]],.119,.006);
    for(const s of [-1,1]) {
      c.line([[x+s*.038,.40],[x+s*.066,.28],[x+s*.048,.20]],.117,.009);
      c.line([[x,.21],[x+s*.034,.16],[x+s*.044,.075]],.117,.010);
    }
  } else if(kind === "bird") {
    if(c.record.id === "W-3-11") {
      const cage=c.record.objects.find(o=>o.kind === "cage");
      const [cx,cy]=cage?objectGrip(c,cage):[.17,1.08];
      c.volume(cx,cy+.23,.140,[.030,.046,.018]);
      c.form("bird-raised-wings",[[cx,cy+.22],[cx-.085,cy+.29],[cx-.075,cy+.34],[cx,cy+.27],[cx+.085,cy+.34],[cx+.075,cy+.28]],.012,.135,.004);
      c.volume(cx,cy+.285,.145,[.025,.026,.017]);
      return;
    }
    c.volume(x,.34,.110,[.046,.078,.025]);
    c.volume(x-sign*.02,.43,.115,[.031,.031,.024]);
    c.form("bird-beak",[[x-sign*.02,.43],[x-sign*.08,.42],[x-sign*.02,.40]],.014,.114,.004);
    c.form("bird-wing",[[x,.38],[x+sign*.08,.29],[x+sign*.025,.24]],.015,.127,.005);
    c.line([[x,.28],[x,.19]],.110,.007);
  } else if(kind === "dragon") {
    c.line([[x-sign*.03,.13],[x+sign*.04,.24],[x-sign*.035,.36],[x+sign*.035,.49],[x,.61]],.103,.031,10);
    c.volume(x,.64,.119,[.052,.048,.030]);
    for(const s of [-1,1])c.line([[x+s*.027,.66],[x+s*.047,.73]],.108,.008);
    c.line([[x,.58],[x-sign*.08,.51],[x-sign*.09,.55]],.118,.012);
    c.line([[x,.32],[x-sign*.08,.25],[x-sign*.09,.28]],.118,.012);
  } else if(kind === "monkey") {
    c.volume(x,.31,.112,[.046,.10,.027]);
    c.volume(x-sign*.01,.45,.126,[.048,.051,.029]);
    c.volume(x-sign*.025,.43,.151,[.028,.024,.014]);
    c.line([[x-sign*.03,.36],[x-sign*.07,.29],[x-sign*.07,.42]],.132,.012);
    c.line([[x,.23],[x+sign*.055,.12],[x+sign*.03,.08]],.116,.014);
    c.line([[x+sign*.03,.25],[x+sign*.075,.30],[x+sign*.06,.43]],.093,.010);
  } else if(kind === "horse" || kind === "tiger") {
    if(c.record.id === "W-4-12" && kind === "horse") {
      // A horse in a cloud is textually documented, but its precise lateral
      // position is not established by the cropped photo. Keep a small shallow
      // upper-margin indication, not a terrestrial animal at the figure's feet.
      c.curve("cloud-horse-base",[['M',.16,1.38],['Q',.11,1.43,.16,1.46],['Q',.20,1.50,.25,1.46],['Q',.32,1.49,.32,1.42],['L',.29,1.38]],.012,.061,.005);
      c.volume(.23,1.47,.084,[.067,.031,.017]);
      c.band([[.27,1.48],[.28,1.55]],.015,.087,.014);
      c.volume(.28,1.56,.098,[.031,.022,.016]);
      for(const xx of [.19,.26])c.line([[xx,1.47],[xx,1.405]],.097,.007);
      return;
    }
    c.volume(sign*.17,.26,.113,[.132,.064,.030]);
    const neck=kind === "horse"?.11:.055;
    c.band([[sign*.24,.27],[sign*.26,.27+neck]],.025,.114,.025);
    c.volume(sign*.26,.31+neck,.127,[.051,.037,.026]);
    for(const xx of [sign*.09,sign*.22])c.line([[xx,.24],[xx+.012,.09]],.119,.012);
    c.line([[sign*.055,.27],[sign*.01,.32],[sign*.005,.21]],.102,.012);
    if(kind === "tiger")for(const xx of [.10,.16,.22])c.line([[sign*xx,.30],[sign*(xx+.015),.23]],.146,.005);
  }
}

function companions(c:Carver) {
  const names:Record<SculptureRecord['companions'][number],string>={child:"童子",dragon:"龙",monkey:"猴",skeleton:"骷髅",horse:"马",tree:"树",tiger:"虎",bird:"鸟"};
  c.record.companions.forEach((kind,index)=>{
    const name=names[kind];
    const sign=c.has(`左侧${name}`)?-1:c.has(`右侧${name}`)?1:specialReader(c.record.id)?1:-1;
    companion(c,kind,sign,index);
    if(kind === "child" && c.has("双童子"))companion(c,kind,-sign,index);
  });
}

/** One explicit catalogue record yields one panel. No floor-based pose or
 * index-modulo fallback is used; unknown data keeps a neutral silhouette. */
export function renderSculpture(q:SculptureSurface, placement:SculpturePlacement, record:SculptureRecord) {
  const c=new Carver(q,placement,record);
  const atlas=q.b.reliefAtlas,entry=atlas?.entries.get(record.id);
  if(atlas && entry) {
    const [rx,ry,rw,rh]=entry.rect;
    // Corrected eastern photographs show wider stone panels than the earlier
    // abstract models. Expand the covered panel and its dressed border together.
    // Keep the photograph's proportions; the widest crops leave only a narrow
    // stone margin above/below instead of compressing faces or cropping hands.
    const boardWidth=Math.min(.95,Math.max(.66,1.72*rw/rh));
    panel(c,boardWidth);
    const fit=Math.min(boardWidth/rw,1.72/rh),width=rw*fit,height=rh*fit;
    const geometry=q.b.geo(`photographic-relief:${record.id}:${entry.rect.join(":")}:${atlas.manifest.width}:${atlas.manifest.height}:${width}:${height}`,()=>{
      const g=new THREE.PlaneGeometry(width,height),uv=g.getAttribute("uv");
      for(let i=0;i<uv.count;i++)uv.setXY(i,(rx+uv.getX(i)*rw)/atlas.manifest.width,1-(ry+(1-uv.getY(i))*rh)/atlas.manifest.height);
      return g;
    });
    const {angle:a,u,y,radius,time,size:s}=placement;
    // panel() uses a fixed .032 centre offset and .045 thickness, so its
    // front is radius+.0545 even when the figure scale is .88 upstairs.
    // This mounting clearance must not be scaled with the photograph.
    const z=radius+.061;
    const p:Point=[u*Math.cos(a)+z*Math.sin(a),y+.86*s,z*Math.cos(a)-u*Math.sin(a)];
    q.add(geometry,"sculpture-photo",time+.002,p,a,{s:[s,s,s],shade:1,tint:[1,1,1],lift:.15,duration:.012});
    // The photo batch preserves this order and has two triangles per panel.
    q.b.reliefPanelIds.push(record.id);
    return;
  }
  panel(c);
  support(c);
  companions(c);
  body(c);
  head(c,specialTraveller(record.id)?-.045:0);
  arms(c);
  objects(c);
}
