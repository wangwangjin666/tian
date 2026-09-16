/**
 * main.js — 游戏主循环
 *
 * 串联所有子系统：噪声 → 世界 → 输入 → 玩家 → 相机 → 渲染 → UI
 *
 * v1.1 新增：
 * - 双指捏合 / 鼠标滚轮缩放
 * - 天数与探索里程统计
 * - 区块流式加载与卸载
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.minimapCanvas = document.getElementById('minimap');

    this.seed = 20260914;
    setSeed(this.seed);

    this.world = new World();
    this.input = new Input();
    this.camera = new Camera();
    this.renderer = new Renderer(this.canvas, this.world, this.camera);
    this.pathfinding = new Pathfinding(this.world);

    // 找到一个可行走的出生点
    const spawn = this._findSpawn();
    this.player = new Player(this.world, spawn.x, spawn.y);
    this.camera.follow(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE);
    this.camera.x = this.player.x * TILE_SIZE;
    this.camera.y = this.player.y * TILE_SIZE;

    // 预加载出生点周围区块
    this.world.updateAround(this.player.x, this.player.y, 2);

    // 生成 NPC
    this.npcs = [];
    this._spawnNPCs(15);

    this.minimap = new Minimap(this.minimapCanvas, this.world, this.player);

    this.paused = false;
    this.lastTime = performance.now();

    // 统计
    this.distance = 0; // 已行走格数
    this._lastDay = 1;

    this._setupUI();
    this._setupZoom();
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // 隐藏加载屏
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
    }, 400);
  }

  /** 找一个可行走的出生点（从原点螺旋搜索） */
  _findSpawn() {
    for (let r = 0; r < 50; r++) {
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2;
        const x = Math.floor(Math.cos(angle) * r);
        const y = Math.floor(Math.sin(angle) * r);
        if (this.world.isWalkable(x, y)) return { x: x + 0.5, y: y + 0.5 };
      }
    }
    return { x: 0.5, y: 0.5 };
  }

  _spawnNPCs(count) {
    const types = Object.keys(NPC_TYPES);
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 50) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 30;
      const x = Math.floor(this.player.x + Math.cos(angle) * dist);
      const y = Math.floor(this.player.y + Math.sin(angle) * dist);
      if (this.world.isWalkable(x, y)) {
        const type = types[Math.floor(Math.random() * types.length)];
        this.npcs.push(new NPC(this.world, this.pathfinding, x + 0.5, y + 0.5, type));
        placed++;
      }
    }
  }

  _setupUI() {
    document.getElementById('btn-resume').addEventListener('click', () => this._togglePause(false));
    document.getElementById('btn-new-seed').addEventListener('click', () => this._newWorld());
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this._togglePause());
  }

  /** 缩放交互：鼠标滚轮 + 触摸双指捏合 */
  _setupZoom() {
    // 滚轮缩放
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.camera.zoomBy(factor);
    }, { passive: false });

    // 双指捏合
    let pinchDist = 0;
    const getDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchDist = getDist(e.touches);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchDist > 0) {
        e.preventDefault();
        const d = getDist(e.touches);
        if (d > 0) {
          this.camera.zoomBy(d / pinchDist);
          pinchDist = d;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      pinchDist = 0;
    }, { passive: true });
  }

  _togglePause(force) {
    this.paused = force !== undefined ? force : !this.paused;
    document.getElementById('pause-menu').classList.toggle('hidden', !this.paused);
    if (this.paused) {
      document.getElementById('menu-seed').textContent = this.seed;
      document.getElementById('menu-chunks').textContent = this.world.chunks.size;
      document.getElementById('menu-npcs').textContent = this.npcs.length;
    }
  }

  _newWorld() {
    this.seed = Math.floor(Math.random() * 1e9);
    setSeed(this.seed);
    this.world = new World();
    const spawn = this._findSpawn();
    this.player = new Player(this.world, spawn.x, spawn.y);
    this.npcs = [];
    this._spawnNPCs(15);
    this.minimap.world = this.world;
    this.minimap.player = this.player;
    this.minimap.invalidate();
    this.renderer.world = this.world;
    this.renderer.particles = [];
    this.renderer.time = 0.25;
    this.renderer.day = 1;
    this.distance = 0;
    this.world.updateAround(this.player.x, this.player.y, 2);
    this.camera.follow(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE);
    this.camera.x = this.player.x * TILE_SIZE;
    this.camera.y = this.player.y * TILE_SIZE;
    this._togglePause(false);
  }

  _resize() {
    this.renderer.resize();
  }

  start() {
    this._loop();
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05); // 限制最大步长

    // ESC 暂停
    if (this.input.wasPressed('escape')) {
      this._togglePause();
    }

    if (!this.paused) {
      this._update(dt);
    }

    this._render(dt);
    this._updateHUD();
    this.input.clearFrame();
  }

  _update(dt) {
    // 时间推进（昼夜循环）
    const prevTime = this.renderer.time;
    this.renderer.time = (this.renderer.time + dt / this.renderer.dayLength) % 1;
    if (this.renderer.time < prevTime) {
      this.renderer.day++; // 跨过午夜 → 新的一天
    }

    const prevX = this.player.x;
    const prevY = this.player.y;

    this.player.update(dt, this.input);
    this.distance += Math.hypot(this.player.x - prevX, this.player.y - prevY);

    this.camera.follow(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE);
    this.camera.update();

    // 流式加载/卸载区块
    this.world.updateAround(this.player.x, this.player.y, 2);

    for (const npc of this.npcs) npc.update(dt);
  }

  _render(dt) {
    this.renderer.render(this.player, this.npcs, dt);
    this.minimap.render();
  }

  _updateHUD() {
    const biome = this.player.getBiome();
    document.getElementById('hud-coords').textContent =
      `X: ${this.player.tileX}, Y: ${this.player.tileY}`;
    document.getElementById('hud-biome').textContent = biome.name;

    const h = this.renderer.hour;
    const hh = String(Math.floor(h)).padStart(2, '0');
    const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
    document.getElementById('hud-time').textContent = `${hh}:${mm}`;

    // 天数与里程
    document.getElementById('hud-day').textContent = `第 ${this.renderer.day} 天`;
    document.getElementById('hud-distance').textContent = `${Math.floor(this.distance)} 格`;
  }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game; // 暴露以便调试
  game.start();
});
