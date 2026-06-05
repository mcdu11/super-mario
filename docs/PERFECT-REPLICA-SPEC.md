# 超级马里奥兄弟（SMB1, NES）像素级复刻 —— 架构与规格文档

> 状态：草案 v0.1（地基文档，后续随实现迭代）
> 目标标准：**B —— 帧级 / 像素级精确复刻**
> 双重目标：① 学习可演进的代码架构；② 还原原版所有可观测细节
> 事实来源（Source of Truth）：原版 6502 反汇编 `SMBDIS.ASM`（doppelganger 注释版），辅以 NESdev Wiki、Data Crystal、TASVideos。

---

## 0. 范围与定义

### 0.1 什么叫「完美复刻（B 标准）」
给定**相同的逐帧输入序列**，本复刻的状态（坐标、速度、敌人、计时、RNG、得分…）应与原版 NES SMB1 **逐帧逐像素一致**，并因此自然涌现出原版的一切行为，包括：
- 物理手感（加速、转身急停、可变跳高、惯性）
- frame rules（关卡完成时间按帧规则量化）
- 屏幕对象槽位导致的敌人「闪烁/消失」
- 确定性 RNG 决定的 Bowser 火球、火焰棒相位
- 著名 glitch（如负世界 World -1、墙穿、旗杆 bug）

> 「A 标准」=「玩起来像马里奥」，靠手调常数即可；**B 标准要求与原版可逐帧对拍（diff）**。两者的工程量差一个数量级，核心差别见 §1。

### 0.2 合法性与仓库卫生（强制约束）⚠️
- 从**自己合法拥有的 ROM** 提取图形/关卡/音乐用于**个人学习**：可行。
- **任天堂版权资产绝不可进入本 git 仓库，也绝不可随公开 GitHub Pages 部署。**
- 因此：
  - 所有 ROM 提取物放入被忽略的目录（见 `.gitignore`：`/roms/`、`/assets/ripped/`、`*.nes`、`*.chr`）。
  - 仓库内、公开构建只使用**重绘 / 占位**美术与音频。
  - 提供一个本地提取脚本（`tools/extract/`，同样不含 ROM），由使用者用自己的 ROM 在本地生成 `assets/ripped/`，供本地精确比对，但不提交、不发布。
- 公开的 Pages 演示 = 引擎 + 占位资产；精确比对 = 本地 + ripped 资产。两条管线分离。

---

## 1. 第一性原理：确定性帧驱动 + 定点整数物理

这是整个项目最重要的架构认知，也是 B 与 A 的分水岭。

| 维度 | 原版 NES | 本仓库现有教程引擎 | B 标准要求 |
|---|---|---|---|
| 时间 | 锁 ~60.0988Hz，**逐帧推进，无 deltaTime** | `pos += vel * deltaTime`（浮点×时间） | **帧驱动**，全局 `frameCount`，无 deltaTime |
| 数值 | **定点整数**（像素 + 子像素累加器） | 浮点 | **整数子像素**，封装为 `Fixed` |
| 确定性 | 完全确定 | 受浮点误差/步长抖动影响，会与原版发散 | 完全确定，可回放、可逐帧 diff |

**推论**：现有 `Level.js` 的浮点积分必须替换为整数子像素的逐帧积分。**但 Entity/Trait 组件架构是好的、予以保留**——我们替换的是底层数值表示与积分方式，不是推倒重来。

渲染可以与逻辑解耦：逻辑严格每「游戏帧」跑一次（确定性），渲染可插值或直接锁 60fps 呈现。比对模式下渲染插值关闭，保证像素对齐。

---

## 2. 目标架构

### 2.1 分层与依赖方向（自底向上，依赖只能向下）
```
core/        确定性内核（无渲染、无 DOM）
  Clock        固定帧时钟：累加真实时间，按固定帧步进逻辑；持有 frameCount
  Fixed        子像素定点数类型（整数运算封装：add/sub/mul、whole、sub）
  PRNG         复刻原版伪随机寄存器（7 字节移位，见 §4.4）
  Vec2Fixed    定点二维向量
physics/     逐帧整数积分 + 碰撞；所有常数集中在 constants.js（直接对应反汇编标签）
world/       关卡模型、瓦片、对象槽位管理（screen object slots）
entities/    具体对象（Mario、各敌人、道具、投射物）
traits/      组件（移动、跳跃、可被踩、可杀、重力…），保留现有模式
data/        关卡/敌人/warp 数据（按原版格式）；ripped 走忽略目录
render/      256×240 画布、NES 调色板、OAM 风格绘制、状态栏、动画时序
audio/       APU 风格音乐/音效引擎 + 音乐数据
states/      状态机：标题 / 关卡进行 / 死亡 / 关卡切换 / 通关 / GameOver
input/       输入采样 + 录制/回放（确定性比对的关键）
app/         装配与主循环
tools/       本地 ROM 提取脚本（不含 ROM，产物进 ignored 目录）
test/        以已知常数与 TAS 输入做的确定性回归
```

