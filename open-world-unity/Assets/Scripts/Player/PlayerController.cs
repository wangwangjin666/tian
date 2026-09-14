using UnityEngine;

/// <summary>
/// 玩家控制器 - WASD移动 + 碰撞检测
/// </summary>
public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float walkSpeed = 4.5f;
    [SerializeField] private float runSpeed = 8f;
    [SerializeField] private float collisionRadius = 0.35f;

    private WorldGenerator world;
    private Vector2 velocity;
    private float walkPhase;
    private string facing = "down";

    public float X => transform.position.x;
    public float Y => transform.position.y;
    public int TileX => Mathf.FloorToInt(transform.position.x);
    public int TileY => Mathf.FloorToInt(transform.position.y);
    public float WalkPhase => walkPhase;
    public string Facing => facing;

    public void Init(WorldGenerator worldGen, Vector2 spawnPos)
    {
        world = worldGen;
        transform.position = spawnPos;
    }

    void Update()
    {
        float h = Input.GetAxisRaw("Horizontal");
        float v = Input.GetAxisRaw("Vertical");
        Vector2 move = new(h, v);
        if (move.sqrMagnitude > 1f) move.Normalize();

        bool running = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        float speed = running ? runSpeed : walkSpeed;
        velocity = move * speed;

        if (move.x != 0f || move.y != 0f)
        {
            facing = Mathf.Abs(move.x) > Mathf.Abs(move.y)
                ? (move.x > 0 ? "right" : "left")
                : (move.y > 0 ? "down" : "up");
            walkPhase += Time.deltaTime * (running ? 14f : 9f);
        }

        // 分轴移动 + 碰撞（滑墙）
        Vector2 newPos = transform.position;
        newPos.x += velocity.x * Time.deltaTime;
        if (CanMoveTo(newPos)) transform.position = newPos;
        else transform.position = new Vector2(transform.position.x, transform.position.y);

        newPos = transform.position;
        newPos.y += velocity.y * Time.deltaTime;
        if (CanMoveTo(newPos)) transform.position = newPos;
    }

    private bool CanMoveTo(Vector2 pos)
    {
        float r = collisionRadius;
        Vector2[] samples = {
            pos + new Vector2(r, 0), pos + new Vector2(-r, 0),
            pos + new Vector2(0, r), pos + new Vector2(0, -r),
            pos + new Vector2(r * 0.7f, r * 0.7f), pos + new Vector2(-r * 0.7f, r * 0.7f),
            pos + new Vector2(r * 0.7f, -r * 0.7f), pos + new Vector2(-r * 0.7f, -r * 0.7f)
        };
        foreach (var s in samples)
        {
            if (!world.IsWalkable(Mathf.FloorToInt(s.x), Mathf.FloorToInt(s.y)))
                return false;
        }
        return true;
    }

    public Biomes.BiomeData GetCurrentBiome() => world.GetTile(TileX, TileY).biome;
}
