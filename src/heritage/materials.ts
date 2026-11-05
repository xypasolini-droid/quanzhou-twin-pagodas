import * as THREE from "three";
import type { ReliefAtlas } from "./reliefAtlas";

export type SurfaceName = "brick" | "wood" | "jade" | "stone" | "plaster" | "tile" | "bronze" | "recess" | "cloth" | "paper" | "moss" | "glass" | "sculpture-photo";
type ProceduralSurface=Exclude<SurfaceName,"sculpture-photo">;
type SurfaceSpec = { color: string; grain: number; roughness: number; bump: number; metalness?: number };

// API names come from the starter. jade/tile/plaster are granite variants here.
// Observed in the user's BT.709 drone footage, especially clip 0086 at 17s:
// cool grey roof strips, grey-brown wall blocks, pale reliefs and ochre weathering.
// These are interpretive albedos, not sampled sunlit pixels or calibrated colours.
const surfaces: Record<ProceduralSurface, SurfaceSpec> = {
  stone:   {color:"#978a7a",grain:12,roughness:.98,bump:.015},
  plaster: {color:"#bdb19f",grain:8,roughness:.97,bump:.009},
  tile:    {color:"#7e7c74",grain:14,roughness:.99,bump:.017},
  jade:    {color:"#74726a",grain:12,roughness:.98,bump:.014},
  brick:   {color:"#9c866c",grain:12,roughness:.98,bump:.015},
  wood:    {color:"#67473b",grain:7,roughness:.91,bump:.009},
  bronze:  {color:"#654936",grain:9,roughness:.86,bump:.011,metalness:.28},
  recess:  {color:"#4d4b44",grain:10,roughness:1,bump:.014},
  cloth:   {color:"#656354",grain:5,roughness:1,bump:.004},
  paper:   {color:"#c2b8a0",grain:4,roughness:.96,bump:.003},
  moss:    {color:"#5d6b40",grain:10,roughness:1,bump:.010},
  glass:   {color:"#a9b6b2",grain:0,roughness:.24,bump:0},
};
const granite = new Set<SurfaceName>(["stone","plaster","tile","jade","brick"]);
function randomFor(name: string) {
  let seed = Array.from(name).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7163)%2147483647;
  return ()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
}
function canvasOf(size:number) {const c=document.createElement("canvas");c.width=c.height=size;return c;}
type NoiseField={w:number;h:number;values:Float32Array};
function field(w:number,h:number,rand:()=>number):NoiseField {
  return {w,h,values:Float32Array.from({length:w*h},rand)};
}
// Seamless bilinear value noise. Stretched grids make water streaks run along
// the stone's local vertical direction; no photographic pixels enter the app.
function sample(f:NoiseField,u:number,v:number) {
  const x=u*f.w,y=v*f.h,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const tx=fx*fx*(3-2*fx),ty=fy*fy*(3-2*fy);
  const x0=((ix%f.w)+f.w)%f.w,x1=(x0+1)%f.w,y0=((iy%f.h)+f.h)%f.h,y1=(y0+1)%f.h;
  const a=f.values[y0*f.w+x0]*(1-tx)+f.values[y0*f.w+x1]*tx;
  const b=f.values[y1*f.w+x0]*(1-tx)+f.values[y1*f.w+x1]*tx;
  return a*(1-ty)+b*ty;
}
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};

