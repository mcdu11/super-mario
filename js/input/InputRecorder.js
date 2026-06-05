/**
 * 逐帧输入录制器。
 * 每一游戏帧调用一次 capture(mask)，把当帧按钮掩码追加到日志。
 * 日志可序列化，配合 InputReplay 复现完全相同的一局（见规格 §10）。
 */
export default class InputRecorder {
    constructor() {
        /** @type {number[]} 下标即帧号，值为该帧按钮掩码 */
        this.frames = [];
    }

    /** @param {number} mask 当帧按钮位掩码 */
    capture(mask) {
        this.frames.push(mask | 0);
    }

    get length() {
        return this.frames.length;
    }

    /** 导出为纯数据，便于存盘/对比 */
    toJSON() {
        return {version: 1, frames: this.frames.slice()};
    }
}
