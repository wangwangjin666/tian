/**
 * camera.js — 相机系统
 * 平滑跟随玩家 + 缩放，提供世界坐标 ↔ 屏幕坐标转换
 */

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothing = 0.12;      // 跟随平滑度（越小越平滑）
    this.zoom = 1.0;            // 当前缩放
    this.targetZoom = 1.0;      // 目标缩放（平滑过渡）
    this.minZoom = 0.5;
    this.maxZoom = 2.2;
    // 逻辑视口尺寸（CSS 像素，由 renderer 在 resize 时更新）
    this.viewW = 800;
    this.viewH = 600;
  }

  setViewport(w, h) {
    this.viewW = w;
    this.viewH = h;
  }

  follow(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  setZoom(z) {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, z));
  }

  zoomBy(factor) {
    this.setZoom(this.targetZoom * factor);
  }

  update() {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
    this.zoom += (this.targetZoom - this.zoom) * 0.18;
  }

  /** 世界坐标转屏幕坐标（含缩放） */
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewW / 2,
      y: (wy - this.y) * this.zoom + this.viewH / 2
    };
  }

  /** 屏幕坐标转世界坐标 */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewW / 2) / this.zoom + this.x,
      y: (sy - this.viewH / 2) / this.zoom + this.y
    };
  }

  /** 获取可见的世界范围（用于视锥体剔除） */
  getViewBounds() {
    const halfW = this.viewW / 2 / this.zoom;
    const halfH = this.viewH / 2 / this.zoom;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH
    };
  }
}
