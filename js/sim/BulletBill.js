/**
 * 子弹比尔 —— 水平匀速直飞，无视重力与墙体（穿墙飞行）；可被踩死。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.3。
 *
 * 出屏由对象槽/调用方回收。
 */
import Vec2Fixed from '../core/Vec2Fixed.js';
import {fromPixels} from '../core/Fixed.js';
import {BULLET_SPEED} from './constants.js';

export default class BulletBill {
    constructor({x, y, dir = -1, width = 16, height = 14}) {
        this.pos = Vec2Fixed.fromPixels(x, y);
        this.dir = dir;
        this.vx = dir * BULLET_SPEED;
        this.vy = 0;
        this.width = width;
        this.height = height;
        this.heightSub = fromPixels(height);
        this.onGround = false;
        this.state = 'flying'; // 'flying' | 'dead'
        this.stompable = true;
    }

    get alive() { return this.state !== 'dead'; }
    get dangerous() { return this.state === 'flying'; }
    get x() { return this.pos.pixelX; }
    get pixelX() { return this.pos.pixelX; }
    get pixelY() { return this.pos.pixelY; }

    step() {
        if (this.state === 'dead') return;
        this.pos.x += this.dir * BULLET_SPEED; // 匀速直飞，不受重力/墙体影响
    }

    stomp() { this.state = 'dead'; } // 被踩即消灭

    die() { this.state = 'dead'; }
}
