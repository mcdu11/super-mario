/**
 * Mario 物理常数 —— 见 docs/PERFECT-REPLICA-SPEC.md §4.2、§4.3。
 *
 * ⚠️ VERIFY：以下数值为「按原版机制 + 社区公认量级」的**临时锚点**，用物理单位
 * （像素/帧、像素/帧²）写出，便于阅读。**精确字节须从 ROM/反汇编核对后替换**，
 * 对应反汇编标签已在注释标出。机制（三档速度、转身、4 档跳跃查表、双重力）已按
 * 原版结构实现，校准只需改本文件的数字，不动逻辑。
 *
 * 单位换算：内部一律用「子像素/帧」（1 像素 = 256 子像素，见 core/Fixed）。
 */
import {SUBPIXELS_PER_PIXEL as PX} from '../core/Fixed.js';

/** 像素/帧 → 子像素/帧（四舍五入到整数，保持确定性整数运算） */
const sp = n => Math.round(n * PX);

// ── 水平移动 ───────────────────────────────────────────────
// 反汇编：MaxRightXSpdData/MaxLeftXSpdData（走 0x18≈1.5px、跑 0x28≈2.5px）
export const MAX_WALK_SPEED = sp(1.5);   // VERIFY 0x18
export const MAX_RUN_SPEED  = sp(2.5);   // VERIFY 0x28

// 反汇编：加速/摩擦 adder（FrictionAdderHigh/Low 等）
export const WALK_ACCEL      = sp(0.0556); // VERIFY
export const RUN_ACCEL       = sp(0.0833); // VERIFY（按住 B 时加速更快）
export const RELEASE_FRICTION = sp(0.0556); // 松开方向键的减速 VERIFY
export const SKID_DECEL      = sp(0.101);  // 转身急停减速（更大）VERIFY

// 反汇编：RunningTimer —— 松开 B 后维持跑速的宽限帧数
export const RUN_TIMER_FRAMES = 10; // VERIFY

// ── 跳跃 ──────────────────────────────────────────────────
// 按起跳瞬间水平速度分 3 档（原版 JumpMForceData/FallMForceData 为多档查表）。
// 档位边界以 |vx|（子像素/帧）划分：[慢, 中, 快]
export const JUMP_SPEED_BUCKETS = [sp(1.0), sp(2.0)]; // < b0:慢 / < b1:中 / 否则:快

// 起跳初速度（向上，子像素/帧），跑得越快跳得越高 —— 反汇编 JumpMForceData
export const JUMP_INITIAL = [sp(4.0), sp(4.0), sp(5.0)]; // VERIFY

// 上升且按住 A：弱重力（跳得高的来源）—— 反汇编（jump move force）
export const GRAVITY_HOLD = [sp(0.125), sp(0.125), sp(0.156)]; // VERIFY

// 下落或松开 A：强重力 —— 反汇编 FallMForceData
export const GRAVITY_FALL = [sp(0.4375), sp(0.4375), sp(0.5625)]; // VERIFY

// 最大下落速度钳制 —— 反汇编 MaxFallSpeed
export const MAX_FALL_SPEED = sp(4.5); // VERIFY

/** 按 |vx|（子像素/帧）返回跳跃档位 0/1/2 */
export function jumpBucket(absVx) {
    if (absVx < JUMP_SPEED_BUCKETS[0]) return 0;
    if (absVx < JUMP_SPEED_BUCKETS[1]) return 1;
    return 2;
}
