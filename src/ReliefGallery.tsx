import { useEffect, useRef, useState } from 'react';
import type { TowerSide } from './HistoryPanel';
import { RELIEF_PHOTOS } from './heritage/reliefPhotos';
import { MONKEY_PILGRIM_ID, reliefReadings } from './heritage/reliefReading';
import { SCULPTURES } from './heritage/sculptureCatalog';
import type { SculptureRecord } from './heritage/sculptureTypes';
import './relief-gallery.css';

const faces = ['南', '西南', '西', '西北', '北', '东北', '东', '东南'];
const photoUrl = (image: string) => `${import.meta.env.BASE_URL}sculptures/${image}`;
const mountedPhotoCount = RELIEF_PHOTOS.filter(photo => photo.onTower).length;
const monkeyReading = reliefReadings.find(item => item.id === MONKEY_PILGRIM_ID);
const exhibits = RELIEF_PHOTOS.map(photo => {
  const record = SCULPTURES.find(figure => figure.id === photo.id);
  if (!record) throw new Error(`No sculpture record for ${photo.id}`);
  return { photo, record };
});

type Props = {
  open: boolean;
  tower: TowerSide;
  selectedId?: string;
  onClose: () => void;
  onLocate: (record: SculptureRecord) => void;
  canLocate: boolean;
};

