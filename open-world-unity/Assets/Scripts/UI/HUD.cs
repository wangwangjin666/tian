using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// HUD界面 - 显示坐标、生物群系、时间
/// </summary>
public class HUD : MonoBehaviour
{
    [SerializeField] private Text coordsText;
    [SerializeField] private Text biomeText;
    [SerializeField] private Text timeText;
    [SerializeField] private DayNightCycle dayNight;
    [SerializeField] private PlayerController player;

    public void SetPlayer(PlayerController p) { player = p; }
    public void SetDayNight(DayNightCycle dn) { dayNight = dn; }

    void Update()
    {
        if (player == null || dayNight == null) return;

        coordsText.text = $"X: {player.TileX}, Y: {player.TileY}";
        biomeText.text = player.GetCurrentBiome().name;

        float h = dayNight.Hour;
        timeText.text = $"{Mathf.FloorToInt(h):D2}:{Mathf.FloorToInt((h % 1f) * 60f):D2}";
    }
}
