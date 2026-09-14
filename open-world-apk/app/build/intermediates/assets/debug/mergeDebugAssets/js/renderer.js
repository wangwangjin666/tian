/**
 * renderer.js — 渲染管线
 *
 * 分层渲染：
 *   1. 地形层（按生物群系着色，水域动画）
 *   2. 装饰层（树木、岩石）
 *   3. 实体层（玩家、NPC）
 *   4. 光照层（昼夜循环叠加）
 *
 * 性能优化：
 *   - 视锥体剔除：只渲染可见格子
 *   - 每块像素直接填充，避免逐像素绘制
 */

class Renderer {
  constructor(canvas, world, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.camera = camera;
    this.time = 0; // 游戏内时间（0~1，0=午夜，0.25=日出，0.5=正午，0.75=日落）
    this.dayLength = 180; // 一天 180 秒
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** 获取当前时间（0~24 小时） */
  get hour() {
    return this.time * 24;
  }

  /** 根据时间获取光照颜色（昼夜循环） */
  _getLighting() {
    const h = this.hour;
    // 关键时间点：
    // 0=午夜（深蓝黑）, 6=日出（暖橙）, 12=正午（白）, 18=日落（暖橙）, 24=午夜
    let r, g, b, alpha;

    if (h < 5 || h >= 21) {
      // 深夜
      r = 8; g = 12; b = 40; alpha = 0.55;
    } else if (h < 7) {
      // 日出
      const t = (h - 5) / 2;
      r = 8 + (255 - 8) * t;
      g = 12 + (140 - 12) * t;
      b = 40 + (80 - 40) * t;
      alpha = 0.55 - 0.35 * t;
    } else if (h < 17) {
      // 白天
      r = 255; g = 245; b = 220; alpha = 0.05;
    } else if (h < 19) {
      // 日落
      const t = (h - 17) / 2;
      r = 255;
      g = 245 - (245 - 120) * t;
      b = 220 - (220 - 60) * t;
      alpha = 0.05 + 0.35 * t;
    } else {
      // 黄昏到夜
      const t = (h - 19) / 2;
      r = 255 - (255 - 8) * t;
      g = 120 - (120 - 12) * t;
      b = 60 - (60 - 40) * t;
      alpha = 0.4 + 0.15 * t;
    }

    return { r, g, b, alpha };
  }

  render(player, npcs) {
    const ctx = this.ctx;
    const cam = this.camera;
    const ts = TILE_SIZE;

    // 清屏
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 计算可见格子范围
    const bounds = cam.getViewBounds();
    const startTileX = Math.floor(bounds.minX / ts) - 1;
    const endTileX = Math.ceil(bounds.maxX / ts) + 1;
    const startTileY = Math.floor(bounds.minY / ts) - 1;
    const endTileY = Math.ceil(bounds.maxY / ts) + 1;

    // 1. 渲染地形
    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        const tile = this.world.getTile(tx, ty);
        const screen = cam.worldToScreen(tx * ts, ty * ts);

        const biome = tile.biome;
        ctx.fillStyle = biome.color;

        // 水域波纹动画
        if (biome.id === 'ocean' || biome.id === 'deep_ocean') {
          const wave = Math.sin(this.time * Math.PI * 2 + tx * 0.5 + ty * 0.3) * 0.04;
          ctx.fillStyle = this._shade(biome.color, wave);
        }

        ctx.fillRect(Math.floor(screen.x), Math.floor(screen.y), ts + 1, ts + 1);
      }
    }

    // 2. 渲染装饰物（树木、岩石）
    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        const chunk = this.world.getChunk(
          Math.floor(tx / CHUNK_SIZE), Math.floor(ty / CHUNK_SIZE)
        );
        if (!chunk) continue;

        for (const deco of chunk.decorations) {
          if (deco.x < startTileX || deco.x >= endTileX ||
              deco.y < startTileY || deco.y >= endTileY) continue;
          const screen = cam.worldToScreen(deco.x * ts + ts / 2, deco.y * ts + ts);
          this._drawDecoration(ctx, deco, screen.x, screen.y);
        }
      }
    }

    // 3. 渲染 NPC
    for (const npc of npcs) {
      const screen = cam.worldToScreen(npc.x * ts, npc.y * ts);
      if (screen.x < -50 || screen.x > this.canvas.width + 50 ||
          screen.y < -50 || screen.y > this.canvas.height + 50) continue;
      this._drawCharacter(ctx, screen.x, screen.y, npc.config.color, npc.walkPhase, npc.facing);
    }

    // 4. 渲染玩家
    const playerScreen = cam.worldToScreen(player.x * ts, player.y * ts);
    this._drawCharacter(ctx, playerScreen.x, playerScreen.y, '#6c8aff', player.walkPhase, player.facing, true);

    // 5. 昼夜光照叠加
    const light = this._getLighting();
    ctx.fillStyle = `rgba(${light.r}, ${light.g}, ${light.b}, ${light.alpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** 绘制装饰物 */
  _drawDecoration(ctx, deco, x, y) {
    if (deco.type === 'tree') {
      // 树干
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(x - 2, y - 10, 4, 10);
      // 树冠
      const greens = ['#2d7a3e', '#3a9250', '#256535', '#358045'];
      ctx.fillStyle = greens[deco.variant % greens.length];
      ctx.beginPath();
      ctx.arc(x, y - 16, 10 + (deco.variant % 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this._shade(greens[deco.variant % greens.length], 0.15);
      ctx.beginPath();
      ctx.arc(x - 3, y - 18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco.type === 'rock') {
      ctx.fillStyle = '#8a8a92';
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a0a0a8';
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 5, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 绘制角色（玩家/NPC 通用） */
  _drawCharacter(ctx, x, y, color, walkPhase, facing, isPlayer = false) {
    const bounce = Math.sin(walkPhase) * 1.5;
    const cy = y - 12 + bounce;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.fillStyle = color;
    ctx.fillRect(x - 6, cy - 2, 12, 12);

    // 头部
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(x - 5, cy - 12, 10, 10);

    // 眼睛（根据朝向）
    ctx.fillStyle = '#1a1a2a';
    if (facing === 'down') {
      ctx.fillRect(x - 3, cy - 8, 2, 2);
      ctx.fillRect(x + 1, cy - 8, 2, 2);
    } else if (facing === 'up') {
      // 背面，无眼睛
    } else if (facing === 'left') {
      ctx.fillRect(x - 4, cy - 8, 2, 2);
    } else {
      ctx.fillRect(x + 2, cy - 8, 2, 2);
    }

    // 玩家高亮圈
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(108, 138, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 2, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** 颜色明暗调整，amount 正=亮，负=暗 */
  _shade(hex, amount) {
    const c = hex.replace('#', '');
    let r = parseInt(c.substr(0, 2), 16);
    let g = parseInt(c.substr(2, 2), 16);
    let b = parseInt(c.substr(4, 2), 16);
    const adj = amount * 255;
    r = Math.max(0, Math.min(255, Math.round(r + adj)));
    g = Math.max(0, Math.min(255, Math.round(g + adj)));
    b = Math.max(0, Math.min(255, Math.round(b + adj)));
    return `rgb(${r},${g},${b})`;
  }
}
