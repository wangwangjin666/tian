/**
 * pathfinding.js — A* 寻路算法
 *
 * 受 NVIDIA cuOpt 路由优化理念启发：
 * - 将地形视为带权网格，不同生物群系有不同移动成本
 * - A* 搜索使用启发式 + 实际成本，找到最优路径
 * - 支持 8 方向移动（含对角线，对角线成本为 √2）
 * - 限制搜索范围以保证性能
 */

class Pathfinding {
  constructor(world) {
    this.world = world;
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

    const startKey = `${sx},${sy}`;
    const endKey = `${tx},${ty}`;

    // open 集：待探索节点（用数组 + 手动排序，节点少时足够）
    const open = [{ x: sx, y: sy, g: 0, f: 0 }];
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(startKey, 0);

    // 8 方向
    const dirs = [
      [1, 0, 1.0], [-1, 0, 1.0], [0, 1, 1.0], [0, -1, 1.0],
      [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
    ];

    let iterations = 0;
    const maxIterations = maxRange * maxRange * 4;

    while (open.length > 0 && iterations < maxIterations) {
      iterations++;

      // 取 f 最小的节点（小顶堆优化，这里用线性查找+pop）
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[bestIdx].f) bestIdx = i;
      }
      const current = open.splice(bestIdx, 1)[0];
      const currentKey = `${current.x},${current.y}`;

      // 到达终点
      if (current.x === tx && current.y === ty) {
        return this._reconstruct(cameFrom, currentKey);
      }

      for (const [dx, dy, baseCost] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const nKey = `${nx},${ny}`;

        // 越界（相对起点的范围限制）
        if (Math.abs(nx - sx) > maxRange || Math.abs(ny - sy) > maxRange) continue;

        // 不可行走
        if (!this.world.isWalkable(nx, ny)) continue;

        // 对角线移动时，确保相邻两格也可行走（避免穿墙）
        if (dx !== 0 && dy !== 0) {
          if (!this.world.isWalkable(current.x + dx, current.y)) continue;
          if (!this.world.isWalkable(current.x, current.y + dy)) continue;
        }

        // 移动成本 = 基础距离 × 地形权重
        const moveCost = baseCost * this.world.getMoveCost(nx, ny);
        const tentativeG = (gScore.get(currentKey) ?? Infinity) + moveCost;

        if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, currentKey);
          gScore.set(nKey, tentativeG);

          // 启发式：欧几里得距离（允许对角线时更紧）
          const h = Math.hypot(tx - nx, ty - ny);
          const f = tentativeG + h;

          // 添加到 open（若已存在则更新）
          const existing = open.find(n => n.x === nx && n.y === ny);
          if (existing) {
            existing.g = tentativeG;
            existing.f = f;
          } else {
            open.push({ x: nx, y: ny, g: tentativeG, f });
          }
        }
      }
    }

    return null; // 未找到路径
  }

  _reconstruct(cameFrom, endKey) {
    const path = [];
    let cur = endKey;
    while (cameFrom.has(cur)) {
      const [x, y] = cur.split(',').map(Number);
      path.unshift({ x, y });
      cur = cameFrom.get(cur);
    }
    return path;
  }
}
