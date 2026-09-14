using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// A* 寻路 - 受NVIDIA cuOpt启发，考虑地形移动成本
/// </summary>
public class Pathfinding
{
    private WorldGenerator world;

    public Pathfinding(WorldGenerator worldGen) { world = worldGen; }

    public List<Vector2Int> FindPath(Vector2Int start, Vector2Int end, int maxRange = 40)
    {
        if (!world.IsWalkable(end.x, end.y)) return null;
        if (Mathf.Abs(end.x - start.x) + Mathf.Abs(end.y - start.y) > maxRange * 2) return null;

        var open = new SortedList<float, List<AStarNode>>();
        var cameFrom = new Dictionary<Vector2Int, Vector2Int>();
        var gScore = new Dictionary<Vector2Int, float>();

        var startKey = start;
        gScore[startKey] = 0;
        var startNode = new AStarNode(start, 0, 0);
        AddToOpen(open, startNode);

        int[,] dirs = { {1,0},{-1,0},{0,1},{0,-1},{1,1},{1,-1},{-1,1},{-1,-1} };
        float[] baseCosts = { 1f, 1f, 1f, 1f, Mathf.Sqrt(2f), Mathf.Sqrt(2f), Mathf.Sqrt(2f), Mathf.Sqrt(2f) };

        int iterations = 0;
        int maxIter = maxRange * maxRange * 4;

        while (open.Count > 0 && iterations < maxIter)
        {
            iterations++;
            var node = PopBest(open);

            if (node.pos == end) return Reconstruct(cameFrom, end);

            for (int i = 0; i < 8; i++)
            {
                int nx = node.pos.x + dirs[i, 0];
                int ny = node.pos.y + dirs[i, 1];
                var nKey = new Vector2Int(nx, ny);

                if (Mathf.Abs(nx - start.x) > maxRange || Mathf.Abs(ny - start.y) > maxRange) continue;
                if (!world.IsWalkable(nx, ny)) continue;

                // 对角线穿墙检测
                if (dirs[i, 0] != 0 && dirs[i, 1] != 0)
                {
                    if (!world.IsWalkable(node.pos.x + dirs[i, 0], node.pos.y)) continue;
                    if (!world.IsWalkable(node.pos.x, node.pos.y + dirs[i, 1])) continue;
                }

                float moveCost = baseCosts[i] * world.GetMoveCost(nx, ny);
                float tentativeG = (gScore.ContainsKey(node.pos) ? gScore[node.pos] : float.PositiveInfinity) + moveCost;

                if (tentativeG < (gScore.ContainsKey(nKey) ? gScore[nKey] : float.PositiveInfinity))
                {
                    cameFrom[nKey] = node.pos;
                    gScore[nKey] = tentativeG;
                    float h = Vector2.Distance(new Vector2(nx, ny), new Vector2(end.x, end.y));
                    AddToOpen(open, new AStarNode(nKey, tentativeG, tentativeG + h));
                }
            }
        }
        return null;
    }

    private struct AStarNode
    {
        public Vector2Int pos;
        public float g, f;
        public AStarNode(Vector2Int p, float g, float f) { pos = p; this.g = g; this.f = f; }
    }

    private void AddToOpen(SortedList<float, List<AStarNode>> open, AStarNode node)
    {
        if (!open.TryGetValue(node.f, out var list))
        {
            list = new List<AStarNode>();
            open[node.f] = list;
        }
        list.Add(node);
    }

    private AStarNode PopBest(SortedList<float, List<AStarNode>> open)
    {
        var key = open.Keys[0];
        var list = open[key];
        var node = list[list.Count - 1];
        list.RemoveAt(list.Count - 1);
        if (list.Count == 0) open.RemoveAt(0);
        return node;
    }

    private List<Vector2Int> Reconstruct(Dictionary<Vector2Int, Vector2Int> cameFrom, Vector2Int end)
    {
        var path = new List<Vector2Int>();
        var cur = end;
        while (cameFrom.ContainsKey(cur))
        {
            path.Add(cur);
            cur = cameFrom[cur];
        }
        path.Reverse();
        return path;
    }
}
