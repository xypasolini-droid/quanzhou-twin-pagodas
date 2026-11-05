import * as THREE from "three";

export type SurfaceName = "brick" | "wood" | "jade" | "stone" | "plaster" | "tile" | "bronze" | "recess" | "cloth" | "paper" | "moss" | "glass";

type SurfaceSpec = {
  color: string;
  grain: number;
  roughness: number;
  bump: number;
  metalness?: number;
};

// Names retain the portable starter's API. For the Kaiyuan towers, jade/tile/
// plaster are stone variants: the eaves, brackets and reliefs are granite too.
// Calibrated from full-height Zhenguo and Renshou eave-detail photographs.
const surfaces: Record<SurfaceName, SurfaceSpec> = {
  stone:   {color:"#9d907d",grain:9,roughness:.96,bump:.014},
  plaster: {color:"#a7957e",grain:8,roughness:.94,bump:.012},
  tile:    {color:"#8f8b7c",grain:9,roughness:.95,bump:.011},
  jade:    {color:"#7e7b6e",grain:8,roughness:.96,bump:.013},
  brick:   {color:"#948b7c",grain:9,roughness:.97,bump:.014},
  wood:    {color:"#744436",grain:4,roughness:.87,bump:.006},
  bronze:  {color:"#614a36",grain:5,roughness:.78,bump:.007,metalness:.32},
  recess:  {color:"#423f37",grain:3,roughness:1,bump:.006},
  cloth:   {color:"#656354",grain:3,roughness:1,bump:.004},
  paper:   {color:"#c2b8a0",grain:3,roughness:.96,bump:.003},
  moss:    {color:"#626f43",grain:7,roughness:1,bump:.009},
  glass:   {color:"#a9b6b2",grain:0,roughness:.24,bump:0},
};

const granite = new Set<SurfaceName>(["stone","plaster","tile","jade","brick"]);

function randomFor(name: string) {
  let seed = Array.from(name).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7163) % 2147483647;
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function canvasOf(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  return canvas;
}

