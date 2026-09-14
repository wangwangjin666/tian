using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Perlin噪声引擎 - 支持种子化随机、fBm和域扭曲
/// </summary>
public class NoiseGenerator
{
    private int[] perm;
    private int seed;

    public NoiseGenerator(int seed = 1337)
    {
        this.seed = seed;
        perm = BuildPermutation(seed);
    }

    /// <summary>2D Perlin噪声，返回[-1, 1]</summary>
    public float Perlin2(float x, float y)
    {
        int X = Mathf.FloorToInt(x) & 255;
        int Y = Mathf.FloorToInt(y) & 255;
        float xf = x - Mathf.Floor(x);
        float yf = y - Mathf.Floor(y);
        float u = Fade(xf);
        float v = Fade(yf);

        int aa = perm[perm[X] + Y];
        int ab = perm[perm[X] + Y + 1];
        int ba = perm[perm[X + 1] + Y];
        int bb = perm[perm[X + 1] + Y + 1];

        float x1 = Lerp(Grad2(aa, xf, yf), Grad2(ba, xf - 1, yf), u);
        float x2 = Lerp(Grad2(ab, xf, yf - 1), Grad2(bb, xf - 1, yf - 1), u);
        return Lerp(x1, x2, v);
    }

    /// <summary>分形布朗运动 - 多层噪声叠加</summary>
    public float Fbm(float x, float y, int octaves = 6, float frequency = 1f,
        float amplitude = 1f, float lacunarity = 2f, float persistence = 0.5f)
    {
        float value = 0, amp = amplitude, freq = frequency, max = 0;
        for (int i = 0; i < octaves; i++)
        {
            value += amp * Perlin2(x * freq, y * freq);
            max += amp;
            amp *= persistence;
            freq *= lacunarity;
        }
        return value / max;
    }

    /// <summary>域扭曲 - 用噪声扰动采样坐标，产生更有机形态</summary>
    public float WarpedFbm(float x, float y, float warpStrength = 1f,
        int octaves = 6, float frequency = 1f, float persistence = 0.5f, float lacunarity = 2f)
    {
        float warpX = Fbm(x * 0.5f + 5.2f, y * 0.5f + 1.3f, octaves, frequency, 1f, lacunarity, persistence);
        float warpY = Fbm(x * 0.5f + 7.8f, y * 0.5f + 3.1f, octaves, frequency, 1f, lacunarity, persistence);
        return Fbm(x + warpX * warpStrength, y + warpY * warpStrength, octaves, frequency, 1f, lacunarity, persistence);
    }

    private int[] BuildPermutation(int s)
    {
        int[] baseArr = new int[256];
        for (int i = 0; i < 256; i++) baseArr[i] = i;
        uint state = (uint)s;
        for (int i = 255; i > 0; i--)
        {
            state = (state + 0x6D2B79F5u);
            uint t = (state ^ (state >> 15)) * (1 | state);
            t = (t + (t ^ (t >> 7)) * 61u) ^ t;
            float r = ((t ^ (t >> 14))) / 4294967296f;
            int j = Mathf.FloorToInt(r * (i + 1));
            int tmp = baseArr[i];
            baseArr[i] = baseArr[j];
            baseArr[j] = tmp;
        }
        int[] p = new int[512];
        for (int i = 0; i < 512; i++) p[i] = baseArr[i & 255];
        return p;
    }

    private float Fade(float t) => t * t * t * (t * (t * 6 - 15) + 10);
    private float Lerp(float a, float b, float t) => a + t * (b - a);

    private float Grad2(int hash, float x, float y)
    {
        int h = hash & 7;
        float u = h < 4 ? x : y;
        float v = h < 4 ? y : x;
        return ((h & 1) != 0 ? -u : u) + ((h & 2) != 0 ? -2 * v : 2 * v);
    }
}
