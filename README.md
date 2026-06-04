# super-mario
纯js实现web版的 超级玛丽

## 在线游玩 / GitHub Pages 部署
本项目源码是原生 ES module，**无需打包即可直接在浏览器运行**。
仓库根目录的 `index.html` 通过 `<script type="module">` 直接加载 `js/main.js`。

部署方式：`.github/workflows/deploy-pages.yml` 会在推送到 `master` 时
自动把静态文件（`index.html` / `js` / `assets`）发布到 GitHub Pages。
首次部署后，到仓库 `Settings → Pages` 确认 Source 为 “GitHub Actions” 即可，
访问地址形如 `https://<用户名>.github.io/super-mario/`。

本地预览（任意静态服务器即可，例如）：
```bash
python3 -m http.server 8123   # 然后浏览器打开 http://127.0.0.1:8123
```
## webpack配置
[https://github.com/JuniorTour/es6-mario]
## 学习资源（需要梯子）
[https://www.youtube.com/watch?v=g-FpDQ8Eqw8&list=PLS8HfBXv9ZWWe8zXrViYbIM2Hhylx8DZx]

### 整个游戏逻辑梳理


1、main是入口文件

2、Level类中有很多其他的类的实例

3、关卡布局是json文件控制的

4、场景运动是Camera类的坐标修改

5、碰撞检测是按照格子来划分检测的

6、动画
