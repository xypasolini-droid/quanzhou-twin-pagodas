import east from './data/east-sculptures.json';
import west from './data/west-sculptures.json';
import type { SculptureRecord } from './sculptureTypes';

/** One explicitly sourced record for every physical panel. Unknown attributes
 * remain unknown; the catalogue does not infer a figure from its floor or index.
 * `npm run check:sculptures` validates the source JSON before publishing.
 */
export const SCULPTURES: readonly SculptureRecord[] = [...east, ...west] as SculptureRecord[];
const byId = new Map(SCULPTURES.map(record => [record.id, record]));

export function getSculpture(tower: 'east' | 'west', level: number, number: number): SculptureRecord {
  const id = `${tower === 'east' ? 'E' : 'W'}-${level}-${String(number).padStart(2, '0')}`;
  const record = byId.get(id);
  if (!record) throw new Error(`Missing sculpture record: ${id}`);
  return record;
}
