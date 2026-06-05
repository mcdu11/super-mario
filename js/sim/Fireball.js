/**
 * 火球投射物 —— 火 Mario 发射。帧驱动定点运动，复用 GridCollider。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.2、§6。
 *
 * 行为：水平高速飞行 + 重力下坠；落地反弹；撞墙即爆；命中敌人即爆并杀敌。
 * 同屏数量上限由调用方（对象槽）限制（MAX_FIREBALLS）。
 *
 * 状态：flying（飞行）/ exploding（爆炸动画）/ dead（移除）
 */
import Vec2Fixed from '../core/Vec2Fixed.js';
import {fromPixels} from '../core/Fixed.js';
import {Sides} from '../Entity.js';
import {
    FIREBALL_SPEED, FIREBALL_GRAVITY, FIREBALL_BOUNCE, FIREBALL_MAX_FALL, FIREBALL_EXPLODE_FRAMES,
} from './constants.js';

export default class Fireball {
    constructor({x, y, dir = 1, collider = null, width = 8, height = 8}) {
        this.pos = Vec2Fixed.fromPixels(x, y);
        this.vx = 0;
        this.vy = 0;
        this.width = width;
        this.height = height;
        this.heightSub = fromPixels(height);
        this.dir = dir;
        this.collider = collider;
        this.onGround = false;
        this.state = 'flying';
        this.explodeTimer = 0;
    }

    get alive() {
        return this.state !== 'dead';
    }

    get x() { return this.pos.pixelX; }
    get pixelX() { return this.pos.pixelX; }
    get pixelY() { return this.pos.pixelY; }

    step() {
        if (this.state === 'dead') return;
        if (this.state === 'exploding') {
            if (--this.explodeTimer <= 0) this.state = 'dead';
            return;
        }

        this.vx = this.dir * FIREBALL_SPEED;
        this.vy += FIREBALL_GRAVITY;
        if (this.vy > FIREBALL_MAX_FALL) this.vy = FIREBALL_MAX_FALL;

        this.pos.x += this.vx;
        if (this.collider) this.collider.collideX(this); // 撞墙 → obstruct → 爆
        if (this.state !== 'flying') return;

        this.pos.y += this.vy;
        if (this.collider) this.collider.collideY(this);
        if (this.onGround) this.vy = -FIREBALL_BOUNCE; // 落地反弹
    }

    obstruct(side) {
        if (side === Sides.LEFT || side === Sides.RIGHT) {
            this.explode(); // 撞墙即爆
        }
    }

    explode() {
        if (this.state === 'flying') {
            this.state = 'exploding';
            this.explodeTimer = FIREBALL_EXPLODE_FRAMES;
            this.vx = 0;
            this.vy = 0;
        }
    }
}
