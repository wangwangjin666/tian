/**
 * pathfinding.js — A* 寻路算法
 *
 * 受 NVIDIA cuOpt 路由优化理念启发：
 * - 将地形视为带权网格，不同生物群系有不同移动成本
 * - A* 搜索使用启发式 + 实际成本，找到最优路径
 * - 支持 8 方向移动（含对角线，对角线成本为 √2）
 * - 限制搜索范围以保证性能
 *
 * 性能优化：
 * - 二叉堆优先队列替代线性扫描（O(log n) 取最小）
 * - 数值键编码替代字符串键（避免 GC 压力）
 */

/** 最小二叉堆（按 f 值排序） */
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      const t = a[p]; a[p] = a[i]; a[i] = t;
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      const n = a.length;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < n && a[l].f < a[m].f) m = l;
        if (r < n && a[r].f < a[m].f) m = r;
        if (m === i) break;
        const t = a[m]; a[m] = a[i]; a[i] = t;
        i = m;
      }
    }
    return top;
  }
}

class Pathfinding {
  constructor(world) {
    this.world = world;
  }

  /** 坐标 → 数值键（支持 ±32768 范围，用乘法避免位运算溢出） */
  _key(x, y) { return (x + 32768) * 65536 + (y + 32768); }

  /** 数值键 → 坐标 */
  _unkey(key) {
    return {
      x: Math.floor(key / 65536) - 32768,
      y: (key % 65536) - 32768
    };
  }

  /**
   * A* 寻路
   * @param {number} sx 起点格子 X
   * @param {number} sy 起点格子 Y
   * @param {number} tx 终点格子 X
   * @param {number} ty 终点格子 Y
   * @param {number} maxRange 最大搜索半径
   * @returns {Array<{x,y}>} 路径节点数组，不含起点；找不到返回 null
   */
  findPath(sx, sy, tx, ty, maxRange = 40) {
    // 终点不可达
    if (!this.world.isWalkable(tx, ty)) return null;
    // 距离过远
    if (Math.abs(tx - sx) + Math.abs(ty - sy) > maxRange * 2) return null;

    const startKey = this._key(sx, sy);

    const open = new MinHeap();
    open.push({ x: sx, y: sy, g: 0, f: 0, key: startKey });

    const cameFrom = new Map();
    const gScore = new Map();
    const closed = new Set();
    gScore.set(startKey, 0);

    // 8 方向
    const dirs = [
      [1, 0, 1.0], [-1, 0, 1.0], [0, 1, 1.0], [0, -1, 1.0],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
    ];

    let iterations = 0;
    const maxIterations = maxRange * maxRange * 4;

    while (open.size > 0 && iterations < maxIterations) {
      iterations++;

      const current = open.pop();
      // 已处理过的节点跳过（惰性删除）
      if (closed.has(current.key)) continue;
      closed.add(current.key);

      // 到达终点
      if (current.x === tx && current.y === ty) {
        return this._reconstruct(cameFrom, current.key);
      }

      const curG = gScore.get(current.key);

      for (const [dx, dy, baseCost] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        // 越界（相对起点的范围限制）
        if (Math.abs(nx - sx) > maxRange || Math.abs(ny - sy) > maxRange) continue;

        const nKey = this._key(nx, ny);
        if (closed.has(nKey)) continue;

        // 不可行走
        if (!this.world.isWalkable(nx, ny)) continue;

        // 对角线移动时，确保相邻两格也可行走（避免穿墙）
        if (dx !== 0 && dy !== 0) {
          if (!this.world.isWalkable(current.x + dx, current.y)) continue;
          if (!this.world.isWalkable(current.x, current.y + dy)) continue;
        }

        // 移动成本 = 基础距离 × 地形权重
        const moveCost = baseCost * this.world.getMoveCost(nx, ny);
        const tentativeG = curG + moveCost;

        if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, current.key);
          gScore.set(nKey, tentativeG);

          // 启发式：欧几里得距离（允许对角线时更紧）
          const h = Math.hypot(tx - nx, ty - ny);
          open.push({ x: nx, y: ny, g: tentativeG, f: tentativeG + h, key: nKey });
        }
      }
    }

    return null; // 未找到路径
  }

  _reconstruct(cameFrom, endKey) {
    const path = [];
    let cur = endKey;
    while (cameFrom.has(cur)) {
      const { x, y } = this._unkey(cur);
      path.unshift({ x, y });
      cur = cameFrom.get(cur);
    }
    return path;
  }
}
