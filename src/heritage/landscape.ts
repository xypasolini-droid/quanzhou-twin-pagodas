import * as THREE from 'three';
import { HeritageBuilder, type Point } from './builder';

/** Restrained greenery for the exhibition setting, not a reconstruction of temple planting. */
export function landscape(b:HeritageBuilder){
  const leaf=b.geo('kaiyuan-foliage',()=>new THREE.IcosahedronGeometry(1,2));
  const rough=(n:number)=>{const x=Math.sin(n*71.7+41.2)*5182.25;return x-Math.floor(x);};
  const trees:[number,number,number][]=[[-26.8,-6.7,1.1],[-26.6,7.2,.78],[26.7,-7.6,1.02],[27.3,6.2,.83],[-8,-8.5,.68],[7.5,-8.8,.82]];
  trees.forEach(([x,z,s],index)=>{
    const h=4.2*s;
    b.cylinder(.10*s,.22*s,h,[x,h/2,z],'bronze',-1,{lift:0,shade:.83});
    for(let arm=0;arm<5;arm++){
      const a=arm*Math.PI*2/5+index*.4;
      const end:Point=[x+Math.sin(a)*1.25*s,h+.25*s,z+Math.cos(a)*1.25*s];
      b.tube([[x,h*.5,z],[x+Math.sin(a)*.55*s,h*.8,z+Math.cos(a)*.55*s],end],.07*s,'bronze',-1,{lift:0},5);
    }
    for(let i=0;i<23;i++){
      const a=rough(index*50+i)*Math.PI*2,r=Math.sqrt(rough(index*99+i+4))*2*s;
      const p:Point=[x+Math.sin(a)*r,h+.2+rough(i+25)*1.15*s,z+Math.cos(a)*r];
      const size=(.75+rough(i+15)*.65)*s;
      b.add(leaf,'moss',-1,{p,s:[size, size*.66,size*.9],r:[rough(i),a,rough(i+8)],lift:0,shade:.72+rough(i*3+index)*.36,tint:[.92+rough(i)*.12,1,.80+rough(i+3)*.12]});
    }
  });
  // Low planting islands accent the side margins, leaving the tower silhouettes clear.
  for(const sign of [-1,1])for(let i=0;i<12;i++){
    const x=sign*(26.3+rough(i+43)*1.2),z=-8+i*1.4;
    b.add(leaf,'moss',-1,{p:[x,.32,z],s:[.6,.45,.72],lift:0,shade:.65+rough(i)*.24,tint:[.9,1,.82]});
  }
}