### 2.2 现有代码到目标架构的映射
| 现有 | 去向 | 处理 |
|---|---|---|
| `Timer` | `core/Clock` | 改为帧驱动 + `frameCount`；逻辑步进与渲染分离 |
| `math.Vec2` | `core/Vec2Fixed` | 数值类型从 float → Fixed |
| `Entity`/`Trait` | `entities/` + `traits/` | **保留模式**，数值改 Fixed，update 不再吃 deltaTime |
| `Go`/`Jump`/`PendulumWalk` | `traits/` | 重写为原版常数 + 整数积分 |
| `TileCollider`/`TileResolver`/`BoundingBox` | `physics/` | 保留分轴思路，改子像素 + corner correction |
| `Level` | `world/Level` | 加对象槽位、frame counter、确定性顺序 |
| `Compositor`/`layers`/`SpriteSheet`/`anim` | `render/` | 加调色板、状态栏、原版动画时序 |
| `loaders` | `data/` + `render/` | 拆数据加载与图集加载 |

### 2.3 必须先清理的债
- `traits/Jump.js` 里每帧 `console.log(entity.vel.y)` 调试遗留 —— 删除。

---

## 3. 核心内核规格

### 3.1 `Clock`（帧驱动）
- 维护 `frameCount`（从 0 起的全局帧序号），是 RNG、动画、计时、frame rule 的统一时基。
- `requestAnimationFrame` 累加真实时间，每满一个 `1/60.0988s` 跑一次 `tick(frameCount)`；落后时多跑几帧（catch-up），但**每次 tick 是离散整数帧**，绝不传 deltaTime 给逻辑。
- 提供 `step()` 单步，供测试/比对逐帧驱动。

### 3.2 `Fixed`（定点数）
- 原版坐标 = 整数像素 + 子像素累加器；速度单位为 **1/16 像素/帧**（见 §4.1 锚点）。
- 用 JS 整数表示子像素，所有算术走整数，避免浮点。封装 `whole()`（取整数像素）、`frac()`、`add/sub`。
- 单元测试：给定速度与帧数，累加结果必须与原版进位行为一致。

### 3.3 `PRNG`
见 §4.4，单独成类，状态可序列化（用于回放）。

---

## 4. 物理规格（核心，逐条照搬反汇编）

> 约定：下表「符号」列为反汇编中的真实标签，**精确字节须由 ROM/反汇编核对填入**（见 §9 提取流程）。已知锚点值给出并标注。

### 4.1 坐标与速度表示
- 每个对象每轴：一个**整数像素位置**（含跨屏的高位）+ 一个**子像素 MoveForce 累加器**。
- 速度 `Player_X_Speed` / `Player_Y_Speed`：**有符号字节，单位 1/16 px/帧**。
  - 锚点（well-known，待核对）：步行最高速 `0x18`（=1.5 px/f），跑步最高速 `0x28`（=2.5 px/f）。
- 相关符号：`Player_X_Position`、`Player_Y_Position`、`Player_X_MoveForce`、`Player_Y_MoveForce`、`Player_XSpeedAbsolute`。

### 4.2 水平移动（走 / 跑 / 转身）
模型（数值待核对）：
- **三档最高速**：走、跑（按住 B）、跑满。符号：`MaxLeftXSpdData` / `MaxRightXSpdData`、`RunningSpeed`。
- **助跑过程**：按住 B 需累计约 10 帧（`RunningTimer` 计满）才进入跑满速。
- **加速**：每帧向 MoveForce 叠加加速度，受当前是否按 B 影响。
- **释放减速（摩擦）**：松开方向键后按 `FrictionAdderHigh` / `FrictionAdderLow` 衰减。
- **急停转身（skid）**：输入方向与速度反向时，用更大的减速值，并触发 skid 动画/音效判定。
- 待填常数表：`MaxLeft/RightXSpdData`、`RunningSpeed`、加速度、`FrictionAdderHigh/Low`、skid 减速、`RunningTimer` 阈值。

