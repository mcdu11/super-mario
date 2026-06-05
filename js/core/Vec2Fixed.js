/**
 * 定点二维向量 —— 内部以 raw 子像素整数存储 x/y。
 * 用于实体的 pos / vel，替代原 math.Vec2 的浮点表示。
 * 所有运算保持整数，确保确定性（见 docs/PERFECT-REPLICA-SPEC.md §1）。
 */
import {fromPixels, toPixels} from './Fixed.js';

export default class Vec2Fixed {
    /** @param {number} x raw 子像素 @param {number} y raw 子像素 */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromPixels(px, py) {
        return new Vec2Fixed(fromPixels(px), fromPixels(py));
    }

    /** 以整数像素设置（内部转 raw） */
    setPixels(px, py) {
        this.x = fromPixels(px);
        this.y = fromPixels(py);
        return this;
    }

    /** 直接设置 raw 子像素 */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    /** 渲染用：向下取整的整数像素 */
    get pixelX() {
        return toPixels(this.x);
    }

    get pixelY() {
        return toPixels(this.y);
    }

    /** 就地加另一个向量的 raw 值 */
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /** 就地加 raw 偏移 */
    addRaw(dx, dy) {
        this.x += dx;
        this.y += dy;
        return this;
    }

    copy() {
        return new Vec2Fixed(this.x, this.y);
    }
}
