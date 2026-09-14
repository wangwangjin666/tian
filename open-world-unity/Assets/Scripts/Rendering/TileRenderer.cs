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
                    if (sr != null) sr.color = tile.biome.color;
                    tileGrid[dy, dx].transform.position = new Vector3(wx, wy, 0);
                }
            }
        }
    }
}
