/**
 * main.js — 游戏主循环
 *
 * 串联所有子系统：噪声 → 世界 → 输入 → 玩家 → 相机 → 渲染 → UI
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.minimapCanvas = document.getElementById('minimap');

    this.seed = 20260914;
    setSeed(this.seed);

    this.world = new World();
    this.input = new Input();
    this.camera = new Camera(this.canvas);
    this.renderer = new Renderer(this.canvas, this.world, this.camera);
    this.pathfinding = new Pathfinding(this.world);

    // 找到一个可行走的出生点
    const spawn = this._findSpawn();
    this.player = new Player(this.world, spawn.x, spawn.y);
    this.camera.follow(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE);

    // 生成 NPC
    this.npcs = [];
    this._spawnNPCs(15);

    this.minimap = new Minimap(this.minimapCanvas, this.world, this.player);

    this.paused = false;
    this.lastTime = performance.now();

    this._setupUI();
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
    this.renderer.world = this.world;
    this.camera.follow(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE);
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

    this._render();
    this._updateHUD();
    this.input.clearFrame();
  }

  _update(dt) {
    // 时间推进（昼夜循环）
    this.renderer.time = (this.renderer.time + dt / this.renderer.dayLength) % 1;

    this.player.update(dt, this.input);
    this.camera.follow(this.player.x * TILE_SIZE, this.player.y * TILE_SIZE);
    this.camera.update();

    for (const npc of this.npcs) npc.update(dt);
  }

  _render() {
    this.renderer.render(this.player, this.npcs);
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
  }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.game = game; // 暴露以便调试
  game.start();
});
