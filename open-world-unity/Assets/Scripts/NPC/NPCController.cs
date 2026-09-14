using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// NPC控制器 - 行为状态机（IDLE/WANDER/PATHING）
/// </summary>
public class NPCController : MonoBehaviour
{
    public enum NPCType { Villager, Wanderer, Animal }

    [Header("Config")]
    [SerializeField] private NPCType npcType = NPCType.Villager;
    [SerializeField] private Color npcColor = new Color(0.91f, 0.75f, 0.48f);

    private WorldGenerator world;
    private Pathfinding pathfinding;
    private string state = "IDLE";
    private List<Vector2Int> path;
    private int pathIndex;
    private float stateTimer;
    private float walkPhase;
    private string facing = "down";
    private float speed;

    private static readonly Dictionary<NPCType, (float speed, Color color)> Configs = new Dictionary<NPCType, (float, Color)>
    {
        { NPCType.Villager, (2.2f, new Color(0.91f, 0.75f, 0.48f)) },
        { NPCType.Wanderer, (3.0f, new Color(0.48f, 0.82f, 0.91f)) },
        { NPCType.Animal, (2.8f, new Color(0.75f, 0.54f, 0.35f)) }
    };

    public void Init(WorldGenerator worldGen, Pathfinding pf, Vector2 pos, NPCType type)
    {
        world = worldGen;
        pathfinding = pf;
        npcType = type;
        var cfg = Configs[type];
        speed = cfg.speed;
        npcColor = cfg.color;
        transform.position = pos;
    }

    void Update()
    {
        stateTimer -= Time.deltaTime;

        switch (state)
        {
            case "IDLE":
                if (stateTimer <= 0) StartWander();
                break;
            case "WANDER":
            case "PATHING":
                FollowPath();
                if (pathIndex >= (path?.Count ?? 0) || stateTimer <= 0)
                {
                    state = "IDLE";
                    stateTimer = 1f + Random.Range(0f, 3f);
                }
                break;
        }
    }

    private void StartWander()
    {
        float angle = Random.Range(0f, Mathf.PI * 2f);
        int dist = Mathf.FloorToInt(3f + Random.Range(0f, 8f));
        var pos = (Vector2Int)transform.position;
        var target = pos + new Vector2Int(Mathf.RoundToInt(Mathf.Cos(angle) * dist), Mathf.RoundToInt(Mathf.Sin(angle) * dist));
        path = pathfinding.FindPath(pos, target, 15);
        if (path != null && path.Count > 0)
        {
            pathIndex = 0;
            state = "WANDER";
            stateTimer = 15f;
        }
        else
        {
            state = "IDLE";
            stateTimer = 1f + Random.Range(0f, 2f);
        }
    }

    private void FollowPath()
    {
        if (path == null || pathIndex >= path.Count) return;
        var target = (Vector2)path[pathIndex] + Vector2.one * 0.5f;
        Vector2 dir = target - (Vector2)transform.position;
        float dist = dir.magnitude;
        if (dist < 0.15f) { pathIndex++; return; }
        transform.position += (dir / dist) * speed * Time.deltaTime;
        walkPhase += Time.deltaTime * 8f;
        facing = Mathf.Abs(dir.x) > Mathf.Abs(dir.y) ? (dir.x > 0 ? "right" : "left") : (dir.y > 0 ? "down" : "up");
    }

    public string State => state;
    public float WalkPhase => walkPhase;
    public string Facing => facing;
    public Color NpcColor => npcColor;
}
