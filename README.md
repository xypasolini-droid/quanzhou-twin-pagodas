# 泉州开元寺 · 东西双塔

> 东西相望，一城千年。
>
> 以石为骨，仿木为形。

以泉州开元寺的仁寿塔与镇国塔为主角，在浏览器中展开一场可交互的古建营造。石座逐层垒起，斗拱向外承挑，五重石檐徐徐成形；拉近镜头，可以细看人物石刻、栏板卷草、檐角铜铃与塔刹链环。

本项目以 Hailey 的开源 [threejs-architecture-effects](https://github.com/lhlGitHub/threejs-architecture-effects) 及其「营造 · 建筑生长」示例为起点，参考原版的古建图录式呈现与逐构件动画方法，结合实景照片、航拍核对和建筑图解，重新制作双塔几何、石材材质与近观视角。

使用 **React + Three.js** 构建真实、可环视的三维场景。拖动旋转、滚轮近观，或沿一条 **22 秒营造时间轴** 播放、暂停、倒拖与重演，在构件的层层相承中观察双塔的形制。

![泉州开元寺双塔总览](preview-overview.jpg)

![镇国塔南面两尊护法的实拍上塔近景](preview-details.jpg)

## 运行

需要 Node.js 22.13 或更新版本及 npm。

macOS 可双击 `启动双塔.command`，打开 http://127.0.0.1:5179 。运行时保持终端窗口打开。

或手动运行：

```sh
git clone https://github.com/xypasolini-droid/quanzhou-twin-pagodas.git
cd quanzhou-twin-pagodas
npm ci
npm run dev -- --port 5179 --strictPort
```

构建检查：`npm run build`。构建后可运行 `npm run preview -- --port 5179 --strictPort`。

## 玩法

- 三维场景占据全宽首屏。右上角“全屏观赏”打开浏览器全屏，按 Esc 或点击“退出全屏”返回。
- 拖动旋转、滚轮缩放；画面上提供同等功能按钮。
- 切换双塔、仁寿塔、镇国塔、石檐斗拱、人物石刻与须弥塔座视角。
- 点击“观看营造”沿22秒时间轴先看仁寿塔落成，再看镇国塔接建。支持暂停及0.5/1/2倍速。
- 拖动时间轴会暂停。点击西塔或东塔年代可跳入相应营造段，台基、五层和塔刹按钮可定位到各阶段。
- “重新营造”回到双塔全景，从西塔台基开始重演。
- 日光与斜阳呈现同一石面在不同光线下的冷暖。右上角“双塔小志”在当前场景中弹出，可切换阅读对象和章节。[查看小志弹窗](docs/qa/history-dialog.jpg)
- “构造细赏”沿石檐、人物石刻、栏座近观。
- “石刻图志”收录63处定位实拍，可按塔和楼层筛选、逐件翻阅。点击“在塔上查看”定位到石板，点塔身的实拍石板可打开对应展签。[查看图志界面](docs/qa/relief-gallery.jpg)
- 从西塔视图或图志可直达“猴行者”，定位到仁寿塔四层东北面石门右侧。展签提供开放许可远摄和清晰特写的原刊入口。[查看文保图录](https://www.mnwhstq.com/bhjg/202406/t20240621_214053.htm)
- 右上角“实景参考与说明”可查看图片、来源与建模范围。

## 参考与建模范围

主要结构参考：[泉州文旅《这份泉州东西塔剖面图，你肯定没见过！》](https://www.sohu.com/a/447133881_683837)。结合立面、八角平面、剖面、石斗拱与石屋面分解图，校核主要比例和形制。

细部参考：[闽南文化生态保护区《泉州开元寺东西塔风华录》](https://www.mnwhstq.com/bhjg/202406/t20240621_214053.htm)。增加浅浮雕人物的头光、衣褶与持物差异、石栏卷草、檐角铃、石柱分节及塔座线脚。详见 `docs/DETAIL-NOTES.md`。

人物补充资料：[Ecke、Demiéville《刺桐双塔》（1935）扫描本](https://archive.org/details/in.ernet.dli.2015.127766)与可定位现代照片。两塔160处均有独立来源记录：126处有可核对图像（含历史照片与局部残幅），34处主要据文字保守补形。衣冠、手势、持物、承托与从者由逐条记录驱动，未知细节留缺，不随机制造差异。见 [160处逐尊索引](docs/SCULPTURE-CATALOG.md)、[研究方法与缺口](docs/SCULPTURE-RESEARCH.md)及[航拍校核说明](docs/DRONE-REFINEMENT.md)。模型仍是形态概括，不是160尊高精度测绘复原。

补充的 [kknews 页面](https://kknews.cc/zh-sg/culture/ag48e6x.html)在本次制作时受站点访问验证阻挡，未取得正文与图片，因此未作为已验证的建模依据。

高度与年代采用[泉州市政府开元寺介绍](https://www.quanzhou.gov.cn/lyb/lytj/rmjdtj/202202/t20220224_2699974.htm)：东塔镇国塔48.27米，1238—1250年；西塔仁寿塔45.06米，1228—1237年。动画依据年代先西后东，单塔按台基、五层、塔刹演示石构叠筑。构件进场和播放节奏为展陈编排，校核说明见 [历史来源与营造顺序](docs/HISTORY-SOURCES.md)。

双塔间距为并置展陈而缩短。62处石板使用对应实拍校正表面，浅凹凸来自图像明暗，雕刻深度仍为展示性估计。其余石刻保留基于图录的形态模型。

选图依据与明细见 `docs/REFERENCE-NOTES.md`，验证结果见 `docs/design/UI-QA-REPORT.md`。

## 素材与许可

- 代码基于 Hailey 的 [threejs-architecture-effects](https://github.com/lhlGitHub/threejs-architecture-effects)，保留 MIT LICENSE；本项目新增双塔几何、石材材质、相机、界面与交互。
- [石刻图志照片及塔身图集署名](public/sculptures/ATTRIBUTION.md)。每处实拍标有摄影者、原图与适用的 CC BY-SA 许可。用户航拍用于本地核对，历史图录通过出处链接查阅。
- `public/references/zhenguo-full.jpg`、`renshou-full.jpg`：摄影 Windmemories，Wikimedia Commons，CC BY-SA 4.0。各原图页面及许可链接见 `public/references/ATTRIBUTION.md`。照片的许可独立于代码 MIT 许可。
- 搜狐文章图解和闽南文化生态保护区照片用于观察分析，未打包进公开页面资源；网页提供原文链接。

## 主要文件

- `src/heritage/architecture.ts`：双塔几何、叠涩石构与营造次序。
- `src/heritage/sculptureGeometry.ts`：按逐尊证据构造人物浮雕。
- `src/heritage/data/*-sculptures.json`：160处人物的形态、证据和未知项。
- `scripts/check-sculptures.mjs`：逐尊编号、位置覆盖与证据字段检查。
- `src/heritage/materials.ts`：花岗岩的颜色、凹凸和粗糙度。
- `src/heritage/builder.ts`：按材质合批、GPU逐构件运动、同步阴影。
- `src/PagodaThreeScene.tsx`：灯光、相机、响应式构图和按需渲染。
- `src/App.tsx`、`src/style.css`：观赏界面与播放控制。
- `src/HistoryPanel.tsx`、`src/heritage/history.ts`：带出处的历史介绍与构造观察。
