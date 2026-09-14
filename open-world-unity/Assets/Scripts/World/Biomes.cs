using UnityEngine;

/// <summary>
/// 生物群系定义 - 包含颜色、可通行性、移动成本（用于A*寻路）
/// </summary>
public static class Biomes
{
    [System.Serializable]
    public struct BiomeData
    {
        public string id;
        public string name;
        public Color color;
        public bool walkable;
        public float moveCost;
        public float vegetation;
    }

    public static readonly BiomeData DeepOcean = new BiomeData { id = "deep_ocean", name = "深海", color = new Color(0.10f, 0.23f, 0.36f), walkable = false, moveCost = float.PositiveInfinity, vegetation = 0 };
    public static readonly BiomeData Ocean = new BiomeData { id = "ocean", name = "海洋", color = new Color(0.16f, 0.35f, 0.54f), walkable = false, moveCost = float.PositiveInfinity, vegetation = 0 };
    public static readonly BiomeData Beach = new BiomeData { id = "beach", name = "沙滩", color = new Color(0.91f, 0.85f, 0.63f), walkable = true, moveCost = 1.4f, vegetation = 0.05f };
    public static readonly BiomeData Grassland = new BiomeData { id = "grassland", name = "草原", color = new Color(0.42f, 0.69f, 0.30f), walkable = true, moveCost = 1.0f, vegetation = 0.15f };
    public static readonly BiomeData Forest = new BiomeData { id = "forest", name = "森林", color = new Color(0.18f, 0.48f, 0.24f), walkable = true, moveCost = 1.3f, vegetation = 0.7f };
    public static readonly BiomeData Jungle = new BiomeData { id = "jungle", name = "丛林", color = new Color(0.12f, 0.35f, 0.18f), walkable = true, moveCost = 1.8f, vegetation = 0.95f };
    public static readonly BiomeData Desert = new BiomeData { id = "desert", name = "沙漠", color = new Color(0.83f, 0.66f, 0.35f), walkable = true, moveCost = 1.6f, vegetation = 0.02f };
    public static readonly BiomeData Savanna = new BiomeData { id = "savanna", name = "稀树草原", color = new Color(0.72f, 0.63f, 0.31f), walkable = true, moveCost = 1.1f, vegetation = 0.25f };
    public static readonly BiomeData Taiga = new BiomeData { id = "taiga", name = "针叶林", color = new Color(0.23f, 0.42f, 0.35f), walkable = true, moveCost = 1.4f, vegetation = 0.6f };
    public static readonly BiomeData Tundra = new BiomeData { id = "tundra", name = "冻原", color = new Color(0.66f, 0.72f, 0.63f), walkable = true, moveCost = 1.5f, vegetation = 0.08f };
    public static readonly BiomeData Snow = new BiomeData { id = "snow", name = "雪原", color = new Color(0.91f, 0.93f, 0.96f), walkable = true, moveCost = 2.0f, vegetation = 0.02f };
    public static readonly BiomeData Mountain = new BiomeData { id = "mountain", name = "山地", color = new Color(0.54f, 0.48f, 0.42f), walkable = true, moveCost = 2.5f, vegetation = 0.1f };
    public static readonly BiomeData Peak = new BiomeData { id = "peak", name = "山峰", color = new Color(0.69f, 0.69f, 0.72f), walkable = false, moveCost = float.PositiveInfinity, vegetation = 0 };

    /// <summary>根据高度/温度/湿度决定生物群系</summary>
    public static BiomeData GetBiome(float elevation, float temperature, float moisture)
    {
        if (elevation < -0.2f) return DeepOcean;
        if (elevation < -0.05f) return Ocean;
        if (elevation < 0.02f) return Beach;
        if (elevation > 0.72f) return Peak;
        if (elevation > 0.55f) return temperature < 0.35f ? Snow : Mountain;
        if (elevation > 0.4f) return temperature < 0.45f ? Taiga : Mountain;

        if (temperature > 0.7f)
        {
            if (moisture < 0.3f) return Desert;
            if (moisture < 0.55f) return Savanna;
            return Jungle;
        }
        if (temperature > 0.35f)
        {
            if (moisture < 0.65f) return Grassland;
            return Forest;
        }
        if (temperature > 0.15f)
        {
            if (moisture < 0.4f) return Tundra;
            return Taiga;
        }
        return Snow;
    }
}
