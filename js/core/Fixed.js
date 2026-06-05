/**
 * 定点数（子像素）工具 —— 复刻 NES SMB1 的坐标表示。
 *
 * 为什么需要它（见 docs/PERFECT-REPLICA-SPEC.md §1、§4.1）：
 * 原版不是用浮点 + deltaTime，而是用「整数像素 + 子像素累加器」做逐帧整数积分，
 * 因此完全确定。原版每个坐标轴有一个 1/256 像素的小数累加器（*_MoveForce）。
 * 这里把「子像素整数」作为唯一真值（raw），渲染时再向下取整成像素。
 *
 * 约定：1 像素 = 256 子像素（8 位小数，对应原版 MoveForce 的 1/256）。
 * 注意：速度（X_Speed 等）在原版里是另一套单位（约 1/16 px/帧），其与位置的
 * 精确换算/移动例程留到 M1 按反汇编 MoveObjectHorizontally 钉死，这里只负责
 * 「位置的定点表示与进位」这一层通用机制。
 */

export const SUBPIXEL_BITS = 8;
export const SUBPIXELS_PER_PIXEL = 1 << SUBPIXEL_BITS; // 256

/** 整数像素 → raw 子像素 */
export function fromPixels(px) {
    return Math.trunc(px) * SUBPIXELS_PER_PIXEL;
}

/**
 * raw 子像素 → 整数像素（向下取整，渲染用）。
 * 用 Math.floor 而非位移，保证负坐标也是数学意义上的向下取整，
 * 且不受 32 位位移溢出影响。
 */
export function toPixels(raw) {
    return Math.floor(raw / SUBPIXELS_PER_PIXEL);
}

/** raw 的子像素小数部分，恒为 [0, 256)（负数也归一到正区间） */
export function frac(raw) {
    return ((raw % SUBPIXELS_PER_PIXEL) + SUBPIXELS_PER_PIXEL) % SUBPIXELS_PER_PIXEL;
}
