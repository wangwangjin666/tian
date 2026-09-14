# 开放世界探索游戏 · Unity 版

基于 Unity 的 2D 程序化生成开放世界探索游戏。

## 特性

-  **无限程序化世界**：Perlin 噪声 + 域扭曲，13 种生物群系
- 🌲 **程序化植被**：树木、岩石按群系密度分布
- 🧭 **玩家探索**：WASD 移动，Shift 奔跑，碰撞检测，平滑相机跟随
- 🤖 **NPC 寻路**：A* 算法，考虑地形移动成本（cuOpt 启发）
-  **昼夜循环**：180 秒一天，日出日落光照渐变
- ️ **小地图 + HUD**：实时坐标、生物群系、游戏时间
-  **种子系统**：固定种子可复现世界

## 在 Unity 中打开

1. 打开 Unity Hub
2. 点击 **Add** → 选择 `open-world-unity` 文件夹
3. 用 Unity 2022.3 LTS 或更高版本打开
4. 打开 `Assets/Scenes/MainScene.unity`
5. 点击 **Play**

## 操作

| 按键 | 功能 |
|------|------|
| WASD / 方向键 | 移动 |
| Shift | 奔跑 |
| ESC | 暂停 |

## 项目结构

```
Assets/
├── Scripts/
│   ├── Core/
│   │   ├── NoiseGenerator.cs    # Perlin 噪声引擎
│   │   └── GameManager.cs       # 游戏管理器
│   ├── World/
│   │   ├── Biomes.cs            # 生物群系定义
│   │   └── WorldGenerator.cs    # 区块化世界生成
│   ├── Player/
│   │   ├── PlayerController.cs  # 玩家控制器
│   │   ── CameraFollow.cs      # 相机跟随
│   ├── NPC/
│   │   ├── Pathfinding.cs       # A* 寻路
│   │   └── NPCController.cs     # NPC 行为
│   ├── Rendering/
│   │   ├── TileRenderer.cs      # 瓦片渲染
│   │   └── DayNightCycle.cs     # 昼夜循环
│   ── UI/
│       ├── HUD.cs               # HUD 界面
│       ├── Minimap.cs           # 小地图
│       └── UIExtensions.cs      # UI 扩展
├── Scenes/
│   └── MainScene.unity          # 主场景
├── Materials/                   # 材质
├── Prefabs/                     # 预制体
└── Resources/                   # 资源
```

## 场景设置指南

在 Unity Editor 中创建场景：

1. **Camera**：添加 `CameraFollow` 组件
2. **World**：空 GameObject，添加 `WorldGenerator` 组件
3. **Player**：Sprite 对象，添加 `PlayerController` 组件
4. **GameManager**：空 GameObject，添加 `GameManager` 组件，拖拽引用
5. **Directional Light**：添加 `DayNightCycle` 组件
6. **Canvas**：添加 HUD UI（Text 元素）和 Minimap（RawImage）

## 技术栈

- Unity 2022.3 LTS+
- C# 脚本
- 2D Sprite 渲染