### 4.3 跳跃（可变跳高的真实机制）
- **起跳初速度按起跳瞬间水平速度分 4 档查表**：`JumpMForceData`（跑得越快，跳得越高越远）。
- **上升阶段按住 A 用较弱重力；松开 A 或过顶点后换更强重力**：`FallMForceData`，每档速度对应一组（起跳力 + 弱/强两个重力）。这就是变跳高来源。
- **最大下落速**有上限钳制。
- 相关符号：`JumpMForceData`、`FallMForceData`、`Player_Y_MoveForce`、`JumpOrigin_Y_Position`、`VerticalForce`、`MaxFallSpeed`（名以反汇编为准）。
- 水中（`SwimmingFlag`）为另一套上浮/重力常数（World 2-2 等），单列。

### 4.4 确定性 RNG
- 原版 RNG = 7 字节伪随机寄存器（`PseudoRandomBitReg`，约 `$07A7..$07AD`），每次调用做线性反馈移位。
- 必须**逐位复刻移位与种子初始化**，否则 Bowser 火球、火焰棒、某些敌人行为相位会与原版不符。
- 用例：Bowser、Lakitu 投掷、Cheep-Cheep 跳跃、Hammer Bro。

### 4.5 碰撞与边角修正
- 保留现有「X/Y 分轴检测」思路，改为子像素精度。
- 需还原：踩敌判定窗口（从上方且向下速度 + 重叠）、**corner correction**（贴墙/贴角的容差）、半砖/坡度（SMB1 无坡）、顶砖 bump 的判定格、被顶起的敌人。

---

## 5. 实体与对象系统

### 5.1 屏幕对象槽位（screen object slots）—— 还原「闪烁/消失」的关键
- 原版敌人活在固定数量的对象槽（约 5 个敌人槽 + 玩家 + 投射物等），符号近 `Enemy_Flag`/`Enemy_State`/`Enemy_ID`，索引 0..5。
- 敌人**按关卡横向滚动到某「列」时从数据生成**进槽；槽满则新敌人不生成 → 这正是原版「同屏敌人上限」与闪烁来源。
- 复刻必须模拟：固定槽位、按列触发生成、回收、绘制顺序，**不可用无限 Set**（现有 `Level.entities` 是无限 Set，需改造）。

### 5.2 traits 清单（在现有模式上扩展）
移动类：`HorizontalMove`、`Jump`、`Gravity`、`Swim`
交互类：`Stompable`、`Killable`、`Shell`（龟壳：缩壳/踢动/滑壳连杀/回血）、`Solid`、`Bumpable`
道具类：`PowerUp`（蘑菇/火花/星/1up）、`Projectile`（火球：落地反弹、命中消失）
AI 类：`PendulumWalk`（保留）、`LedgeAware`（红龟不走悬崖）、`Fly`/`Jump AI`、`Throw`（锤子/火球）

### 5.3 敌人全家桶（World 1–8）
Goomba、绿/红 Koopa Troopa、Paratroopa（飞龟，两种）、Piranha Plant（食人花）、Buzzy Beetle（铁甲虫，免火球）、Hammer Bro、Lakitu + Spiny、Bullet Bill、Cheep-Cheep（游/跳两型）、Blooper（乌贼）、Bowser（+ 假 Bowser 形态）、Fire Bar（火焰棒）、Podoboo（岩浆球）、Spring（弹簧台）。各自 AI / 受击规则逐一对照反汇编。

---

## 6. 关卡与世界数据（原版格式）

### 6.1 数据格式（Data Crystal / 反汇编为准）
- **Area（区域）**分类型：水上、地下、水下、城堡。每关由「object 数据」（地形/管道/砖/平台/城堡件）+「enemy 数据」两段字节流描述，各以 2 字节为单位编码 (x, y, 类型/参数)，终止符结束。
- **Area pointer 表**把 World-Level 映射到区域，并支持一区域被多关复用、warp zone 跳转。
- 还需：关卡起点/中点（midway）重生、计时初值（通常 400）、背景/调色板选择、音乐选择。

### 6.2 提取流程（本地、不入库）
- `tools/extract/`：读取使用者本地 ROM →
  - CHR → 重建图集 PNG（`assets/ripped/`，ignored）
  - 区域 object/enemy 数据 → `data/areas/*.json`（**结构可入库，但若直接来自 ROM 字节则视为版权数据，放 ignored**；公开仓库用重建的等价关卡）
  - 调色板 → `render/palette.js`
  - 音乐数据 → `audio/`（同版权约束）
- 文档将给出每段数据在 ROM 的偏移/格式表，便于核对。

### 6.3 现有 1-1 JSON
现有 `assets/levels/1-1.json` 是教程的近似手写版，可作占位/公开演示用；精确版由提取管线在本地生成并比对。

---

