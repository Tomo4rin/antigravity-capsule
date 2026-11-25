# 星轨猫猫悬浮胶囊（antigravity-capsule）

> 面向 **Antigravity 2.0（Windows 桌面端）** 的独立轻量主窗口常驻悬浮胶囊插件。
> 不占右侧辅助栏宽度、不修改客户端 `app.asar`、零第三方依赖、零磁盘缓存。

## 核心特性

- **一粒液态玻璃迷你胶囊**：平时安静停靠在主窗口角落，实时显示 **猫猫动态头像 + 上下文占用 % + 生成速率（tok/s）+ 5h 共享额度 %**。
- **自由拖拽与一键折叠**：按住胶囊即可拖动到窗口任意角落（自动防越界并由 `localStorage` 记忆位置）；也可一键折叠成带微光环的猫猫圆球，几乎零占地。
- **点击展开详情浮卡**：点击胶囊展开紧凑 Liquid Glass 浮卡，查看当前模型、上下文进度条、缓存命中率、TTFT、5h/周共享额度及重置倒计时。
- **高上下文 ≥ 80% 柔光提醒**：当上下文占比达到 80% 以上时，胶囊边缘自动亮起琥珀色柔光脉冲，猫猫台词主动提醒使用 `/compact`。
- **Shadow DOM 隔离 + 零 CSP 报错**：通过本机 CDP 将指标与头像直接推送到主窗口顶层 Shadow DOM，无需额外开放本地端口，关闭插件即自动干净卸载。

## 前置条件

与无侵入汉化插件相同，需要在 Antigravity 桌面快捷方式的启动参数中包含本机回环调试端口：

```text
--remote-debugging-port=0 --remote-debugging-address=127.0.0.1
```

## 安装与使用

1. 将本目录复制到 `%USERPROFILE%\.gemini\config\plugins\antigravity-capsule\`。
2. 在 Antigravity 的 **Customizations → Plugins** 中启用 **星轨猫猫悬浮胶囊**。
3. 主窗口右上角即会自动浮现悬浮胶囊；随时拖动调整位置、点击展开浮卡或折叠成猫猫圆球。

## 命令行调试

```powershell
# 查看当前调试端口与采集状态
python -B sidecars/capsule/capsule.py --status

# 手动单次注入/刷新一次
python -B sidecars/capsule/capsule.py --once

# 从主窗口卸载胶囊
python -B sidecars/capsule/capsule.py --remove
```
