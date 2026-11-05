# 泉州开元寺 · 东西双塔

以实景照片和建筑图解为依据的 Three.js 交互建模与营造动画。

![泉州开元寺双塔总览](preview-overview.jpg)

![人物石刻、石栏与檐口细节](preview-details.jpg)

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

- 拖动旋转、滚轮缩放；画面右侧提供同等功能按钮。
- 切换双塔、仁寿塔、镇国塔、石檐斗拱、人物石刻与须弥塔座视角。
- 点击“观看营造”播放22秒组装过程；支持暂停、0.5/1/2倍速。
- 拖动时间轴会自动暂停；点击阶段文字直接查看对应阶段完成状态。
- “重新营造”从台基开始重演。
- 右上角“实景参考与说明”可查看图片、来源与建模范围。

## 参考与建模范围

主要结构参考：[泉州文旅《这份泉州东西塔剖面图，你肯定没见过！》](https://www.sohu.com/a/447133881_683837)。结合立面、八角平面、剖面、石斗拱与石屋面分解图，校核主要比例和形制。

细部参考：[闽南文化生态保护区《泉州开元寺东西塔风华录》](https://www.mnwhstq.com/bhjg/202406/t20240621_214053.htm)。增加浅浮雕人物的头光、衣褶与持物差异、石栏卷草、檐角铃、石柱分节及塔座线脚。具体人物与方位仍为简化意象，并非逐尊测绘。详见 `docs/DETAIL-NOTES.md`。

补充的 [kknews 页面](https://kknews.cc/zh-sg/culture/ag48e6x.html)在本次制作时受站点访问验证阻挡，未取得正文与图片，因此未作为已验证的建模依据。

高度与年代采用[泉州市政府开元寺介绍](https://www.quanzhou.gov.cn/lyb/lytj/rmjdtj/202202/t20220224_2699974.htm)：东塔镇国塔48.27米，1238—1250年；西塔仁寿塔45.06米，1228—1237年。

双塔间距为并置展陈而缩短，并非寺院测绘总平面。浮雕、石缝、内部结构和施工次序采用表达性简化；模型不是文物测绘成果或工程结构模型。

选图依据与明细见 `docs/REFERENCE-NOTES.md`，验证结果见 `docs/design/UI-QA-REPORT.md`。

## 素材与许可

- 代码基于 Hailey 的 [threejs-architecture-effects](https://github.com/lhlGitHub/threejs-architecture-effects)，保留 MIT LICENSE；本项目新增双塔几何、石材材质、相机、界面与交互。
- 场景本身由程序几何和程序材质生成，不使用照片贴片。
- `public/references/zhenguo-full.jpg`、`renshou-full.jpg`：摄影 Windmemories，Wikimedia Commons，CC BY-SA 4.0。各原图页面及许可链接见 `public/references/ATTRIBUTION.md`。照片的许可独立于代码 MIT 许可。
- 搜狐文章图解和闽南文化生态保护区照片用于观察分析，未打包进公开页面资源；网页提供原文链接。

## 主要文件

- `src/heritage/architecture.ts`：双塔几何、叠涩石构与营造次序。
- `src/heritage/materials.ts`：花岗岩的颜色、凹凸和粗糙度。
- `src/heritage/builder.ts`：按材质合批、GPU逐构件运动、同步阴影。
- `src/PagodaThreeScene.tsx`：灯光、相机、响应式构图和按需渲染。
- `src/App.tsx`、`src/style.css`：观赏界面与播放控制。
