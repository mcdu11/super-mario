import {Vec2} from './math.js'

/**
 * 相机
 * @constructor
 * @pos {vec2} 位置
 * @size {vec2}  大小
 */
export default class Camera {
    constructor() {
        this.pos = new Vec2(0, 0);
        this.size = new Vec2(250, 206);
    }
}