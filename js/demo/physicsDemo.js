/**
 * 物理沙盒 —— 把 M0–M2 串起来在画布上跑（见 docs/PERFECT-REPLICA-SPEC.md）。
 *
 * 目的：用真实键盘输入肉眼验证「定点 + 帧驱动」物理的手感（走/跑/转身/可变跳高、
 * 瓦片碰撞）。自包含、不依赖 ROM 资产，也不触碰现有 main.js / 已部署的游戏。
 *
 * 逻辑严格按固定游戏帧推进（Clock，无 deltaTime）；渲染每次 rAF 都画当前状态。
 */
import Clock from '../core/Clock.js';
import TileGrid, {TILE_SIZE} from '../physics/TileGrid.js';
import GridCollider from '../physics/GridCollider.js';
import PlayerMotion from '../physics/PlayerMotion.js';
import KeyboardButtons from '../input/KeyboardButtons.js';
import {SUBPIXELS_PER_PIXEL} from '../core/Fixed.js';

// 字符画关卡（# = 固体）。32 列 × 14 行，每格 16px。
const LEVEL = [
    '................................', // 0
    '................................', // 1
    '................................', // 2
    '..........######................', // 3  浮空平台
    '................................', // 4
    '.....####.......................', // 5  高台
    '................................', // 6
    '....................######......', // 7  可在下方顶头的天花板
    '................................', // 8
    '.................###............', // 9
    '...............#................', // 10
    '...............#................', // 11 立柱（撞墙用）
    '...............#................', // 12
    '########.##########.############', // 13 地面（col8、col18 处两个坑）
];

const COLS = LEVEL[0].length;
const ROWS = LEVEL.length;
const SCALE = 2;

const START = {x: 2 * TILE_SIZE, y: 13 * TILE_SIZE - 16}; // 站在最左地面上

export function startPhysicsDemo(canvas) {
    canvas.width = COLS * TILE_SIZE * SCALE;
    canvas.height = ROWS * TILE_SIZE * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = TileGrid.fromStrings(LEVEL);
    const collider = new GridCollider(grid);

    let player = makePlayer(collider);
    const keyboard = new KeyboardButtons().listenTo(window);

    const clock = new Clock(() => {
        player.step(keyboard.read());
        // 掉出关卡 → 重生
        if (player.pixelY > ROWS * TILE_SIZE + 64) {
            player = makePlayer(collider);
        }
    });

    let last = null;
    function frame(now) {
        if (last != null) clock.advance(now - last);
        last = now;
        render(ctx, grid, player, clock.frameCount);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function makePlayer(collider) {
    return new PlayerMotion({x: START.x, y: START.y, width: 14, height: 16, world: collider});
}

function render(ctx, grid, player, frameCount) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    // 背景
    ctx.fillStyle = '#5c94fc'; // 经典天空蓝
    ctx.fillRect(0, 0, W, H);

    // 瓦片
    ctx.fillStyle = '#c84c0c';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let row = 0; row < grid.cells.length; row++) {
        for (let col = 0; col < grid.cells[row].length; col++) {
            if (!grid.isSolid(col, row)) continue;
            const x = col * TILE_SIZE, y = row * TILE_SIZE;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
    }

    // 玩家
    ctx.fillStyle = player.onGround ? '#e40058' : '#fc7460';
    ctx.fillRect(player.pixelX, player.pixelY, player.width, player.height);
    // 朝向小标记
    ctx.fillStyle = '#fff';
    const eyeX = player.facing > 0 ? player.pixelX + player.width - 4 : player.pixelX + 1;
    ctx.fillRect(eyeX, player.pixelY + 3, 3, 3);

    // HUD（不缩放，画在左上）
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 230, 64);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    const vxPx = (player.vx / SUBPIXELS_PER_PIXEL).toFixed(3);
    const vyPx = (player.vy / SUBPIXELS_PER_PIXEL).toFixed(3);
    ctx.fillText(`frame: ${frameCount}`, 8, 16);
    ctx.fillText(`vx: ${vxPx} px/f   vy: ${vyPx} px/f`, 8, 32);
    ctx.fillText(`onGround: ${player.onGround}  facing: ${player.facing > 0 ? '→' : '←'}`, 8, 48);
    ctx.fillText(`← → 移动  X 跑  Z 跳`, 8, 60);
}