export function createHeritageMaterials(renderer: THREE.WebGLRenderer) {
  const textures: THREE.Texture[] = [];
  const materials = {} as Record<SurfaceName, THREE.MeshStandardMaterial>;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const makeTexture = (canvas: HTMLCanvasElement, color = false) => {
    const texture = new THREE.CanvasTexture(canvas);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = anisotropy;
    textures.push(texture);
    return texture;
  };

  for (const [name, spec] of Object.entries(surfaces) as [SurfaceName, SurfaceSpec][]) {
    if (name === "glass") {
      materials[name] = new THREE.MeshPhysicalMaterial({
        color:spec.color, roughness:.24, metalness:0, transparent:true,
        opacity:.08, depthWrite:false, clearcoat:.35, vertexColors:true,
      });
      continue;
    }

    const rand = randomFor(name);
    const size = 512;
    const canvas = canvasOf(size);
    const ctx = canvas.getContext("2d")!;
    const pixels = ctx.createImageData(size, size);
    const base = [1,3,5].map(offset => parseInt(spec.color.slice(offset, offset+2), 16));
    const stone = granite.has(name);

    // Quartz/feldspar and mica are small mineral flecks. Broad variation is
    // periodic so UV wrap has no bright seam and blocks do not look painted.
    for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
      const u=x/size*Math.PI*2, v=y/size*Math.PI*2;
      const cloud = Math.sin(u+Math.sin(v)*.7)*1.8 + Math.sin(3*u-2*v)*1.2
        + Math.sin(7*u+4*v)*.6 + Math.sin(13*u-9*v)*.3;
      const grain = (rand()-.5)*spec.grain;
      const mineral = rand();
      const fleck = stone ? (mineral>.972 ? 14 : mineral<.035 ? -16 : 0) : 0;
      const i=(y*size+x)*4;
      // Small ochre feldspar crystals sit beside neutral quartz/dark mica.
      // The colour difference remains confined to mineral-sized details.
      const feldspar=stone && mineral>.92 && mineral<.945;
      for (let c=0;c<3;c++) {
        const mineralTint=feldspar?[9,4,-3][c]:0;
        pixels.data[i+c]=base[c]+cloud*[1,.9,.72][c]+grain+fleck+mineralTint;
      }
      pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);

    // Quiet, irregular weathering. These are pigment changes only, not pits.
    const clouds = stone ? 42 : name === "bronze" ? 32 : 14;
    for (let n=0;n<clouds;n++) {
      const x=rand()*size, y=rand()*size, radius=size*(.03+rand()*.12);
      const stain = stone
        ? n%5===0 ? "rgba(140,82,41,.18)"
          : n%5===1 ? "rgba(190,179,137,.10)"
          : "rgba(49,57,47,.045)"
        : name==="bronze"
          ? n%7===0 ? "rgba(50,78,62,.13)" : "rgba(111,63,32,.09)"
          : name==="moss"
            ? n%2===0 ? "rgba(141,145,76,.11)" : "rgba(29,54,34,.11)"
            : "rgba(47,41,34,.035)";
      for (const ox of [-size,0,size]) for (const oy of [-size,0,size]) {
        const g=ctx.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,radius);
        g.addColorStop(0,stain);
        g.addColorStop(1,"rgba(47,50,43,0)");
        ctx.fillStyle=g;
        ctx.fillRect(x+ox-radius,y+oy-radius,2*radius,2*radius);
      }
    }

    if (name === "wood") {
      // Muted red timber exists only at the small portal gates.
      for(let n=0;n<130;n++) {
        const x=rand()*size;
        ctx.strokeStyle=n%3?"rgba(27,23,18,.1)":"rgba(190,133,99,.09)";
        ctx.lineWidth=.5+rand();ctx.beginPath();ctx.moveTo(x,0);
        for(let y=0;y<=size;y+=8) ctx.lineTo(x+Math.sin(y*.025+x)*1.1,y);
        ctx.stroke();
      }
    }

    // Height map is independent of the colour map. Granite stays fine-grained
    // in close-up; relief carving is handled by real geometry, not this map.
    const detail=canvasOf(256), dc=detail.getContext("2d")!;
    const heightPixels=dc.createImageData(256,256);
    for(let y=0;y<256;y++) for(let x=0;x<256;x++) {
      const i=(y*256+x)*4;
      const grain=(rand()-.5)*(stone?44:22);
      const striation=name==="wood"?Math.sin(x*.7+Math.sin(y*.025))*12:0;
      const height=128+grain+striation;
      heightPixels.data[i]=heightPixels.data[i+1]=heightPixels.data[i+2]=height;
      heightPixels.data[i+3]=255;
    }
    dc.putImageData(heightPixels,0,0);

    const roughCanvas=canvasOf(256), rc=roughCanvas.getContext("2d")!;
    const roughPixels=rc.createImageData(256,256);
    for(let y=0;y<256;y++) for(let x=0;x<256;x++) {
      const i=(y*256+x)*4;
      const value=239+Math.sin(x/256*Math.PI*6)*3+Math.sin(y/256*Math.PI*8)*3+(rand()-.5)*12;
      roughPixels.data[i]=roughPixels.data[i+1]=roughPixels.data[i+2]=value;
      roughPixels.data[i+3]=255;
    }
    rc.putImageData(roughPixels,0,0);

    materials[name]=new THREE.MeshStandardMaterial({
      map:makeTexture(canvas,true),
      bumpMap:makeTexture(detail), roughnessMap:makeTexture(roughCanvas),
      bumpScale:spec.bump, roughness:spec.roughness,
      metalness:spec.metalness??0, vertexColors:true,
    });
  }

  return {
    materials,
    dispose() {
      textures.forEach(texture=>texture.dispose());
      Object.values(materials).forEach(material=>material.dispose());
    },
  };
}
