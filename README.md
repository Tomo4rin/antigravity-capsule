# 星轨猫猫悬浮胶囊（antigravity-capsule）

> 面向 **Antigravity 2.0（Windows 桌面端）** 的独立轻量主窗口常驻悬浮胶囊插件。
> 不占右侧辅助栏宽度、不修改客户端 `app.asar`、零第三方依赖、零磁盘缓存。

## 核心特性

- **一粒液态玻璃迷你胶囊**：平时安静停靠在主窗口角落，实时显示 **猫猫动态头像 + 上下文占用 % + 生成速率（tok/s）+ 5h 共享额度 %**。
- **三色额度流光水晶球**：双击胶囊或点击浮卡里的「圆球」即可纯 GPU 丝滑形变为 44px 星轨水晶球；边框流光随当前活跃模型池剩余额度自动变色（**翡翠绿** >50% / **琥珀橙** 21%~50% / **警示玫红** ≤20%），悬停即显示极简预览条。
- **纯 GPU 跟手拖拽 + 贴边磁吸**：按住横条或圆球即可全程零重排拖动，靠近窗口左右边缘自动轻柔磁吸对齐并由 `localStorage` 记忆锚点位置，切换圆球时不乱跳。
- **猫猫头像趣味互动**：点击横条头像或浮卡大头像（以及右键圆球）可轮换 4 种表情与傲娇台词并飘散彩虹 `✦` 星芒；2.2 秒内连戳 5 下触发算力过热晃动彩蛋。
- **展开详情 Liquid Glass 浮卡**：点击胶囊数字区展开浮卡，查看当前模型、上下文进度条、均速/峰值速率、TTFT、缓存命中率，以及 **5 小时 / 周额度** 双进度条、重置倒计时与预计耗尽预警。
- **高上下文 ≥ 80% 柔光提醒**：当上下文占比达到 80% 以上时，胶囊边缘自动亮起琥珀色柔光脉冲，猫猫主动提醒使用 `/compact`。
- **会话秒级跟随 & 极致省性能**：优先从 `%APPDATA%\Antigravity\DevToolsActivePort` 发现调试端口，按每个主窗口 URL 中的 `conversationId` 精准跟随当前浏览对话（同一对话多窗口共享采集、闲置跳过无效 CDP 推送、后台自动降频至 15 秒）。
- **Shadow DOM 隔离 + 零 CSP 报错**：通过本机 CDP 将指标与内联头像直接推送到主窗口顶层 Shadow DOM，无需额外开放本地端口，关闭插件即自动干净卸载。

## 前置条件

需要 Python 3.10+，且在 Antigravity 桌面快捷方式的启动参数中包含本机回环调试端口：

```text
--remote-debugging-port=0 --remote-debugging-address=127.0.0.1
```

## 安装与使用

1. 从 [Releases](https://github.com/Tomo4rin/antigravity-capsule/releases) 下载最新压缩包并解压，将 `antigravity-capsule` 文件夹放入：
   ```text
   %USERPROFILE%\.gemini\config\plugins\antigravity-capsule\
   ```
2. 在 Antigravity 的 **Customizations → Plugins** 中启用 **星轨猫猫悬浮胶囊**。
3. 主窗口右上角即会自动浮现悬浮胶囊：
   - **点头像**：戳猫猫、切表情、飘星芒；
   - **点数字区 / 箭头**：展开或收起 Liquid Glass 详情浮卡；
   - **双击胶囊 / 右键圆球**：在横条胶囊与流光水晶球之间切换，或隔空戳猫。

## 命令行调试

```powershell
# 查看当前调试端口与采集状态
python -B sidecars/capsule/capsule.py --status

# 手动单次注入/刷新一次
python -B sidecars/capsule/capsule.py --once

# 从主窗口卸载胶囊
python -B sidecars/capsule/capsule.py --remove
```

## 开源协议

[MIT](LICENSE)
