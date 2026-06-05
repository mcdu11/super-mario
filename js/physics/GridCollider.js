/**
 * 定点瓦片碰撞器 —— 分轴解析（先 X 后 Y），子像素精度。
 * 见 docs/PERFECT-REPLICA-SPEC.md §4.5。
 *
 * 沿用原版/教程引擎的「分轴」思路（与现有 js/TileCollider 一致），但：
 * - 全程整数子像素，结果确定；
 * - 把碰撞结果通过 body.obstruct(side) 回报，便于上层（跳跃取消、踩敌等）响应；
 * - onGround 仅在「向下且接触底部固体」时为真。
 *
 * body 约定（鸭子类型）：
 *   pos: Vec2Fixed（左上角，子像素）
 *   vx, vy: 子像素/帧
 *   width: 像素宽
 *   heightSub: 子像素高
 *   onGround: boolean（由本碰撞器写入）
 *   obstruct?(side): 可选回调
 *
 * ⚠️ VERIFY：原版还有「corner correction」（贴角微调）等细节，留待对照
 * 反汇编校准；当前为干净的固体轴分离解析。
 */
import {fromPixels} from '../core/Fixed.js';
import {Sides} from '../Entity.js';
import {TILE_SUB, tileIndex} from './TileGrid.js';

export default class GridCollider {
    constructor(grid) {
        this.grid = grid;
    }

    /** 在 pos.x 已按 vx 推进后调用：把前导竖直边推出固体。 */
    collideX(body) {
        if (body.vx === 0) return;
        const widthSub = fromPixels(body.width);
        const top = body.pos.y;
        const bottom = body.pos.y + body.heightSub;
        const rowTop = tileIndex(top);
        const rowBottom = tileIndex(bottom - 1); // 含右下角，避免抓到下一行

        // 前导边所在列：右移看右边缘的最后一个像素，左移看左边缘
        const edge = body.vx > 0 ? body.pos.x + widthSub - 1 : body.pos.x;
        const col = tileIndex(edge);

        for (let row = rowTop; row <= rowBottom; row++) {
            if (!this.grid.isSolid(col, row)) continue;
            if (body.vx > 0) {
                body.pos.x = col * TILE_SUB - widthSub; // 右边缘贴到该格左沿
                body.vx = 0;
                body.obstruct && body.obstruct(Sides.RIGHT);
            } else {
                body.pos.x = (col + 1) * TILE_SUB;      // 左边缘贴到该格右沿
                body.vx = 0;
                body.obstruct && body.obstruct(Sides.LEFT);
            }
            return;
        }
    }

    /** 在 pos.y 已按 vy 推进后调用：把前导水平边推出固体，并更新 onGround。 */
    collideY(body) {
        body.onGround = false;
        if (body.vy === 0) return;
        const widthSub = fromPixels(body.width);
        const left = body.pos.x;
        const right = body.pos.x + widthSub;
        const colLeft = tileIndex(left);
        const colRight = tileIndex(right - 1);

        if (body.vy > 0) {
            const row = tileIndex(body.pos.y + body.heightSub - 1); // 脚底
            for (let col = colLeft; col <= colRight; col++) {
                if (!this.grid.isSolid(col, row)) continue;
                body.pos.y = row * TILE_SUB - body.heightSub; // 落到该格上沿
                body.vy = 0;
                body.onGround = true;
                body.obstruct && body.obstruct(Sides.BOTTOM);
                return;
            }
        } else {
            const row = tileIndex(body.pos.y); // 头顶
            for (let col = colLeft; col <= colRight; col++) {
                if (!this.grid.isSolid(col, row)) continue;
                body.pos.y = (row + 1) * TILE_SUB; // 顶到该格下沿
                body.vy = 0;
                body.obstruct && body.obstruct(Sides.TOP);
                return;
            }
        }
    }
}
