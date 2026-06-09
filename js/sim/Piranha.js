/**
 * 食人花 —— 从水管定时探出/缩回；玩家在管口附近时不探出；不可踩，只能火球/星星消灭。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.3。
 *
 * 相位循环：hidden（缩在管内）→ rising（升出）→ exposed（探出停留）→ lowering（缩回）→ hidden…
 * hidden 期间若玩家靠近管口则保持缩回（重置计时）。
 *
 * ⚠️ VERIFY：升降速度、停留帧、靠近判定距离待 ROM 校准。
 */
import Vec2Fixed from '../core/Vec2Fixed.js';
import {fromPixels} from '../core/Fixed.js';
import {
    PIRANHA_SPEED, PIRANHA_HIDDEN_FRAMES, PIRANHA_EXPOSED_FRAMES, PIRANHA_NEAR_DIST,
} from './constants.js';

export default class Piranha {
    /**
     * @param {{x:number, pipeTopY:number, width?:number, height?:number}} opts
     *   pipeTopY 管口顶面像素 y；植株在管内时藏于其下。
     */
    constructor({x, pipeTopY, width = 16, height = 24}) {
        this.width = width;
        this.height = height;
        this.heightSub = fromPixels(height);
        this.exposedYSub = fromPixels(pipeTopY - height); // 完全探出（在管口之上）
        this.hiddenYSub = fromPixels(pipeTopY);            // 完全缩回（藏于管内）
        this.pos = new Vec2Fixed(fromPixels(x), this.hiddenYSub);
        this.vx = 0;
        this.vy = 0;
        this.phase = 'hidden';
        this.timer = 0;
        this.state = 'walking'; // 复用「存活」语义；dead 表示被消灭
        this.stompable = false; // 不可踩
    }

    get alive() { return this.state !== 'dead'; }
    get dangerous() { return this.phase !== 'hidden'; }
    get x() { return this.pos.pixelX; }
    get pixelX() { return this.pos.pixelX; }
    get pixelY() { return this.pos.pixelY; }

    /** @param {number} [playerX] 玩家像素 x（用于管口靠近判定） */
    step(playerX = null) {
        if (this.state === 'dead') return;
        const near = playerX != null &&
            Math.abs(playerX - this.pixelX) < PIRANHA_NEAR_DIST;

        switch (this.phase) {
            case 'hidden':
                if (near) { this.timer = 0; break; } // 玩家在管口附近 → 不探出
                if (++this.timer >= PIRANHA_HIDDEN_FRAMES) { this.phase = 'rising'; this.timer = 0; }
                break;
            case 'rising':
                this.pos.y -= PIRANHA_SPEED;
                if (this.pos.y <= this.exposedYSub) { this.pos.y = this.exposedYSub; this.phase = 'exposed'; this.timer = 0; }
                break;
            case 'exposed':
                if (++this.timer >= PIRANHA_EXPOSED_FRAMES) { this.phase = 'lowering'; this.timer = 0; }
                break;
            case 'lowering':
                this.pos.y += PIRANHA_SPEED;
                if (this.pos.y >= this.hiddenYSub) { this.pos.y = this.hiddenYSub; this.phase = 'hidden'; this.timer = 0; }
                break;
        }
    }

    /** 不可踩：踩它的语义由交互层判定为受伤，这里 stomp 不改变状态 */
    stomp() { /* no-op：食人花不可踩 */ }

    die() { this.state = 'dead'; }
}