export function createHeritageMaterials(renderer:THREE.WebGLRenderer,reliefAtlas:ReliefAtlas|null=null) {
  const textures:THREE.Texture[]=[],materials={} as Record<SurfaceName,THREE.MeshStandardMaterial>;
  const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const makeTexture=(canvas:HTMLCanvasElement,name:string,color=false)=>{
    const t=new THREE.CanvasTexture(canvas);t.name=name;if(color)t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;textures.push(t);return t;
  };
  for(const [name,spec] of Object.entries(surfaces) as [ProceduralSurface,SurfaceSpec][]){
    if(name==="glass"){
      materials[name]=new THREE.MeshPhysicalMaterial({color:spec.color,roughness:.24,metalness:0,transparent:true,opacity:.08,depthWrite:false,clearcoat:.35,vertexColors:true});continue;
    }
    const rand=randomFor(name),stone=granite.has(name),paleCarving=name==="plaster";
    // Only the most exposed wall and sculpture maps need 1024px. Other maps
    // stay at 512px, and height/roughness at 256px to bound memory and startup.
    const size=name==="stone"||name==="plaster"?1024:512;
    const canvas=canvasOf(size),ctx=canvas.getContext("2d")!,pixels=ctx.createImageData(size,size);
    const base=[1,3,5].map(o=>parseInt(spec.color.slice(o,o+2),16));
    const broad=field(7,7,rand),patch=field(29,29,rand),mineral=field(127,127,rand),runoff=field(21,3,rand),thinRunoff=field(71,5,rand);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size,i=(y*size+x)*4;
      const cloud=sample(broad,u,v),mottling=sample(patch,u,v),crystal=sample(mineral,u,v);
      const grain=(rand()-.5)*spec.grain;
      const fleck=rand(),quartz=stone?(fleck>.977?15:fleck<.035?-16:0)*(paleCarving?.55:1):0;
      // Dry pale mineral skins break up ochre/brown surfaces at several scales.
      // Runoff is pigmentation, not baked lighting or a synthetic cavity shadow.
      // Drone close-ups show quieter pale carved faces beside locally stained
      // masonry. Keep broad age marks sparse rather than coating every surface.
      const bleach=stone?smooth(.61,.80,mottling*.62+crystal*.38)*(paleCarving?.11:.19):0;
      const oxide=stone?smooth(.60,.82,cloud)*(.56+(mottling-.5)*.25)*(paleCarving?.26:1):0;
      const flow=stone?(smooth(.65,.88,sample(runoff,u,v))*.31+smooth(.74,.92,sample(thinRunoff,u,v))*.055)*(paleCarving?.25:name==="tile"?.65:1):0;
      const variation=(cloud-.5)*(paleCarving?12:stone?28:9)+(mottling-.5)*(paleCarving?6:stone?10:6)+(crystal-.5)*(paleCarving?3:stone?5:4);
      for(let c=0;c<3;c++){
        let value=base[c]+variation+grain+quartz;
        if(stone){
          const oxideTint=name==="tile"?[6,3,-3]:[34,7,-17];
          value+=oxide*oxideTint[c];
          value=value*(1-bleach)+[199,192,179][c]*bleach;
          value=value*(1-flow)+[58,59,56][c]*flow;
        }else if(name==="bronze"){
          const patina=smooth(.59,.78,cloud*.6+mottling*.4)*.55;
          value=value*(1-patina)+[65,91,76][c]*patina;
        }else if(name==="moss")value+=(cloud-.5)*[24,29,13][c];
        pixels.data[i+c]=value;
      }
      pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    if(name==="wood"){
      for(let n=0;n<100;n++){
        const x=rand()*size;ctx.strokeStyle=n%3?"rgba(24,24,19,.15)":"rgba(178,128,92,.12)";
        ctx.lineWidth=.5+rand();ctx.beginPath();ctx.moveTo(x,0);
        for(let y=0;y<=size;y+=8)ctx.lineTo(x+Math.sin(y*.025+x)*1.1,y);ctx.stroke();
      }
    }
    // Micro-height is independent of broad stains: a dark stripe stays flat.
    // Fine mineral grains and very shallow pits avoid a waxy, polished surface.
    const detail=canvasOf(256),dc=detail.getContext("2d")!,heights=dc.createImageData(256,256);
    const rough=canvasOf(256),rc=rough.getContext("2d")!,roughness=rc.createImageData(256,256);
    const heightNoise=field(64,64,rand);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4,u=x/256,v=y/256,grain=(rand()-.5)*(paleCarving?28:stone?45:27);
      const pit=stone&&rand()<(paleCarving?.012:.022)?-22:0;
      const woodgrain=name==="wood"?Math.sin(x*.7+Math.sin(y*.025))*12:0;
      const height=128+grain+pit+(sample(heightNoise,u,v)-.5)*(paleCarving?6:stone?12:7)+woodgrain;
      const r=stone?238+(sample(patch,u,v)-.5)*23+(rand()-.5)*10:235+(rand()-.5)*15;
      heights.data[i]=heights.data[i+1]=heights.data[i+2]=height;heights.data[i+3]=255;
      roughness.data[i]=roughness.data[i+1]=roughness.data[i+2]=r;roughness.data[i+3]=255;
    }
    dc.putImageData(heights,0,0);rc.putImageData(roughness,0,0);
    materials[name]=new THREE.MeshStandardMaterial({
      map:makeTexture(canvas,`${name}-colour`,true),bumpMap:makeTexture(detail,`${name}-microheight`),roughnessMap:makeTexture(rough,`${name}-roughness`),
      bumpScale:spec.bump,roughness:spec.roughness,metalness:spec.metalness??0,vertexColors:true,
    });
  }
  if(reliefAtlas)reliefAtlas.texture.anisotropy=Math.min(4,anisotropy);
  materials["sculpture-photo"]=new THREE.MeshStandardMaterial({
    color:0xf8f5ee,map:reliefAtlas?.texture??null,roughness:.98,metalness:0,
    bumpMap:reliefAtlas?.texture??null,bumpScale:.005,
    // A small photographic fill prevents the source's existing shading from
    // being crushed a second time on a north-facing panel. It remains a lit,
    // shadow-receiving stone surface rather than an unlit billboard.
    emissive:0xffffff,emissiveMap:reliefAtlas?.texture??null,emissiveIntensity:reliefAtlas?.texture ? .1 : 0,
    vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  });
  return {materials,dispose(){textures.forEach(t=>t.dispose());Object.values(materials).forEach(m=>m.dispose());}};
}
