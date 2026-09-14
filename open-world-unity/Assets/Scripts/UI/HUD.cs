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
    [SerializeField] private Text caveText;
    [SerializeField] private DayNightCycle dayNight;
    [SerializeField] private PlayerController player;
    [SerializeField] private WorldGenerator world;

    public void SetPlayer(PlayerController p) { player = p; }
    public void SetDayNight(DayNightCycle dn) { dayNight = dn; }
    public void SetWorld(WorldGenerator w) { world = w; }

    void Update()
    {
        if (player == null || dayNight == null) return;

        coordsText.text = $"X: {player.TileX}, Y: {player.TileY}";
        biomeText.text = player.GetCurrentBiome().name;

        float h = dayNight.Hour;
        timeText.text = $"{Mathf.FloorToInt(h):D2}:{Mathf.FloorToInt((h % 1f) * 60f):D2}";
        
        // 显示洞穴信息
        if (world != null && caveText != null)
        {
            var tile = world.GetTile(player.TileX, player.TileY);
            if (tile.isCave)
            {
                caveText.text = "🕳️ 洞穴";
                caveText.color = new Color(0.9f, 0.7f, 0.5f);
            }
            else
            {
                caveText.text = "";
            }
        }
    }
}
