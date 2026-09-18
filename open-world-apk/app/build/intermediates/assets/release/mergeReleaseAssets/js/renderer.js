/**
 * renderer.js — 渲染管线
 *
 * 分层渲染：
 *   1. 地形层（按生物群系着色 + 高度明暗 + 水域动画 + 海岸泡沫）
 *   2. 实体层（装饰物 + 玩家 + NPC，按 Y 轴深度排序）
 *   3. 粒子层（夜晚萤火虫、寒冷地区飘雪）
 *   4. 光照层（昼夜循环叠加）
 *
 * 性能优化：
 *   - 视锥体剔除：只渲染可见格子
 *   - devicePixelRatio 适配：高分屏清晰渲染
 *   - 颜色缓存：量化高度/波形等级，避免每帧重复生成颜色字符串
 *   - 区块装饰物按区块遍历，避免重复查询
 */

class Renderer {
  constructor(canvas, world, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.world = world;
    this.camera = camera;
    this.time = 0.25; // 游戏内时间（0~1，0=午夜，0.25=日出，0.5=正午，0.75=日落）
    this.dayLength = 180; // 一天 180 秒
    this.day = 1; // 天数计数

    this._colorCache = new Map(); // 颜色字符串缓存
    this._biomeRGB = new Map();   // biome.id → {r,g,b}

    // 粒子系统
    this.particles = [];
    this._particleTimer = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    this.camera.setViewport(w, h);
  }

  /** 获取当前时间（0~24 小时） */
  get hour() {
    return this.time * 24;
  }

  /** 是否夜晚（用于粒子生成） */
  get isNight() {
    const h = this.hour;
    return h < 5.5 || h >= 19.5;
  }

  /** 解析 hex 颜色为 rgb 分量（带缓存） */
  _parseHex(hex) {
    let c = this._biomeRGB.get(hex);
    if (!c) {
      const s = hex.replace('#', '');
      c = {
        r: parseInt(s.substr(0, 2), 16),
        g: parseInt(s.substr(2, 2), 16),
        b: parseInt(s.substr(4, 2), 16)
      };
      this._biomeRGB.set(hex, c);
    }
    return c;
  }

  /** 生成带缓存的颜色字符串 */
  _cachedRGB(key, r, g, b) {
    let s = this._colorCache.get(key);
    if (!s) {
      s = `rgb(${r},${g},${b})`;
      this._colorCache.set(key, s);
      if (this._colorCache.size > 4000) this._colorCache.clear();
    }
    return s;
  }

  /**
   * 计算瓦片颜色（含量化缓存）
   * 高度影响明暗：越高越亮，山谷越暗；水域越深越暗
   */
  _tileColor(tile, waveLevel) {
    const biome = tile.biome;
    const isWater = biome.id === 'ocean' || biome.id === 'deep_ocean';

    let amount;
    if (isWater) {
      // 水域：深度决定明暗（elevation 越负越深）
      amount = Math.max(-0.25, Math.min(0.1, tile.elevation * 0.35));
    } else {
      // 陆地：高度决定明暗
      amount = Math.max(-0.12, Math.min(0.22, (tile.elevation - 0.05) * 0.4));
    }

    // 量化到 24 级，配合波形 3 级 → 缓存命中率高
    const level = Math.round(amount * 60) + 20;
    const key = `${biome.id}:${level}:${waveLevel}`;

    let s = this._colorCache.get(key);
    if (!s) {
      const base = this._parseHex(biome.color);
      const adj = amount * 255;
      const r = Math.max(0, Math.min(255, Math.round(base.r + adj)));
      const g = Math.max(0, Math.min(255, Math.round(base.g + adj)));
      const b = Math.max(0, Math.min(255, Math.round(base.b + adj)));
      s = `rgb(${r},${g},${b})`;
      this._colorCache.set(key, s);
    }
    return s;
  }

