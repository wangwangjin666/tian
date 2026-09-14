/**
 * camera.js — 相机系统
 * 平滑跟随玩家，提供世界坐标 ↔ 屏幕坐标转换
 */

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothing = 0.12; // 跟随平滑度（越小越平滑）
  }

  follow(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  update() {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  /** 屏幕中心对应的世界坐标 */
  get centerWorldX() { return this.x; }
  get centerWorldY() { return this.y; }

  /** 世界坐标转屏幕坐标 */
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) + this.canvas.width / 2,
      y: (wy - this.y) + this.canvas.height / 2
    };
  }

  /** 屏幕坐标转世界坐标 */
  screenToWorld(sx, sy) {
    return {
      x: sx - this.canvas.width / 2 + this.x,
      y: sy - this.canvas.height / 2 + this.y
    };
  }

  /** 获取可见的世界范围（用于视锥体剔除） */
  getViewBounds() {
    const halfW = this.canvas.width / 2;
    const halfH = this.canvas.height / 2;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH
    };
  }
}
