import * as THREE from "three";

export type ReliefAtlasEntry = {
  id: string;
  /** Pixel rectangle, measured from the atlas's top-left, excluding its gutter. */
  rect: [number,number,number,number];
  sourceUrl: string;
  author: string;
  license: string;
};
export type ReliefAtlasManifest = {
  version: 1;
  image: string;
  width: number;
  height: number;
  entries: ReliefAtlasEntry[];
};
export type ReliefAtlas = {
  manifest: ReliefAtlasManifest;
  entries: ReadonlyMap<string,ReliefAtlasEntry>;
  texture: THREE.Texture;
  dispose():void;
};

/** Atlas files contain only publishable photographs, with their attribution in
 * the manifest. Historical scans with restricted rights stay outside public/.
 * No inference of metric sculptural depth is made from image brightness. */
export async function loadReliefAtlas(signal:AbortSignal):Promise<ReliefAtlas|null> {
  let texture:THREE.Texture|undefined,bitmap:ImageBitmap|undefined;
  try {
    const base=import.meta.env.BASE_URL;
    const siteBase=new URL(base,window.location.origin);
    const manifestUrl=new URL("sculptures/relief-atlas.json",siteBase);
    const response=await fetch(manifestUrl,{signal});
    if(!response.ok)return null;
    const manifest=await response.json() as ReliefAtlasManifest;
    if(manifest.version!==1 || !Array.isArray(manifest.entries) || !manifest.entries.length)return null;
    if(!Number.isInteger(manifest.width)||!Number.isInteger(manifest.height)||manifest.width<1||manifest.height<1||manifest.width>4096||manifest.height>4096||manifest.width*manifest.height>8_388_608)throw Error("Relief atlas exceeds its texture budget");
    const entries=new Map<string,ReliefAtlasEntry>();
    for(const entry of manifest.entries) {
      const [x,y,w,h]=entry.rect ?? [];
      if(!/^[EW]-[1-5]-(0[1-9]|1[0-6])$/.test(entry.id)||![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<1||h<1||x+w>manifest.width||y+h>manifest.height||!entry.sourceUrl||!entry.author||!entry.license)continue;
      entries.set(entry.id,entry);
    }
    if(!entries.size)return null;
    const imageUrl=manifest.image.startsWith("/sculptures/")?new URL(manifest.image.slice(1),siteBase):new URL(manifest.image,manifestUrl);
    if(imageUrl.origin!==window.location.origin)throw Error("Relief atlas must be a local published asset");
    const imageResponse=await fetch(imageUrl,{signal});
    if(!imageResponse.ok)throw Error("Relief atlas image unavailable");
    const blob=await imageResponse.blob();
    if(signal.aborted)return null;
    bitmap=await createImageBitmap(blob,{imageOrientation:"flipY",premultiplyAlpha:"none",colorSpaceConversion:"none"});
    if(signal.aborted){bitmap.close();return null;}
    if(bitmap.width!==manifest.width||bitmap.height!==manifest.height)throw Error("Relief atlas image dimensions differ from its manifest");
    texture=new THREE.Texture(bitmap);
    texture.name="licensed-sculpture-photographs";
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.flipY=false;
    texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
    texture.magFilter=THREE.LinearFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;
    texture.needsUpdate=true;
    const ownedTexture=texture,ownedBitmap=bitmap;
    return {manifest,entries,texture,dispose(){ownedTexture.dispose();ownedBitmap.close();}};
  } catch(error) {
    texture?.dispose();bitmap?.close();
    // The architecture remains usable when optional photographic coverage is
    // unavailable. An aborted React mount must not leave late textures alive.
    if(!signal.aborted)console.info("Photographic relief atlas unavailable; retaining documented geometry.",error);
    return null;
  }
}
