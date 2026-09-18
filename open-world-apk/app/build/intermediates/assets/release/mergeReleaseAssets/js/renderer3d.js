/**
 * renderer3d.js — Three.js 3D 渲染层
 *
 * 将 2D 瓦片世界升级为 3D：
 * - 地形：每个区块生成带顶点色的 Mesh（高度来自同一套噪声，与逻辑层一致）
 * - 水面：跟随玩家的半透明大平面
 * - 装饰物：树/岩石/花/灌木 用 InstancedMesh 渲染（采集后树变树桩）
 * - 角色：玩家与 NPC 用低多边形小人/动物表示
 * - 相机：第三人称跟随，单指拖动旋转视角，双指/滚轮缩放（复用 2D Camera 的 zoom）
 * - 昼夜：太阳方向光 + 环境光 + 天空/雾颜色随时间变化
 *
 * 接口与 2D Renderer 保持一致：time/day/dayLength/hour/isNight/resize/render
 */

const HEIGHT_SCALE = 9;   // 高度值 → 世界单位
const WATER_Y = -0.45;    // 水面高度（对应 elevation ≈ -0.05 的海岸线）

class Renderer3D {
  constructor(canvas, world, camera) {
    this.canvas = canvas;
    this.world = world;
    this.camera2d = camera;      // 复用 2D 相机的 zoom 值控制视距
    this.time = 0.35;            // 游戏内时间 0~1（0=午夜 0.25=日出 0.5=正午 0.75=日落）
    this.dayLength = 180;
    this.day = 1;
    this.particles = [];
    this.harvestSystem = null;

    // 第三人称相机参数
    this.camYaw = 0;
    this.camPitch = 0.62;

    this._chunkMeshes = new Map(); // chunkKey → 3D 记录
    this._buildQueue = [];
    this._queued = new Set();
    this._npcRecords = new Map();  // NPC 对象 → 3D 记录
    this._playerRecord = null;
    this._lastWorld = world;

    this._dummy = new THREE.Object3D();
    this._camPos = null;

    // 昼夜光照用缓存颜色（避免每帧 new）
    this._skyNight = new THREE.Color(0x0b1026);
    this._skyDusk = new THREE.Color(0xe8945a);
    this._skyDay = new THREE.Color(0x8fc3e8);
    this._sky = new THREE.Color();

    this._initThree();
    this._initSharedAssets();
    this._initCameraInput();
    this.resize();
  }

