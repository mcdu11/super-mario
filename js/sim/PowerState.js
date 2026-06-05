/**
 * 玩家变身状态机 —— 小 / 大 / 火 三态 + 受伤降级 + 无敌帧 + 星星无敌。
 * 见 docs/PERFECT-REPLICA-SPEC.md §0.1、§5。
 *
 * 原版规则：
 * - 蘑菇：小→大；已是大/火则仅得分（状态不变）。
 * - 火花：→火（大体型）。
 * - 受伤：任何「带能力」态（大/火）被击中 → 直接变小 + 一段无敌帧；小态被击中 → 死亡。
 *   （SMB1 没有「火→大」的中间步，一击即回小。）
 * - 星星：一段时间无敌，期间接触敌人即秒杀、自身不受伤。
 */
import {DAMAGE_IFRAMES, STAR_DURATION} from './constants.js';

export const SMALL = 0;
export const SUPER = 1;
export const FIRE = 2;

export default class PowerState {
    constructor() {
        this.tier = SMALL;
        this.damageIFrames = 0;
        this.starTimer = 0;
        this.dead = false;
    }

    /** 体型高度（小 16 / 大·火 32 像素） */
    get height() {
        return this.tier === SMALL ? 16 : 32;
    }

    get starActive() {
        return this.starTimer > 0;
    }

    /** 当前是否免疫伤害（受伤无敌帧或星星无敌） */
    get invincible() {
        return this.starTimer > 0 || this.damageIFrames > 0;
    }

    /** 吃蘑菇 @returns {'grow'|'none'} */
    grow() {
        if (this.tier === SMALL) {
            this.tier = SUPER;
            return 'grow';
        }
        return 'none'; // 已是大/火，仅得分
    }

    /** 吃火花 @returns {'fire'|'none'} */
    giveFire() {
        if (this.tier < FIRE) {
            this.tier = FIRE;
            return 'fire';
        }
        return 'none';
    }

    /** 吃星星 */
    giveStar(duration = STAR_DURATION) {
        this.starTimer = duration;
    }

    /**
     * 被敌人/危险物击中。
     * @returns {'none'|'shrink'|'die'}
     */
    hurt() {
        if (this.invincible) return 'none';
        if (this.tier > SMALL) {
            this.tier = SMALL;
            this.damageIFrames = DAMAGE_IFRAMES;
            return 'shrink';
        }
        this.dead = true;
        return 'die';
    }

    /** 每帧推进：递减计时器 */
    update() {
        if (this.damageIFrames > 0) this.damageIFrames--;
        if (this.starTimer > 0) this.starTimer--;
    }
}
