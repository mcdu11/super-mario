/**
 * 帧驱动时钟 —— 复刻 NES 的「逐帧推进、无 deltaTime」时基。
 * 见 docs/PERFECT-REPLICA-SPEC.md §1、§3.1。
 *
 * 关键点：
 * - 逻辑严格按固定的「游戏帧」离散推进；update 回调只拿到 frameCount，拿不到 deltaTime。
 *   这保证相同输入序列 → 相同状态（确定性，可回放、可逐帧 diff）。
 * - 真实时间只用来决定「这一拍要补跑几帧」（catch-up），不参与物理数值。
 * - advance() 把累加/步进逻辑独立出来，便于在 Node 下不依赖 rAF 做单元测试。
 */

// NES NTSC 实际帧率（PPU 每场），不是整 60。
export const FPS = 60.0988;
export const FRAME_MS = 1000 / FPS;

export default class Clock {
    /**
     * @param {(frameCount:number)=>void} update 每一游戏帧调用一次
     * @param {{maxCatchUp?:number}} [opts]
     */
    constructor(update, {maxCatchUp = 5} = {}) {
        this.update = update;
        this.frameCount = 0;
        this.accumulator = 0; // 毫秒，未消化的真实时间
        this.maxCatchUp = maxCatchUp; // 单拍最多补跑帧数，防「死亡螺旋」
        this.running = false;
        this._lastTime = null;
        this._rafId = null;
        this._loop = this._loop.bind(this);
    }

    /** 确定性单步：推进恰好一帧。测试与逐帧比对用。 */
    step() {
        this.update(this.frameCount);
        this.frameCount += 1;
    }

    /**
     * 消化 elapsedMs 真实时间，按固定帧步进若干帧。
     * @returns {number} 本次实际步进的帧数
     */
    advance(elapsedMs) {
        this.accumulator += elapsedMs;
        let stepped = 0;
        while (this.accumulator >= FRAME_MS && stepped < this.maxCatchUp) {
            this.step();
            this.accumulator -= FRAME_MS;
            stepped += 1;
        }
        // 落后过多（卡顿/切后台回来）时丢弃积压，避免一次补跑成百上千帧。
        if (stepped >= this.maxCatchUp) {
            this.accumulator = 0;
        }
        return stepped;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this._lastTime = null;
        this._rafId = requestAnimationFrame(this._loop);
    }

    stop() {
        this.running = false;
        if (this._rafId != null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _loop(now) {
        if (!this.running) return;
        if (this._lastTime != null) {
            this.advance(now - this._lastTime);
        }
        this._lastTime = now;
        this._rafId = requestAnimationFrame(this._loop);
    }
}
