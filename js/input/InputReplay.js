/**
 * 逐帧输入回放器。
 * 给定一段录制（帧掩码数组），按帧号取回当帧输入。
 * 超出录制长度后返回 0（无输入），便于让回放自然停住。
 */
export default class InputReplay {
    /** @param {number[]} frames 帧掩码数组（如 InputRecorder.toJSON().frames） */
    constructor(frames) {
        this.frames = frames;
    }

    static fromJSON(data) {
        return new InputReplay(data.frames);
    }

    /** @param {number} frame 帧号 @returns {number} 当帧按钮掩码 */
    at(frame) {
        return frame >= 0 && frame < this.frames.length ? this.frames[frame] : 0;
    }

    get length() {
        return this.frames.length;
    }
}
