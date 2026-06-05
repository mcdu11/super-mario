/**
 * 道具实体 —— 蘑菇 / 火花 / 星星 / 1up。帧驱动定点运动，复用 GridCollider。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.2。
 *
 * 运动：
 *   mushroom / oneup —— 像敌人一样行走（撞墙折返）+ 重力
 *   star            —— 行走 + 落地反弹（持续蹦跳）
 *   fireflower      —— 静止
 *
 * ⚠️ VERIFY：原版道具从砖块「缓缓升出」的过场、精确速度待后续/ROM 校准。
 */
import Vec2Fixed from '../core/Vec2Fixed.js';
import {fromPixels} from '../core/Fixed.js';
import {Sides} from '../Entity.js';
import {POWERUP_WALK_SPEED, ENEMY_GRAVITY, ENEMY_MAX_FALL, STAR_BOUNCE} from './constants.js';

export default class PowerUp {
    constructor({kind, x, y, collider = null, dir = 1, width = 16, height = 16}) {
        this.kind = kind; // 'mushroom' | 'fireflower' | 'star' | 'oneup'
        this.pos = Vec2Fixed.fromPixels(x, y);
        this.vx = 0;
        this.vy = 0;
        this.width = width;
        this.height = height;
        this.heightSub = fromPixels(height);
        this.collider = collider;
        this.dir = dir;
        this.onGround = false;
        this.state = 'active'; // 'active' | 'consumed'
    }

    get active() {
        return this.state === 'active';
    }

    get x() {
        return this.pos.pixelX;
    }

    get pixelX() { return this.pos.pixelX; }
    get pixelY() { return this.pos.pixelY; }

    step() {
        if (this.state !== 'active') return;
        if (this.kind === 'fireflower') return; // 静止

        this.vx = this.dir * POWERUP_WALK_SPEED;
        this.vy += ENEMY_GRAVITY;
        if (this.vy > ENEMY_MAX_FALL) this.vy = ENEMY_MAX_FALL;

        this.pos.x += this.vx;
        if (this.collider) this.collider.collideX(this);
        this.pos.y += this.vy;
        if (this.collider) this.collider.collideY(this);

        // 星星落地反弹
        if (this.kind === 'star' && this.onGround) {
            this.vy = -STAR_BOUNCE;
        }
    }

    obstruct(side) {
        if (side === Sides.LEFT || side === Sides.RIGHT) {
            this.dir = -this.dir;
        }
    }
}
