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
export const PARATROOPA_HOP = sp(3.0); // Paratroopa 落地起跳速度 VERIFY

// ── 食人花 / 子弹比尔 ─────────────────────────────────────
export const PIRANHA_SPEED = sp(0.5);     // 食人花升降速度 VERIFY
export const PIRANHA_HIDDEN_FRAMES = 60;  // 缩在管内停留帧 VERIFY
export const PIRANHA_EXPOSED_FRAMES = 60; // 完全探出停留帧 VERIFY
export const PIRANHA_NEAR_DIST = 32;      // 玩家在此像素内则不探出 VERIFY
export const BULLET_SPEED = sp(2.0);      // 子弹比尔水平速度 VERIFY

// ── 道具 / 变身 ───────────────────────────────────────────
export const DAMAGE_IFRAMES = 120;       // 受伤降级后的无敌帧 VERIFY
export const STAR_DURATION = 600;        // 星星无敌时长（帧）VERIFY
export const STAR_BOUNCE = sp(3.0);      // 星星弹跳速度 VERIFY
export const POWERUP_WALK_SPEED = sp(0.5); // 蘑菇/1up/星 移动速度 VERIFY

// ── 火球 ─────────────────────────────────────────────────
export const FIREBALL_SPEED = sp(3.0);       // 水平速度 VERIFY
export const FIREBALL_GRAVITY = sp(0.5);     // 火球重力 VERIFY
export const FIREBALL_BOUNCE = sp(2.5);      // 落地反弹速度 VERIFY
export const FIREBALL_MAX_FALL = sp(4.0);    // 最大下落速度 VERIFY
export const FIREBALL_EXPLODE_FRAMES = 8;    // 爆炸动画帧 VERIFY
export const MAX_FIREBALLS = 2;              // 同屏火球上限 VERIFY
