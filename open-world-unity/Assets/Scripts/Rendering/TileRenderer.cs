using UnityEngine;

/// <summary>
/// 瓦片渲染器 - 将世界数据渲染为Tilemap
/// </summary>
public class TileRenderer : MonoBehaviour
{
    [SerializeField] private WorldGenerator world;
    [SerializeField] private int renderRadius = 25;
    [SerializeField] private GameObject tilePrefab;
    [SerializeField] private GameObject treePrefab;
    [SerializeField] private GameObject rockPrefab;

    private GameObject[,] tileGrid;
    private int lastPlayerTileX = int.MinValue;
    private int lastPlayerTileY = int.MinValue;

    public void Init(WorldGenerator worldGen)
    {
        world = worldGen;
        int size = renderRadius * 2;
        tileGrid = new GameObject[size, size];
    }

    public void UpdateRender(int playerTileX, int playerTileY)
    {
        if (playerTileX == lastPlayerTileX && playerTileY == lastPlayerTileY) return;
        lastPlayerTileX = playerTileX;
        lastPlayerTileY = playerTileY;

        int size = renderRadius * 2;
        for (int dy = 0; dy < size; dy++)
        {
            for (int dx = 0; dx < size; dx++)
            {
                int wx = playerTileX - renderRadius + dx;
                int wy = playerTileY - renderRadius + dy;
                var tile = world.GetTile(wx, wy);

                if (tileGrid[dy, dx] == null && tilePrefab != null)
                {
                    var go = Instantiate(tilePrefab, new Vector3(wx, wy, 0), Quaternion.identity, transform);
                    tileGrid[dy, dx] = go;
                }

                if (tileGrid[dy, dx] != null)
                {
                    var sr = tileGrid[dy, dx].GetComponent<SpriteRenderer>();
                    if (sr != null)
                    {
                        // 瓦片过渡规则：检测相邻瓦片，调整颜色实现平滑过渡
                        Color finalColor = tile.biome.color;
                        
                        // 洞穴渲染：洞穴内部颜色变暗
                        if (tile.isCave)
                        {
                            finalColor = Color.Lerp(finalColor, Color.black, 0.6f);
                        }
                        
                        // 检查四个方向的邻居
                        var left = world.GetTile(wx - 1, wy);
                        var right = world.GetTile(wx + 1, wy);
                        var down = world.GetTile(wx, wy - 1);
                        var up = world.GetTile(wx, wy + 1);
                        
                        // 如果邻居是不同的生物群系，混合颜色
                        if (left.biome.id != tile.biome.id)
                            finalColor = Color.Lerp(finalColor, left.biome.color, 0.15f);
                        if (right.biome.id != tile.biome.id)
                            finalColor = Color.Lerp(finalColor, right.biome.color, 0.15f);
                        if (down.biome.id != tile.biome.id)
                            finalColor = Color.Lerp(finalColor, down.biome.color, 0.15f);
                        if (up.biome.id != tile.biome.id)
                            finalColor = Color.Lerp(finalColor, up.biome.color, 0.15f);
                        
                        sr.color = finalColor;
                    }
                    tileGrid[dy, dx].transform.position = new Vector3(wx, wy, 0);
                }
            }
        }
    }
}
