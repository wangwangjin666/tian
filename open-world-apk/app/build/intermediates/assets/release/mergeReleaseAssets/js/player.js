/**
 * player.js — 玩家实体
 * 基于格子的移动 + 碰撞检测（不可行走的地形）
 */

const PLAYER_SPEED = 4.5;       // 格/秒
const PLAYER_RUN_SPEED = 8.0;
const PLAYER_RADIUS = 0.35;     // 碰撞半径（格）

class Player {
  constructor(world, startX, startY) {
    this.world = world;
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 'down'; // up/down/left/right
    this.walkPhase = 0;   // 行走动画相位
  }

  update(dt, input) {
    const move = input.getMoveVector();
    const speed = input.isRunning() ? PLAYER_RUN_SPEED : PLAYER_SPEED;

    this.vx = move.x * speed;
    this.vy = move.y * speed;

    // 更新朝向
    if (move.x !== 0 || move.y !== 0) {
      if (Math.abs(move.x) > Math.abs(move.y)) {
        this.facing = move.x > 0 ? 'right' : 'left';
      } else {
        this.facing = move.y > 0 ? 'down' : 'up';
      }
      this.walkPhase += dt * (input.isRunning() ? 14 : 9);
    }

    // 分轴移动 + 碰撞（滑墙）
    const newX = this.x + this.vx * dt;
    if (this._canMoveTo(newX, this.y)) this.x = newX;

    const newY = this.y + this.vy * dt;
    if (this._canMoveTo(this.x, newY)) this.y = newY;
  }

  /** 检测指定位置是否可行走（考虑半径） */
  _canMoveTo(x, y) {
    // 检查碰撞圆周边的几个采样点
    const r = PLAYER_RADIUS;
    const samples = [
      [x + r, y], [x - r, y],
      [x, y + r], [x, y - r],
      [x + r * 0.7, y + r * 0.7],
      [x - r * 0.7, y + r * 0.7],
      [x + r * 0.7, y - r * 0.7],
      [x - r * 0.7, y - r * 0.7]
    ];
    for (const [sx, sy] of samples) {
      if (!this.world.isWalkable(Math.floor(sx), Math.floor(sy))) {
        return false;
      }
    }
    return true;
  }

  /** 获取当前所在格子坐标 */
  get tileX() { return Math.floor(this.x); }
  get tileY() { return Math.floor(this.y); }

  /** 获取当前生物群系 */
  getBiome() {
    return this.world.getBiomeAt(this.tileX, this.tileY);
  }
}
