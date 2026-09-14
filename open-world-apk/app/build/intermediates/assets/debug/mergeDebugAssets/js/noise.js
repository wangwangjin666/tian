/**
 * noise.js — 程序化噪声引擎
 *
 * 基于经典 Perlin 噪声实现，支持：
 * - 种子化随机（可复现的世界生成）
 * - 2D 噪声采样
 * - 分形布朗运动 (fBm)：多倍频叠加产生自然地形
 * - 域扭曲 (domain warping)：让地形更有机
 */

class Noise {
  constructor(seed = 1337) {
    this.seed = seed;
    this.perm = this._buildPermutation(seed);
  }

  /** 用种子构建排列表（Fisher-Yates 洗牌） */
  _buildPermutation(seed) {
    const p = new Array(512);
    const base = new Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;

    // 种子化的伪随机数生成器（mulberry32）
    let s = seed >>> 0;
    const rand = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Fisher-Yates 洗牌
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }

    // 复制到 512 长度以避免越界
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    return p;
  }

  /** 2D Perlin 噪声，返回 [-1, 1] */
  perlin2(x, y) {
    const p = this.perm;
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this._fade(xf);
    const v = this._fade(yf);

    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    const x1 = this._lerp(this._grad2(aa, xf, yf), this._grad2(ba, xf - 1, yf), u);
    const x2 = this._lerp(this._grad2(ab, xf, yf - 1), this._grad2(bb, xf - 1, yf - 1), u);

    return this._lerp(x1, x2, v);
  }

  /** 分形布朗运动 — 多层噪声叠加 */
  fbm(x, y, options = {}) {
    const {
      octaves = 6,
      frequency = 1,
      amplitude = 1,
      lacunarity = 2.0,
      persistence = 0.5
    } = options;

    let value = 0;
    let amp = amplitude;
    let freq = frequency;
    let max = 0;

    for (let i = 0; i < octaves; i++) {
      value += amp * this.perlin2(x * freq, y * freq);
      max += amp;
      amp *= persistence;
      freq *= lacunarity;
    }

    return value / max; // 归一化到 [-1, 1]
  }

  /** 域扭曲 — 用噪声扭曲采样坐标，产生更有机的形态 */
  warpedFbm(x, y, warpStrength = 1.0, fbmOpts = {}) {
    const warpX = this.fbm(x * 0.5 + 5.2, y * 0.5 + 1.3, fbmOpts);
    const warpY = this.fbm(x * 0.5 + 7.8, y * 0.5 + 3.1, fbmOpts);
    return this.fbm(
      x + warpX * warpStrength,
      y + warpY * warpStrength,
      fbmOpts
    );
  }

  _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  _lerp(a, b, t) { return a + t * (b - a); }

  _grad2(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }
}

// 全局噪声实例
let _noise = new Noise(1337);

function setSeed(seed) {
  _noise = new Noise(seed);
}

function getNoise() {
  return _noise;
}
