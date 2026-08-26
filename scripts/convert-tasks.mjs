// One-time: research/data/task-rewards*.csv → src/engine/data/official/tasks.json
import { readFileSync, writeFileSync } from 'node:fs';

const parse = (file) =>
  readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const [category, task, wood, clay, iron, crop, xp, key] = line.split(',');
    return { category, name: task, res: [+wood, +clay, +iron, +crop], xp: +xp, key };
  });

const out = {
  start: parse('research/data/task-rewards.csv'),
  every: parse('research/data/task-rewards-every-village.csv'),
  general: parse('research/data/task-rewards-general.csv'),
};
writeFileSync('src/engine/data/official/tasks.json', JSON.stringify(out));
console.log('start', out.start.length, 'every', out.every.length, 'general', out.general.length);
console.log('key shapes:', [...new Set(out.start.concat(out.general).map((t) => t.key.replace(/\d+/g, 'N')))].join(' '));
