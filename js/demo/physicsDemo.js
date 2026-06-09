/**
 * 物理沙盒 —— 把 M0–M4b 串起来在画布上跑（见 docs/PERFECT-REPLICA-SPEC.md）。
 *
 * 端到端验证整条链路：定点+帧驱动物理、瓦片碰撞、对象槽位生成、敌人状态机与交互、
 * 变身（小/大/火）、道具（蘑菇/星）、火球、? 砖/砖块顶起。
 * 自包含、不依赖 ROM 资产，也不触碰现有 main.js / 已部署的游戏。
 */
import Clock from '../core/Clock.js';
import TileGrid, {TILE_SIZE, tileIndex} from '../physics/TileGrid.js';
import GridCollider from '../physics/GridCollider.js';
import PlayerMotion from '../physics/PlayerMotion.js';
import {Sides} from '../Entity.js';
import {fromPixels, SUBPIXELS_PER_PIXEL} from '../core/Fixed.js';
import KeyboardButtons from '../input/KeyboardButtons.js';
import {Button, isDown} from '../input/Buttons.js';
import ObjectSlots from '../world/ObjectSlots.js';
import EnemySpawner from '../world/EnemySpawner.js';
import Enemy from '../sim/Enemy.js';
import Piranha from '../sim/Piranha.js';
import PowerState, {SMALL, FIRE} from '../sim/PowerState.js';
import PowerUp from '../sim/PowerUp.js';
import Fireball from '../sim/Fireball.js';
import Block from '../sim/Block.js';
import {MAX_FIREBALLS} from '../sim/constants.js';
import {
    resolvePlayerEnemy, resolveShellEnemy, resolvePlayerPowerUp, resolveFireballEnemy,
} from '../sim/interactions.js';

// 字符画关卡：# 固体、? 问号砖、B 普通砖、. 空。col8/col29 为坑。
const LEVEL = [
    '................................', // 0
    '................................', // 1
    '................................', // 2
    '................................', // 3
    '................................', // 4
    '................................', // 5
    '................................', // 6
    '................................', // 7
    '................................', // 8
    '..........?..B..?...............', // 9  col10 ?(蘑菇/火花), col13 B(砖), col16 ?(星)
    '................................', // 10
    '......................##........', // 11 水管(col22-23)，管口在 row11
    '......................##........', // 12
    '########.####################.##', // 13 地面（col8、col29 坑）
];
const COLS = LEVEL[0].length;
const ROWS = LEVEL.length;
const SCALE = 2;
const GROUND_Y = 13 * TILE_SIZE - 16;
const START = {x: 2 * TILE_SIZE, y: GROUND_Y};
const STAR_COL = 16; // 该 ? 砖出星星，其余出蘑菇/火花

const ENEMIES = [
    {x: 12 * TILE_SIZE, y: GROUND_Y, type: 'goomba'},
    {x: 18 * TILE_SIZE, y: GROUND_Y, type: 'paratroopa'},        // 蹦跳的飞龟
    {x: 20 * TILE_SIZE, y: GROUND_Y, type: 'koopa'},
    {x: 26 * TILE_SIZE, y: GROUND_Y, type: 'koopa', ledgeAware: true}, // 红龟：到 col29 坑边折返
];

const key = (col, row) => `${col},${row}`;

