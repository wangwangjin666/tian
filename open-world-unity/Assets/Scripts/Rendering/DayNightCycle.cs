using UnityEngine;

/// <summary>
/// 昼夜循环系统 - 实时日夜变化与光照渐变
/// </summary>
public class DayNightCycle : MonoBehaviour
{
    [SerializeField] private float dayLength = 180f; // 秒
    [SerializeField] private Light sunLight;
    [SerializeField] private Gradient skyGradient;
    [SerializeField] private Camera skyCamera;

    private float time = 0f; // 0~1

    public float DayTime => time;
    public float Hour => time * 24f;

    void Update()
    {
        time = (time + UnityEngine.Time.deltaTime / dayLength) % 1f;
        float hour = Hour;

        // 太阳旋转
        if (sunLight != null)
        {
            float angle = (hour / 24f) * 360f - 90f;
            sunLight.transform.rotation = Quaternion.Euler(angle, 30f, 0f);

            // 光照强度
            float intensity = Mathf.Clamp01(Mathf.Sin((hour / 24f) * Mathf.PI));
            sunLight.intensity = intensity * 1.2f;
        }

        // 天空颜色
        if (skyCamera != null && skyGradient != null)
        {
            skyCamera.backgroundColor = skyGradient.Evaluate(time);
        }
    }

    /// <summary>获取当前光照叠加颜色（用于全屏光照效果）</summary>
    public Color GetLightingColor()
    {
        float h = Hour;
        if (h < 5f || h >= 21f) return new Color(0.03f, 0.05f, 0.16f, 0.55f);
        if (h < 7f) { float t = (h - 5f) / 2f; return new Color(0.03f + t, 0.05f + t * 0.5f, 0.16f + t * 0.2f, 0.55f - t * 0.35f); }
        if (h < 17f) return new Color(1f, 0.96f, 0.86f, 0.05f);
        if (h < 19f) { float t = (h - 17f) / 2f; return new Color(1f, 0.96f - t * 0.5f, 0.86f - t * 0.4f, 0.05f + t * 0.35f); }
        float t2 = (h - 19f) / 2f;
        return new Color(1f - t2 * 0.97f, 0.47f - t2 * 0.42f, 0.24f - t2 * 0.15f, 0.4f + t2 * 0.15f);
    }
}