## 7. 渲染规格
- **逻辑分辨率 256×240**，整数倍放大到画布。
- **NES 主调色板**（64 色）+ 每区域子调色板；马里奥按力量状态（小/大/火）换子调色板；星星无敌时调色板循环。
- 状态栏（MARIO / 得分 / 金币 / WORLD / TIME）按原版字模与刷新时机。
- 动画时序以**帧**为单位（金币旋转、砖块闪、敌人走），与逻辑时基统一。
- 可选还原「每扫描线 8 精灵」导致的 flicker（精度模式开，体验模式可关）。
- 相机：**左边界锁定**（不能往回走出屏），右随玩家，关末/管道/城堡特殊镜头。

## 8. 音频规格
- APU 四通道模型（两方波 + 三角 + 噪声）+ DMC 不用。
- 音乐用原版数据格式驱动（本地提取）；公开版用重录等价曲。
- 音效清单：跳、踩、金币、顶砖、碎砖、变身出现、变身获得、火球、踢壳、进管、1up、旗杆、烟花、死亡 jingle、关末倒计时变速、GameOver、Bowser 倒下。

## 9. 系统 / 元层
- 计分、金币（满 100 → 加命）、生命、**400 倒计时**（计时按特定帧率递减；剩余转分；催促时音乐提速）。
- **Frame rules**：关卡完成时间按约 21 帧为一规则量化（影响通关用时与某些刷分）。
- 世界结构：**8 世界 × 4 关 = 32**；城堡 boss、warp zone、隐藏 1up、火焰棒城堡。
- 状态机：标题（含 1P/2P 选择与人物交替 Mario/Luigi）、关卡、死亡重生（回起点或中点）、关卡切换过场、通关救公主与字幕、循环（通关后更难变体）、GameOver。
- 著名 glitch 列为「精度验收项」：World -1（负世界）、墙穿、旗杆 bug、快速加速等——能复现即证明底层够精确。

## 10. 精确性验证策略（如何证明「完美」）
1. **确定性回放**：输入录制成逐帧按键序列；同序列必得同状态（状态哈希一致）。
2. **TAS 对拍**：导入已知 TAS 输入（如任意百分比/速通），与原版参考逐帧比关键量（Mario 像素坐标、速度、计时、RNG 寄存器）。允许提供「真值轨迹」CSV 做单元断言。
3. **常数单元测试**：物理常数表对照反汇编标签逐一断言。
4. **视觉 diff**：精度模式下逐帧截图与原版录像对齐（像素差阈值）。
5. **glitch 验收**：负世界等能否复现，作为综合精度的试金石。

## 11. 路线图（里程碑 + 学习重点）
- **M0 重构地基**：`Clock`(帧驱动) + `Fixed`(定点) + 输入录制/回放 + 删调试遗留。*学：确定性内核为何如此设计。*
- **M1 物理核心垂直切片**：Mario 水平移动（三档+转身）+ 跳跃（4 档查表 + 双重力），用 §4 常数，回放可复现。*学：定点积分与查表式物理。*
- **M2 瓦片碰撞 + 对象槽位**：子像素碰撞、corner correction、固定敌人槽与按列生成。*学：原版对象内存模型。*
- **M3 实体交互**：踩扁/死亡/龟壳连杀/顶砖出物/金币。*学：trait 组合与事件。*
- **M4 道具与变身**：蘑菇/火花/星/1up + 火球投射 + 三态。
- **M5 敌人全家桶 + 确定性 RNG**：逐个对照 AI。
- **M6 数据管线**：本地 ROM 提取 → 精确关卡/图集/调色板（ignored），公开占位版并行。
- **M7 系统/元层**：HUD、计时、frame rules、32 关、warp、结局、双人。
- **M8 音频**：音乐音效引擎。
- **M9 精度验收**：TAS 对拍、glitch 复现、视觉 diff。

## 12. 参考资料
- `SMBDIS.ASM`（doppelganger 注释版 SMB1 反汇编）—— **首要事实来源**
- NESdev Wiki（CPU/PPU/APU、OAM、调色板、控制器时序）
- Data Crystal（SMB1 的 ROM map、关卡/敌人数据格式、偏移表）
- TASVideos（输入序列、frame rule、glitch 原理）
- 6502 指令集参考（核对算术/进位语义）

---

## 附：现状基线（写文档时的仓库状态）
- 架构：Entity/Trait 组件 + Compositor 分层 + Timer(1/60 累加) + JSON 关卡 + 分轴瓦片碰撞，**地基良好可演进**。
- 已实现：Mario 走/跑/可变跳（浮点近似）、Goomba/Koopa 行走折返、JSON 生成实体、相机跟随。
- 主要缺口（相对 B）：浮点物理需改定点帧驱动、无实体交互、无对象槽位、无道具/变身/音频/系统层、常数非原版精确值。
- 完成度（相对 B 标准）：约 10–15%（地基层为主）。
