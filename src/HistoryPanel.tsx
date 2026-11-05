import {useState, type KeyboardEvent} from 'react';
import {HISTORY_SOURCES, TEMPLE_STORY, TOWER_HISTORY, HISTORY_TIMELINE, MATERIAL_HISTORY, CONSERVATION_NOTE, type HistorySourceId} from './heritage/history';
import './history-dialog.css';
export type TowerSide='east'|'west';
export type HistoryLocation=TowerSide|'eaves'|'reliefs'|'base';
type Props={tower:TowerSide;onTower:(tower:TowerSide)=>void;onLocate:(view:HistoryLocation)=>void;canLocate:boolean;onClose:()=>void};
function Citations({ids}:{ids:readonly HistorySourceId[]}){return <span className="citations">{ids.map(id=>{const s=HISTORY_SOURCES.find(s=>s.id===id)!;return <a key={id} href={s.url} target="_blank" rel="noreferrer" aria-label={`资料来源：${s.publisher}，${s.title}`}>{HISTORY_SOURCES.indexOf(s)+1}</a>;})}</span>;}
const tabs=[['story','双塔沿革'],['details','构造细赏'],['stone','石色与岁月']] as const;
export default function HistoryPanel({tower,onTower,onLocate,canLocate,onClose}:Props){
  const [tab,setTab]=useState<(typeof tabs)[number][0]>('story');
  const facts=TOWER_HISTORY[tower];
  const tabKeys=(e:KeyboardEvent<HTMLButtonElement>,index:number)=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();setTab(tabs[next][0]);document.getElementById(`history-tab-${tabs[next][0]}`)?.focus();};
  return <div className="history-panel">
    <header className="history-header"><div><p className="eyebrow">A STORY IN STONE</p><h2 id="history-title" tabIndex={-1} autoFocus>双塔小志</h2><p id="history-description">从一块石，读一座城。沿着双塔的来处、构造与石色，走近开元寺。</p></div><button className="close-button" onClick={onClose} aria-label="关闭双塔小志">×</button></header>
    <div className="history-navigation">
      <div className="history-tabs" role="tablist" aria-label="阅读内容">{tabs.map(([id,label],i)=><button key={id} id={`history-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`history-panel-${id}`} tabIndex={tab===id?0:-1} onKeyDown={e=>tabKeys(e,i)} onClick={()=>setTab(id)}><span aria-hidden="true">0{i+1}</span>{label}</button>)}</div>
      <div className="history-tower-label">此刻阅读</div>
      <div className="tower-select" role="group" aria-label="选择要了解的塔">{(['west','east'] as const).map(id=><button key={id} aria-pressed={tower===id} onClick={()=>onTower(id)}>{TOWER_HISTORY[id].position} <b>{TOWER_HISTORY[id].name}</b></button>)}</div>
      <p className="history-nav-note">切换阅读对象时，镜头保留在原处。</p>
    </div>
    <section className="history-scroll" id="history-panel-story" role="tabpanel" aria-labelledby="history-tab-story" hidden={tab!=='story'} tabIndex={0}>
      <div className="tower-heading"><h3>{facts.name}</h3><span>{facts.height}<small>米</small></span></div>
      <p className="stone-dates">南宋 · {facts.years}</p><p>{facts.body}<Citations ids={facts.sourceIds}/></p>
      <button className="history-locate" disabled={!canLocate} onClick={()=>onLocate(tower)}>在场景中看{facts.name}<span aria-hidden="true">↗</span></button>
      <ul className="fact-list">{facts.details.map(s=><li key={s}>{s}</li>)}</ul>
      {TEMPLE_STORY.map(s=><article key={s.title}><h4>{s.title}</h4><p>{s.body}<Citations ids={s.sourceIds}/></p></article>)}
      <details className="history-more"><summary>一千三百余年的时间线</summary><ol className="history-timeline">{HISTORY_TIMELINE.map(s=><li key={s.year}><time>{s.year}</time><b>{s.title}</b><p>{s.body}<Citations ids={s.sourceIds}/></p></li>)}</ol></details>
      <details className="history-more"><summary>历代修缮与保护</summary><p>{CONSERVATION_NOTE.body}<Citations ids={CONSERVATION_NOTE.sourceIds}/></p></details>
    </section>
    <section className="history-scroll" id="history-panel-details" role="tabpanel" aria-labelledby="history-tab-details" hidden={tab!=='details'} tabIndex={0}>
      <p className="panel-lead">沿着能看清的构件观察，从石材接缝读到建筑的承托关系。</p>
      <div className="structure-selector" role="group" aria-label={`前往${facts.name}构造近景`}>{([['eaves','石檐斗拱','出挑与承托'],['reliefs','门龛石刻','衣纹与持物'],['base','石栏塔座','线脚与基座']] as const).map(([id,label,note])=><button key={id} disabled={!canLocate} onClick={()=>onLocate(id)}><b>{label}</b><small>{note}</small><span aria-hidden="true">↗</span></button>)}</div>
      <article><h4>石头做成的木构</h4><p>石柱、额枋与层层出挑的斗拱，延续了木构楼阁的形式。近观可以分辨三段接柱、挑梁和檐端圆饰。<Citations ids={['qz-heritage','mnwh-detail']}/></p></article>
      <article><h4>嵌在墙里的石刻</h4><p>人物刻在纵向矩形石板中，与周围块石共同组成墙面。长袍衣纹细浅，甲胄、头手与靴的起伏更强；持物、手势和头光也各不相同。<Citations ids={['mnwh-detail','zayton-1935']}/></p></article>
      <article><h4>栏边与檐下</h4><p>实拍中的石栏边框较浅，栏板内部留有赭褐斑痕；檐下更暗，石块接缝和雨水流痕却仍可辨认。让这些差异保留下来，才能读出石构的厚度。</p></article>
      <p className="fine-print">石刻图志收录对应石板的实拍和人物说明。场景以校正照片呈现部分石板的原貌，其余依据图录作形态示意。</p>
    </section>
    <section className="history-scroll" id="history-panel-stone" role="tabpanel" aria-labelledby="history-tab-stone" hidden={tab!=='stone'} tabIndex={0}>
      <p className="panel-lead">灰不是一种颜色。石的冷暖、雨水的痕迹、日光的方向，叠在同一座塔上。</p>
      <div className="stone-palette" aria-label="实景色泽观察"><span className="swatch-grey">冷灰石檐</span><span className="swatch-rust">赭褐块石</span><span className="swatch-pale">浅灰石栏</span><span className="swatch-dark">檐下雨痕</span></div>
      {MATERIAL_HISTORY.map(s=><article key={s.title}><h4>{s.title}</h4><p>{s.body}<Citations ids={s.sourceIds}/></p></article>)}
      <article><h4>从航拍里辨认石色</h4><p>近景作为石块色差和水迹的观察依据；远景的金黄色还包含斜阳照射。切换画面上方的日光与斜阳，观察同一石面如何随光变化。</p></article>
      <p className="fine-print">以实拍校正的程序材质，非摄影测量或逐石扫描。场景仍采用双塔并置的展陈布局。</p>
    </section>
    <footer className="history-footnote"><span>文中小数字可打开资料原文 <span aria-hidden="true">↗</span></span><button className="text-button" onClick={onClose}>继续观塔 <span aria-hidden="true">→</span></button></footer>
  </div>;
}
