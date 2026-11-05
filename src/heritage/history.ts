/** Historical text for the exhibition sidebar. Every factual group has source IDs.
 * Observation prompts are reading aids, not a claim of survey-level reconstruction.
 */
export type HistorySourceId = 'qz-history' | 'qz-heritage' | 'qz-english' | 'mnwh-detail' | 'unesco' | 'fz-earthquake' | 'zayton-1935';
export type CitedText = { title: string; body: string; sourceIds: HistorySourceId[] };

export const HISTORY_SOURCES: { id: HistorySourceId; title: string; publisher: string; url: string }[] = [
  { id: 'qz-history', title: '开元寺 · 重点文物', publisher: '泉州市人民政府', url: 'https://www.quanzhou.gov.cn/lyb/lswh/zdww/201510/t20151029_183313.htm' },
  { id: 'qz-heritage', title: '开元寺 · 世界遗产专题', publisher: '泉州市人民政府', url: 'https://www.quanzhou.gov.cn/lyb/lytj/rmjdtj/202202/t20220224_2699974.htm' },
  { id: 'qz-english', title: 'Kaiyuan Temple', publisher: '泉州市人民政府', url: 'https://www.quanzhou.gov.cn/gastronomy/en/about/unesco-heritage/202412/t20241228_3124001.htm' },
  { id: 'mnwh-detail', title: '泉州开元寺东西塔风华录', publisher: '闽南文化生态保护区', url: 'https://www.mnwhstq.com/bhjg/202406/t20240621_214053.htm' },
  { id: 'unesco', title: '泉州：宋元中国的世界海洋商贸中心', publisher: 'UNESCO 世界遗产中心', url: 'https://whc.unesco.org/en/list/1561/' },
  { id: 'fz-earthquake', title: '1604年泉州近海地震', publisher: '福州市防震减灾中心', url: 'https://www.fuzhou.gov.cn/zgfzzt/fzjzzl/fzjzzl/kpzs/201609/t20160930_212637.htm' },
  { id: 'zayton-1935', title: 'The Twin Pagodas of Zayton（1935）', publisher: 'G. Ecke / P. Demiéville，Internet Archive 扫描本', url: 'https://archive.org/details/in.ernet.dli.2015.127766' },
];

export const TEMPLE_STORY: CitedText[] = [
  { title: '一寺双塔，走过唐宋', body: '开元寺始建于686年，738年改称今名。今天所见的两座石塔建于南宋，立在寺院中轴两侧，各自形成塔院。', sourceIds: ['qz-history', 'qz-heritage'] },
  { title: '石头写下木构的语言', body: '两塔均为五层八角花岗岩建筑。石柱、额枋与斗拱保留楼阁式木构的形态，塔心柱、石梁与外壁相互联系，层层收分。', sourceIds: ['qz-heritage', 'qz-english'] },
  { title: '海上往来，汇入一城', body: '宋元泉州的海洋贸易带来了经济繁荣与文化交汇。寺院、僧侣和地方社群参与城市生活，双塔石刻也留下多元信仰与工艺相遇的痕迹。', sourceIds: ['qz-english', 'unesco'] },
];

export const TOWER_HISTORY = {
  east: {
    name: '镇国塔', position: '东塔', height: '48.27', years: '1238—1250',
    title: '镇国 · 东塔',
    body: '前身为865年始建的木塔，后经历砖塔阶段，南宋改建为现存石塔。东塔更高，立面细部也更繁密。',
    details: [
      '每层柱间设两组补间斗拱，五层保持这一节奏。',
      '塔身共80尊人物浮雕；须弥座以佛教故事石刻见长。',
    ],
    sourceIds: ['qz-history', 'qz-heritage'] as HistorySourceId[],
  },
  west: {
    name: '仁寿塔', position: '西塔', height: '45.06', years: '1228—1237',
    title: '仁寿 · 西塔',
    body: '前身建于916年，初名无量寿塔，也经历木、砖、石的变化。现存西塔先于东塔建成，两者相似而不相同。',
    details: [
      '三至五层柱间各设一组补间斗拱，可与东塔对照。',
      '塔身亦有80尊人物浮雕，须弥座更多见花卉与禽兽纹样。',
    ],
    sourceIds: ['qz-history', 'qz-heritage', 'qz-english'] as HistorySourceId[],
  },
} as const;

export const HISTORY_TIMELINE = [
  { year: '686 / 738', title: '建寺 · 定名', body: '唐代建寺，后以“开元”为名。', sourceIds: ['qz-history'] },
  { year: '865 / 916', title: '双塔的前身', body: '东、西两塔先后从木塔起步。', sourceIds: ['qz-history'] },
  { year: '1228—1237', title: '仁寿塔石构落成', body: '西塔改建为今天的五层石塔。', sourceIds: ['qz-history', 'qz-heritage'] },
  { year: '1238—1250', title: '镇国塔石构落成', body: '东塔接续营建，双塔相望。', sourceIds: ['qz-history', 'qz-heritage'] },
  { year: '2021', title: '列入世界遗产', body: '开元寺随“泉州：宋元中国的世界海洋商贸中心”列入名录。', sourceIds: ['unesco', 'qz-english'] },
] satisfies { year: string; title: string; body: string; sourceIds: HistorySourceId[] }[];

export const MATERIAL_HISTORY: CitedText[] = [
  { title: '就地取材的花岗岩', body: '两塔使用本地花岗岩，将楼阁木构的柱、枋、斗拱转译为石材构件。石檐也属于石构，观察时要与木瓦屋面区分。', sourceIds: ['mnwh-detail', 'qz-english'] },
  { title: '颜色里有时间', body: '石面经历日照、雨水与风化。今天的保护工作关注渗水、结构稳定和表面风化；颜色与粗糙度应结合迎光面、背阴面分别观察。', sourceIds: ['qz-heritage'] },
];

export const CONSERVATION_NOTE: CitedText = {
  title: '留存，并非从未受损',
  body: '1604年泉州近海地震中，东塔部分檐石、栏杆和顶部构件有受损记载。古塔留存至今，也离不开后世持续修缮与保护。',
  sourceIds: ['fz-earthquake', 'qz-heritage'],
};
