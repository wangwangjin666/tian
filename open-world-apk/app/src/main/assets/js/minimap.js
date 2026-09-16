/**
 * minimap.js — 小地图
 * 显示玩家周围的地形概览与玩家位置
 *
 * 性能优化：
 * - 离屏缓冲：地形只在玩家移动超过阈值时重绘到离屏 canvas
 * - 每帧仅将离屏缓冲拷贝到可见 canvas + 叠加玩家标记
 */

class Minimap {
  constructor(canvas, world, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.player = player;
    this.range = 40; // 显示半径（格）

    // 离屏缓冲
    this.buffer = document.createElement('canvas');
    this.buffer.width = canvas.width;
    this.buffer.height = canvas.height;
    this.bufferCtx = this.buffer.getContext('2d');

    this._lastPx = Infinity;
    this._lastPy = Infinity;
    this._dirty = true;
  }

  /** 玩家移动超过 1 格时重绘地形缓冲 */
  _maybeRedrawBuffer() {
    const px = this.player.x;
    const py = this.player.y;
    if (!this._dirty &&
        Math.abs(px - this._lastPx) < 1 &&
        Math.abs(py - this._lastPy) < 1) {
      return;
    }
    this._lastPx = px;
    this._lastPy = py;
    this._dirty = false;

    const ctx = this.bufferCtx;
    const w = this.buffer.width;
    const h = this.buffer.height;
    const range = this.range;
    const cellW = w / (range * 2);
    const cellH = h / (range * 2);

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    const ipx = Math.floor(px);
    const ipy = Math.floor(py);

    for (let dy = -range; dy < range; dy++) {
      for (let dx = -range; dx < range; dx++) {
        const biome = this.world.getBiomeAt(ipx + dx, ipy + dy);
        ctx.fillStyle = biome.color;
        ctx.fillRect((dx + range) * cellW, (dy + range) * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  render() {
    this._maybeRedrawBuffer();

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 拷贝地形缓冲
    ctx.drawImage(this.buffer, 0, 0);

    // 玩家标记（中心）
    ctx.fillStyle = '#ff5050';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,80,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
    ctx.stroke();

    // 边框
    ctx.strokeStyle = 'rgba(120,140,200,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }

  /** 切换世界时强制重绘 */
  invalidate() {
    this._dirty = true;
  }
}
