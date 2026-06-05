/**
 * 实体交互解析 —— 玩家↔敌人、敌人↔敌人。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5。
 *
 * 踩扁判定（原版）：玩家正在下落（vy>0）且脚底在敌人竖直中线之上 → 踩扁；
 * 否则侧面接触 → 受伤（或对静止壳 → 踢动）。
 */
import {overlaps} from '../physics/AABB.js';
import {STOMP_BOUNCE} from './constants.js';

/**
 * 解析一次「玩家 vs 单个敌人」。会就地修改敌人状态与玩家 vy（弹起）。
 * @returns {'none'|'stomp'|'kick'|'hurt'}
 *   stomp 踩扁/缩壳/停壳；kick 踢动静止壳；hurt 玩家受伤；none 无交互
 */
export function resolvePlayerEnemy(player, enemy) {
    if (!enemy.alive || enemy.state === 'squashed') return 'none';
    if (!overlaps(player, enemy)) return 'none';

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

    // 巡逻中的敌人或滑行的壳 → 伤害玩家
    return 'hurt';
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
