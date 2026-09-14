# 开放世界探索游戏 · Unity 版

基于 Unity 的 2D 程序化生成开放世界探索游戏。

## 特性

-  **无限程序化世界**：Perlin 噪声 + 域扭曲 + Voronoi 区域，13 种生物群系
- 🌲 **丰富植被系统**：树木、岩石、灌木、草地、花朵，按群系密度分布
- 🏔️ **生物群系混合过渡**：平滑的颜色和属性过渡，自然边界
- 🕳️ **洞穴系统**：基于元胞自动机的洞穴生成
- 🧭 **玩家探索**：WASD 移动，Shift 奔跑，碰撞检测，平滑相机跟随
- 🤖 **NPC 寻路**：A* 算法，考虑地形移动成本（cuOpt 启发）
-  **昼夜循环**：180 秒一天，日出日落光照渐变
- ️ **小地图 + HUD**：实时坐标、生物群系、游戏时间
-  **种子系统**：固定种子可复现世界

## 技术亮点

### 1. 多层噪声系统
- **Perlin 噪声**：基础地形生成
- **分形布朗运动 (fBm)**：多尺度细节叠加
- **域扭曲 (Domain Warping)**：有机形态的地形边界
- **Voronoi 噪声**：自然区域划分和特殊地形

### 2. 生物群系混合
借鉴 Whittaker 生物群系模型，使用高度、温度、湿度三维度决定生物群系，并在边界处实现平滑过渡：
- 颜色混合：相邻生物群系颜色渐变
- 属性混合：移动成本、植被密度平滑过渡
- 瓦片过渡规则：渲染时检测邻居并调整

### 3. 扩展装饰物系统
- **大型装饰物**：树木、岩石（低密度）
- **中型装饰物**：灌木（中等密度）
- **小型装饰物**：草地、花朵（高密度）
- 每种装饰物支持多个变体和随机缩放

### 4. 洞穴生成
基于元胞自动机原理，使用多层噪声叠加在山地区域生成洞穴系统。

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