export function startPhysicsDemo(canvas) {
    canvas.width = COLS * TILE_SIZE * SCALE;
    canvas.height = ROWS * TILE_SIZE * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const keyboard = new KeyboardButtons().listenTo(window);
    let grid, collider, blocks, player, power, slots, spawner, powerups, fireballs, piranha;
    let prevB = false;
    let coins = 0, stomps = 0, deaths = 0;

    function reset() {
        grid = new TileGrid(LEVEL.map(l => [...l].map(c => c !== ' ' && c !== '.')));
        collider = new GridCollider(grid);
        blocks = buildBlocks();
        power = new PowerState();
        powerups = [];
        fireballs = [];
        piranha = new Piranha({x: 22 * TILE_SIZE, pipeTopY: 11 * TILE_SIZE});
        player = new PlayerMotion({x: START.x, y: START.y, width: 14, height: 16, world: collider});
        player.obstruct = side => onPlayerObstruct(side);
        slots = new ObjectSlots(5);
        spawner = new EnemySpawner(ENEMIES, {
            slots,
            createEntity: p => new Enemy({type: p.type, x: p.x, y: p.y, collider, dir: -1,
                winged: p.winged, ledgeAware: p.ledgeAware}),
            screenWidth: COLS * TILE_SIZE,
        });
    }

    function buildBlocks() {
        const m = new Map();
        LEVEL.forEach((line, row) => [...line].forEach((ch, col) => {
            if (ch === '?') {
                const b = new Block({kind: 'question', contents: col === STAR_COL ? 'star' : null});
                b.role = col === STAR_COL ? 'star' : 'powerup';
                m.set(key(col, row), b);
            } else if (ch === 'B') {
                m.set(key(col, row), new Block({kind: 'brick'}));
            }
        }));
        return m;
    }

    // 玩家头顶撞到方块 → 顶起
    function onPlayerObstruct(side) {
        if (side !== Sides.TOP) return;
        const cx = player.pos.x + fromPixels(player.width) / 2;
        const col = tileIndex(cx);
        const row = tileIndex(player.pos.y) - 1; // 方块在头顶上一格
        const b = blocks.get(key(col, row));
        if (!b || b.state !== 'idle') return;
        if (b.role === 'powerup') b.contents = power.tier === SMALL ? 'mushroom' : 'fireflower';
        const out = b.bump(power);
        if (out === 'coin') coins++;
        else if (out === 'break') { grid.cells[row][col] = false; blocks.delete(key(col, row)); }
        else if (out === 'bump' || out === 'none') { /* 仅弹动 */ }
        else powerups.push(new PowerUp({kind: out, x: col * TILE_SIZE, y: (row - 1) * TILE_SIZE, collider, dir: 1}));
    }

    reset();

    const clock = new Clock(() => {
        const buttons = keyboard.read();
        player.step(buttons);
        power.update();

        // 火 Mario 按 B 发火球（上升沿，受同屏上限约束）
        const b = isDown(buttons, Button.B);
        if (power.tier === FIRE && b && !prevB && fireballs.length < MAX_FIREBALLS) {
            const fx = player.facing > 0 ? player.pixelX + player.width : player.pixelX - 8;
            fireballs.push(new Fireball({x: fx, y: player.pixelY + 4, dir: player.facing, collider}));
        }
        prevB = b;

        spawner.update(0);

        // 敌人推进 + 掉坑
        for (const [, e] of slots.active()) {
            e.step();
            if (e.pixelY > ROWS * TILE_SIZE + 32) e.die();
        }
        const actives = slots.active().map(([, e]) => e);

        // 滑壳连杀
        for (const shell of actives) {
            if (shell.state !== 'sliding') continue;
            for (const other of actives) resolveShellEnemy(shell, other);
        }

        // 食人花：定时出入水管（玩家靠近则不出）
        piranha.step(player.pixelX);

        // 火球：推进 + 命中敌人/食人花
        for (const f of fireballs) {
            f.step();
            for (const e of actives) resolveFireballEnemy(f, e);
            resolveFireballEnemy(f, piranha);
        }
        fireballs = fireballs.filter(f => f.alive);

        // 道具：推进 + 拾取
        for (const item of powerups) {
            item.step();
            const got = resolvePlayerPowerUp(player, power, item);
            if (got === 'mushroom' || got === 'fireflower') player.setHeight(power.height);
        }
        powerups = powerups.filter(p => p.active);

        // 玩家 × 敌人（含食人花）
        const opts = {starActive: power.starActive, invincible: power.invincible};
        const onHurt = () => {
            const res = power.hurt();
            if (res === 'die') { deaths++; reset(); return true; }
            if (res === 'shrink') player.setHeight(16);
            return false;
        };
        for (const e of actives) {
            const r = resolvePlayerEnemy(player, e, opts);
            if (r === 'stomp') stomps++;
            else if (r === 'hurt' && onHurt()) return;
        }
        if (resolvePlayerEnemy(player, piranha, opts) === 'hurt' && onHurt()) return;

        for (const [i, e] of slots.active()) if (!e.alive) slots.release(i);

        if (player.pixelY > ROWS * TILE_SIZE + 64) { deaths++; reset(); }
    });

    let last = null;
    function frame(now) {
        if (last != null) clock.advance(now - last);
        last = now;
        render(ctx, {grid, blocks, player, power, slots, powerups, fireballs, piranha,
            hud: {frame: clock.frameCount, coins, stomps, deaths}});
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function render(ctx, s) {
    const {grid, blocks, player, power, slots, powerups, fireballs, piranha, hud} = s;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, W, H);

    // 普通固体瓦片（跳过方块格，单独画）
    ctx.fillStyle = '#c84c0c';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let row = 0; row < grid.cells.length; row++) {
        for (let col = 0; col < grid.cells[row].length; col++) {
            if (!grid.isSolid(col, row) || blocks.has(`${col},${row}`)) continue;
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(col * TILE_SIZE + 0.5, row * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
    }

    // 方块
    for (const [k, b] of blocks) {
        const [col, row] = k.split(',').map(Number);
        const x = col * TILE_SIZE, y = row * TILE_SIZE;
        if (b.kind === 'question') ctx.fillStyle = b.state === 'idle' ? '#f8b800' : '#7c5800';
        else ctx.fillStyle = '#c87038';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        if (b.kind === 'question' && b.state === 'idle') {
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText('?', x + 5, y + 12);
        }
    }

    // 道具
    for (const item of powerups) {
        if (item.kind === 'mushroom') ctx.fillStyle = '#e40000';
        else if (item.kind === 'fireflower') ctx.fillStyle = '#f87800';
        else if (item.kind === 'star') ctx.fillStyle = '#fce000';
        else ctx.fillStyle = '#00c000'; // 1up
        ctx.fillRect(item.pixelX, item.pixelY, item.width, item.height);
    }

    // 敌人
    for (const [, e] of slots.active()) {
        if (e.state === 'squashed') {
            ctx.fillStyle = '#888';
            ctx.fillRect(e.pixelX, e.pixelY + e.height - 6, e.width, 6);
            continue;
        }
        if (e.type === 'goomba') ctx.fillStyle = '#a0522d';
        else if (e.ledgeAware) ctx.fillStyle = '#e40000'; // 红龟
        else ctx.fillStyle = (e.state === 'shell' || e.state === 'sliding') ? '#b5a000' : '#38a800';
        ctx.fillRect(e.pixelX, e.pixelY, e.width, e.height);
        if (e.winged) { // 翅膀标记
            ctx.fillStyle = '#fff';
            ctx.fillRect(e.pixelX - 2, e.pixelY + 2, 2, 6);
            ctx.fillRect(e.pixelX + e.width, e.pixelY + 2, 2, 6);
        }
    }

    // 食人花（仅在探出时绘制；缩回则藏于管内）
    if (piranha.alive && piranha.dangerous) {
        ctx.fillStyle = '#2ca02c';
        ctx.fillRect(piranha.pixelX, piranha.pixelY, piranha.width, piranha.height);
    }

    // 火球
    ctx.fillStyle = '#ff8000';
    for (const f of fireballs) ctx.fillRect(f.pixelX, f.pixelY, f.width, f.height);

    // 玩家（体型随变身；星星无敌闪烁；受伤无敌帧半透明）
    let color = power.tier === FIRE ? '#fff' : power.tier > SMALL ? '#e40058' : '#e40058';
    if (power.starActive && (hud.frame >> 2) % 2) color = '#fce000';
    ctx.globalAlpha = power.damageIFrames > 0 && (hud.frame >> 1) % 2 ? 0.4 : 1;
    ctx.fillStyle = color;
    ctx.fillRect(player.pixelX, player.pixelY, player.width, player.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    const eyeX = player.facing > 0 ? player.pixelX + player.width - 4 : player.pixelX + 1;
    ctx.fillRect(eyeX, player.pixelY + 3, 3, 3);

    // HUD
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 300, 84);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    const tierName = power.tier === FIRE ? '火' : power.tier > SMALL ? '大' : '小';
    const vxPx = (player.vx / SUBPIXELS_PER_PIXEL).toFixed(2);
    ctx.fillText(`frame:${hud.frame}  vx:${vxPx}px/f  onGround:${player.onGround}`, 8, 16);
    ctx.fillText(`形态:${tierName}  star:${power.starActive ? Math.ceil(power.starTimer / 60) + 's' : '-'}`, 8, 32);
    ctx.fillText(`coins:${hud.coins}  stomps:${hud.stomps}  deaths:${hud.deaths}`, 8, 48);
    ctx.fillText(`← → 移动  X 跑/火球  Z 跳`, 8, 64);
    ctx.fillText(`顶 ? 砖出蘑菇/火花/星；火形态按 X 发火球`, 8, 78);
}