  /** 根据时间获取光照颜色（昼夜循环） */
  _getLighting() {
    const h = this.hour;
    let r, g, b, alpha;

    if (h < 5 || h >= 21) {
      r = 8; g = 12; b = 40; alpha = 0.55;
    } else if (h < 7) {
      const t = (h - 5) / 2;
      r = 8 + (255 - 8) * t;
      g = 12 + (140 - 12) * t;
      b = 40 + (80 - 40) * t;
      alpha = 0.55 - 0.35 * t;
    } else if (h < 17) {
      r = 255; g = 245; b = 220; alpha = 0.05;
    } else if (h < 19) {
      const t = (h - 17) / 2;
      r = 255;
      g = 245 - (245 - 120) * t;
      b = 220 - (220 - 60) * t;
      alpha = 0.05 + 0.35 * t;
    } else {
      const t = (h - 19) / 2;
      r = 255 - (255 - 8) * t;
      g = 120 - (120 - 12) * t;
      b = 60 - (60 - 40) * t;
      alpha = 0.4 + 0.15 * t;
    }

    return { r, g, b, alpha };
  }

  render(player, npcs, dt, interactTarget) {
    const ctx = this.ctx;
    const cam = this.camera;
    const zoom = cam.zoom;
    const ts = TILE_SIZE * zoom;

    // 清屏
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, cam.viewW, cam.viewH);

    // 计算可见格子范围
    const bounds = cam.getViewBounds();
    const startTileX = Math.floor(bounds.minX / TILE_SIZE) - 1;
    const endTileX = Math.ceil(bounds.maxX / TILE_SIZE) + 1;
    const startTileY = Math.floor(bounds.minY / TILE_SIZE) - 1;
    const endTileY = Math.ceil(bounds.maxY / TILE_SIZE) + 1;

    const wavePhase = this.time * Math.PI * 2;

