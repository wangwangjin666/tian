using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 程序化世界生成 - 区块系统实现无限世界
/// </summary>
public class WorldGenerator : MonoBehaviour
{
    public const int ChunkSize = 32;
    public const float TileSize = 1f;

    [SerializeField] private int seed = 20260914;
    [SerializeField] private float elevationScale = 0.012f;
    [SerializeField] private float warpStrength = 1.2f;

    private NoiseGenerator noise;
    private Dictionary<string, ChunkData> chunks = new Dictionary<string, ChunkData>();

    public struct TileData
    {
        public float elevation;
        public float temperature;
        public float moisture;
        public Biomes.BiomeData biome;
        public bool isCave; // 洞穴标记
    }

    public struct Decoration
    {
        public int x, y;
        public string type; // "tree", "rock", "grass", "flower", "bush"
        public int variant;
        public float scale;
    }

    public class ChunkData
    {
        public int cx, cy;
        public TileData[,] tiles;
        public List<Decoration> decorations;
    }

    void Awake()
    {
        noise = new NoiseGenerator(seed);
    }

    public void SetSeed(int newSeed)
    {
        seed = newSeed;
        noise = new NoiseGenerator(seed);
        chunks.Clear();
    }

    private string Key(int cx, int cy) => $"{cx},{cy}";

    public TileData GetTile(int wx, int wy)
    {
        int cx = Mathf.FloorToInt((float)wx / ChunkSize);
        int cy = Mathf.FloorToInt((float)wy / ChunkSize);
        var chunk = GetChunk(cx, cy);
        int lx = ((wx % ChunkSize) + ChunkSize) % ChunkSize;
        int ly = ((wy % ChunkSize) + ChunkSize) % ChunkSize;
        var tile = chunk.tiles[ly, lx];
        
        // 生物群系混合过渡（检测相邻瓦片的生物群系差异）
        if (lx > 0 && lx < ChunkSize - 1 && ly > 0 && ly < ChunkSize - 1)
        {
            var right = chunk.tiles[ly, lx + 1];
            var up = chunk.tiles[ly + 1, lx];
            
            // 如果相邻瓦片生物群系不同，进行混合
            if (right.biome.id != tile.biome.id)
            {
                float blendX = (wx % 1f);
                tile.biome = Biomes.BlendBiomes(tile.biome, right.biome, blendX);
            }
            if (up.biome.id != tile.biome.id)
            {
                float blendY = (wy % 1f);
                tile.biome = Biomes.BlendBiomes(tile.biome, up.biome, blendY);
            }
        }
        
        return tile;
    }

    public ChunkData GetChunk(int cx, int cy)
    {
        string key = Key(cx, cy);
        if (!chunks.TryGetValue(key, out var chunk))
        {
            chunk = GenerateChunk(cx, cy);
            chunks[key] = chunk;
        }
        return chunk;
    }

