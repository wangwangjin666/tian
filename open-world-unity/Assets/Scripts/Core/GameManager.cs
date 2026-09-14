using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 游戏管理器 - 串联所有子系统
/// </summary>
public class GameManager : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private WorldGenerator worldGenerator;
    [SerializeField] private PlayerController player;
    [SerializeField] private CameraFollow cameraFollow;
    [SerializeField] private DayNightCycle dayNight;
    [SerializeField] private TileRenderer tileRenderer;
    [SerializeField] private HUD hud;
    [SerializeField] private Minimap minimap;

    [Header("NPC Settings")]
    [SerializeField] private int npcCount = 15;
    [SerializeField] private GameObject npcPrefab;

    [Header("Spawn Settings")]
    [SerializeField] private int seed = 20260914;
    [SerializeField] private Vector2 spawnOffset = Vector2.zero;

    private Pathfinding pathfinding;
    private List<NPCController> npcs = new List<NPCController>();
    private bool paused = false;

    void Start()
    {
        // 初始化世界
        worldGenerator.SetSeed(seed);

        // 找出生点
        Vector2 spawn = FindSpawn();

        // 初始化玩家
        player.Init(worldGenerator, spawn);
        cameraFollow.SetTarget(player.transform);

        // 初始化寻路
        pathfinding = new Pathfinding(worldGenerator);

        // 初始化渲染
        if (tileRenderer != null) tileRenderer.Init(worldGenerator);

        // 生成NPC
        SpawnNPCs(npcCount, spawn);

        // 初始化UI
        if (hud != null)
        {
            hud.SetPlayer(player);
            hud.SetDayNight(dayNight);
        }
        if (minimap != null)
        {
            minimap.SetWorld(worldGenerator);
            minimap.SetPlayer(player);
        }
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            paused = !paused;
            Time.timeScale = paused ? 0f : 1f;
        }

        // 更新渲染
        if (tileRenderer != null)
        {
            tileRenderer.UpdateRender(player.TileX, player.TileY);
        }
    }

    private Vector2 FindSpawn()
    {
        for (int r = 0; r < 50; r++)
        {
            for (int a = 0; a < 8; a++)
            {
                float angle = (a / 8f) * Mathf.PI * 2f;
                int x = Mathf.FloorToInt(Mathf.Cos(angle) * r);
                int y = Mathf.FloorToInt(Mathf.Sin(angle) * r);
                if (worldGenerator.IsWalkable(x, y))
                    return new Vector2(x + 0.5f, y + 0.5f) + spawnOffset;
            }
        }
        return spawnOffset;
    }

    private void SpawnNPCs(int count, Vector2 playerPos)
    {
        NPCController.NPCType[] types = { NPCController.NPCType.Villager, NPCController.NPCType.Wanderer, NPCController.NPCType.Animal };
        int placed = 0, attempts = 0;
        while (placed < count && attempts < count * 50)
        {
            attempts++;
            float angle = Random.Range(0f, Mathf.PI * 2f);
            float dist = Random.Range(10f, 40f);
            int x = Mathf.FloorToInt(playerPos.x + Mathf.Cos(angle) * dist);
            int y = Mathf.FloorToInt(playerPos.y + Mathf.Sin(angle) * dist);
            if (worldGenerator.IsWalkable(x, y))
            {
                var npcType = types[Random.Range(0, types.Length)];
                var npc = Instantiate(npcPrefab, new Vector3(x + 0.5f, y + 0.5f, 0), Quaternion.identity).GetComponent<NPCController>();
                npc.Init(worldGenerator, pathfinding, new Vector2(x + 0.5f, y + 0.5f), npcType);
                npcs.Add(npc);
                placed++;
            }
        }
    }

    public void NewWorld(int newSeed)
    {
        // 清理旧NPC
        foreach (var npc in npcs) Destroy(npc.gameObject);
        npcs.Clear();

        // 重新生成
        seed = newSeed;
        worldGenerator.SetSeed(seed);
        Vector2 spawn = FindSpawn();
        player.Init(worldGenerator, spawn);
        pathfinding = new Pathfinding(worldGenerator);
        SpawnNPCs(npcCount, spawn);
    }
}
