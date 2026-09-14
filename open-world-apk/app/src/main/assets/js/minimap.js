/**
 * minimap.js — 小地图
 * 显示玩家周围的地形概览与玩家位置
 */

class Minimap {
  constructor(canvas, world, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.player = player;
    this.range = 40; // 显示半径（格）
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const range = this.range;
    const cellW = w / (range * 2);
    const cellH = h / (range * 2);

    // 背景
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    const px = this.player.x;
    const py = this.player.y;

    // 绘制地形
    for (let dy = -range; dy < range; dy++) {
      for (let dx = -range; dx < range; dx++) {
        const tx = Math.floor(px + dx);
        const ty = Math.floor(py + dy);
        const biome = this.world.getBiomeAt(tx, ty);

        const sx = (dx + range) * cellW;
        const sy = (dy + range) * cellH;

        ctx.fillStyle = biome.color;
        ctx.fillRect(sx, sy, cellW + 0.5, cellH + 0.5);
      }
    }

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
}
