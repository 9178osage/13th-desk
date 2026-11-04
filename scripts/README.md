# 脚本目录

本目录包含构建入口、项目验证和平台辅助代码。脚本及测试之间有相对路径引用，移动文件前要同时更新调用方和测试。

## 常用入口

| 命令                                              | 用途                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                                     | 通过 `with-app-env.mjs` 注入应用环境后启动开发服务。                       |
| `npm run build`                                   | 构建生产版本，再运行 `migrate.mjs`；没有 `DATABASE_URL` 时跳过数据库迁移。 |
| `npm test`                                        | 运行格式检查和项目自动化测试，入口是 `test-all.mjs`。                      |
| `npm run typecheck`、`npm run lint`               | 分别检查 TypeScript 类型和代码规范。                                       |
| `npm run check:links`、`npm run check:auth`       | 检查外部链接与开发环境和构建环境的认证配置。                               |
| `npm run preview:restart`、`npm run preview:stop` | 在 Linux 沙箱中管理生产构建的预览服务。                                    |
| `npm run posters`                                 | 用 Playwright 重新生成 `public/posters/` 里的六语海报（PDF 与 PNG）。      |

## 文件分组

- **构建和配置**：`with-app-env.mjs`、`app-env-plugin.mjs`、`migrate.mjs`、`migration-plan.mjs`。
- **浏览器和发布验证**：`browser-smoke.mjs`、`browser-smoke-verdict.mjs`、`browser-guard.mjs`、`brand-check.mjs`、`check-auth-invariant.mjs`、`check-links.mjs`、`link-outcome.mjs`、`preview.mjs`、`preview-thumbnail.mjs`。
- **平台功能**：`grok-pwa-plugin.mjs`、`grok-pwa-shared.mjs`、`grok-pwa-shared.d.mts`、`install-page.html`；这些文件与平台的 PWA 和安装页面配合使用。
- **海报**：`posters/copy.mjs` 是六语文案，`posters/template.mjs` 定义固定画布，`posters/render.mjs` 输出文件并检查文字溢出；打印 PNG 写入 192 DPI 元数据，手机图写入 96 DPI。`posters/qr-poster.svg` 是指向 `/poster` 的二维码。`npm run posters -- zh en` 只重做指定语言。
- **共享工具**：`sign-out-plan.mjs` 提供退出登录步骤；`temp-dir.mjs` 管理测试临时目录；`write-atomic.mjs` 原子写入文件。
- **测试**：`*.test.mjs` 覆盖脚本和应用行为；应用库自身的 TypeScript 测试位于 `src/lib/`。

## 测试发现

`test-all.mjs` 会自动发现本目录**根层**的 `*.test.mjs`，其中 `grok-pwa-plugin.test.mjs` 在独立的空临时目录中运行；它还显式列出 `src/lib/` 下的 TypeScript 测试。新增根层脚本测试会自动纳入；新增其他目录的测试需要更新测试入口。GitHub Actions 的 Verification 工作流另外运行类型检查、lint、依赖审计和生产构建。
