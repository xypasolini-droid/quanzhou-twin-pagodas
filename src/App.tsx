import { useCallback, useEffect, useRef, useState } from 'react';
import HistoryPanel, {type HistoryLocation, type TowerSide} from './HistoryPanel';
import PagodaThreeScene, { type DetailView, type CameraAction } from './PagodaThreeScene';
import ReliefGallery from './ReliefGallery';
import type { SculptureRecord } from './heritage/sculptureTypes';
import { SCULPTURES } from './heritage/sculptureCatalog';
import { WEST_BUILD_END } from './heritage/history';
const DURATION = 22;
const stages = [['台基',.10],['第一层',.26],['第二层',.42],['第三层',.58],['第四层',.74],['第五层',.90],['塔刹',1]] as const;
const views: [DetailView,string][] = [['overview','双塔全景'],['west','西塔 · 仁寿'],['east','东塔 · 镇国'],['eaves','石檐斗拱'],['reliefs','人物石刻'],['base','须弥塔座']];
const detailNotes:Partial<Record<DetailView,[string,string]>>={eaves:['层层出挑，石作木形','近看石斗拱、圆瓦当与檐角铜铃'],reliefs:['一石一像，各有姿态','近看石像衣纹、持物与浮雕起伏'],base:['重叠石座，托起千年','须弥座线脚、角部负塔形象与石栏']};
export default function App(){
  const [progress,setProgress]=useState(1),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[view,setView]=useState<DetailView>('overview');
  const [action,setAction]=useState<CameraAction>({type:'reset',sequence:0});
  const [sourcesOpen,setSourcesOpen]=useState(false);
  const [galleryOpen,setGalleryOpen]=useState(false);
  const [galleryTower,setGalleryTower]=useState<TowerSide>('east'),[galleryId,setGalleryId]=useState<string>();
  const [historyOpen,setHistoryOpen]=useState(false),[historyTower,setHistoryTower]=useState<TowerSide>('east');
  const historyDialog=useRef<HTMLDialogElement>(null),historyButton=useRef<HTMLButtonElement>(null),historyVisited=useRef(false);
  const historyFocusView=useRef<HistoryLocation|undefined>(undefined);
  const [fullscreen,setFullscreen]=useState(false),[focusMode,setFocusMode]=useState(false);
  const appRef=useRef<HTMLElement>(null),fullscreenButton=useRef<HTMLButtonElement>(null),focusScroll=useRef(0);
  const [sculpture,setSculpture]=useState<SculptureRecord>();
  const [tower,setTower]=useState<TowerSide>('east'),[sunlight,setSunlight]=useState<'day'|'late'>('day');
  const progressRef=useRef(1),dialogRef=useRef<HTMLDialogElement>(null),sourceButton=useRef<HTMLButtonElement>(null);
  const onReady=useCallback(()=>setReady(true),[]),onError=useCallback((message:string)=>setError(message),[]);
  const seek=useCallback((next:number)=>{const p=Math.max(0,Math.min(1,next));progressRef.current=p;setProgress(p);},[]);
  useEffect(()=>{
    if(!playing||!ready)return;let frame=0,previous=performance.now();
    const tick=(now:number)=>{const dt=Math.min((now-previous)/1000,.1);previous=now;
      if(!document.hidden){const next=Math.min(1,progressRef.current+dt*speed/DURATION);seek(next);if(next===1){setPlaying(false);return;}}
      frame=requestAnimationFrame(tick);
    };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,ready,speed,seek]);
  useEffect(()=>{const d=dialogRef.current;if(!d)return;if(sourcesOpen&&!d.open)d.showModal();if(!sourcesOpen&&d.open)d.close();},[sourcesOpen]);
  useEffect(()=>{const d=historyDialog.current;if(!d)return;if(historyOpen&&!d.open)d.showModal();if(!historyOpen&&d.open)d.close();},[historyOpen]);
  useEffect(()=>{
    const changed=()=>{const active=document.fullscreenElement===appRef.current;setFullscreen(active);if(!active&&!document.querySelector('dialog[open]'))fullscreenButton.current?.focus({preventScroll:true});};
    document.addEventListener('fullscreenchange',changed);
    return()=>document.removeEventListener('fullscreenchange',changed);
  },[]);
  useEffect(()=>{
    if(!focusMode)return;
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]'))setFocusMode(false);};
    document.addEventListener('keydown',key);appRef.current?.scrollTo({top:0});
    return()=>{document.removeEventListener('keydown',key);requestAnimationFrame(()=>{window.scrollTo({top:focusScroll.current});fullscreenButton.current?.focus({preventScroll:true});});};
  },[focusMode]);
  const toggleFullscreen=async()=>{
    if(document.fullscreenElement===appRef.current){await document.exitFullscreen().catch(()=>{});return;}
    if(focusMode){setFocusMode(false);return;}
    const app=appRef.current;if(!app)return;
    focusScroll.current=window.scrollY;
    if(document.fullscreenEnabled&&app.requestFullscreen){
      try{await app.requestFullscreen();app.scrollTo({top:0});return;}catch{/* The viewport layout remains available when native fullscreen is denied. */}
    }
    setFocusMode(true);
  };
  const scrollToViewer=()=>document.getElementById('main-scene')?.scrollIntoView({block:'start',behavior:'auto'});
  const readHistory=()=>{if(!historyVisited.current){setHistoryTower(tower);historyVisited.current=true;}historyFocusView.current=undefined;setHistoryOpen(true);};
  const closeHistory=()=>setHistoryOpen(false);
  const openGallery=()=>{setGalleryTower(tower);setGalleryId(sculpture?.id);setGalleryOpen(true);};
  const inspectRelief=useCallback((id:string)=>{const record=SCULPTURES.find(record=>record.id===id);if(!record)return;setGalleryTower(record.tower);setGalleryId(id);setGalleryOpen(true);},[]);
  const command=(type:CameraAction['type'])=>setAction(a=>({type,sequence:a.sequence+1}));
  const prepareConstruction=()=>{if(view!=='overview'){setView('overview');setSculpture(undefined);command('reset');}};
  const seekConstruction=(next:number)=>{if(next<1)prepareConstruction();setPlaying(false);seek(next);};
  const replay=()=>{setView('overview');setSculpture(undefined);command('reset');seek(0);setPlaying(true);};
  const chooseView=(next:DetailView)=>{setView(next);setSculpture(undefined);if(next==='east'||next==='west')setTower(next);command('reset');scrollToViewer();};
  const locateHistory=(next:HistoryLocation)=>{
    historyFocusView.current=next;setHistoryOpen(false);setPlaying(false);seek(1);setTower(historyTower);chooseView(next);
  };
  const locateSculpture=(record:SculptureRecord)=>{
    setGalleryOpen(false);
    setPlaying(false);
    seek(1);
    setTower(record.tower);
    setSculpture(record);
    setView('reliefs');
    command('reset');
    document.getElementById('main-scene')?.scrollIntoView({block:'start'});
  };
  const toggle=()=>{if(progressRef.current===1){prepareConstruction();seek(0);setPlaying(true);}else{if(!playing)prepareConstruction();setPlaying(v=>!v);}};
  const closeSources=()=>{setSourcesOpen(false);sourceButton.current?.focus();};
  const buildTower:TowerSide=progress<=WEST_BUILD_END?'west':'east';
  const buildStart=buildTower==='west'?0:WEST_BUILD_END,buildSpan=buildTower==='west'?WEST_BUILD_END:1-WEST_BUILD_END;
  const stageEnd=(end:number)=>buildStart+end*buildSpan;
  const localStage=progress===WEST_BUILD_END?'落成':stages.find(([,end])=>progress<=stageEnd(end))?.[0]??'塔刹';
  const stage=progress===1?'双塔落成':`${buildTower==='west'?'西塔':'东塔'} · ${localStage}`;
  const disabled=!ready||!!error;
  return <main ref={appRef} className={`exhibition${fullscreen?' is-fullscreen':''}${focusMode?' is-focus-mode':''}`}>
    <header className="site-header">
      <a className="brand" href="#main-scene" aria-label="泉州双塔，跳至三维场景"><span className="seal">泉</span><span>刺桐古建<small>QUANZHOU HERITAGE</small></span></a>
      <span className="edition">开元寺 / 宋代石构</span>
      <div className="header-actions">
        <button className="text-button history-jump" ref={historyButton} onClick={readHistory} aria-label="阅读双塔小志" aria-haspopup="dialog"><span>双塔</span>小志</button>
        <button className="text-button relief-gallery-entry" onClick={openGallery} aria-haspopup="dialog">石刻图志</button>
        <button className="text-button header-source" ref={sourceButton} onClick={()=>setSourcesOpen(true)} aria-label="实景参考与说明"><span className="source-long">实景参考与说明</span><span className="source-short">参考</span><span aria-hidden="true">↗</span></button>
        <button className="fullscreen-button" ref={fullscreenButton} type="button" onClick={toggleFullscreen} aria-pressed={fullscreen||focusMode} aria-label={fullscreen||focusMode?'退出全屏观赏':'全屏观赏'} title={fullscreen||focusMode?'退出全屏观赏（Esc）':'全屏观赏'}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">{fullscreen||focusMode?<path d="M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5"/>:<path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5"/>}</svg><span>{fullscreen||focusMode?'退出全屏':'全屏观赏'}</span></button>
      </div>
    </header>

    <div className="viewer-shell">
    <section id="main-scene" className={`stage${view!=='overview'?' is-detail-view':''}`} aria-label="泉州开元寺双塔交互模型">
    <section className="intro"><div><p className="eyebrow">KAIYUAN TEMPLE · THE TWIN PAGODAS</p><h1>东西相望，一城千年。</h1></div><p className="intro-note">以石为骨，仿木为形。<br/>在方寸之间，重见双塔营造。</p></section>
      <PagodaThreeScene progress={progress} view={view} action={action} tower={tower} sculpture={sculpture} sunlight={sunlight} onReady={onReady} onError={onError} onInspectRelief={inspectRelief}/>

      <div className="scene-information">
      <div className="scene-meta"><i/><span>{!ready?'正在准备场景':progress===1?'双塔已成':stage}</span><span>{Math.round(progress*100)}%</span></div>
      {detailNotes[view]?<div className="detail-caption"><span>{view==='reliefs'&&sculpture?`${tower==='east'?'镇国塔':'仁寿塔'} · 第 ${sculpture.level} 层 · ${sculpture.id}`:detailNotes[view]![0]}</span><small>{view==='reliefs'?<button className="gallery-inline" onClick={openGallery} aria-haspopup="dialog">查看实物照片与介绍 ↗</button>:detailNotes[view]![1]}</small></div>:view==='overview'?<div className="tower-facts"><span className="facts-label">双塔档案</span><span>仁寿塔 <b>45.06</b> 米</span><i/><span>镇国塔 <b>48.27</b> 米</span></div>:<div className="detail-caption"><span>{view==='west'?'西塔 · 仁寿塔':'东塔 · 镇国塔'}</span><small>{view==='west'?'1228—1237 · 45.06 米':'1238—1250 · 48.27 米'}</small></div>}
      </div>
      <div className="light-switch" role="group" aria-label="观察光线"><button aria-pressed={sunlight==='day'} onClick={()=>setSunlight('day')}>日光</button><button aria-pressed={sunlight==='late'} onClick={()=>setSunlight('late')}>斜阳</button></div>

      {!ready&&!error&&<div className="loading" role="status"><strong>塔</strong><p>正在铺陈双塔…</p></div>}
      {error&&<div className="loading error" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>重新加载</button></div>}

    <div className="viewer-dock">
    <nav className="view-switcher" aria-label="选择观赏位置">{views.map(([id,label])=><button key={id} data-view={id} aria-pressed={view===id} disabled={disabled} onClick={()=>chooseView(id)}>{label}</button>)}</nav>
    <section className="playback" aria-label="控制营造动画">
      <button className="play-button" disabled={disabled} onClick={toggle} aria-label={playing?'暂停营造':progress===1?'播放营造过程':'继续营造'}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{playing?<path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="3"/>:<path d="m8 4 12 8-12 8Z" fill="currentColor"/>}</svg><span>{playing?'暂停营造':progress===1?'观看营造':'继续营造'}</span></button>
      <div className="timeline-block"><div className="timeline-heading"><span>{stage}</span><time>{(progress*DURATION).toFixed(1)} <span>/ 22.0 s</span></time></div>
        <input className="timeline" type="range" aria-label="营造进度" aria-valuetext={`${Math.round(progress*100)}%，${stage}`} min="0" max="1000" value={Math.round(progress*1000)} disabled={disabled} onChange={e=>seekConstruction(Number(e.target.value)/1000)} style={{'--progress':`${progress*100}%`} as React.CSSProperties}/>
        <div className="milestones">{stages.map(([label,end])=><button key={label} disabled={disabled} className={progress>=stageEnd(end)?'passed':''} onClick={()=>seekConstruction(stageEnd(end))} aria-label={`查看${buildTower==='west'?'西塔':'东塔'}${label}完成状态`}>{label}</button>)}</div>
        <div className="construction-order" role="group" aria-label="按建成年代选择营造段落"><button disabled={disabled} aria-pressed={buildTower==='west'} onClick={()=>seekConstruction(0)}>西塔 <span>1228—1237</span></button><span aria-hidden="true">→</span><button disabled={disabled} aria-pressed={buildTower==='east'} onClick={()=>seekConstruction(WEST_BUILD_END+.001)}>东塔 <span>1238—1250</span></button><small>石构叠筑示意</small></div>
      </div>

    </section>
    <div className="dock-utilities">
      <div className="camera-tools" role="group" aria-label="调整视角">
        {([['left','↶','向左旋转'],['right','↷','向右旋转'],['in','＋','放大'],['out','−','缩小'],['reset','⟲','重置当前视角']] as const).map(([type,icon,label])=><button key={type} disabled={disabled} onClick={()=>command(type)} aria-label={label}>{icon}</button>)}
      </div>
      <div className="playback-extra"><label>速度<select aria-label="营造速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><button className="text-button" disabled={disabled} onClick={replay} aria-label="重新营造"><span className="replay-label">重新营造 </span><span aria-hidden="true">↺</span></button></div>
    </div></div>
    <p className="viewer-help">{view==='reliefs'&&progress===1?'点击塔身实拍石刻，打开图志':<><span className="desktop-help">拖动旋转 · 滚轮缩放</span><span className="mobile-help">横向滑动旋转 · 双指缩放</span></>}</p>
    </section></div>
    <footer className="colophon"><span>泉州 · 开元寺 <i/>南宋石构双塔</span><span>依实景重建 · 双塔并置展示 <button onClick={()=>setSourcesOpen(true)} aria-label="查看建模范围说明">ⓘ</button></span></footer>
    <dialog ref={historyDialog} className="history-dialog" aria-labelledby="history-title" aria-describedby="history-description" onCancel={closeHistory} onClose={()=>{setHistoryOpen(false);const target=historyFocusView.current?document.querySelector<HTMLButtonElement>(`.view-switcher button[data-view="${historyFocusView.current}"]`):historyButton.current;target?.focus({preventScroll:true});}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeHistory();}}}>
      <HistoryPanel tower={historyTower} onTower={setHistoryTower} onLocate={locateHistory} canLocate={!disabled} onClose={closeHistory}/>
    </dialog>
    <dialog ref={dialogRef} className="source-dialog" aria-labelledby="source-title" onCancel={closeSources} onClose={()=>setSourcesOpen(false)} onClick={e=>{if(e.target===e.currentTarget)closeSources();}}>
      <div className="dialog-top"><div><p className="eyebrow">OBSERVE · COMPARE · REBUILD</p><h2 id="source-title">从实景，到双塔。</h2></div><button className="close-button" onClick={closeSources} aria-label="关闭参考说明">×</button></div>
      <p className="dialog-description">以实景照片与航拍核对轮廓、石构与材质。已有清晰实拍的石刻用照片校正板面细节，并在石刻图志中收录实物图与出处。</p>
      <div className="reference-grid">{[{id:'renshou',name:'仁寿塔',detail:'五层八角轮廓、石檐与檐下斗拱',file:'Renshou'},{id:'zhenguo',name:'镇国塔',detail:'上层比例、塔刹相轮与斜拉铁链',file:'Zhenguo'}].map(r=><a key={r.id} href={`https://commons.wikimedia.org/wiki/File:20230129_${r.file}_Pagoda_of_Kaiyuan_Temple.jpg`} target="_blank" rel="noreferrer"><img src={`/references/${r.id}-full.jpg`} alt={`${r.name}实景参考照片`} loading="lazy"/><span>{r.name} · 实景参考 <i>↗</i></span><small>{r.detail}</small></a>)}</div>
      <p className="photo-credit">摄影：Windmemories / Wikimedia Commons · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>。照片按展示尺寸缩放，原图与作者信息见链接。</p>
      <div className="source-notes"><div><h3>保留的形制</h3><p>八角五层、花岗岩石构、出挑石檐、仿木斗拱、门龛与栏板，以及东高西低的体量关系。</p></div><div><h3>动画里的营造顺序</h3><p>按现存石塔的史载年代先建西塔，再建东塔。由台基、五层石构至塔刹的动画示意构件的承托关系。石件进场动作和播放节奏为展陈编排。</p></div></div>
      <a className="official-source" href="https://www.sohu.com/a/447133881_683837" target="_blank" rel="noreferrer">剖面与形制参考：泉州文旅「这份泉州东西塔剖面图，你肯定没见过！」 ↗</a>
      <a className="official-source" href="https://www.mnwhstq.com/bhjg/202406/t20240621_214053.htm" target="_blank" rel="noreferrer">石刻与檐角参考：闽南文化生态保护区「泉州开元寺东西塔风华录」 ↗</a>
      <a className="official-source" href="https://archive.org/details/in.ernet.dli.2015.127766" target="_blank" rel="noreferrer">逐层雕刻图版：Ecke、Demiéville《刺桐双塔》（1935）扫描本 ↗</a>
      <a className="official-source" href="https://www.quanzhou.gov.cn/lyb/lytj/rmjdtj/202202/t20220224_2699974.htm" target="_blank" rel="noreferrer">高度与年代资料：泉州市人民政府「开元寺」 ↗</a>
    </dialog>
    <ReliefGallery open={galleryOpen} tower={galleryTower} selectedId={galleryId} canLocate={!disabled} onClose={()=>setGalleryOpen(false)} onLocate={locateSculpture}/>
  </main>;
}
