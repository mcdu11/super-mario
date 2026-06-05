/**
 * 可顶起的方块 —— ? 砖 / 普通砖。见 docs/PERFECT-REPLICA-SPEC.md §5、§6。
 *
 * 玩家从下方顶（tile 碰撞 TOP）时触发 bump：
 * - question：吐出内容物（道具或金币）一次，随后变 empty（撞死的空砖）。
 * - brick：含内容物则吐出；否则大体型(大/火)顶碎 → broken，小体型仅 bump 弹动。
 *
 * 内容物用字符串描述：'coin' | 'mushroom' | 'fireflower' | 'star' | 'oneup'。
 * 注意：? 砖里的道具按「小马里奥→蘑菇 / 大马里奥→火花」由调用方决定具体物，
 * 这里只负责「吐出已配置的内容」，保持纯粹可测。
 */
export default class Block {
    /**
     * @param {{kind:'question'|'brick', contents?:string|null, coins?:number}} opts
     *   coins: 砖块可被多次顶出的金币数（如隐藏多金币砖），默认 0
     */
    constructor({kind, contents = null, coins = 0}) {
        this.kind = kind;
        this.contents = contents;
        this.coins = coins;
        this.state = 'idle'; // 'idle' | 'empty' | 'broken'
    }

    /**
     * 从下方被顶。
     * @param {{tier:number}} [power] 玩家能力态（tier>0 为大/火）
     * @returns {'none'|'bump'|'break'|'coin'|'mushroom'|'fireflower'|'star'|'oneup'}
     */
    bump(power) {
        if (this.state !== 'idle') return 'none';

        if (this.kind === 'question') {
            const out = this.contents || 'coin';
            this.contents = null;
            this.state = 'empty';
            return out;
        }

        // brick
        if (this.contents) {
            const out = this.contents;
            this.contents = null;
            this.state = 'empty';
            return out;
        }
        if (this.coins > 0) {
            this.coins -= 1;
            if (this.coins === 0) this.state = 'empty';
            return 'coin';
        }
        if (power && power.tier > 0) {
            this.state = 'broken';
            return 'break';
        }
        return 'bump'; // 小马里奥顶砖：仅弹动
    }
}
