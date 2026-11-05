/** Descriptions record only observed or explicitly documented forms.
 * Left/right are the viewer's left/right when facing the relief.
 * A photograph may be historical: source notes must distinguish that from current condition.
 */
export type SculptureEvidence = 'photo' | 'text' | 'unresolved';
export type FigureBody = 'armoured' | 'bare' | 'robe' | 'short-robe' | 'official' | 'seated' | 'mounted' | 'unknown';
export type FigureHead = 'bare' | 'curled' | 'hood' | 'crown' | 'cap' | 'topknot' | 'monkey' | 'unknown';
export type FigureGesture = 'raised' | 'open' | 'chest' | 'joined' | 'waist' | 'down' | 'holding' | 'unknown';
export type FigureObject = 'staff' | 'sword' | 'vajra' | 'bowl' | 'book' | 'scroll' | 'rosary' | 'flask' | 'flower' | 'censer' | 'tablet' | 'banner' | 'seal' | 'ruyi' | 'stupa' | 'whisk' | 'broom' | 'cloth' | 'sun' | 'moon' | 'pearl' | 'bell' | 'axe' | 'bow' | 'cage' | 'fan' | 'hammer' | 'drum' | 'torch' | 'rope' | 'other';
export type SculptureRecord = {
  id: string; // E-1-01 ... W-5-16, book numbering from south face, external right to left
  tower: 'east' | 'west';
  level: number; // 1..5
  number: number; // 1..16
  evidence: SculptureEvidence;
  sources: {url:string; title:string; pdfPage?:number; plate?:string; note?:string}[];
  description: string; // concise original observation in Chinese, not copied prose
  body: FigureBody;
  head: FigureHead;
  halo: 'round' | 'none' | 'unknown';
  pose: 'frontal' | 'turned-left' | 'turned-right' | 'lean-left' | 'lean-right' | 'seated' | 'mounted' | 'unknown';
  hands: {left:FigureGesture; right:FigureGesture};
  objects: {kind:FigureObject; side:'left'|'right'|'center'; orientation:'vertical'|'diagonal'|'horizontal'|'unknown'}[];
  support: 'lotus' | 'rock' | 'lion' | 'elephant' | 'cloud' | 'none' | 'unknown';
  companions: ('child' | 'dragon' | 'monkey' | 'skeleton' | 'horse' | 'tree' | 'tiger' | 'bird')[];
  details: string[];
};
