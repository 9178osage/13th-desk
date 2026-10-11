# Eugene Desk 代码检查 · 2026-10-07

> 后续状态：下列问题已在本地修复并复验。见 [修复记录](FIXES-2026-10-07.md)。以下保留原始审查基线；旧诊断脚本仅用于该基线，不适用于新的存储适配器。

检查基线：本地 `main`，HEAD `0c3ad51`。这是代码检查报告，不是修复完成声明。本轮没有修改网站业务代码、升级依赖或推送部署。

## 优先处理的问题

### 1. [P1] 恢复损坏存档后，后续编辑仍无法保存

位置：`src/lib/store.ts:255–277`、`:317–320`、`:748–771`。

`getItem()` 遇到损坏 JSON 或存储读取失败，将闭包内的 `readFailed` 永久设为 true。导入备份通过 `replacePersistedDeskState()` 直接写入 localStorage，却没有清除此标记。因此导入本身成功，之后新增待办、修改课表等仍被 `flush()` 丢弃；刷新后只剩导入时的数据。页面会再次显示存储警告，但恢复流程并未真正恢复自动保存。

验证：`artifacts/audit-storage-2026-10-07.mjs` 提取当前存储适配器，在隔离 VM 中模拟损坏读取、成功导入、后续编辑；确认后续编辑未写入。没有访问真实浏览器存档。

建议：提供明确的存储恢复入口；仅在用户确认恢复且写入成功后解除保护，并清理旧的待写入任务。保留损坏原件，不能仅为消除报错而自动覆盖。

### 2. [P1] 多标签页可能互相覆盖数据

位置：`src/lib/store.ts:280`、`:288–297`、`:590–604`。

每个标签页保留独立的全量内存快照，保存时覆盖整个 `13th-desk-v1`。主存储没有监听 `storage` 事件，也没有版本冲突检测。A、B 同时打开后，A 新增一条待办，B 再编辑自己的旧快照，会把 A 的新增内容覆盖；甚至不同学段的改动也会互相覆盖。

验证：上述隔离诊断脚本使用两个独立适配器和共享模拟存储，确认最后一次全量写入只保留 B 的内容。代码搜索也确认目前只有导入前快照组件监听 `storage`，主 desk store 没有监听。

建议：加入跨页同步及写入版本检查；检测到冲突时合并记录或明确提示，避免静默覆盖。仅监听事件而不处理同时编辑仍不足以完全解决问题。

### 3. [P2] 备份导入允许重复记录 ID

位置：`src/lib/desk-backup.ts:175–198`；删除/修改逻辑见 `src/lib/store.ts`。

导入逐条校验数据类型，但不检查同一列表中的 ID 是否唯一。实测两条不同待办使用相同 ID 时，`parseDeskBackup()` 返回成功。后续按 ID 删除会同时删除两条；切换完成状态也会同时修改，React 列表还会出现重复 key。课程和成绩列表同样缺少唯一性检查。

建议：在每个学段的 notes、schedule、grades 内拒绝重复 ID，或在导入确认前安全重建唯一 ID，并增加覆盖测试。

### 4. [P2] 锁定依赖包含一个已知高危公告

位置：`package-lock.json:6775`。

`npm audit --omit=dev` 报告 `source-map-js@1.2.1` 命中 GHSA-68fv-2mgg-jv7q；公告修复版本为 1.2.2。依赖链为 Tailwind 构建工具与 Vite → PostCSS。攻击条件涉及处理特制 indexed source map；本次没有发现网站面向访客接受此类文件的入口，不能据此断言线上站点可被直接远程利用。

建议：更新该间接依赖及锁文件，重新跑构建和检查；不要直接执行不受控的强制批量升级。

来源：[GitHub Reviewed 安全公告](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。检查时生产依赖审计结果：1 high，0 critical。

### 5. [P2] 完整测试命令失败，并跳过后半段测试

位置：`scripts/grok-pwa-plugin.test.mjs`、`scripts/grok-pwa-shared.mjs:251`、`package.json` 的 test 脚本。

195 项脚本测试中 187 项通过、8 项失败。失败集中在分享标题/分享卡片注入：测试期望 x / Wild Race 等模拟标题，但默认读到了真实 `src/lib/og/site.json` 的 Eugene Desk 配置。应隔离测试目录/显式注入测试身份，不应修改真实品牌配置来迎合断言。

由于 test 命令通过 `&&` 串联，前半段失败后不会执行后面的认证和连接器测试。本次单独补跑了后半段，55 项全部通过。平台保护文件本轮未修改。

### 6. [P3] 地点营业说明未接入六语翻译

位置：`src/components/place-browser.tsx` 中直接渲染 `{place.hours}`；`src/data/places.ts` 的 hours 字段。

生产构建中文校园页仍显示 “Varies · check library hours (finals shift)” 等英文说明。这不是语言包加载慢，而是字段本身为固定字符串、没有经过 `tr()`。应改为可翻译 Copy 数据。指南中“硬编码的 UO 学期快照”等开发术语也建议换成面向学生的说明。

## 检查结果

| 检查 | 结果 |
| --- | --- |
| TypeScript 全项目类型检查 | 通过 |
| 生产构建 | 通过；无数据库环境时迁移按配置跳过 |
| 业务测试 test:desk | 38/38 通过 |
| 脚本测试 | 187/195 通过，8 项品牌注入测试失败 |
| 单独补跑认证/连接器测试 | 55/55 通过 |
| ESLint | 1 error、3 warnings |
| 生产依赖审计 | 1 high、0 critical |
| 开发/生产首页 | 均已在真实浏览器打开；未见白屏或捕获到的控制台错误 |
| 桌面与手机 | 两种构建均检查 1280×800、390×844 截图，首屏未见横向溢出或布局遮挡 |
| 生产五个页面 | 今日、校园、探索尤金、学生指南、绩点页面均完成加载检查 |
| 学段切换 | 大学→高中→大学，页面内容随之切换 |

Lint 具体问题：`src/lib/app-data/client.server.ts:281` 空 catch（error）；`src/lib/auth/use-current-user.ts:59` 无效 eslint-disable（warning）；`src/lib/calendar.ts:7–8` 两个未使用导入（warning）。

## 检查范围与限制

全项目运行类型、规范、构建和既有测试检查；重点人工审阅了持久化、导入导出、课表、GPA、多语言、日期、主要页面、天气、入口、预览消息边界和部署配置。扫描了危险 HTML、动态执行、网络请求和存储入口。没有把自动扫描当成逐行审阅所有平台辅助代码，也不承诺“所有代码绝无漏洞”。

本次没有完整遍历六语×四学段的全部交互组合，没有做渗透测试，也没有重新核验全部学校日期、地点信息和外链。原项目 smoke 脚本仅允许 Linux `/workspace` 输出路径，在当前 Mac 被路径检查拒绝；未绕过或改写该保护，改用内置浏览器核对开发版和生产版。`agent-browser` 当前未安装，交互检查同样通过内置浏览器完成。

截图在 `screenshots/audit-dev-desktop.jpg`、`audit-dev-mobile.jpg`、`audit-built-desktop.jpg`、`audit-built-mobile.jpg`。

## Logo 交付

`Eugene Desk Logo/v2/`：Illustrator 原生保存的横版 Logo 与品牌展示稿，配套 SVG 和 Illustrator 预览截图。旧 Logo 文件保留；未替换网站图标，未部署。