    // ===== 1. 渲染地形 =====
    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        const tile = this.world.getTile(tx, ty);
        const screen = cam.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE);

        // 水域波形（量化为 3 级）
        let waveLevel = 0;
        const bid = tile.biome.id;
        if (bid === 'ocean' || bid === 'deep_ocean') {
          const wave = Math.sin(wavePhase * 8 + tx * 0.5 + ty * 0.3);
          waveLevel = wave > 0.4 ? 1 : (wave < -0.4 ? -1 : 0);
        }

        ctx.fillStyle = this._tileColor(tile, waveLevel);
        ctx.fillRect(Math.floor(screen.x), Math.floor(screen.y), Math.ceil(ts) + 1, Math.ceil(ts) + 1);

        // 海岸泡沫：沙滩紧邻水域的边缘画浅色条
        if (bid === 'beach') {
          this._drawFoam(ctx, tx, ty, screen.x, screen.y, ts);
        }
      }
    }

    // ===== 2. 收集并按 Y 排序绘制实体（装饰物 + 角色） =====
    const drawables = [];

    // 装饰物：按区块遍历（去重）
    const c0x = Math.floor(startTileX / CHUNK_SIZE);
    const c1x = Math.floor(endTileX / CHUNK_SIZE);
    const c0y = Math.floor(startTileY / CHUNK_SIZE);
    const c1y = Math.floor(endTileY / CHUNK_SIZE);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        for (const deco of chunk.decorations) {
          if (deco.x < startTileX || deco.x >= endTileX ||
              deco.y < startTileY || deco.y >= endTileY) continue;

          // 已采集的装饰物：树留树桩，其他跳过
          if (this.harvestSystem) {
            const info = this.harvestSystem.isHarvested(chunk, deco);
            if (info) {
              if (info.type === 'tree') {
                drawables.push({ kind: 'stump', y: deco.y, deco });
              }
              continue;
            }
          }
          drawables.push({ kind: 'deco', y: deco.y, deco });
        }
      }
    }

    // NPC
    for (const npc of npcs) {
      if (npc.x < startTileX - 2 || npc.x > endTileX + 2 ||
          npc.y < startTileY - 2 || npc.y > endTileY + 2) continue;
      drawables.push({ kind: 'npc', y: npc.y, npc });
    }

    // 玩家
    drawables.push({ kind: 'player', y: player.y, player });

    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables) {
      if (d.kind === 'deco') {
        const screen = cam.worldToScreen(d.deco.x * TILE_SIZE + TILE_SIZE / 2, d.deco.y * TILE_SIZE + TILE_SIZE);
        this._drawDecoration(ctx, d.deco, screen.x, screen.y, zoom);
      } else if (d.kind === 'stump') {
        const screen = cam.worldToScreen(d.deco.x * TILE_SIZE + TILE_SIZE / 2, d.deco.y * TILE_SIZE + TILE_SIZE);
        this._drawStump(ctx, screen.x, screen.y, zoom);
      } else if (d.kind === 'npc') {
        const screen = cam.worldToScreen(d.npc.x * TILE_SIZE, d.npc.y * TILE_SIZE);
        this._drawCharacter(ctx, screen.x, screen.y, d.npc.config.color, d.npc.walkPhase, d.npc.facing, false, zoom);
      } else {
        const screen = cam.worldToScreen(d.player.x * TILE_SIZE, d.player.y * TILE_SIZE);
        this._drawCharacter(ctx, screen.x, screen.y, '#6c8aff', d.player.walkPhase, d.player.facing, true, zoom);
      }
    }

    // 交互目标高亮圈
    if (interactTarget) {
      const deco = interactTarget.deco;
      const screen = cam.worldToScreen(deco.x * TILE_SIZE + TILE_SIZE / 2, deco.y * TILE_SIZE + TILE_SIZE / 2);
      const pulse = 0.75 + Math.sin(performance.now() / 250) * 0.25;
      ctx.strokeStyle = `rgba(255, 230, 120, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 14 * zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ===== 3. 粒子 =====
    this._updateParticles(dt, player);
    this._drawParticles(ctx, cam);

    // ===== 4. 昼夜光照叠加 =====
    const light = this._getLighting();
    ctx.fillStyle = `rgba(${light.r | 0}, ${light.g | 0}, ${light.b | 0}, ${light.alpha})`;
    ctx.fillRect(0, 0, cam.viewW, cam.viewH);
  }

  /** 海岸泡沫：检测沙滩四邻是否有水，有则画浅色边缘 */
  _drawFoam(ctx, tx, ty, sx, sy, ts) {
    const w = this.world;
    const foamColor = 'rgba(240, 248, 255, 0.35)';
    const edge = Math.max(2, ts * 0.15);
    let drew = false;

    if (!w.getTile(tx, ty - 1).biome.walkable && w.getTile(tx, ty - 1).biome.vegetation === 0) {
      ctx.fillStyle = foamColor;
      ctx.fillRect(sx, sy, ts, edge);
      drew = true;
    }
    if (!w.getTile(tx, ty + 1).biome.walkable && w.getTile(tx, ty + 1).biome.vegetation === 0) {
      ctx.fillStyle = foamColor;
      ctx.fillRect(sx, sy + ts - edge, ts, edge);
      drew = true;
    }
    if (!w.getTile(tx - 1, ty).biome.walkable && w.getTile(tx - 1, ty).biome.vegetation === 0) {
      ctx.fillStyle = foamColor;
      ctx.fillRect(sx, sy, edge, ts);
      drew = true;
    }
    if (!w.getTile(tx + 1, ty).biome.walkable && w.getTile(tx + 1, ty).biome.vegetation === 0) {
      ctx.fillStyle = foamColor;
      ctx.fillRect(sx + ts - edge, sy, edge, ts);
      drew = true;
    }
    return drew;
  }

  /** 绘制装饰物 */
  _drawDecoration(ctx, deco, x, y, z) {
    if (deco.type === 'tree') {
      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x, y, 8 * z, 3 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      // 树干
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(x - 2 * z, y - 10 * z, 4 * z, 10 * z);
      // 树冠
      const greens = ['#2d7a3e', '#3a9250', '#256535', '#358045'];
      const g = greens[deco.variant % greens.length];
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - 16 * z, (10 + (deco.variant % 2)) * z, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(x - 3 * z, y - 18 * z, 5 * z, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco.type === 'rock') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y, 7 * z, 2.5 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a8a92';
      ctx.beginPath();
      ctx.ellipse(x, y - 4 * z, 7 * z, 5 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a0a0a8';
      ctx.beginPath();
      ctx.ellipse(x - 2 * z, y - 5 * z, 3 * z, 2 * z, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco.type === 'bush') {
      ctx.fillStyle = '#3f7a3a';
      ctx.beginPath();
      ctx.arc(x - 3 * z, y - 3 * z, 4 * z, 0, Math.PI * 2);
      ctx.arc(x + 3 * z, y - 3 * z, 4 * z, 0, Math.PI * 2);
      ctx.arc(x, y - 5 * z, 4.5 * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(x - 1 * z, y - 6 * z, 2 * z, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco.type === 'flower') {
      const colors = ['#e86a8a', '#e8c05a', '#c07ae8', '#f0f0f0'];
      const c = colors[deco.variant % colors.length];
      // 茎
      ctx.strokeStyle = '#4a8a40';
      ctx.lineWidth = Math.max(1, 1.2 * z);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 5 * z);
      ctx.stroke();
      // 花瓣
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y - 6 * z, 2.5 * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5e080';
      ctx.beginPath();
      ctx.arc(x, y - 6 * z, 1 * z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 绘制树桩（树被砍伐后残留） */
  _drawStump(ctx, x, y, z) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y, 6 * z, 2.5 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    // 树桩主体
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(x - 4 * z, y - 6 * z, 8 * z, 6 * z);
    // 年轮顶面
    ctx.fillStyle = '#a07848';
    ctx.beginPath();
    ctx.ellipse(x, y - 6 * z, 4 * z, 2 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6238';
    ctx.beginPath();
    ctx.ellipse(x, y - 6 * z, 2 * z, 1 * z, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 绘制角色（玩家/NPC 通用） */
  _drawCharacter(ctx, x, y, color, walkPhase, facing, isPlayer = false, z = 1) {
    const bounce = Math.sin(walkPhase) * 1.5 * z;
    const cy = y - 12 * z + bounce;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * z, 8 * z, 3 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.fillStyle = color;
    ctx.fillRect(x - 6 * z, cy - 2 * z, 12 * z, 12 * z);

    // 头部
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(x - 5 * z, cy - 12 * z, 10 * z, 10 * z);

    // 眼睛（根据朝向）
    ctx.fillStyle = '#1a1a2a';
    if (facing === 'down') {
      ctx.fillRect(x - 3 * z, cy - 8 * z, 2 * z, 2 * z);
      ctx.fillRect(x + 1 * z, cy - 8 * z, 2 * z, 2 * z);
    } else if (facing === 'left') {
      ctx.fillRect(x - 4 * z, cy - 8 * z, 2 * z, 2 * z);
    } else if (facing === 'right') {
      ctx.fillRect(x + 2 * z, cy - 8 * z, 2 * z, 2 * z);
    }

    // 玩家高亮圈
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(108, 138, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 2 * z, 12 * z, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** 更新并生成粒子 */
  _updateParticles(dt, player) {
    this._particleTimer -= dt;

    if (this._particleTimer <= 0 && this.particles.length < 60) {
      this._particleTimer = 0.25;

      const biome = player.getBiome();
      const px = player.x, py = player.y;

      // 夜晚 + 植被多的群系 → 萤火虫
      if (this.isNight && biome.vegetation >= 0.15) {
        this.particles.push({
          type: 'firefly',
          x: px + (Math.random() - 0.5) * 24,
          y: py + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.4,
          life: 4 + Math.random() * 4,
          maxLife: 8,
          phase: Math.random() * Math.PI * 2
        });
      }

      // 寒冷群系 → 飘雪
      if (biome.id === 'snow' || biome.id === 'tundra' || biome.id === 'taiga') {
        this.particles.push({
          type: 'snow',
          x: px + (Math.random() - 0.5) * 30,
          y: py - 10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 1.5 + Math.random(),
          life: 5,
          maxLife: 5,
          size: 1 + Math.random() * 1.5
        });
      }
    }

    // 更新现有粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.type === 'firefly') {
        p.phase += dt * 3;
        p.x += p.vx * dt + Math.sin(p.phase) * 0.02;
        p.y += p.vy * dt + Math.cos(p.phase * 0.7) * 0.02;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
  }

  /** 绘制粒子 */
  _drawParticles(ctx, cam) {
    for (const p of this.particles) {
      const screen = cam.worldToScreen(p.x * TILE_SIZE, p.y * TILE_SIZE);
      if (screen.x < -10 || screen.x > cam.viewW + 10 ||
          screen.y < -10 || screen.y > cam.viewH + 10) continue;

      if (p.type === 'firefly') {
        const blink = (Math.sin(p.phase * 2) + 1) / 2;
        const fade = Math.min(1, p.life / 1.5);
        ctx.fillStyle = `rgba(200, 255, 120, ${0.3 + blink * 0.6 * fade})`;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 1.5 + blink, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'snow') {
        const fade = Math.min(1, p.life / 1);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * fade})`;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
