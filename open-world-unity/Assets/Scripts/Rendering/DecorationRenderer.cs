using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 装饰物渲染器 - 渲染树木、岩石、灌木、草地、花朵
/// </summary>
public class DecorationRenderer : MonoBehaviour
{
    [SerializeField] private WorldGenerator world;
    [SerializeField] private int renderRadius = 20;
    [SerializeField] private GameObject grassPrefab;
    [SerializeField] private GameObject flowerPrefab;
    [SerializeField] private GameObject bushPrefab;

    private Dictionary<string, GameObject> activeDecorations = new Dictionary<string, GameObject>();
    private int lastPlayerTileX = int.MinValue;
    private int lastPlayerTileY = int.MinValue;

    public void Init(WorldGenerator worldGen)
    {
        world = worldGen;
    }

    public void UpdateRender(int playerTileX, int playerTileY)
    {
        if (playerTileX == lastPlayerTileX && playerTileY == lastPlayerTileY) return;
        lastPlayerTileX = playerTileX;
        lastPlayerTileY = playerTileY;

        // 清理超出范围的装饰物
        List<string> toRemove = new List<string>();
        foreach (var kvp in activeDecorations)
        {
            var pos = kvp.Value.transform.position;
            if (Mathf.Abs(pos.x - playerTileX) > renderRadius + 5 ||
                Mathf.Abs(pos.y - playerTileY) > renderRadius + 5)
            {
                Destroy(kvp.Value);
                toRemove.Add(kvp.Key);
            }
        }
        foreach (var key in toRemove)
        {
            activeDecorations.Remove(key);
        }

        // 生成新装饰物
        for (int dy = -renderRadius; dy <= renderRadius; dy++)
        {
            for (int dx = -renderRadius; dx <= renderRadius; dx++)
            {
                int wx = playerTileX + dx;
                int wy = playerTileY + dy;
                var chunk = world.GetChunk(Mathf.FloorToInt((float)wx / WorldGenerator.ChunkSize),
                                          Mathf.FloorToInt((float)wy / WorldGenerator.ChunkSize));
                
                foreach (var dec in chunk.decorations)
                {
                    if (dec.x == wx && dec.y == wy)
                    {
                        string key = $"{wx},{wy}";
                        if (!activeDecorations.ContainsKey(key))
                        {
                            GameObject prefab = GetPrefab(dec.type);
                            if (prefab != null)
                            {
                                var obj = Instantiate(prefab, new Vector3(wx + 0.5f, wy + 0.5f, 0), Quaternion.identity, transform);
                                obj.transform.localScale = Vector3.one * dec.scale;
                                
                                // 设置变体颜色
                                var sr = obj.GetComponent<SpriteRenderer>();
                                if (sr != null)
                                {
                                    sr.color = GetDecorationColor(dec.type, dec.variant);
                                    sr.sortingOrder = GetSortingOrder(dec.type);
                                }
                                
                                activeDecorations[key] = obj;
                            }
                        }
                    }
                }
            }
        }
    }

    private GameObject GetPrefab(string type)
    {
        switch (type)
        {
            case "grass": return grassPrefab;
            case "flower": return flowerPrefab;
            case "bush": return bushPrefab;
            default: return null;
        }
    }

    private Color GetDecorationColor(string type, int variant)
    {
        switch (type)
        {
            case "grass":
                return variant switch
                {
                    0 => new Color(0.35f, 0.65f, 0.25f),
                    1 => new Color(0.40f, 0.70f, 0.30f),
                    2 => new Color(0.45f, 0.75f, 0.35f),
                    _ => Color.green
                };
            case "flower":
                return variant switch
                {
                    0 => new Color(0.95f, 0.35f, 0.45f), // 红色
                    1 => new Color(0.95f, 0.85f, 0.35f), // 黄色
                    2 => new Color(0.85f, 0.45f, 0.95f), // 紫色
                    3 => new Color(0.95f, 0.65f, 0.35f), // 橙色
                    4 => new Color(0.95f, 0.95f, 0.95f), // 白色
                    _ => Color.white
                };
            case "bush":
                return variant switch
                {
                    0 => new Color(0.25f, 0.55f, 0.20f),
                    1 => new Color(0.30f, 0.60f, 0.25f),
                    2 => new Color(0.35f, 0.65f, 0.30f),
                    _ => new Color(0.30f, 0.60f, 0.25f)
                };
            default:
                return Color.white;
        }
    }

    private int GetSortingOrder(string type)
    {
        switch (type)
        {
            case "grass": return 5;
            case "flower": return 6;
            case "bush": return 7;
            default: return 5;
        }
    }
}
