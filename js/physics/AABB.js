/**
 * 轴对齐包围盒（AABB）重叠检测 —— 子像素精度。
 * 用于实体↔实体交互（踩扁/受伤/壳撞击），见 docs/PERFECT-REPLICA-SPEC.md §5。
 *
 * body 约定：pos(Vec2Fixed 左上角,子像素)、width(像素)、heightSub(子像素高)。
 */
import {fromPixels} from '../core/Fixed.js';

export function overlaps(a, b) {
    const aL = a.pos.x, aR = a.pos.x + fromPixels(a.width), aT = a.pos.y, aB = a.pos.y + a.heightSub;
    const bL = b.pos.x, bR = b.pos.x + fromPixels(b.width), bT = b.pos.y, bB = b.pos.y + b.heightSub;
    return aL < bR && aR > bL && aT < bB && aB > bT;
}
