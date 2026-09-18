/**
 * npc.js — NPC 实体
 *
 * 行为状态机：
 * - IDLE：原地停留
 * - WANDER：随机漫游
 * - PATHING：沿 A* 路径移动到目标
 * - FLEE：逃离玩家（动物专属）
 *
 * 受 NVIDIA cuOpt 启发：每个 NPC 定期重新规划路径，
 * 考虑地形移动成本，选择最优路线。
 *
 * v1.2 新增：
 * - 渔夫（FISHER）：偏好停留在水边
 * - 商人（TRADER）：长距离漫游，像旅行商人
 * - 动物（ANIMAL）：玩家靠近时会逃跑
 */

const NPC_TYPES = {
  VILLAGER: { speed: 2.2, color: '#e8c07a', name: '村民' },
  WANDERER: { speed: 3.0, color: '#7ad0e8', name: '旅人' },
  ANIMAL: { speed: 2.8, color: '#c08a5a', name: '动物', flees: true },
  FISHER: { speed: 2.0, color: '#5a9ac0', name: '渔夫' },
  TRADER: { speed: 2.6, color: '#c07ae8', name: '商人' }
};

class NPC {
  constructor(world, pathfinding, x, y, type = 'VILLAGER') {
    this.world = world;
    this.pathfinding = pathfinding;
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = NPC_TYPES[type];
    this.state = 'IDLE';
    this.path = [];
    this.pathIndex = 0;
    this.stateTimer = 0;
    this.walkPhase = 0;
    this.facing = 'down';
    this._fleeCheckTimer = 0;
  }

  update(dt, player) {
    this.stateTimer -= dt;

    // 动物：定期检测玩家距离，太近就逃跑
    if (this.config.flees && player) {
      this._fleeCheckTimer -= dt;
      if (this._fleeCheckTimer <= 0) {
        this._fleeCheckTimer = 0.4;
        const d = Math.hypot(player.x - this.x, player.y - this.y);
        if (d < 4 && this.state !== 'FLEE') {
          this._startFlee(player);
        }
      }
    }

    switch (this.state) {
      case 'IDLE':
        if (this.stateTimer <= 0) {
          this._startWander();
        }
        break;

      case 'WANDER':
        this._followPath(dt);
        if (this.pathIndex >= this.path.length || this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.stateTimer = 1 + Math.random() * 3;
        }
        break;

      case 'PATHING':
        this._followPath(dt);
        if (this.pathIndex >= this.path.length) {
          this.state = 'IDLE';
          this.stateTimer = 1 + Math.random() * 2;
        }
        break;

      case 'FLEE':
        this._followPath(dt);
        if (this.pathIndex >= this.path.length || this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.stateTimer = 0.5 + Math.random();
        }
        break;
    }
  }

  /** 动物逃跑：朝远离玩家的方向找一条短路径 */
  _startFlee(player) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    // 沿远离方向 6~9 格
    const dist = 6 + Math.random() * 3;
    const tx = Math.floor(this.x + (dx / len) * dist);
    const ty = Math.floor(this.y + (dy / len) * dist);

    const path = this.pathfinding.findPath(
      Math.floor(this.x), Math.floor(this.y), tx, ty, 12
    );

    if (path && path.length > 0) {
      this.path = path;
      this.pathIndex = 0;
      this.state = 'FLEE';
      this.stateTimer = 4;
    } else {
      // 找不到路就直接位移尝试
      const nx = this.x + (dx / len) * 0.5;
      const ny = this.y + (dy / len) * 0.5;
      if (this.world.isWalkable(Math.floor(nx), Math.floor(ny))) {
        this.x = nx;
        this.y = ny;
      }
    }
  }

  _startWander() {
    // 商人：长距离漫游；渔夫：短距离；其他：中等
    let distMin = 3, distMax = 11;
    if (this.type === 'TRADER') { distMin = 8; distMax = 20; }
    if (this.type === 'FISHER') { distMin = 2; distMax = 6; }

    const angle = Math.random() * Math.PI * 2;
    const dist = distMin + Math.floor(Math.random() * (distMax - distMin));
    let tx = Math.floor(this.x + Math.cos(angle) * dist);
    let ty = Math.floor(this.y + Math.sin(angle) * dist);

    // 渔夫偏好水边：若目标不可走，尝试找邻近水边的格子
    if (this.type === 'FISHER') {
      const spot = this._findWaterEdge(tx, ty);
      if (spot) { tx = spot.x; ty = spot.y; }
    }

    const path = this.pathfinding.findPath(
      Math.floor(this.x), Math.floor(this.y), tx, ty, 22
    );

    if (path && path.length > 0) {
      this.path = path;
      this.pathIndex = 0;
      this.state = 'WANDER';
      this.stateTimer = this.type === 'TRADER' ? 25 : 15;
    } else {
      this.state = 'IDLE';
      this.stateTimer = 1 + Math.random() * 2;
    }
  }

  /** 在目标附近找一个紧邻水域的可行走格 */
  _findWaterEdge(tx, ty) {
    for (let r = 0; r < 5; r++) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const x = Math.floor(tx + Math.cos(ang) * r);
        const y = Math.floor(ty + Math.sin(ang) * r);
        if (!this.world.isWalkable(x, y)) continue;
        // 四邻有水
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of neighbors) {
          const b = this.world.getBiomeAt(x + dx, y + dy);
          if (b.id === 'ocean' || b.id === 'deep_ocean') {
            return { x, y };
          }
        }
      }
    }
    return null;
  }

  _followPath(dt) {
    if (this.pathIndex >= this.path.length) return;

    const target = this.path[this.pathIndex];
    const dx = target.x + 0.5 - this.x;
    const dy = target.y + 0.5 - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.15) {
      this.pathIndex++;
      return;
    }

    // 逃跑时速度 ×1.6
    const speed = this.config.speed * (this.state === 'FLEE' ? 1.6 : 1);
    this.x += (dx / dist) * speed * dt;
    this.y += (dy / dist) * speed * dt;
    this.walkPhase += dt * 8;

    // 更新朝向
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }
  }
}
