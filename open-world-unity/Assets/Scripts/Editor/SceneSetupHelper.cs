#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEngine.UI;

/// <summary>
/// 场景自动设置助手 - 在 Unity Editor 中运行以快速搭建场景
/// 使用方法：菜单 → OpenWorld → Setup Scene
/// </summary>
public static class SceneSetupHelper
{
    [MenuItem("OpenWorld/Setup Scene")]
    public static void SetupScene()
    {
        // 创建 Main Camera 并添加 CameraFollow
        var cam = Camera.main;
        if (cam == null)
        {
            var camObj = new GameObject("Main Camera");
            cam = camObj.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 15f;
            camObj.tag = "MainCamera";
        }
        cam.gameObject.AddComponent<CameraFollow>();
        cam.transform.position = new Vector3(0, 0, -10);

        // 创建 WorldGenerator
        var worldObj = new GameObject("WorldGenerator");
        worldObj.AddComponent<WorldGenerator>();

        // 创建 Player
        var playerObj = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        playerObj.name = "Player";
        playerObj.transform.position = Vector3.zero;
        var player = playerObj.AddComponent<PlayerController>();
        var playerSprite = playerObj.AddComponent<SpriteRenderer>();
        playerSprite.color = new Color(0.42f, 0.54f, 1f);
        playerSprite.sortingOrder = 10;
        Object.DestroyImmediate(playerObj.GetComponent<CapsuleCollider>());
        var playerCol = playerObj.AddComponent<CircleCollider2D>();
        playerCol.radius = 0.35f;

        // 创建 Directional Light + DayNightCycle
        var lightObj = new GameObject("Directional Light");
        var light = lightObj.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1f;
        lightObj.AddComponent<DayNightCycle>();

        // 创建 TileRenderer
        var rendererObj = new GameObject("TileRenderer");
        rendererObj.AddComponent<TileRenderer>();

        // 创建 Canvas + HUD
        var canvasObj = new GameObject("Canvas");
        var canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasObj.AddComponent<GraphicRaycaster>();

        // HUD Panel
        var hudPanel = CreateUIObject("HUDPanel", canvasObj);
        var panelRect = hudPanel.GetComponent<RectTransform>();
        panelRect.anchorMin = Vector2.zero;
        panelRect.anchorMax = Vector2.one;
        panelRect.sizeDelta = Vector2.zero;

        // Coords Text
        var coordsText = CreateTextObject("CoordsText", hudPanel, new Vector2(10, -10));
        coordsText.text = "X: 0, Y: 0";

        // Biome Text
        var biomeText = CreateTextObject("BiomeText", hudPanel, new Vector2(10, -40));
        biomeText.text = "Biome: —";

        // Time Text
        var timeText = CreateTextObject("TimeText", hudPanel, new Vector2(10, -70));
        timeText.text = "00:00";

        // HUD Component
        var hud = canvasObj.AddComponent<HUD>();

        // 创建 Minimap
        var minimapObj = CreateUIObject("Minimap", canvasObj);
        var mmRect = minimapObj.GetComponent<RectTransform>();
        mmRect.anchorMin = new Vector2(1, 0);
        mmRect.anchorMax = new Vector2(1, 0);
        mmRect.pivot = new Vector2(1, 0);
        mmRect.sizeDelta = new Vector2(160, 160);
        mmRect.anchoredPosition = new Vector2(-10, 10);
        var rawImage = minimapObj.AddComponent<RawImage>();
        rawImage.color = Color.white;
        var minimap = canvasObj.AddComponent<Minimap>();

        // 创建 GameManager
        var gmObj = new GameObject("GameManager");
        gmObj.AddComponent<GameManager>();

        Debug.Log("[OpenWorld] Scene setup complete! Please drag references in Inspector:");
        Debug.Log("  1. GameManager → drag WorldGenerator, Player, CameraFollow, DayNightCycle, TileRenderer, HUD, Minimap");
        Debug.Log("  2. HUD → drag CoordsText, BiomeText, TimeText, DayNightCycle, Player");
        Debug.Log("  3. Minimap → drag WorldGenerator, Player");
        Debug.Log("  4. Create a 1x1 white sprite and assign to TileRenderer's tilePrefab");
        Debug.Log("  5. Press Play!");
    }

    private static GameObject CreateUIObject(string name, GameObject parent)
    {
        var obj = new GameObject(name);
        obj.transform.SetParent(parent.transform, false);
        obj.AddComponent<RectTransform>();
        return obj;
    }

    private static Text CreateTextObject(string name, GameObject parent, Vector2 offset)
    {
        var obj = CreateUIObject(name, parent);
        var rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0, 1);
        rect.anchorMax = new Vector2(0, 1);
        rect.pivot = new Vector2(0, 1);
        rect.sizeDelta = new Vector2(200, 25);
        rect.anchoredPosition = offset;

        var text = obj.AddComponent<Text>();
        text.text = name;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.fontSize = 14;
        text.color = Color.white;
        text.alignment = TextAnchor.MiddleLeft;

        var outline = obj.AddComponent<Outline>();
        outline.effectColor = Color.black;
        outline.effectDistance = new Vector2(1, -1);

        return text;
    }
}
#endif