    private ChunkData GenerateChunk(int cx, int cy)
    {
        var chunk = new ChunkData { cx = cx, cy = cy, tiles = new TileData[ChunkSize, ChunkSize], decorations = new List<Decoration>() };

        for (int ly = 0; ly < ChunkSize; ly++)
        {
            for (int lx = 0; lx < ChunkSize; lx++)
            {
                int wx = cx * ChunkSize + lx;
                int wy = cy * ChunkSize + ly;
                float nx = wx * elevationScale;
                float ny = wy * elevationScale;

                float elevation = noise.WarpedFbm(nx, ny, warpStrength);

                float latTemp = 1f - Mathf.Abs(wy) * 0.0015f;
                float tempNoise = noise.Fbm(nx * 0.8f + 100f, ny * 0.8f + 100f, 3);
                float temperature = Mathf.Clamp01(latTemp * 0.6f + (tempNoise * 0.5f + 0.5f) * 0.4f);

                float moistNoise = noise.Fbm(nx * 0.6f + 200f, ny * 0.6f + 200f, 4);
                float moisture = Mathf.Clamp01(moistNoise * 0.5f + 0.5f);

                // Voronoi 生物群系区域（用于更自然的区域边界）
                float voronoi = noise.Voronoi2(wx, wy, 20f);
                if (voronoi < 0.1f && elevation > 0.1f && elevation < 0.4f)
                {
                    // 在 Voronoi 边界创建特殊区域（如湿地）
                    moisture = Mathf.Min(1f, moisture + 0.3f);
                }

                var biome = Biomes.GetBiome(elevation, temperature, moisture);

                // 洞穴生成（元胞自动机简化版）
                bool isCave = false;
                if (elevation > 0.2f && elevation < 0.5f && biome.walkable)
                {
                    float caveNoise = noise.Fbm(nx * 2f + 300f, ny * 2f + 300f, 3);
                    float caveNoise2 = noise.Fbm(nx * 3f + 400f, ny * 3f + 400f, 2);
                    // 两个噪声叠加产生洞穴效果
                    isCave = (caveNoise > 0.4f && caveNoise2 > 0.2f);
                }

                chunk.tiles[ly, lx] = new TileData { elevation = elevation, temperature = temperature, moisture = moisture, biome = biome, isCave = isCave };

                // 扩展装饰物生成
                if (biome.walkable && biome.vegetation > 0f)
                {
                    float r = Hash2(wx, wy);
                    float grassR = Hash2(wx + 100, wy + 100);
                    float flowerR = Hash2(wx + 200, wy + 200);
                    
                    // 大型装饰物（树木、岩石）
                    if (r < biome.vegetation * 0.3f)
                    {
                        chunk.decorations.Add(new Decoration
                        {
                            x = wx, y = wy,
                            type = r < biome.vegetation * 0.08f ? "rock" : "tree",
                            variant = Mathf.FloorToInt(Hash2(wx + 1, wy + 1) * 4f),
                            scale = 0.8f + Hash2(wx + 2, wy + 2) * 0.4f
                        });
                    }
                    // 灌木
                    else if (r < biome.vegetation * 0.5f && biome.vegetation > 0.4f)
                    {
                        chunk.decorations.Add(new Decoration
                        {
                            x = wx, y = wy,
                            type = "bush",
                            variant = Mathf.FloorToInt(Hash2(wx + 3, wy + 3) * 3f),
                            scale = 0.6f + Hash2(wx + 4, wy + 4) * 0.3f
                        });
                    }
                    
                    // 草地（高密度）
                    if (grassR < biome.vegetation * 0.8f)
                    {
                        chunk.decorations.Add(new Decoration
                        {
                            x = wx, y = wy,
                            type = "grass",
                            variant = Mathf.FloorToInt(Hash2(wx + 5, wy + 5) * 3f),
                            scale = 0.5f + Hash2(wx + 6, wy + 6) * 0.5f
                        });
                    }
                    
                    // 花朵（仅在草原和森林）
                    if (flowerR < biome.vegetation * 0.15f && (biome.id == "grassland" || biome.id == "forest"))
                    {
                        chunk.decorations.Add(new Decoration
                        {
                            x = wx, y = wy,
                            type = "flower",
                            variant = Mathf.FloorToInt(Hash2(wx + 7, wy + 7) * 5f),
                            scale = 0.4f + Hash2(wx + 8, wy + 8) * 0.3f
                        });
                    }
                }
            }
        }
        return chunk;
    }

    public bool IsWalkable(int wx, int wy) => GetTile(wx, wy).biome.walkable;
    public float GetMoveCost(int wx, int wy) => GetTile(wx, wy).biome.moveCost;

    private float Hash2(int x, int y)
    {
        int h = x * 374761393 ^ y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((uint)(h ^ (h >> 16))) / 4294967296f;
    }

    public int GetChunkCount() => chunks.Count;
}
