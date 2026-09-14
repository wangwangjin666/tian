/**
 * npc.js — NPC 实体
 *
 * 行为状态机：
 * - IDLE：原地停留
 * - WANDER：随机漫游
 * - PATHING：沿 A* 路径移动到目标
 *
 * 受 NVIDIA cuOpt 启发：每个 NPC 定期重新规划路径，
 * 考虑地形移动成本，选择最优路线。
 */

const NPC_TYPES = {
  VILLAGER: { speed: 2.2, color: '#e8c07a', name: '村民' },
  WANDERER: { speed: 3.0, color: '#7ad0e8', name: '旅人' },
  ANIMAL: { speed: 2.8, color: '#c08a5a', name: '动物' }
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
  }

  update(dt) {
    this.stateTimer -= dt;

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
    }
  }

  _startWander() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 3 + Math.floor(Math.random() * 8);
    const tx = Math.floor(this.x + Math.cos(angle) * dist);
    const ty = Math.floor(this.y + Math.sin(angle) * dist);

    const path = this.pathfinding.findPath(
      Math.floor(this.x), Math.floor(this.y), tx, ty, 15
    );

    if (path && path.length > 0) {
      this.path = path;
      this.pathIndex = 0;
      this.state = 'WANDER';
      this.stateTimer = 15; // 最长漫游时间
    } else {
      this.state = 'IDLE';
      this.stateTimer = 1 + Math.random() * 2;
    }
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

    const speed = this.config.speed;
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
