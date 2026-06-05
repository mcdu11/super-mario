/**
 * 瓦片网格 —— 16×16 像素的固体/空气网格，供定点碰撞查询。
 * 见 docs/PERFECT-REPLICA-SPEC.md §4.5。
 *
 * 仅描述「某格是否固体」；真正的关卡瓦片类型/外观由 world 层提供，
 * 这里只关心碰撞所需的最小信息，便于 headless 测试。
 */
import {SUBPIXELS_PER_PIXEL} from '../core/Fixed.js';

export const TILE_SIZE = 16;                          // 像素
export const TILE_SUB = TILE_SIZE * SUBPIXELS_PER_PIXEL; // 子像素（16*256 = 4096）

/** 子像素坐标 → 瓦片下标（向下取整） */
export function tileIndex(sub) {
    return Math.floor(sub / TILE_SUB);
}

export default class TileGrid {
    /** @param {boolean[][]} cells cells[row][col] 为真表示固体 */
    constructor(cells) {
        this.cells = cells;
    }

    /**
     * 用字符画构建：非「空格 / .」的字符视为固体。便于测试可读地铺关卡。
     * @param {string[]} lines
     */
    static fromStrings(lines) {
        return new TileGrid(lines.map(line =>
            [...line].map(ch => ch !== ' ' && ch !== '.')));
    }

    isSolid(col, row) {
        if (row < 0 || row >= this.cells.length) return false;
        const r = this.cells[row];
        if (col < 0 || col >= r.length) return false;
        return !!r[col];
    }
}
