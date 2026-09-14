using UnityEngine;

/// <summary>
/// 相机跟随系统 - 平滑跟随玩家
/// </summary>
public class CameraFollow : MonoBehaviour
{
    [SerializeField] private float smoothing = 0.12f;
    private Transform target;
    private Vector3 velocity;

    public void SetTarget(Transform t) { target = t; }

    void LateUpdate()
    {
        if (target == null) return;
        Vector3 desired = new(target.position.x, target.position.y, transform.position.z);
        transform.position = Vector3.SmoothDamp(transform.position, desired, ref velocity, smoothing);
    }
}
