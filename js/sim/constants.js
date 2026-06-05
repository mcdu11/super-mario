/**
 * 敌人/交互物理常数（子像素单位）。见 docs/PERFECT-REPLICA-SPEC.md §5.2、§5.3。
 * ⚠️ VERIFY：数值为按原版机制设的临时锚点，精确字节待 ROM 校准。
 */
import {SUBPIXELS_PER_PIXEL as PX} from '../core/Fixed.js';
const sp = n => Math.round(n * PX);

export const ENEMY_WALK_SPEED  = sp(0.5);  // goomba/绿koopa 巡逻速度 VERIFY
export const SHELL_SLIDE_SPEED  = sp(2.5);  // 龟壳滑行速度 VERIFY
export const ENEMY_GRAVITY      = sp(0.3);  // 敌人重力 VERIFY
export const ENEMY_MAX_FALL     = sp(4.0);  // 敌人最大下落速度 VERIFY

export const STOMP_BOUNCE = sp(4.0); // 玩家踩敌后的弹起速度 VERIFY
export const SQUASH_FRAMES = 30;     // goomba 被踩扁后停留多少帧再移除 VERIFY

// ── 道具 / 变身 ───────────────────────────────────────────
export const DAMAGE_IFRAMES = 120;       // 受伤降级后的无敌帧 VERIFY
export const STAR_DURATION = 600;        // 星星无敌时长（帧）VERIFY
export const STAR_BOUNCE = sp(3.0);      // 星星弹跳速度 VERIFY
export const POWERUP_WALK_SPEED = sp(0.5); // 蘑菇/1up/星 移动速度 VERIFY