export default function ReliefGallery({ open, tower, selectedId, onClose, onLocate, canLocate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(tower);
  const [selected, setSelected] = useState<string>();
  const [floor, setFloor] = useState<number>();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setSide(tower);
      setSelected(selectedId);
      setFloor(undefined);
      element.showModal();
      element.scrollTop = 0;
    }
    if (!open && element.open) element.close();
  }, [open, tower, selectedId]);

  const towerPhotos = exhibits.filter(entry => entry.record.tower === side);
  const floors = Array.from(new Set(towerPhotos.map(entry => entry.record.level))).sort((a, b) => a - b);
  const photos = floor ? towerPhotos.filter(entry => entry.record.level === floor) : towerPhotos;
  const index = Math.max(0, photos.findIndex(entry => entry.photo.id === selected));
  const exhibit = photos[index];
  const isMonkeyPilgrim = exhibit?.photo.id === MONKEY_PILGRIM_ID;
  const chooseTower = (next: TowerSide) => {
    if (next === side) return;
    setSide(next);
    setFloor(undefined);
    setSelected(undefined);
  };
  const step = (delta: number) => {
    const next = photos[index + delta];
    if (next) setSelected(next.photo.id);
  };
  const showMonkeyPilgrim = () => {
    setSide('west');
    setFloor(4);
    setSelected(MONKEY_PILGRIM_ID);
  };

  useEffect(() => {
    if (!open) return;
    const row = strip.current;
    const item = row?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!row || !item) return;
    const viewport = row.getBoundingClientRect();
    const bounds = item.getBoundingClientRect();
    if (bounds.left < viewport.left) row.scrollLeft += bounds.left - viewport.left - 5;
    if (bounds.right > viewport.right) row.scrollLeft += bounds.right - viewport.right + 5;
  }, [open, exhibit?.photo.id]);

  return <dialog ref={dialog} className="source-dialog relief-gallery" aria-labelledby="relief-gallery-title" onClose={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const { left, top, right, bottom } = event.currentTarget.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onClose();
  }}>
    <div className="dialog-top">
      <div>
        <p className="eyebrow">KAIYUAN TEMPLE · STONE RELIEFS</p>
        <h2 id="relief-gallery-title">石刻图志</h2>
      </div>
      <button className="close-button" type="button" onClick={onClose} aria-label="关闭石刻图志">×</button>
    </div>
    {open && <>
      <div className="relief-gallery-bar">
        <p>
          从实物照片细看手势、衣纹和持物。<span className="relief-total">已上塔 {mountedPhotoCount} 处</span>
          <button type="button" className="gallery-inline relief-feature" onClick={showMonkeyPilgrim}>猴行者 · 西塔四层 <span aria-hidden="true">↗</span></button>
        </p>
        <div className="relief-gallery-towers" role="group" aria-label="选择石刻所在塔">
          <button type="button" aria-pressed={side === 'east'} onClick={() => chooseTower('east')}>东塔 · 镇国</button>
          <button type="button" aria-pressed={side === 'west'} onClick={() => chooseTower('west')}>西塔 · 仁寿</button>
        </div>
      </div>
      <div className="relief-gallery-tools">
        <div className="relief-gallery-floors" role="group" aria-label="按楼层筛选石刻">
          <button type="button" aria-pressed={floor === undefined} onClick={() => setFloor(undefined)}>全部</button>
          {floors.map(level => <button key={level} type="button" aria-pressed={floor === level} onClick={() => setFloor(level)}>{level} 层</button>)}
        </div>
        <div className="relief-gallery-navigation">
          <p aria-live="polite">第 {index + 1} 件 <span>/</span> {photos.length} 件</p>
          <div role="group" aria-label="逐件翻阅">
            <button type="button" disabled={index === 0} onClick={() => step(-1)} aria-label="上一件石刻">← <span>上一件</span></button>
            <button type="button" disabled={index === photos.length - 1} onClick={() => step(1)} aria-label="下一件石刻"><span>下一件</span> →</button>
          </div>
        </div>
      </div>
      {exhibit && <div className="relief-exhibit">
        <figure className="relief-photo">
          <img key={exhibit.photo.id} src={photoUrl(exhibit.photo.image)} alt={exhibit.photo.alt} decoding="async" />
          <figcaption>{exhibit.photo.imageNote ?? '实物照片'} · {exhibit.photo.date}</figcaption>
        </figure>
        <div className="relief-interpretation" aria-live="polite">
          <p className="relief-location">第 {exhibit.record.level} 层 · {faces[Math.floor((exhibit.record.number - 1) / 2)]}面{exhibit.record.number % 2 ? '右' : '左'}侧</p>
          <h3>{exhibit.photo.title}</h3>
          <p>{exhibit.photo.introduction}</p>
          <p className="relief-catalogue-id">图录编号 {exhibit.record.id} · 方位按面向石板时的左右</p>
          <div className="relief-exhibit-actions">
            <button className="relief-locate" type="button" disabled={!canLocate} onClick={() => onLocate(exhibit.record)}>在塔上查看 <span aria-hidden="true">↗</span></button>
            {isMonkeyPilgrim && monkeyReading && <a href={monkeyReading.sourceUrl} target="_blank" rel="noreferrer">查看文保图录特写 ↗</a>}
          </div>
          {!exhibit.photo.onTower && <p className="relief-catalogue-id">实物照片供对照，对应塔身为形态示意。</p>}
          <div className="relief-photo-source">
            <span>摄影 {exhibit.photo.photographer} · 裁切与透视校正</span>
            <a href={exhibit.photo.sourceUrl} target="_blank" rel="noreferrer">原图与出处 ↗</a>
            <a href={exhibit.photo.licenseUrl} target="_blank" rel="noreferrer">{exhibit.photo.license}</a>
          </div>
        </div>
      </div>}
      <div ref={strip} className="relief-gallery-strip" role="group" aria-label="选择实物照片">
        {photos.map(({ photo, record }) => <button key={photo.id} type="button" aria-pressed={exhibit?.photo.id === photo.id} onClick={() => setSelected(photo.id)}>
          <img src={photoUrl(photo.image)} alt="" loading="lazy" decoding="async" />
          <span><b>{photo.title}</b><small>第 {record.level} 层 · {faces[Math.floor((record.number - 1) / 2)]}面</small></span>
        </button>)}
      </div>
      <div className="relief-gallery-footer">
        <span>浮雕方位与人物描述依照图录和实物核对。</span>
        <a href="https://github.com/xypasolini-droid/quanzhou-twin-pagodas/blob/main/docs/SCULPTURE-CATALOG.md" target="_blank" rel="noreferrer">查阅 160 处图录索引 ↗</a>
      </div>
      <details className="relief-reading">
        <summary>更多人物与原刊特写</summary>
        <ul>
          {reliefReadings.filter(item => item.id.startsWith(side === 'east' ? 'E-' : 'W-')).map(item => <li key={item.id}>
            <small>{item.id}</small>
            <h3>{item.title}</h3>
            <p>{item.introduction}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel} ↗</a>
          </li>)}
        </ul>
      </details>
    </>}
  </dialog>;
}
