/**
 * 实体交互解析 —— 玩家↔敌人、敌人↔敌人。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5。
 *
 * 踩扁判定（原版）：玩家正在下落（vy>0）且脚底在敌人竖直中线之上 → 踩扁；
 * 否则侧面接触 → 受伤（或对静止壳 → 踢动）。
 */
import {overlaps} from '../physics/AABB.js';
import {STOMP_BOUNCE, STAR_DURATION} from './constants.js';

/**
 * 解析一次「玩家 vs 单个敌人」。会就地修改敌人状态与玩家 vy（弹起）。
 * @param {object} [opts]
 * @param {boolean} [opts.starActive] 玩家处于星星无敌 → 任何接触秒杀敌人
 * @param {boolean} [opts.invincible] 玩家处于受伤无敌帧 → 侧面接触不受伤
 * @returns {'none'|'stomp'|'kick'|'hurt'|'starkill'}
 */
export function resolvePlayerEnemy(player, enemy, {starActive = false, invincible = false} = {}) {
    if (!enemy.alive || enemy.state === 'squashed') return 'none';
    if (!overlaps(player, enemy)) return 'none';

    // 星星无敌：任意方向接触都秒杀敌人，玩家不受影响
    if (starActive) {
        enemy.die();
        return 'starkill';
    }

    const playerBottom = player.pos.y + player.heightSub;
    const enemyMid = enemy.pos.y + enemy.heightSub / 2;
    const stomping = player.vy > 0 && playerBottom <= enemyMid;

    if (stomping) {
        // 踩在敌人头上：goomba 压扁、koopa 缩壳/停壳，玩家弹起
        enemy.stomp();
        player.vy = -STOMP_BOUNCE;
        return 'stomp';
    }

    // 侧面接触
    if (enemy.state === 'shell') {
        // 静止壳：朝远离玩家的方向踢出
        const dir = player.pos.x < enemy.pos.x ? 1 : -1;
        enemy.kick(dir);
        return 'kick';
    }

    // 受伤无敌帧内：侧面接触不再受伤
    if (invincible) return 'none';

    // 巡逻中的敌人或滑行的壳 → 伤害玩家
    return 'hurt';
}

/**
 * 解析「玩家 vs 道具」拾取。会就地消费道具并应用到 PowerState。
 * @returns {'none'|'mushroom'|'fireflower'|'star'|'oneup'}
 */
export function resolvePlayerPowerUp(player, power, item) {
    if (!item.active) return 'none';
    if (!overlaps(player, item)) return 'none';
    item.state = 'consumed';
    switch (item.kind) {
        case 'mushroom':   power.grow(); return 'mushroom';
        case 'fireflower': power.giveFire(); return 'fireflower';
        case 'star':       power.giveStar(STAR_DURATION); return 'star';
        case 'oneup':      return 'oneup'; // 加命由调用方处理
        default:           return 'none';
    }
}

/**
 * 解析「火球 vs 敌人」。命中则杀敌并引爆火球。
 * @returns {boolean} 是否命中
 */
export function resolveFireballEnemy(fireball, enemy) {
    if (fireball.state !== 'flying') return false;
    if (!enemy.alive || enemy.state === 'squashed') return false;
    if (!overlaps(fireball, enemy)) return false;
    enemy.die();
    fireball.explode();
    return true;
}

/**
 * 解析「滑行的壳 vs 另一敌人」（连杀）。
 * @returns {boolean} 是否击杀了 other
 */
export function resolveShellEnemy(shell, other) {
    if (shell === other) return false;
    if (shell.state !== 'sliding') return false;
    if (!other.alive || other.state === 'squashed') return false;
    if (!overlaps(shell, other)) return false;
    other.die();
    return true;
}
