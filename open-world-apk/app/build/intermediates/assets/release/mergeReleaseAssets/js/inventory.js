/**
 * inventory.js — 背包与采集系统
 *
 * 玩家靠近装饰物（树/岩石/花/灌木）时可采集：
 * - 树 → 木材（留下树桩，一段时间后重生）
 * - 岩石 → 石头（消失）
 * - 花 → 花朵（消失）
 * - 灌木 → 浆果（消失）
 *
 * 采集状态存储在 chunk 上，随区块卸载自然重置。
 */

const RESOURCE_NAMES = {
  wood: '木材',
  stone: '石头',
  flower: '花朵',
  berry: '浆果'
};

const RESOURCE_COLORS = {
  wood: '#a0722f',
  stone: '#9a9aa2',
  flower: '#e86a8a',
  berry: '#c05a7a'
};

class Inventory {
  constructor() {
    this.items = { wood: 0, stone: 0, flower: 0, berry: 0 };
  }

  add(type, count = 1) {
    if (!(type in this.items)) return;
    this.items[type] += count;
  }

  total() {
    let n = 0;
    for (const k in this.items) n += this.items[k];
    return n;
  }
}

/** 采集规则：装饰物类型 → 产出资源与数量 */
const HARVEST_RULES = {
  tree: { resource: 'wood', count: 2, leavesStump: true },
  rock: { resource: 'stone', count: 2, leavesStump: false },
  flower: { resource: 'flower', count: 1, leavesStump: false },
  bush: { resource: 'berry', count: 1, leavesStump: false }
};

class HarvestSystem {
  constructor(world, inventory) {
    this.world = world;
    this.inventory = inventory;
    this.interactRange = 1.8; // 格
    this._lastMessage = '';
    this._messageTimer = 0;
  }

  /** 查找玩家附近可交互的装饰物 */
  findNearest(px, py) {
    const r = Math.ceil(this.interactRange);
    const tx = Math.floor(px);
    const ty = Math.floor(py);
    let best = null;
    let bestDist = this.interactRange;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const wx = tx + dx;
        const wy = ty + dy;
        const chunk = this.world.getChunk(
          Math.floor(wx / CHUNK_SIZE), Math.floor(wy / CHUNK_SIZE)
        );
        if (!chunk.harvested) chunk.harvested = new Map();

        for (let i = 0; i < chunk.decorations.length; i++) {
          const deco = chunk.decorations[i];
          if (deco.x !== wx || deco.y !== wy) continue;
          if (!HARVEST_RULES[deco.type]) continue;

          const key = `${deco.x},${deco.y}`;
          if (chunk.harvested.has(key)) continue;

          const d = Math.hypot(deco.x + 0.5 - px, deco.y + 0.5 - py);
          if (d < bestDist) {
            bestDist = d;
            best = { deco, chunk, key };
          }
        }
      }
    }
    return best;
  }

  /** 执行采集，返回收获信息或 null */
  harvest(target) {
    if (!target) return null;
    const { deco, chunk, key } = target;
    const rule = HARVEST_RULES[deco.type];
    if (!rule) return null;

    if (!chunk.harvested) chunk.harvested = new Map();
    chunk.harvested.set(key, {
      type: deco.type,
      // 树桩 60 秒后重生，其他 120 秒
      respawnAt: performance.now() + (rule.leavesStump ? 60000 : 120000)
    });

    this.inventory.add(rule.resource, rule.count);
    return { resource: rule.resource, count: rule.count };
  }

  /** 检查并恢复已到重生时间的装饰物 */
  updateRespawns() {
    const now = performance.now();
    for (const chunk of this.world.chunks.values()) {
      if (!chunk.harvested || chunk.harvested.size === 0) continue;
      for (const [key, info] of chunk.harvested) {
        if (now >= info.respawnAt) {
          chunk.harvested.delete(key);
        }
      }
    }
  }

  /** 判断某装饰物是否已被采集（渲染时跳过或画树桩） */
  isHarvested(chunk, deco) {
    if (!chunk.harvested) return null;
    return chunk.harvested.get(`${deco.x},${deco.y}`) || null;
  }
}
