/**
 * 物理沙盒 —— 把 M0–M3 串起来在画布上跑（见 docs/PERFECT-REPLICA-SPEC.md）。
 *
 * 目的：用真实键盘输入肉眼验证整条链路：定点+帧驱动物理、瓦片碰撞、
 * 对象槽位生成、敌人状态机与交互（踩扁/踢壳连杀/受伤重生）。
 * 自包含、不依赖 ROM 资产，也不触碰现有 main.js / 已部署的游戏。
 */
import Clock from '../core/Clock.js';
import TileGrid, {TILE_SIZE} from '../physics/TileGrid.js';
import GridCollider from '../physics/GridCollider.js';
import PlayerMotion from '../physics/PlayerMotion.js';
import KeyboardButtons from '../input/KeyboardButtons.js';
import ObjectSlots from '../world/ObjectSlots.js';
import EnemySpawner from '../world/EnemySpawner.js';
import Enemy from '../sim/Enemy.js';
import {resolvePlayerEnemy, resolveShellEnemy} from '../sim/interactions.js';
import {SUBPIXELS_PER_PIXEL} from '../core/Fixed.js';

// 字符画关卡（# = 固体）。32 列 × 14 行，每格 16px。col8、col19 为坑。
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
    '########.##########.############', // 13 地面（col8、col19 处两个坑）
];

const COLS = LEVEL[0].length;
const ROWS = LEVEL.length;
const SCALE = 2;
const GROUND_Y = 13 * TILE_SIZE - 16; // 敌人/玩家站在地面上的 y

const START = {x: 2 * TILE_SIZE, y: GROUND_Y};

// 敌人放置（像素 x）。放在 col9–18 的平台上，玩家需跳过 col8 的坑才能接触。
const ENEMIES = [
    {x: 10 * TILE_SIZE, y: GROUND_Y, type: 'koopa'},
    {x: 13 * TILE_SIZE, y: GROUND_Y, type: 'goomba'},
    {x: 16 * TILE_SIZE, y: GROUND_Y, type: 'goomba'},
    {x: 25 * TILE_SIZE, y: GROUND_Y, type: 'goomba'},
];

export function startPhysicsDemo(canvas) {
    canvas.width = COLS * TILE_SIZE * SCALE;
    canvas.height = ROWS * TILE_SIZE * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = TileGrid.fromStrings(LEVEL);
    const collider = new GridCollider(grid);
    const keyboard = new KeyboardButtons().listenTo(window);

    let player, slots, spawner;
    let stomps = 0, deaths = 0;

    function reset() {
        player = new PlayerMotion({x: START.x, y: START.y, width: 14, height: 16, world: collider});
        slots = new ObjectSlots(5);
        spawner = new EnemySpawner(ENEMIES, {
            slots,
            createEntity: p => new Enemy({type: p.type, x: p.x, y: p.y, collider, dir: -1}),
            screenWidth: COLS * TILE_SIZE, // 关卡不滚动：一次性生成全部
        });
    }
    reset();

    const clock = new Clock(() => {
        player.step(keyboard.read());
        spawner.update(0); // 镜头固定在 0

        // 敌人推进 + 掉坑判定
        for (const [, e] of slots.active()) {
            e.step();
            if (e.pixelY > ROWS * TILE_SIZE + 32) e.die();
        }

        const actives = slots.active().map(([, e]) => e);

        // 敌人↔敌人：滑行壳连杀
        for (const shell of actives) {
            if (shell.state !== 'sliding') continue;
            for (const other of actives) resolveShellEnemy(shell, other);
        }

        // 玩家↔敌人
        for (const e of actives) {
            const r = resolvePlayerEnemy(player, e);
            if (r === 'stomp') stomps++;
            else if (r === 'hurt') { deaths++; reset(); return; }
        }

        // 清理死亡槽
        for (const [i, e] of slots.active()) if (!e.alive) slots.release(i);

        // 掉坑 → 重生
        if (player.pixelY > ROWS * TILE_SIZE + 64) { deaths++; reset(); }
    });

    let last = null;
    function frame(now) {
        if (last != null) clock.advance(now - last);
        last = now;
        render(ctx, grid, player, slots, {frame: clock.frameCount, stomps, deaths});
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function render(ctx, grid, player, slots, hud) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, W, H);

    // 瓦片
    ctx.fillStyle = '#c84c0c';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let row = 0; row < grid.cells.length; row++) {
        for (let col = 0; col < grid.cells[row].length; col++) {
            if (!grid.isSolid(col, row)) continue;
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(col * TILE_SIZE + 0.5, row * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
    }

    // 敌人
    for (const [, e] of slots.active()) {
        if (e.state === 'squashed') {
            ctx.fillStyle = '#888';
            ctx.fillRect(e.pixelX, e.pixelY + e.height - 6, e.width, 6); // 压扁
            continue;
        }
        if (e.type === 'goomba') ctx.fillStyle = '#a0522d';
        else ctx.fillStyle = (e.state === 'shell' || e.state === 'sliding') ? '#b5a000' : '#38a800';
        ctx.fillRect(e.pixelX, e.pixelY, e.width, e.height);
    }

    // 玩家
    ctx.fillStyle = player.onGround ? '#e40058' : '#fc7460';
    ctx.fillRect(player.pixelX, player.pixelY, player.width, player.height);
    ctx.fillStyle = '#fff';
    const eyeX = player.facing > 0 ? player.pixelX + player.width - 4 : player.pixelX + 1;
    ctx.fillRect(eyeX, player.pixelY + 3, 3, 3);

    // HUD
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 260, 80);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    const vxPx = (player.vx / SUBPIXELS_PER_PIXEL).toFixed(3);
    const vyPx = (player.vy / SUBPIXELS_PER_PIXEL).toFixed(3);
    ctx.fillText(`frame: ${hud.frame}`, 8, 16);
    ctx.fillText(`vx: ${vxPx}  vy: ${vyPx}  px/f`, 8, 32);
    ctx.fillText(`onGround: ${player.onGround}  stomps: ${hud.stomps}  deaths: ${hud.deaths}`, 8, 48);
    ctx.fillText(`← → 移动  X 跑  Z 跳`, 8, 64);
    ctx.fillText(`跳过坑去踩敌人；踩绿龟得壳，侧踢→连杀`, 8, 76);
}
