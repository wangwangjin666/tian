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
    }

    public struct Decoration
    {
        public int x, y;
        public string type; // "tree" or "rock"
        public int variant;
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
        return chunk.tiles[ly, lx];
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

                var biome = Biomes.GetBiome(elevation, temperature, moisture);

                chunk.tiles[ly, lx] = new TileData { elevation = elevation, temperature = temperature, moisture = moisture, biome = biome };

                if (biome.walkable && biome.vegetation > 0f)
                {
                    float r = Hash2(wx, wy);
                    if (r < biome.vegetation * 0.4f)
                    {
                        chunk.decorations.Add(new Decoration
                        {
                            x = wx, y = wy,
                            type = r < biome.vegetation * 0.1f ? "rock" : "tree",
                            variant = Mathf.FloorToInt(Hash2(wx + 1, wy + 1) * 4f)
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