  /* ================= 初始化 ================= */

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fc3e8);
    this.scene.fog = new THREE.Fog(0x8fc3e8, 55, 130);

    this.three = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.camera3d = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 500);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(30, 50, 20);
    this.scene.add(this.sunLight);

    this.ambient = new THREE.AmbientLight(0xbcd0e8, 0.6);
    this.scene.add(this.ambient);

    // 水面（跟随玩家的大平面）
    const waterGeo = new THREE.PlaneGeometry(600, 600);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x2f6fb0, transparent: true, opacity: 0.85,
      shininess: 90, specular: 0x88aacc
    });
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = WATER_Y;
    this.scene.add(this.water);

    // 交互目标高亮圈
    const ringGeo = new THREE.RingGeometry(0.55, 0.78, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe678, transparent: true, opacity: 0.9, side: THREE.DoubleSide
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);
  }

  /** 共享几何体与材质（所有区块复用，降低内存与 draw call 开销） */
  _initSharedAssets() {
    // 树
    this.trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.3, 6);
    this.trunkGeo.translate(0, 0.65, 0);
    this.leafGeo = new THREE.ConeGeometry(0.95, 2.4, 7);
    this.leafGeo.translate(0, 2.2, 0);
    this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
    this.leafMat = new THREE.MeshLambertMaterial({ color: 0x2d8a3e });

    // 树桩
    this.stumpGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.35, 7);
    this.stumpGeo.translate(0, 0.17, 0);
    this.stumpMat = new THREE.MeshLambertMaterial({ color: 0x8a6238 });

    // 岩石
    this.rockGeo = new THREE.DodecahedronGeometry(0.45, 0);
    this.rockGeo.translate(0, 0.32, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0x8a8a92 });

    // 花
    this.flowerGeo = new THREE.SphereGeometry(0.17, 6, 5);
    this.flowerGeo.translate(0, 0.22, 0);
    this.flowerMat = new THREE.MeshLambertMaterial({ color: 0xe86a8a });

    // 灌木（浆果）
    this.bushGeo = new THREE.SphereGeometry(0.42, 7, 5);
    this.bushGeo.translate(0, 0.32, 0);
    this.bushMat = new THREE.MeshLambertMaterial({ color: 0x3a7a3a });

    // 角色材质
    this._bodyMats = {};
    this._skinMat = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
    this._hatMat = new THREE.MeshLambertMaterial({ color: 0xe8c050 });
  }

  /** 单指拖动旋转视角（双指捏合缩放仍由 main.js 处理） */
  _initCameraInput() {
    const pointers = new Map();

    this.canvas.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (pointers.size !== 1) return;
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      this.camYaw += dx * 0.005;
      this.camPitch = Math.max(0.25, Math.min(1.25, this.camPitch + dy * 0.004));
    });

    const remove = (e) => pointers.delete(e.pointerId);
    this.canvas.addEventListener('pointerup', remove);
    this.canvas.addEventListener('pointercancel', remove);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.three.setSize(w, h);
    this.camera3d.aspect = w / h;
    this.camera3d.updateProjectionMatrix();
    this.camera2d.setViewport(w, h);
  }

  /* ================= 时间 ================= */

  get hour() { return this.time * 24; }

  get isNight() {
    const h = this.hour;
    return h < 5.5 || h >= 19.5;
  }

  /* ================= 地形高度 ================= */

  /** 连续坐标的地面高度（与 world.js 的 elevation 公式完全一致） */
  heightAt(x, y) {
    const e = getNoise().warpedFbm(x * 0.012, y * 0.012, 1.2, {
      octaves: 6, frequency: 1, persistence: 0.5, lacunarity: 2.0
    });
    return e * HEIGHT_SCALE;
  }

  /* ================= 区块 Mesh ================= */

  _syncChunks() {
    // 世界切换 → 清空所有区块 Mesh
    if (this._lastWorld !== this.world) {
      this._lastWorld = this.world;
      for (const rec of this._chunkMeshes.values()) this._disposeChunk(rec);
      this._chunkMeshes.clear();
      this._buildQueue = [];
      this._queued.clear();
    }

    // 收集缺失的区块
    for (const [key, chunk] of this.world.chunks) {
      if (!this._chunkMeshes.has(key) && !this._queued.has(key)) {
        this._queued.add(key);
        this._buildQueue.push(chunk);
      }
    }

    // 卸载已移除区块的 Mesh
    for (const [key, rec] of this._chunkMeshes) {
      if (!this.world.chunks.has(key)) {
        this._disposeChunk(rec);
        this._chunkMeshes.delete(key);
      }
    }

    // 预算式构建：每帧最多 2 个区块，避免卡顿
    let built = 0;
    while (this._buildQueue.length > 0 && built < 2) {
      const chunk = this._buildQueue.shift();
      const key = `${chunk.cx},${chunk.cy}`;
      this._queued.delete(key);
      if (this._chunkMeshes.has(key) || !this.world.chunks.has(key)) continue;
      const rec = this._buildChunk(chunk);
      this._chunkMeshes.set(key, rec);
      built++;
    }

    // 采集状态变化 → 更新装饰物矩阵
    for (const rec of this._chunkMeshes.values()) {
      const v = rec.chunk._harvestVersion || 0;
      if (v !== rec.version) {
        this._applyDecoMatrices(rec);
        rec.version = v;
      }
    }
  }

  /** 构建区块地形 Mesh + 装饰物 InstancedMesh */
  _buildChunk(chunk) {
    const cs = CHUNK_SIZE;
    const group = new THREE.Group();

    // --- 地形 ---
    const n = cs + 1;
    const positions = new Float32Array(n * n * 3);
    const colors = new Float32Array(n * n * 3);
    const c0 = chunk.cx * cs;
    const r0 = chunk.cy * cs;

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const wx = c0 + i;
        const wy = r0 + j;
        const idx = j * n + i;
        positions[idx * 3] = wx;
        positions[idx * 3 + 1] = this.heightAt(wx, wy);
        positions[idx * 3 + 2] = wy;

        const biome = this.world.getTile(wx, wy).biome;
        const hex = biome.color;
        colors[idx * 3] = parseInt(hex.substr(1, 2), 16) / 255;
        colors[idx * 3 + 1] = parseInt(hex.substr(3, 2), 16) / 255;
        colors[idx * 3 + 2] = parseInt(hex.substr(5, 2), 16) / 255;
      }
    }

    const indices = [];
    for (let j = 0; j < cs; j++) {
      for (let i = 0; i < cs; i++) {
        const a = j * n + i;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    group.add(terrain);

    // --- 装饰物（按类型统计数量） ---
    const counts = { tree: 0, rock: 0, flower: 0, bush: 0 };
    for (const deco of chunk.decorations) {
      if (counts[deco.type] !== undefined) counts[deco.type]++;
    }

    const ims = {};
    const mk = (geo, mat, count) => {
      const im = new THREE.InstancedMesh(geo, mat, count);
      im.frustumCulled = false;
      group.add(im);
      return im;
    };
    if (counts.tree > 0) {
      ims.treeTrunk = mk(this.trunkGeo, this.trunkMat, counts.tree);
      ims.treeLeaf = mk(this.leafGeo, this.leafMat, counts.tree);
      ims.stump = mk(this.stumpGeo, this.stumpMat, counts.tree);
    }
    if (counts.rock > 0) ims.rock = mk(this.rockGeo, this.rockMat, counts.rock);
    if (counts.flower > 0) ims.flower = mk(this.flowerGeo, this.flowerMat, counts.flower);
    if (counts.bush > 0) ims.bush = mk(this.bushGeo, this.bushMat, counts.bush);

    const rec = {
      chunk, group, terrain, ims,
      version: chunk._harvestVersion || 0
    };
    this._applyDecoMatrices(rec);
    this.scene.add(group);
    return rec;
  }

  /** 根据采集状态设置各实例矩阵（已采集的树 → 树桩，其他 → 缩放为 0 隐藏） */
  _applyDecoMatrices(rec) {
    const chunk = rec.chunk;
    const ims = rec.ims;
    const idx = { tree: 0, rock: 0, flower: 0, bush: 0 };
    const d = this._dummy;

    for (const deco of chunk.decorations) {
      const type = deco.type;
      if (!(type in idx)) continue;

      const harvested = chunk.harvested && chunk.harvested.has(`${deco.x},${deco.y}`);
      const gy = this.heightAt(deco.x + 0.5, deco.y + 0.5);
      const scale = 0.8 + deco.variant * 0.15;

      d.position.set(deco.x + 0.5, gy, deco.y + 0.5);
      d.rotation.set(0, (deco.variant * 1.7 + deco.x * 0.7 + deco.y * 1.3), 0);
      d.scale.setScalar(scale);
      d.updateMatrix();
      const zero = harvested && type !== 'tree';

      if (type === 'tree') {
        if (harvested) {
          // 树被砍 → 树干/树叶隐藏，显示树桩
          d.scale.setScalar(0.0001);
          d.updateMatrix();
          ims.treeTrunk.setMatrixAt(idx.tree, d.matrix);
          ims.treeLeaf.setMatrixAt(idx.tree, d.matrix);
          d.scale.setScalar(scale);
          d.updateMatrix();
          ims.stump.setMatrixAt(idx.tree, d.matrix);
        } else {
          ims.treeTrunk.setMatrixAt(idx.tree, d.matrix);
          ims.treeLeaf.setMatrixAt(idx.tree, d.matrix);
          d.scale.setScalar(0.0001);
          d.updateMatrix();
          ims.stump.setMatrixAt(idx.tree, d.matrix);
          d.scale.setScalar(scale);
        }
      } else {
        const im = ims[type];
        if (zero) {
          d.scale.setScalar(0.0001);
          d.updateMatrix();
        }
        im.setMatrixAt(idx[type], d.matrix);
        if (zero) d.scale.setScalar(scale);
      }
      idx[type]++;
    }

    for (const k in ims) {
      ims[k].instanceMatrix.needsUpdate = true;
    }
  }

  _disposeChunk(rec) {
    this.scene.remove(rec.group);
    rec.terrain.geometry.dispose();
    rec.terrain.material.dispose();
    for (const k in rec.ims) rec.ims[k].dispose();
  }

  /* ================= 角色 ================= */

  _bodyMaterial(color) {
    let m = this._bodyMats[color];
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: new THREE.Color(color) });
      this._bodyMats[color] = m;
    }
    return m;
  }

  /** 低多边形小人 */
  _makeHumanoid(color, withHat) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 0.75, 8), this._bodyMaterial(color));
    body.position.y = 0.55;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6), this._skinMat);
    head.position.y = 1.12;
    g.add(head);
    if (withHat) {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.35, 8), this._hatMat);
      hat.position.y = 1.4;
      g.add(hat);
    }
    return g;
  }

  /** 低多边形动物 */
  _makeAnimal(color) {
    const g = new THREE.Group();
    const mat = this._bodyMaterial(color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.75), mat);
    body.position.y = 0.4;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), mat);
    head.position.set(0, 0.55, 0.45);
    g.add(head);
    return g;
  }

  _syncEntities(player, npcs) {
    // 玩家
    if (!this._playerRecord) {
      const mesh = this._makeHumanoid('#4a80e0', true);
      this.scene.add(mesh);
      this._playerRecord = { mesh, angle: 0 };
    }
    const pr = this._playerRecord;
    const py = this.heightAt(player.x, player.y);
    const moving = player.vx !== 0 || player.vy !== 0;
    const bob = moving ? Math.abs(Math.sin(player.walkPhase)) * 0.1 : 0;
    pr.mesh.position.set(player.x, py + bob, player.y);

    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing] || [0, 1];
    const targetAngle = Math.atan2(dir[0], dir[1]);
    pr.angle = this._lerpAngle(pr.angle, targetAngle, 0.25);
    pr.mesh.rotation.y = pr.angle;

    // NPC：新增/同步
    const seen = new Set();
    for (const npc of npcs) {
      seen.add(npc);
      let rec = this._npcRecords.get(npc);
      if (!rec) {
        const isAnimal = npc.type === 'ANIMAL';
        const mesh = isAnimal
          ? this._makeAnimal(npc.config.color)
          : this._makeHumanoid(npc.config.color, false);
        this.scene.add(mesh);
        rec = { mesh, angle: 0, lastX: npc.x, lastY: npc.y };
        this._npcRecords.set(npc, rec);
      }
      const ny = this.heightAt(npc.x, npc.y);
      const dx = npc.x - rec.lastX;
      const dy = npc.y - rec.lastY;
      const moved = Math.hypot(dx, dy) > 0.001;
      if (moved) {
        const ta = Math.atan2(dx, dy);
        rec.angle = this._lerpAngle(rec.angle, ta, 0.2);
        rec.lastX = npc.x;
        rec.lastY = npc.y;
      }
      const bobN = moved ? Math.abs(Math.sin(npc.walkPhase)) * 0.08 : 0;
      rec.mesh.position.set(npc.x, ny + bobN, npc.y);
      rec.mesh.rotation.y = rec.angle;
    }

    // 清理已不存在的 NPC（如切换新世界）
    for (const [npc, rec] of this._npcRecords) {
      if (!seen.has(npc)) {
        this.scene.remove(rec.mesh);
        this._npcRecords.delete(npc);
      }
    }
  }

  _lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  /* ================= 昼夜光照 ================= */

  _updateLighting() {
    const sunH = Math.sin((this.time - 0.25) * Math.PI * 2); // -1(午夜) ~ 1(正午)
    // 白天亮度曲线：日出后较快提亮，避免清晨过暗
    const dayF = Math.max(0, Math.min(1, sunH * 2.5 + 0.45));

    // 天空颜色：夜晚 → 黄昏 → 白天
    if (sunH < 0) {
      this._sky.copy(this._skyNight).lerp(this._skyDusk, Math.max(0, sunH + 1) * 0.6);
    } else {
      this._sky.copy(this._skyDusk).lerp(this._skyDay, Math.min(1, sunH * 2.2));
    }
    this.scene.background.copy(this._sky);
    this.scene.fog.color.copy(this._sky);

    // 太阳位置与强度
    const az = (this.time - 0.25) * Math.PI * 2;
    this.sunLight.position.set(Math.cos(az) * 40, Math.max(sunH, 0.08) * 60 + 6, Math.sin(az) * 40);
    this.sunLight.intensity = Math.max(0.06, sunH) * 1.15;
    this.sunLight.color.setHex(sunH < 0.25 ? 0xffc080 : 0xfff4e0);

    this.ambient.intensity = 0.42 + dayF * 0.5;
    this.ambient.color.setHex(dayF > 0.5 ? 0xbcd0e8 : 0x5060a0);
  }

  /* ================= 主渲染 ================= */

  render(player, npcs, dt, interactTarget) {
    this._syncChunks();
    this._syncEntities(player, npcs);

    // 交互高亮圈
    if (interactTarget) {
      const deco = interactTarget.deco;
      const gy = this.heightAt(deco.x + 0.5, deco.y + 0.5);
      this.ring.position.set(deco.x + 0.5, gy + 0.08, deco.y + 0.5);
      const pulse = 1 + Math.sin(performance.now() / 250) * 0.15;
      this.ring.scale.setScalar(pulse);
      this.ring.material.opacity = 0.65 + Math.sin(performance.now() / 250) * 0.3;
      this.ring.visible = true;
    } else {
      this.ring.visible = false;
    }

    // 水面跟随玩家 + 轻微波动
    this.water.position.x = player.x;
    this.water.position.z = player.y;
    this.water.position.y = WATER_Y + Math.sin(performance.now() / 1400) * 0.05;

    this._updateLighting();

    // 第三人称相机
    const dist = 13 / this.camera2d.zoom;
    const cp = this.camPitch;
    const px = player.x;
    const pz = player.y;
    const py = this.heightAt(px, pz);
    const tx = px + Math.sin(this.camYaw) * Math.cos(cp) * dist;
    const ty = py + Math.sin(cp) * dist + 1;
    const tz = pz + Math.cos(this.camYaw) * Math.cos(cp) * dist;

    if (!this._camPos) {
      this._camPos = new THREE.Vector3(tx, ty, tz);
    } else {
      this._camPos.x += (tx - this._camPos.x) * 0.15;
      this._camPos.y += (ty - this._camPos.y) * 0.15;
      this._camPos.z += (tz - this._camPos.z) * 0.15;
    }
    this.camera3d.position.copy(this._camPos);
    this.camera3d.lookAt(px, py + 1.2, pz);

    this.three.render(this.scene, this.camera3d);
  }
}
