# 今日小馆 Implementation Plan

**Goal:** 为电子老黄历增加每日抽签、生活小挑战与本地集章册。

**Architecture:** 日期与主题生成可复现的每日签文；独立逻辑模块负责日期和集章规则，独立界面模块接入现有日历事件。复用原工具面板的开关、日期同步与主题色。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node 内置测试、Python Playwright。

---

### 1. 每日玩法逻辑

创建 daily-play.js，提供四类签文、每日挑战、上海时区日期、存储读写及盖章统计。创建 tests/daily-play.test.cjs，以 `node --test tests/daily-play.test.cjs` 验证结果稳定、跨日规则、重复点击、跨年连续天数和存储故障。

### 2. 纸张界面

创建 daily-play.css 和 daily-play-ui.js；修改 index.html，加入有明确文案的入口、可滚动小馆面板和日期事件。实现抽签动画、主题选择、完成盖章、最近七日集章与复制文本。日历的日期/导出面板与小馆互斥，Escape 返回入口，减少动态效果时跳过抽签动画。

### 3. 集成验证与交付

通过本地 HTTP 服务运行网页，用 Playwright 验证桌面/手机主流程、刷新保存、主题切换、历史日期限制、日期翻页和原有面板。保存检查过的截图；README 说明运行方式、玩法和记录规则。完成 Git 差异检查后提交分支并向 rsliyu/OldAlmanac 创建 PR。
