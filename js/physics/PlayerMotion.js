/**
 * Mario 帧驱动定点物理 —— M1 垂直切片（见 docs/PERFECT-REPLICA-SPEC.md §4）。
 *
 * 纯逻辑、无 DOM、无渲染：每帧 step(buttons) 推进一帧，状态全为整数子像素，
 * 因此完全确定（同输入序列 → 同轨迹，可逐帧 diff、可回放）。
 *
 * 本切片用「单一水平地面」近似碰撞，专注还原移动/跳跃手感；
 * 真正的子像素瓦片碰撞在 M2 接入（届时 groundTop 由瓦片决定）。
 */
import Vec2Fixed from '../core/Vec2Fixed.js';
import {fromPixels} from '../core/Fixed.js';
import {Button, isDown} from '../input/Buttons.js';
import {
    MAX_WALK_SPEED, MAX_RUN_SPEED,
    WALK_ACCEL, RUN_ACCEL, RELEASE_FRICTION, SKID_DECEL,
    RUN_TIMER_FRAMES,
    JUMP_INITIAL, GRAVITY_HOLD, GRAVITY_FALL, MAX_FALL_SPEED,
    jumpBucket,
} from './constants.js';

export default class PlayerMotion {
    constructor({x = 32, y = 184, width = 14, height = 16, groundTop = 200, world = null} = {}) {
        this.pos = Vec2Fixed.fromPixels(x, y); // 左上角，子像素
        this.vx = 0; // 子像素/帧
        this.vy = 0;
        this.width = width;
        this.height = height;
        this.heightSub = fromPixels(height);
        this.groundTopSub = fromPixels(groundTop); // 地面顶面 Y（子像素，仅扁平回退用）
        this.world = world; // 碰撞器（GridCollider）；为 null 时退化为单一水平地面

        this.onGround = world ? false : (this.pos.y + this.heightSub >= this.groundTopSub);
        this.facing = 1;        // 1 右 / -1 左
        this.runningTimer = 0;  // 松开 B 后维持跑速的宽限帧
        this.jumpFallBucket = 0;// 本次跳跃使用的重力档位
        this._prevJump = false; // 上一帧 A 键，用于检测「刚按下」边沿
    }

    /** 推进一帧。@param {number} buttons 当帧按钮位掩码 */
    step(buttons) {
        const left  = isDown(buttons, Button.LEFT);
        const right = isDown(buttons, Button.RIGHT);
        const running = isDown(buttons, Button.B);
        const jump = isDown(buttons, Button.A);

        let dir = 0;
        if (right && !left) dir = 1;
        else if (left && !right) dir = -1;

        // ── 跑步宽限计时（RunningTimer）：按住 B 且在移动时充满，否则递减 ──
        if (running && this.vx !== 0) this.runningTimer = RUN_TIMER_FRAMES;
        else if (this.runningTimer > 0) this.runningTimer -= 1;
        const cap = (running || this.runningTimer > 0) ? MAX_RUN_SPEED : MAX_WALK_SPEED;

        // ── 水平：加速 / 转身急停 / 释放摩擦 ──
        if (dir !== 0) {
            this.facing = dir;
            const opposing = (this.vx > 0 && dir < 0) || (this.vx < 0 && dir > 0);
            if (opposing) {
                // 转身：用更大的减速把速度拉向 0（skid）
                this.vx += SKID_DECEL * dir;
            } else {
                this.vx += (running ? RUN_ACCEL : WALK_ACCEL) * dir;
            }
        } else if (this.vx !== 0) {
            // 无方向输入：摩擦减速向 0
            const f = Math.min(Math.abs(this.vx), RELEASE_FRICTION);
            this.vx += this.vx > 0 ? -f : f;
        }

        // 速度上限：超过当前 cap 时按摩擦平滑收敛（从跑速降到走速）
        if (Math.abs(this.vx) > cap) {
            const over = Math.abs(this.vx) - cap;
            const reduce = Math.min(over, RELEASE_FRICTION);
            this.vx += this.vx > 0 ? -reduce : reduce;
            // 仍按住方向且未在转身时，硬钳到 cap，避免抖动
            if (Math.abs(this.vx) > cap && dir !== 0) {
                this.vx = (this.vx > 0 ? 1 : -1) * cap;
            }
        }

        // ── 跳跃起跳（仅在地面 + A 键上升沿）──
        if (jump && !this._prevJump && this.onGround) {
            const b = jumpBucket(Math.abs(this.vx));
            this.jumpFallBucket = b;
            this.vy = -JUMP_INITIAL[b];
            this.onGround = false;
        }

        // ── 重力（每帧施加；上升且按住 A 用弱重力，否则强重力 = 可变跳高）──
        // 落地状态由碰撞解析负责重新判定，故此处不再用 onGround 门控。
        {
            const b = this.jumpFallBucket;
            const g = (jump && this.vy < 0) ? GRAVITY_HOLD[b] : GRAVITY_FALL[b];
            this.vy += g;
            if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;
        }

        // ── 分轴积分 + 碰撞解析（先 X 后 Y）──
        this.pos.x += this.vx;
        this._collideX();
        this.pos.y += this.vy;
        this._collideY();

        this._prevJump = jump;
    }

    _collideX() {
        if (this.world) {
            this.world.collideX(this);
        }
        // 扁平回退：无墙，X 不处理
    }

    _collideY() {
        if (this.world) {
            this.world.collideY(this);
            return;
        }
        // 扁平回退：单一水平地面
        this.onGround = false;
        if (this.pos.y + this.heightSub >= this.groundTopSub) {
            this.pos.y = this.groundTopSub - this.heightSub;
            this.vy = 0;
            this.onGround = true;
        }
    }

    /** 渲染用整数像素坐标 */
    get pixelX() { return this.pos.pixelX; }
    get pixelY() { return this.pos.pixelY; }

    /** 快照（用于确定性比对/调试） */
    snapshot() {
        return {x: this.pos.x, y: this.pos.y, vx: this.vx, vy: this.vy, onGround: this.onGround};
    }
}
