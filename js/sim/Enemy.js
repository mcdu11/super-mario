/**
 * 敌人状态机 + 帧驱动定点运动（Goomba / Koopa）。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.2、§5.3。
 *
 * 状态：
 *   walking  巡逻（撞墙折返）
 *   shell    缩进龟壳、静止（仅 koopa）
 *   sliding  被踢动的龟壳，高速滑行、撞墙折返、可连杀
 *   squashed 被踩扁（goomba），停留若干帧后移除
 *   dead     已移除（被滑壳撞死/掉出等）
 *
 * 运动复用 GridCollider（注入），撞墙经 obstruct(side) 折返。
 */
import Vec2Fixed from '../core/Vec2Fixed.js';
import {fromPixels} from '../core/Fixed.js';
import {tileIndex} from '../physics/TileGrid.js';
import {Sides} from '../Entity.js';
import {
    ENEMY_WALK_SPEED, SHELL_SLIDE_SPEED, ENEMY_GRAVITY, ENEMY_MAX_FALL, SQUASH_FRAMES,
    PARATROOPA_HOP,
} from './constants.js';

export default class Enemy {
    constructor({type, x, y, collider = null, width = 16, height = 16, dir = -1,
                 winged = false, ledgeAware = false} = {}) {
        // 'paratroopa' = 带翅膀的 koopa
        this.winged = winged || type === 'paratroopa';
        this.type = type === 'paratroopa' ? 'koopa' : type; // 'goomba' | 'koopa'
        this.ledgeAware = ledgeAware; // 红龟：不走下悬崖
        this.pos = Vec2Fixed.fromPixels(x, y);
        this.vx = 0;
        this.vy = 0;
        this.width = width;
        this.height = height;
        this.heightSub = fromPixels(height);
        this.collider = collider;
        this.dir = dir;           // -1 左 / 1 右
        this.onGround = false;
        this.state = 'walking';
        this.squashTimer = 0;
        this.stompable = true; // goomba/koopa 可被踩（食人花/刺猬等为 false）
    }

    get alive() {
        return this.state !== 'dead';
    }

    /** 当前是否会从侧面伤害玩家（巡逻中或滑行的壳） */
    get dangerous() {
        return this.state === 'walking' || this.state === 'sliding';
    }

    /** 当前像素 x（供出屏回收等使用，与 ObjectSlots/EnemySpawner 约定一致） */
    get x() {
        return this.pos.pixelX;
    }

    get pixelX() {
        return this.pos.pixelX;
    }

    get pixelY() {
        return this.pos.pixelY;
    }

    step() {
        if (this.state === 'dead') return;
        if (this.state === 'squashed') {
            this.vx = 0;
            if (--this.squashTimer <= 0) this.state = 'dead';
            return;
        }

        // 红龟：将走下悬崖前折返（脚下前方一格无固体则掉头）
        if (this.state === 'walking' && this.ledgeAware && this.onGround && this.collider) {
            const centerCol = tileIndex(this.pos.x + fromPixels(this.width) / 2);
            const footRow = tileIndex(this.pos.y + this.heightSub); // 脚下那一行
            if (!this.collider.grid.isSolid(centerCol + this.dir, footRow)) {
                this.dir = -this.dir;
            }
        }

        // 水平速度由状态决定
        if (this.state === 'walking') this.vx = this.dir * ENEMY_WALK_SPEED;
        else if (this.state === 'sliding') this.vx = this.dir * SHELL_SLIDE_SPEED;
        else this.vx = 0; // shell idle

        // 重力
        this.vy += ENEMY_GRAVITY;
        if (this.vy > ENEMY_MAX_FALL) this.vy = ENEMY_MAX_FALL;

        // 分轴积分 + 碰撞
        this.pos.x += this.vx;
        if (this.collider) this.collider.collideX(this);
        this.pos.y += this.vy;
        if (this.collider) this.collider.collideY(this);

        // Paratroopa：落地即起跳（持续蹦跳）
        if (this.winged && this.onGround) {
            this.vy = -PARATROOPA_HOP;
        }
    }

    /** 碰撞回报：撞到左右墙则折返 */
    obstruct(side) {
        if (side === Sides.LEFT || side === Sides.RIGHT) {
            this.dir = -this.dir;
        }
    }

    /** 被玩家踩 */
    stomp() {
        if (this.type === 'goomba') {
            this.state = 'squashed';
            this.squashTimer = SQUASH_FRAMES;
        } else { // koopa
            if (this.winged) {
                this.winged = false; // Paratroopa 第一次被踩 → 失翅，变普通巡逻龟
                return;
            }
            // 巡逻→缩壳；滑行→停成静止壳
            this.state = 'shell';
            this.vx = 0;
        }
    }

    /** 踢动静止的壳 @param {number} dir 滑行方向 */
    kick(dir) {
        if (this.state === 'shell') {
            this.state = 'sliding';
            this.dir = dir;
        }
    }

    /** 被滑壳/其它方式杀死 */
    die() {
        this.state = 'dead';
    }
}
