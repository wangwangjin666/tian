// 从 npm 包中提取素材与精简 manifest，生成 www/ 静态资源
const fs = require('fs');
const path = require('path');

const root = __dirname;
const pkg = path.join(root, 'package');
const out = path.join(root, 'www');
const assetsOut = path.join(out, 'assets');
const dataOut = path.join(out, 'data');

fs.rmSync(assetsOut, { recursive: true, force: true });
fs.mkdirSync(assetsOut, { recursive: true });
fs.mkdirSync(dataOut, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(pkg, 'manifest.json'), 'utf8'));

const slim = manifest.map((e) => ({
  slug: e.slug,
  name: e.name,
  type: e.exerciseType,
  equipment: e.equipment,
  muscle: e.primaryMuscle,
  secondary: e.secondaryMuscles || [],
  stretch: !!e.isStretch,
  frames: (e.frames || []).map((f) => f.path),
}));

// 拷贝每个动作的三帧图片
let copied = 0;
for (const e of slim) {
  const dstDir = path.join(assetsOut, e.slug);
  fs.mkdirSync(dstDir, { recursive: true });
  for (const p of e.frames) {
    const src = path.join(pkg, p);
    const dst = path.join(out, p);
    fs.copyFileSync(src, dst);
    copied++;
  }
}

fs.writeFileSync(
  path.join(dataOut, 'exercises.js'),
  'window.EXERCISES = ' + JSON.stringify(slim) + ';\n'
);

// 统计器械/肌群，便于调试
const equip = [...new Set(slim.map((e) => e.equipment))].sort();
const muscles = [...new Set(slim.map((e) => e.muscle))].sort();
console.log(`exercises: ${slim.length}, frames copied: ${copied}`);
console.log('equipment:', equip.join(', '));
console.log('muscles:', muscles.join(', '));

// 校验训练计划候选 slug 是否存在
const slugs = new Set(slim.map((e) => e.slug));
const planCandidates = [
  'bench-press','incline-dumbbell-press','push-up','dumbbell-fly','overhead-press','dumbbell-shoulder-press',
  'lateral-raise','triceps-pushdown','tricep-dips','dumbbell-triceps-extension',
  'pull-up','lat-pulldown','barbell-row','seated-cable-row','dumbbell-row','face-pull','biceps-curl','dumbbell-curl','hammer-curl',
  'squat','barbell-squat','deadlift','romanian-deadlift','leg-press','leg-curl','leg-extension','walking-lunge','lunge','calf-raise','plank','hanging-leg-raise','crunch','leg-raise'
];
const missing = planCandidates.filter((s) => !slugs.has(s));
console.log('missing plan candidates:', missing.join(', ') || '(none)');
