import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const records = [...read('../src/heritage/data/east-sculptures.json'), ...read('../src/heritage/data/west-sculptures.json')];
const oneOf = (value, choices, label) => assert(choices.split('|').includes(value), `${label}: ${value}`);
const ids = new Set();
for (const r of records) {
  assert(!ids.has(r.id), `Duplicate panel ${r.id}`); ids.add(r.id);
  oneOf(r.tower, 'east|west', r.id);
  assert(Number.isInteger(r.level) && r.level >= 1 && r.level <= 5, `${r.id} level`);
  assert(Number.isInteger(r.number) && r.number >= 1 && r.number <= 16, `${r.id} number`);
  assert.equal(r.id, `${r.tower === 'east' ? 'E' : 'W'}-${r.level}-${String(r.number).padStart(2,'0')}`);
  oneOf(r.evidence, 'photo|text|unresolved', `${r.id} evidence`);
  assert(r.description?.length > 5, `${r.id} needs an observation`);
  assert(r.sources?.length > 0, `${r.id} needs traceable evidence or gap source`);
  for (const s of r.sources) {
    assert(/^https:\/\//.test(s.url) && s.title?.length, `${r.id} invalid source`);
    if (s.pdfPage !== undefined) assert(Number.isInteger(s.pdfPage) && s.pdfPage > 0, `${r.id} PDF page`);
  }
  if (r.evidence === 'photo') assert(r.sources.some(s => s.plate || s.note), `${r.id} photo locator`);
  oneOf(r.body, 'armoured|bare|robe|short-robe|official|seated|mounted|unknown', `${r.id} body`);
  oneOf(r.head, 'bare|curled|hood|crown|cap|topknot|monkey|unknown', `${r.id} head`);
  oneOf(r.halo, 'round|none|unknown', `${r.id} halo`);
  oneOf(r.pose, 'frontal|turned-left|turned-right|lean-left|lean-right|seated|mounted|unknown', `${r.id} pose`);
  for (const side of ['left','right']) oneOf(r.hands[side], 'raised|open|chest|joined|waist|down|holding|unknown', `${r.id} ${side} hand`);
  assert(Array.isArray(r.objects), `${r.id} objects`);
  for (const o of r.objects) {
    oneOf(o.kind, 'staff|sword|vajra|bowl|book|scroll|rosary|flask|flower|censer|tablet|banner|seal|ruyi|stupa|whisk|broom|cloth|sun|moon|pearl|bell|axe|bow|cage|fan|hammer|drum|torch|rope|other', `${r.id} object`);
    oneOf(o.side, 'left|right|center', `${r.id} object side`);
    oneOf(o.orientation, 'vertical|diagonal|horizontal|unknown', `${r.id} object orientation`);
  }
  oneOf(r.support, 'lotus|rock|lion|elephant|cloud|none|unknown', `${r.id} support`);
  assert(Array.isArray(r.companions) && Array.isArray(r.details), `${r.id} details`);
  for (const c of r.companions) oneOf(c, 'child|dragon|monkey|skeleton|horse|tree|tiger|bird', `${r.id} companion`);
}
assert.equal(records.length, 160, 'Exactly one entry per physical sculpture');
// Match actual eight face placement, with right/left as seen from outside.
for (const tower of ['east','west']) for (let level=1; level<=5; level++) {
  const seen = new Set();
  for (let face=0; face<8; face++) for (const slot of [0,1]) {
    const n = ((8-face)%8)*2 + (slot ? 1 : 2);
    const id = `${tower==='east'?'E':'W'}-${level}-${String(n).padStart(2,'0')}`;
    assert(ids.has(id), `Uncovered physical slot ${id}`); seen.add(n);
  }
  assert.equal(seen.size,16);
}
const counts = Object.fromEntries(['east','west'].map(tower => [tower, Object.fromEntries(['photo','text','unresolved'].map(evidence => [evidence, records.filter(r=>r.tower===tower&&r.evidence===evidence).length]))]));
console.log(JSON.stringify({panels:records.length,evidence:counts},null,2));
