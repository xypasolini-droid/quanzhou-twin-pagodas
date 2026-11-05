import { useEffect, useRef, useState } from 'react';
import type { TowerSide } from './HistoryPanel';
import { RELIEF_PHOTOS } from './heritage/reliefPhotos';
import { reliefReadings } from './heritage/reliefReading';
import { SCULPTURES } from './heritage/sculptureCatalog';
import type { SculptureRecord } from './heritage/sculptureTypes';
import './relief-gallery.css';

const faces = ['南', '西南', '西', '西北', '北', '东北', '东', '东南'];
const photoUrl = (image: string) => `${import.meta.env.BASE_URL}sculptures/${image}`;
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
  const [side, setSide] = useState(tower);
  const [selected, setSelected] = useState<string>();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setSide(tower);
      setSelected(selectedId);
      element.showModal();
      element.scrollTop = 0;
    }
    if (!open && element.open) element.close();
  }, [open, tower, selectedId]);

  const photos = exhibits.filter(entry => entry.record.tower === side);
  const exhibit = photos.find(entry => entry.photo.id === selected) ?? photos[0];

  return <dialog ref={dialog} className="source-dialog relief-gallery" aria-labelledby="relief-gallery-title" onClose={onClose}>
    <div className="dialog-top">
      <div>
        <p className="eyebrow">KAIYUAN TEMPLE · STONE RELIEFS</p>
        <h2 id="relief-gallery-title">石刻图志</h2>
      </div>
      <button className="close-button" type="button" onClick={onClose} aria-label="关闭石刻图志">×</button>
    </div>
    {open && <>
      <div className="relief-gallery-bar">
        <p>{exhibits.length} 处实物照片。选一张细看人物的手势、衣纹和持物。</p>
        <div className="relief-gallery-towers" role="group" aria-label="选择石刻所在塔">
          <button type="button" aria-pressed={side === 'east'} onClick={() => setSide('east')}>东塔 · 镇国</button>
          <button type="button" aria-pressed={side === 'west'} onClick={() => setSide('west')}>西塔 · 仁寿</button>
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
          <button className="relief-locate" type="button" disabled={!canLocate} onClick={() => onLocate(exhibit.record)}>在塔上查看 <span aria-hidden="true">↗</span></button>
          {!exhibit.photo.onTower && <p className="relief-catalogue-id">此处塔身使用形态示意，左图为实物。</p>}
          <div className="relief-photo-source">
            <span>摄影 {exhibit.photo.photographer} · 裁切与透视校正</span>
            <a href={exhibit.photo.sourceUrl} target="_blank" rel="noreferrer">打开原图 ↗</a>
            <a href={exhibit.photo.licenseUrl} target="_blank" rel="noreferrer">{exhibit.photo.license}</a>
          </div>
        </div>
      </div>}
      <div className="relief-gallery-strip" role="group" aria-label="选择实物照片">
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
