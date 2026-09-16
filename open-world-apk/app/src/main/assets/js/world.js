/**
 * world.js — 程序化世界生成
 *
 * 采用区块(Chunk)系统实现无限世界：
 * - 世界被划分为 CHUNK_SIZE × CHUNK_SIZE 的区块
 * - 每个区块按需生成并缓存
 * - 远离玩家的区块自动卸载（LRU 式，防止内存无限增长）
 * - 区块数据：高度图、温度、湿度、生物群系、装饰物
 *
 * 生成管线：
 *   坐标 → 域扭曲 fBm (elevation) → 高度
 *        → 独立 fBm (temperature) → 温度
 *        → 独立 fBm (moisture)     → 湿度
 *        → getBiome()              → 群系
 *        → 群系植被密度 + 散点噪声  → 装饰物
 */

const CHUNK_SIZE = 32;       // 每个区块 32×32 格
const TILE_SIZE = 24;        // 每格像素大小
const MAX_LOADED_CHUNKS = 96; // 最多保留的区块数（超出则卸载最远的）

class World {
  constructor() {
    this.chunks = new Map(); // key: "cx,cy" → Chunk
  }

  /** 获取区块键 */
  _key(cx, cy) { return `${cx},${cy}`; }

  /** 获取指定格子的世界数据，按需生成区块 */
  getTile(wx, wy) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cy);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.tiles[ly][lx];
  }

  /** 获取或生成区块 */
  getChunk(cx, cy) {
    const key = this._key(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this._generateChunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /**
   * 围绕玩家更新区块加载状态：
   * - 预加载玩家周围的区块（避免移动时卡顿）
   * - 卸载距离过远的区块（控制内存）
   */
  updateAround(px, py, radius = 2) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcy = Math.floor(py / CHUNK_SIZE);

    // 预加载周围区块
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.getChunk(pcx + dx, pcy + dy);
      }
    }

    // 卸载过远区块（曼哈顿距离 > radius+2）
    if (this.chunks.size > MAX_LOADED_CHUNKS) {
      const limit = radius + 3;
      for (const [key, chunk] of this.chunks) {
        const dist = Math.max(Math.abs(chunk.cx - pcx), Math.abs(chunk.cy - pcy));
        if (dist > limit) {
          this.chunks.delete(key);
        }
      }
    }
  }

  /** 生成一个区块的所有数据 */
  _generateChunk(cx, cy) {
    const noise = getNoise();
    const tiles = [];
    const decorations = [];

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      tiles[ly] = [];
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;

        // 采样坐标（除以尺度让地形更平缓）
        const nx = wx * 0.012;
        const ny = wy * 0.012;

        // 高度 — 域扭曲让海岸线更自然
        const elevation = noise.warpedFbm(nx, ny, 1.2, {
          octaves: 6, frequency: 1, persistence: 0.5, lacunarity: 2.0
        });

        // 温度 — 随纬度变化 + 噪声扰动
        const latTemp = 1 - Math.abs(wy) * 0.0015;
        const tempNoise = noise.fbm(nx * 0.8 + 100, ny * 0.8 + 100, {
          octaves: 3, persistence: 0.5
        });
        const temperature = Math.max(0, Math.min(1,
          latTemp * 0.6 + (tempNoise * 0.5 + 0.5) * 0.4));

        // 湿度
        const moistNoise = noise.fbm(nx * 0.6 + 200, ny * 0.6 + 200, {
          octaves: 4, persistence: 0.55
        });
        const moisture = Math.max(0, Math.min(1, moistNoise * 0.5 + 0.5));

        const biome = getBiome(elevation, temperature, moisture);

        tiles[ly][lx] = {
          elevation,
          temperature,
          moisture,
          biome
        };

        // 装饰物：基于群系植被密度 + 确定性散点
        if (biome.walkable && biome.vegetation > 0) {
          const r = this._hash2(wx, wy);
          const density = biome.vegetation * 0.4;
          if (r < density) {
            // 细分装饰物类型：岩石 / 灌木 / 花 / 树
            const r2 = this._hash2(wx + 1, wy + 1);
            let type;
            if (r2 < 0.12) type = 'rock';
            else if (r2 < 0.30) type = 'bush';
            else if (r2 < 0.42 && biome.vegetation < 0.5) type = 'flower';
            else type = 'tree';
            decorations.push({
              x: wx, y: wy,
              type,
              variant: Math.floor(this._hash2(wx + 2, wy + 2) * 4)
            });
          }
        }
      }
    }

    return { cx, cy, tiles, decorations };
  }

  /** 确定性二维哈希 → [0,1) */
  _hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /** 获取某坐标的生物群系 */
  getBiomeAt(wx, wy) {
    return this.getTile(wx, wy).biome;
  }

  /** 判断格子是否可行走 */
  isWalkable(wx, wy) {
    return this.getTile(wx, wy).biome.walkable;
  }

  /** 获取移动成本（用于寻路） */
  getMoveCost(wx, wy) {
    return this.getTile(wx, wy).biome.moveCost;
  }
}
