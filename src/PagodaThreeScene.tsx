import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createHeritageMaterials } from './heritage/materials';
import { HeritageBuilder } from './heritage/builder';
import { buildArchitecture, courtyard } from './heritage/architecture';
import { landscape } from './heritage/landscape';
export type DetailView='overview'|'east'|'west'|'eaves'|'base'|'reliefs';
export type CameraAction={type:'reset'|'left'|'right'|'in'|'out';sequence:number};
type Props={progress:number;view:DetailView;action:CameraAction;onReady:()=>void;onError:(message:string)=>void};
export default function PagodaThreeScene({progress,view,action,onReady,onError}:Props){
  const mountRef=useRef<HTMLDivElement>(null),state=useRef({progress,view,action}),callbacks=useRef({onReady,onError});
  useEffect(()=>{state.current={progress,view,action};},[progress,view,action]);
  useEffect(()=>{callbacks.current={onReady,onError};},[onReady,onError]);
  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
    catch{callbacks.current.onError('当前浏览器未能启用三维图形。请使用支持 WebGL2 的 Chrome 或 Safari 重试。');return;}
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,400);
    renderer.setPixelRatio(Math.min(devicePixelRatio,window.innerWidth<700?1.5:2));
    renderer.setClearColor(0xf4f1e9,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    mount.appendChild(renderer.domElement);
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.025);
    scene.environment=environment.texture;scene.environmentIntensity=.22;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xfffcf4,0x777a72,.65));
    const key=new THREE.DirectionalLight(0xfff8eb,2.4);key.position.set(-35,60,42);key.target.position.set(0,13,0);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-48,right:48,top:42,bottom:-32,near:1,far:160});
    key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=3;scene.add(key,key.target);
    const fill=new THREE.DirectionalLight(0xe8eff0,.50);fill.position.set(35,24,5);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xfff6e8,.65);rim.position.set(-10,30,-40);scene.add(rim);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;
    controls.enablePan=true;controls.minDistance=6;controls.maxDistance=220;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.56;
    const materialKit=createHeritageMaterials(renderer),builder=new HeritageBuilder(materialKit.materials);
    try{courtyard(builder);landscape(builder);buildArchitecture(builder);builder.finish(scene);}catch(error){
      console.error(error);callbacks.current.onError('模型加载未完成，请重新加载页面。');builder.dispose();materialKit.dispose();environment.dispose();controls.dispose();renderer.dispose();renderer.domElement.remove();return;
    }
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(230,180),new THREE.ShadowMaterial({color:0x474d43,opacity:.14}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.receiveShadow=true;scene.add(ground);
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const destination=new THREE.Vector3(),targetDestination=new THREE.Vector3();
    let lastView=state.current.view,lastAction=-1,transition=false,needsFrame=true,raf=0,lastNow=performance.now();
    let lastProgress=-2,lastShadowProgress=-2,lastShadowTime=-Infinity,frames=0,elapsed=0,rendered=0,shadowUpdates=0;
    const preset=(v:DetailView,instant=false)=>{
      let target:THREE.Vector3,position:THREE.Vector3;
      if(v==='overview'){
        const distance=Math.max(37/(2*Math.tan(THREE.MathUtils.degToRad(16))),62/(2*Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect))*1.04;
        target=new THREE.Vector3(0,15.4,0);position=new THREE.Vector3(.20,.15,1).normalize().multiplyScalar(distance).add(target);
      }else if(v==='east'||v==='west'){
        const x=v==='east'?17:-17,y=v==='east'?15.9:14.7;
        const distance=Math.max(35/(2*Math.tan(THREE.MathUtils.degToRad(16))),17/(2*Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect))*1.04;
        target=new THREE.Vector3(x,y,0);position=new THREE.Vector3(v==='east'?.52:-.52,.12,1).normalize().multiplyScalar(distance).add(target);
      }else if(v==='eaves'){target=new THREE.Vector3(20.9,18.6,3.9);position=new THREE.Vector3(27,17.9,11);}
      else if(v==='reliefs'){target=new THREE.Vector3(-17,15.5,4.2);position=new THREE.Vector3(-16.4,15.6,13.5);}
      else{target=new THREE.Vector3(20.5,1.6,4.7);position=new THREE.Vector3(27,4.5,14);}
      destination.copy(position);targetDestination.copy(target);
      if(instant||reducedMotion){camera.position.copy(destination);controls.target.copy(targetDestination);transition=false;}else transition=true;
      needsFrame=true;
    };
    const resize=()=>{const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();preset(state.current.view,true);needsFrame=true;};
    const ro=new ResizeObserver(resize);ro.observe(mount);resize();
    const interrupt=()=>{transition=false;};controls.addEventListener('start',interrupt);
    const contextLost=(e:Event)=>{e.preventDefault();callbacks.current.onError('三维图形连接已中断。请重新加载恢复场景。');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
    builder.progress.value=state.current.progress;renderer.compile(scene,camera);
    const render=(now:number)=>{
      const frameSeconds=(now-lastNow)/1000,dt=Math.min(frameSeconds,.1);lastNow=now;
      const current=state.current;builder.progress.value=current.progress;
      if(current.view!==lastView){lastView=current.view;preset(current.view);}
      if(lastAction!==current.action.sequence){lastAction=current.action.sequence;const type=current.action.type;
        if(type==='reset')preset(current.view);else{transition=false;const offset=camera.position.clone().sub(controls.target);
          if(type==='left'||type==='right')offset.applyAxisAngle(new THREE.Vector3(0,1,0),type==='left'?.26:-.26);
          else offset.multiplyScalar(type==='in'?.83:1.2);
          offset.setLength(THREE.MathUtils.clamp(offset.length(),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);needsFrame=true;
        }
      }
      if(transition){const amount=1-Math.exp(-dt*5);camera.position.lerp(destination,amount);controls.target.lerp(targetDestination,amount);if(camera.position.distanceTo(destination)<.015&&controls.target.distanceTo(targetDestination)<.015)transition=false;}
      const cameraChanged=controls.update(),progressChanged=lastProgress!==current.progress;
      const shadowChanged=lastShadowProgress!==current.progress&&(now-lastShadowTime>=1000/30||current.progress===0||current.progress===1);
      if(!document.hidden&&(needsFrame||cameraChanged||transition||progressChanged||shadowChanged)){
        if(shadowChanged){renderer.shadowMap.needsUpdate=true;lastShadowProgress=current.progress;lastShadowTime=now;shadowUpdates++;}
        renderer.render(scene,camera);rendered++;lastProgress=current.progress;needsFrame=false;
      }
      frames++;elapsed+=frameSeconds;
      if(elapsed>.75){mount.dataset.renderStats=JSON.stringify({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,pieces:builder.pieces,fps:Math.round(frames/elapsed),renderFps:Math.round(rendered/elapsed),shadowUpdatesPerSecond:Math.round(shadowUpdates/elapsed),idle:rendered===0,dpr:renderer.getPixelRatio(),shadowLights:1,postPasses:0});frames=0;elapsed=0;rendered=0;shadowUpdates=0;}
      raf=requestAnimationFrame(render);
    };
    raf=requestAnimationFrame(render);callbacks.current.onReady();
    return()=>{cancelAnimationFrame(raf);ro.disconnect();controls.removeEventListener('start',interrupt);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);builder.dispose();materialKit.dispose();ground.geometry.dispose();ground.material.dispose();environment.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div ref={mountRef} className="three-scene" aria-label="可旋转的泉州开元寺镇国塔与仁寿塔三维模型"/>;
}
