/**
 * biomes.js — 生物群系定义
 *
 * 每个群系由高度(elevation)、温度(temperature)、湿度(moisture) 三维映射决定。
 * 包含配色、植被密度、可通行性、移动成本（用于 cuOpt 风格寻路）。
 */

const BIOMES = {
  DEEP_OCEAN: {
    id: 'deep_ocean',
    name: '深海',
    color: '#1a3a5c',
    colorLight: '#234b73',
    walkable: false,
    moveCost: Infinity,
    vegetation: 0
  },
  OCEAN: {
    id: 'ocean',
    name: '海洋',
    color: '#2a5a8a',
    colorLight: '#3a6fa0',
    walkable: false,
    moveCost: Infinity,
    vegetation: 0
  },
  BEACH: {
    id: 'beach',
    name: '沙滩',
    color: '#e8d8a0',
    colorLight: '#f0e4b8',
    walkable: true,
    moveCost: 1.4,
    vegetation: 0.05
  },
  GRASSLAND: {
    id: 'grassland',
    name: '草原',
    color: '#6ab04c',
    colorLight: '#7dc460',
    walkable: true,
    moveCost: 1.0,
    vegetation: 0.15
  },
  FOREST: {
    id: 'forest',
    name: '森林',
    color: '#2d7a3e',
    colorLight: '#3a9250',
    walkable: true,
    moveCost: 1.3,
    vegetation: 0.7
  },
  JUNGLE: {
    id: 'jungle',
    name: '丛林',
    color: '#1e5a2e',
    colorLight: '#2a7540',
    walkable: true,
    moveCost: 1.8,
    vegetation: 0.95
  },
  DESERT: {
    id: 'desert',
    name: '沙漠',
    color: '#d4a85a',
    colorLight: '#e0bc70',
    walkable: true,
    moveCost: 1.6,
    vegetation: 0.02
  },
  SAVANNA: {
    id: 'savanna',
    name: '稀树草原',
    color: '#b8a050',
    colorLight: '#c8b468',
    walkable: true,
    moveCost: 1.1,
    vegetation: 0.25
  },
  TAIGA: {
    id: 'taiga',
    name: '针叶林',
    color: '#3a6b5a',
    colorLight: '#4a8068',
    walkable: true,
    moveCost: 1.4,
    vegetation: 0.6
  },
  TUNDRA: {
    id: 'tundra',
    name: '冻原',
    color: '#a8b8a0',
    colorLight: '#bccab0',
    walkable: true,
    moveCost: 1.5,
    vegetation: 0.08
  },
  SNOW: {
    id: 'snow',
    name: '雪原',
    color: '#e8eef5',
    colorLight: '#f5f8fc',
    walkable: true,
    moveCost: 2.0,
    vegetation: 0.02
  },
  MOUNTAIN: {
    id: 'mountain',
    name: '山地',
    color: '#8a7a6a',
    colorLight: '#9a8a7a',
    walkable: true,
    moveCost: 2.5,
    vegetation: 0.1
  },
  PEAK: {
    id: 'peak',
    name: '山峰',
    color: '#b0b0b8',
    colorLight: '#c8c8d0',
    walkable: false,
    moveCost: Infinity,
    vegetation: 0
  }
};

/**
 * 根据三维噪声值决定生物群系
 * @param {number} elevation -1 ~ 1，高度
 * @param {number} temperature 0 ~ 1，温度
 * @param {number} moisture 0 ~ 1，湿度
 */
function getBiome(elevation, temperature, moisture) {
  // 水域
  if (elevation < -0.2) return BIOMES.DEEP_OCEAN;
  if (elevation < -0.05) return BIOMES.OCEAN;
  if (elevation < 0.02) return BIOMES.BEACH;

  // 高山
  if (elevation > 0.72) return BIOMES.PEAK;
  if (elevation > 0.55) {
    // 雪线：温度越低越容易积雪
    if (temperature < 0.35) return BIOMES.SNOW;
    return BIOMES.MOUNTAIN;
  }
  if (elevation > 0.4) {
    if (temperature < 0.45) return BIOMES.TAIGA;
    return BIOMES.MOUNTAIN;
  }

  // 按温度 + 湿度分类
  // 温度高
  if (temperature > 0.7) {
    if (moisture < 0.3) return BIOMES.DESERT;
    if (moisture < 0.55) return BIOMES.SAVANNA;
    return BIOMES.JUNGLE;
  }
  // 温度中
  if (temperature > 0.35) {
    if (moisture < 0.35) return BIOMES.GRASSLAND;
    if (moisture < 0.65) return BIOMES.GRASSLAND;
    return BIOMES.FOREST;
  }
  // 温度低
  if (temperature > 0.15) {
    if (moisture < 0.4) return BIOMES.TUNDRA;
    return BIOMES.TAIGA;
  }
  // 极寒
  return BIOMES.SNOW;
}
