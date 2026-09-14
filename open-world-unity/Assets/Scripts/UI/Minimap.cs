using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 小地图 - 显示玩家周围地形
/// </summary>
public class Minimap : MonoBehaviour
{
    [SerializeField] private WorldGenerator world;
    [SerializeField] private PlayerController player;
    [SerializeField] private int range = 40;
    [SerializeField] private int resolution = 160;

    private Texture2D mapTexture;
    private RawImage rawImage;

    public void SetWorld(WorldGenerator w) { world = w; }
    public void SetPlayer(PlayerController p) { player = p; }

    void Start()
    {
        mapTexture = new Texture2D(resolution, resolution, TextureFormat.RGB24, false);
        mapTexture.filterMode = FilterMode.Point;
        rawImage = GetComponent<RawImage>();
        if (rawImage != null) rawImage.texture = mapTexture;
    }

    void LateUpdate()
    {
        if (world == null || player == null || mapTexture == null) return;

        int px = player.TileX;
        int py = player.TileY;
        float cellW = (float)resolution / (range * 2);

        Color[] pixels = new Color[resolution * resolution];

        for (int dy = 0; dy < resolution; dy++)
        {
            for (int dx = 0; dx < resolution; dx++)
            {
                int wx = px - range + Mathf.FloorToInt(dx / cellW);
                int wy = py - range + Mathf.FloorToInt(dy / cellW);
                var biome = world.GetTile(wx, wy).biome;
                pixels[dy * resolution + dx] = biome.color;
            }
        }

        mapTexture.SetPixels(pixels);
        mapTexture.Apply();
    }
}
