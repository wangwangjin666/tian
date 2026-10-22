---
name: "esp32s3-cam-board"
description: "ESP32-S3-CAM N16R8 开发板（yolo_detect 安全帽检测项目）的硬件档案与操作规范。涉及该板的烧录、串口、USB、固件校验、联网调试或 board_record.json 时调用。"
---

# ESP32-S3-CAM N16R8 板子操作规范

本 skill 沉淀了此前所有对话中关于该板的调试结论与操作经验。完整硬件档案（含逐项置信度标注）见 `/workspace/board_record.json`，那是 source of truth；本文件只保留可直接复用的规则与命令。

## 置信度约定（board_record.json 中的 confidence 字段）

- `hw_verified`：硬件直读实测，可直接采信
- `project_annotation`：来自项目源码注释
- `historical`：系统历史记录，可能有保留，不可盲信

## 板子身份

- 型号：安信可 (Ai-Thinker) ESP32-S3-CAM N16R8（N16 = 16MB Flash 兆易创新，R8 = 8MB PSRAM）
- 摄像头：OV2640 出厂焊好，引脚定义使用 `CAMERA_MODEL_ESP32S3_EYE`
- MAC：`44:1b:f6:ca:ad:ec`
- GPIO 19/20（native USB D-/D+）未被摄像头占用，原生 USB 干净可用
- 项目路径：`D:\Projects\helmet_final\yolo_detect`
- 历史：上一块板（`CAMERA_MODEL_CUSTOM_ESP32S3` FPC 引脚方案）已退货，不要走回头路

## 硬性规则（踩坑结论，务必遵守）

1. **烧录只走原生 USB "OTG" 口**：COM3，VID:PID `303A:1001`（USB-Serial/JTAG），无需按 BOOT 键。旧的 COM6 命令已作废。
2. **UART 口（板载 CH343，VID:PID `1A86:55D3`）已确认硬件损坏**：插上只亮灯、Windows 完全枚举不到。结论是数据链路故障，不值得修。不要再在这个口上排查，也不要建议用户修它。
3. **串口默认读不到不是故障**：`CDCOnBoot=Disabled` 使 `Serial.begin(115200)` 指向 UART0 (GPIO43/44) 而非 USB。要看串口二选一：
   - 重编译加 `CDCOnBoot=cdc`（会覆盖固件，可用本地留档原样烧回）
   - 外置 USB-TTL 接 GPIO43/44，绕过损坏的板载 CH343
4. **不要用 `app_desc.project_name` 判断固件**：它恒为 `arduino-lib-builder`（Arduino ESP32 核心编译系统的固有产物名，所有 sketch 都一样）。确认固件身份必须用 `verify-flash` + 分区表比对。
5. **定位板子 IP 靠 MAC 认人**：连上同一热点后在 ARP 表里按 `44-1b-f6-ca-ad-ec` 查找。IP 是热点 DHCP 分配的，每次重连可能变化，不要假设固定 IP。

## 固件现状（2026-09-14 实测）

- 固件：`yolo_detect.ino`（YOLOv5n INT8 160 安全帽检测 + OV2640），与本机编译产物逐字节一致
- IDF v5.5.4，大小 3.08MB，app0 分区占用约 38.5%
- 自定义分区表与 `D:\Projects\helmet_final\yolo_detect\partitions.csv` 逐字节一致（该方案为本项目独有，可作为固件指纹）
- 编译 FQBN：`esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,PartitionScheme=custom`
- 本地留档：`C:\Users\34989\AppData\Local\arduino\sketches\89A1102D5DD4B1FDC003D09AF4F7EB0B\yolo_detect.ino.bin`

## 运行时服务（已实测）

- WiFi STA 连热点（2.4GHz），HTTP 服务：
  - 80 端口：`/` `/status` `/control` `/capture` `/bmp` `/xclk` `/reg` `/greg` `/pll` `/resolution`
  - 81 端口：`/stream`（MJPEG multipart）
- 检测框由 `detect_annot.cpp` 直接画在 `/stream` 上，浏览器可见，**不依赖串口** —— 调试检测逻辑优先看流，不要纠结串口

## 常用命令（Windows 本机）

```powershell
# esptool 路径
$esptool = "C:\Users\34989\AppData\Local\Arduino15\packages\esp32\tools\esptool_py\5.3.0\esptool.exe"

# 读芯片/Flash 信息
& $esptool --port COM3 --baud 460800 flash-id

# 读分区表
& $esptool --port COM3 --baud 460800 read-flash 0x8000 0x9000 part.bin

# 校验固件（确认板上固件身份的正确方式）
& $esptool --port COM3 --baud 460800 verify-flash 0x10000 "C:\Users\34989\AppData\Local\arduino\sketches\89A1102D5DD4B1FDC003D09AF4F7EB0B\yolo_detect.ino.bin"

# 列出 COM 口
[System.IO.Ports.SerialPort]::GetPortNames()

# 按 MAC 在 ARP 表里找板子 IP
arp -a | Select-String '44-1b-f6-ca-ad-ec'

# 列出 ESP 相关设备
Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match 'VID_303A|VID_1A86' } | Format-Table Status,Class,InstanceId
```

## 尚未解决的问题

- 购买记录 / 订单号未知
- 缺板子正反面丝印照片、厂商批次
- 本板 UART 口历史上是否曾成功枚举无法确定（已退货那块板也带 CH343，Windows 设备记录无法区分）
