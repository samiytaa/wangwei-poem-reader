import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIR = path.resolve('五言律诗');
const OUTPUT_DIR = path.resolve('src/data');
const NOTE_MARKERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟';

function findMarkdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findMarkdownFiles(entryPath);
    return entry.name.endsWith('.md') && entry.name !== '索引.md' ? [entryPath] : [];
  });
}

function cleanTitle(title) {
  return title.replace(new RegExp(`[${NOTE_MARKERS}]+$`), '').trim();
}

function parseAnnotations(lines) {
  const annotations = [];

  for (const line of lines) {
    if (!line || line.startsWith('### ')) break;

    const match = line.match(/^\*\*(.*?)：\*\*(.*)$/);
    annotations.push(match
      ? { term: match[1], text: match[2] }
      : { term: '', text: line });
  }

  return annotations;
}

function parseCollation(lines) {
  const collation = {};
  let currentMarker = null;
  const markerPattern = new RegExp(`^([${NOTE_MARKERS}])(.*)$`);

  for (const line of lines) {
    if (!line || line === '【注】' || line.startsWith('### ')) break;

    const match = line.match(markerPattern);
    if (match) {
      currentMarker = match[1];
      collation[currentMarker] = match[2];
    } else if (currentMarker) {
      collation[currentMarker] += line;
    }
  }

  return Object.keys(collation).length > 0 ? collation : null;
}

function parsePoem(filePath) {
  const relativeParts = path.relative(SOURCE_DIR, filePath).split(path.sep);
  const volume = relativeParts[0];
  const group = relativeParts.length > 2 ? relativeParts.slice(1, -1).join(' / ') : '';
  const id = relativeParts.join('/').replace(/\.md$/, '');
  const lines = fs.readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim());
  const titleIndex = lines.findIndex((line) => line.startsWith('# '));

  if (titleIndex === -1) throw new Error(`缺少标题：${filePath}`);

  const content = lines.slice(titleIndex + 1);
  const collationIndex = content.indexOf('【校】');
  const annotationIndex = content.indexOf('【注】');
  const sectionStarts = [collationIndex, annotationIndex].filter((index) => index >= 0);
  const bodyEnd = sectionStarts.length ? Math.min(...sectionStarts) : content.length;
  const body = content.slice(0, bodyEnd).filter(Boolean);

  if (body.length !== 4) throw new Error(`正文应为四行：${filePath}`);

  return {
    id,
    title: cleanTitle(lines[titleIndex].slice(2)),
    volume,
    group,
    body,
    collation: collationIndex >= 0 ? parseCollation(content.slice(collationIndex + 1)) : null,
    annotations: annotationIndex >= 0 ? parseAnnotations(content.slice(annotationIndex + 1)) : []
  };
}

const poemsByVolume = new Map();
for (const filePath of findMarkdownFiles(SOURCE_DIR)) {
  const poem = parsePoem(filePath);
  const poems = poemsByVolume.get(poem.volume) ?? [];
  poems.push(poem);
  poemsByVolume.set(poem.volume, poems);
}

const outputNames = {
  '卷七 近体诗三十九首': 'poems_vol7.json',
  '卷八 近体诗三十三首': 'poems_vol8.json',
  '卷九 近体诗三十五首': 'poems_vol9.json',
  '卷十五 外编四十七首': 'poems_vol15.json'
};

for (const [volume, outputName] of Object.entries(outputNames)) {
  const poems = poemsByVolume.get(volume);
  if (!poems) throw new Error(`未找到 ${volume} 的数据`);
  fs.writeFileSync(path.join(OUTPUT_DIR, outputName), `${JSON.stringify(poems, null, 2)}\n`, 'utf8');
  console.log(`${volume}：${poems.length} 首`);
}

const total = [...poemsByVolume.values()].reduce((sum, poems) => sum + poems.length, 0);
console.log(`共生成 ${total} 首诗的数据。`);
