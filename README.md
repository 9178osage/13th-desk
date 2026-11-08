# Eugene Desk

尤金学生书桌 —— 把「今天要做什么」的仪表盘密度，和温暖纸感书桌合在一起。

[中文](#功能) · [English](#english) · [Español](#español) · [한국어](#한국어) · [Tiếng Việt](#tiếng-việt) · [日本語](#日本語)

**在线演示：** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**仓库：** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

**维护文档 / Maintenance:** [项目结构](docs/PROJECT-LAYOUT.md) · [脚本索引](scripts/README.md) · [部署与 CI](docs/DEPLOY-CI.md)

书桌功能**不需要登录或数据库**。语言、学段、课表、笔记、绩点等存在本机浏览器的 `localStorage`（键名 `13th-desk-v1`，请勿改名以免丢数据）。

---

## 功能

| 页面               | 说明                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| **今日** `/`       | 待办、周课表、下一节课与倒计时、当日课程、天气、快捷入口、临近校历日期            |
| **校园** `/campus` | 大学：场所搜索、分类、收藏与开放时间；K–12：学区校园卡片                          |
| **城里** `/town`   | 放学后 / 校外场所，可搜索、分类、收藏，按学段调整内容                             |
| **指南** `/guide`  | 大学：到校清单、截止日期、帮助链接；K–12：对应学段指南；有效校历日期可导出 `.ics` |
| **绩点** `/gpa`    | 按学段估算 GPA，合并既有 GPA / 学分、试算目标与图表；高中支持普通和加权 GPA       |

其它：

- **首次打开**：语言 + 学段选择（顶栏与移动端底栏可随时改）
- **学段**：小学 / 初中 / 高中 / 大学（`elem` · `mid` · `high` · `uni`），各自保存待办、课表和绩点等书桌数据
- **课表**：周一至周五，支持增改、删除与撤销、标星、示例课表和时间重叠提示；可导出 1080×1920 锁屏 PNG
- **快捷搜索**：顶栏搜索按钮或 `⌘K` / `Ctrl+K`，查找页面、地点、校历与快捷链接，也可切换语言和学段；地点页的搜索与分类保存在 URL 中
- **日历导出**：首页和指南可下载仍有效、尚未过去的校历日期为 `.ics`，供日历软件导入
- **学区条**（K–12）：可选定位或手动选 Lane 县附近学区
- **六种语言**：English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

品牌图标在 `public/brand/`；favicon 为 `public/favicon.svg`，分享图为 `public/og.jpg` 和 `public/x-banner.jpg`。

---

## 技术栈

- **Node.js 26**（`.nvmrc`、CI 与 Vercel 的 `engines.node` 保持一致）
- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand**（persist → `13th-desk-v1`）
- 手写 SVG（GPA 图，不用图表库）
- 字体：Fraunces（标题）+ Outfit（界面）

视觉：奶油纸底 + 海军墨色 + 电蓝点缀；辅色苔绿与金色。

---

## 本地运行

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm ci --include=dev --ignore-scripts
npm run dev:local
```

先启用 Node 26；使用 fnm 时可运行 `fnm install`、`fnm use`，读取本仓库的 `.nvmrc`，无需替换其他项目的系统 Node。

开发地址为 `http://127.0.0.1:8080`。`dev:local` 只监听本机；`npm run dev` 监听所有接口，供预览沙盒使用。开发与构建都经过 `scripts/with-app-env.mjs`，读取 `.app-builder/app-env.json`，不要直接调用 Vite。当前配置关闭认证和业务数据库，无需为书桌功能创建 `.env`。

首次运行完整测试前，安装海报 PDF 二维码校验所需的 Chromium：

```bash
npx playwright install chromium
```

| 命令                                               | 用途                                                      |
| -------------------------------------------------- | --------------------------------------------------------- |
| `npm test`                                         | 格式检查、脚本测试和应用库测试；包含海报 PDF / 二维码校验 |
| `npm run test:desk`                                | 书桌核心规则的快速测试子集，不能替代完整测试              |
| `npm run typecheck` / `npm run lint`               | TypeScript 类型检查 / ESLint                              |
| `npm run check:format`                             | 仅检查格式                                                |
| `npm run build`                                    | 生产构建与迁移入口；未配置数据库时跳过迁移                |
| `npm run preview`                                  | 在本机预览最新构建产物（127.0.0.1:8081）                  |
| `npm run preview:restart` / `npm run preview:stop` | Linux 预览沙盒的构建产物服务管理                          |
| `npm run check:links`                              | 检查网站业务数据中的外部链接                              |
| `npm run check:auth`                               | 比对开发环境与生产构建的认证配置                          |
| `npm run posters -- zh en`                         | 重新生成指定语言海报；不带语言参数则生成全部六语          |

脚本详细说明见[脚本索引](scripts/README.md)。

---

## 部署

### 每次推送的可核查记录

GitHub [Verification 检查](https://github.com/9178osage/13th-desk/actions/workflows/verification.yml)在每次 push、PR 和手动触发时执行完整测试、依赖审计（`npm audit --audit-level=low`）、类型检查、ESLint 和生产构建，并核对产物的 Node 运行时与 `pdx1` 区域。每次运行记录实际检出的提交、Node/npm 版本、锁文件摘要，以及逐项成功／失败／跳过结果。失败也会上传日志；新推送不会取消旧推送的检查。

运行详情页提供 `verification-提交SHA-尝试次数` 日志下载包，申请保留 90 天（受仓库保留策略限制），不属于永久档案。PR 默认检查合并后的测试提交，准确 SHA 见 `source.txt`。未包含网站页面的真机／浏览器验收，现有 Vercel 自动部署仍独立运行，不代表测试通过后才发布。

已连接 **Vercel** 项目 `eugene-desk`，推送到 GitHub `main` 会自动部署到：

[eugene-desk.vercel.app](https://eugene-desk.vercel.app)

[Link check](https://github.com/9178osage/13th-desk/actions/workflows/link-check.yml) 每日定时检查外部链接，也在相关代码变化或手动触发时执行；只改 README 不会触发该工作流。

发布前完成格式、完整测试、类型、lint 和生产构建；涉及页面时，还要复核开发版与构建产物的桌面和手机显示。推送后分别核对同一提交的 GitHub Actions 与 Vercel 生产部署结果。完整流程见[部署与 CI](docs/DEPLOY-CI.md)。

仓库根目录有 `vercel.json`（安全响应头等）。本地也可：

```bash
npx vercel --prod
```

（需已登录并链到同一 Vercel 项目。）

Vercel 的安装与构建命令通过 `scripts/vercel-npm.mjs` 启动 npm，移除构建环境注入、npm 不支持的 `npm_config_cache_dir`（含大写变体）。只记录移除的变量名，不记录值；合法的 `npm_config_cache`、其他配置和警告均保留，嵌套的 `npm run db:migrate` 也继承清理后的环境。不要通过降低 npm 日志级别隐藏配置警告。

旧标签页在部署后可能找不到原来的动态资源。网站会先询问是否刷新，并提醒未保存的输入会丢失；取消不会自动刷新，同一标签页内相同错误只询问一次。原始加载错误仍会交给原有错误处理。这只是资源加载失败时的恢复措施，不替代 Vercel Skew Protection 的前后端版本锁定。

---

## 数据与说明

- 书桌状态（语言、学段、笔记、课表、绩点行、收藏等）只存在**当前浏览器**，键名 **`13th-desk-v1`**。
- **多标签页与存档保护**：同一浏览器的标签页可跟随本地保存变化，写入前尝试合并并行修改；仍可能存在编辑冲突，不提供跨设备同步。损坏或不支持的存档会阻止覆盖并给出提示。
- **偏好 Cookie**：第一方 `eugene-desk-prefs` 仅保存语言与学段的首屏提示，让服务端先显示对应界面；书桌内容仍以 `localStorage` 为准。
- **备份与恢复**：侧栏「保存在当前浏览器」下方，以及页脚，可导出 / 导入本地数据。导出文件名为 `eugene-desk-backup-YYYY-MM-DD.json`，包含四个学段的完整书桌状态。换设备或清理浏览器缓存前，先导出一份备份；导入时会严格校验，坏文件不会改动现有数据，确认弹层会显示各学段待办与课程数量；确认导入前会自动下载 `eugene-desk-before-import-…json`，并把导入前快照写到独立键 `13th-desk-v1:pre-import`，刷新后仍可撤销（存储满时会提示并依赖已下载文件）。
- **校历数据（每学期更新）**：大学日期在 `src/data/guide.ts` 与 `src/lib/calendar-meta.ts`（学期标签、`validThrough`、核对日期、官方链接）。K–12 日期目前只收录尤金 4J（`src/data/k12.ts`）；其他学区显示「参考校历」并链到该学区官网，不冒充 4J。换学期时改上述文件并更新核对日期。
- **隐私与访问统计**：网站用 Vercel Web Analytics 做匿名访问统计，只记页面路径和访问次数这类汇总数字。统计不使用 Cookie，不收集姓名、邮箱等个人信息，也不往浏览器里存任何统计数据；不记录查询参数，不使用自定义事件。开发环境和预览 iframe 里不加载统计脚本。
- **渠道入口**：`/card`、`/isa`、`/teacher`、`/eld`、`/poster` 都显示首页，统计里会分别计数，记下后地址栏换回 `/`。只认 `src/lib/channels.ts` 里列出的几个，加新渠道只要在那里加一行；其他路径照常返回 404。
- **宣传海报**：六种语言各有一套，放在 `public/posters/`，上线后可直接下载，例如 [https://eugene-desk.vercel.app/posters/eugene-desk-poster-zh-letter.pdf](https://eugene-desk.vercel.app/posters/eugene-desk-poster-zh-letter.pdf)。每种语言三个文件：`-letter.pdf`（US Letter 打印版）、`-letter.png`（1632×2112，192 DPI，打印为 8.5×11 英寸）、`-story.png`（1080×1920，96 DPI）；各语言同一格式尺寸一致。语言代码为 `en`、`zh`、`es`、`ko`、`vi`、`ja`。海报上的二维码指向 `/poster` 渠道。文案在 `scripts/posters/copy.mjs`，改完运行 `npm run posters` 重新生成，不手改输出文件。
- 场所开放时间、校历等为参考信息；以各机构官网为准。天气由 Open-Meteo 提供；校历 `.ics` 为文件导出，不连接个人日历账户。
- GPA 为估算工具，正式成绩以学校成绩单为准。
- 仓库历史名曾为 Eugene Student Web / 13th-desk / 河谷校园仪表盘；产品品牌现为 **Eugene Desk**。

---

## English

**Eugene Desk** is a student dashboard for Eugene, Oregon, combining a dense “what do I need to do today?” home screen with the feel of a warm, paper-textured desk.

**Live demo:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**Repository:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

The desk does **not require an account or a database**. Language, school level, schedule, notes, GPA rows, and other preferences are stored in the current browser's `localStorage` under **`13th-desk-v1`**. Do not rename this key or existing local data will no longer be found.

### Features

| Page                 | What it includes                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Today** `/`        | To-dos, weekly schedule, next-class countdown, today's classes, weather, quick links, upcoming calendar dates         |
| **Campus** `/campus` | University locations such as libraries and dining halls with hours; K–12 campus cards by district                     |
| **Town** `/town`     | After-school and off-campus places, with copy and categories adjusted by school level                                 |
| **Guide** `/guide`   | University arrival checklist, deadlines, and help links; level-appropriate guides for K–12                            |
| **GPA** `/gpa`       | GPA by school level, prior-GPA / credit totals, target estimates, charts; unweighted and weighted GPA for high school |

Other details:

- **First run:** Choose a language and school level on first launch. Both can be changed later from the top bar or mobile bottom navigation.
- **School levels:** Elementary, middle, high school, and university (`elem` · `mid` · `high` · `uni`).
- **Schedule:** Monday–Friday classes with add/edit, delete/undo, stars, sample schedules, overlap warnings, and a 1080×1920 lock-screen PNG export.
- **Search:** Use the top-bar button or `⌘K` / `Ctrl+K` to find pages, places, calendar dates, and quick links, or switch language / school level. Place search and category filters stay in the URL.
- **Calendar export:** Download upcoming, valid dates from Today and Guide as `.ics` files for your calendar app.
- **District bar (K–12):** Use location or manually choose a school district near Lane County.
- **Six languages:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語.

Brand icons live in `public/brand/`; the favicon is `public/favicon.svg`, and share images are `public/og.jpg` and `public/x-banner.jpg`.

### Stack

- **Node.js 26** (`.nvmrc` / `engines.node`)
- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** for persisted state (`13th-desk-v1`)
- Hand-drawn SVG for the GPA chart (no chart library)
- **Fonts:** Fraunces for headings and Outfit for the interface

The visual system uses a cream paper background, navy ink, electric-blue accents, and moss-green and gold supporting colors.

### Run locally

Use **Node.js 26** from `.nvmrc`. `dev:local` binds to this computer only; `npm run dev` is for the preview sandbox. Authentication and the business database are disabled; no `.env` is needed for desk features.

Install Chromium once for the full test suite (`npx playwright install chromium`). See the [shared command reference](#本地运行) and [script index](scripts/README.md).

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm ci --include=dev --ignore-scripts
npm run dev:local
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080). Useful commands:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

### Deploy

The [Verification workflow](https://github.com/9178osage/13th-desk/actions/workflows/verification.yml) runs full tests, dependency audit, type checking, lint, and production build on every push / PR. It preserves per-commit logs; Vercel deploys independently. Verify both for the same commit after publishing. [Deployment and CI details](docs/DEPLOY-CI.md).

The `eugene-desk` project is connected to **Vercel**. Every push to the GitHub `main` branch deploys automatically to:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

The repository root includes `vercel.json` for settings such as security response headers. You can also deploy locally:

```bash
npx vercel --prod
```

You must already be logged in and linked to the same Vercel project.

An older tab may request a dynamic asset that a new deployment no longer serves. The site asks before reloading and warns that unsaved input will be lost. Canceling prevents an automatic reload; the same error prompts only once per tab. Original errors still reach existing error handlers. This is asset-load recovery, not Vercel Skew Protection's client/server version locking.

### Data notes

- **Preference cookie:** `eugene-desk-prefs` mirrors only language and school level for the server-rendered first view; desk content stays in `localStorage`.
- **Multiple tabs:** Tabs in the same browser follow local saves and attempt to merge concurrent changes. Editing conflicts are still possible; there is no cross-device sync. Damaged or unsupported saves are protected from overwrite.
- Desk state—language, school level, notes, schedule, GPA rows, favorites, and similar settings—stays in the **current browser** under **`13th-desk-v1`**.
- **Backup & restore:** Under “Stored in this browser” in the sidebar, and again in the footer, you can export or import local desk data. Exports download as `eugene-desk-backup-YYYY-MM-DD.json` and include all four school levels. Use this when moving to another device or before clearing browser cache. Imports are validated strictly—bad files leave your data untouched—show per-level counts for confirmation; before overwriting, the app downloads `eugene-desk-before-import-…json` and stores a pre-import snapshot under `13th-desk-v1:pre-import` so undo survives refresh (if storage is full, it says so and relies on the downloaded file).
- **Calendar data (update each term):** University dates live in `src/data/guide.ts` plus term metadata in `src/lib/calendar-meta.ts` (label, `validThrough`, last-verified date, official link). K–12 date rows currently cover Eugene 4J only (`src/data/k12.ts`); other districts show “Reference calendar” and link to that district’s site without pretending the dates are theirs. When a term ends, the UI says so instead of going blank or stale.
- **Privacy & page stats:** The site uses Vercel Web Analytics for anonymous, cookieless page statistics: aggregate counts per page path only. No names, emails, or other personal data are collected, nothing analytics-related is stored in the browser, query strings are not recorded, and there are no custom events. The script does not load in dev or inside a framed preview.
- **Channel entry paths:** `/card`, `/isa`, `/teacher`, `/eld`, and `/poster` show the home page and are counted as separate paths, then the address bar switches to `/`. Only the slugs listed in `src/lib/channels.ts` work (add a channel with one line there); any other path is still a 404.
- **Posters:** one set per language in `public/posters/`, downloadable once deployed, e.g. [https://eugene-desk.vercel.app/posters/eugene-desk-poster-en-letter.pdf](https://eugene-desk.vercel.app/posters/eugene-desk-poster-en-letter.pdf). Each language has `-letter.pdf` (US Letter print), `-letter.png` (1632×2112 at 192 DPI, prints at 8.5×11 in) and `-story.png` (1080×1920 at 96 DPI); dimensions match across languages for each format. Language codes are `en`, `zh`, `es`, `ko`, `vi`, `ja`. The QR code opens the `/poster` channel. Copy lives in `scripts/posters/copy.mjs`; run `npm run posters` to regenerate instead of editing the outputs.
- Location hours, calendar dates, and similar details are reference information; check each institution's official website for the latest information.
- GPA is an estimation tool, not an official transcript or grades record.
- The repository has previously been called Eugene Student Web, 13th-desk, and 河谷校园仪表盘; the current product brand is **Eugene Desk**.

---

## Español

**Eugene Desk** es un escritorio estudiantil para Eugene, Oregón: la densidad de un panel de «¿qué tengo que hacer hoy?» con la sensación de un escritorio de papel cálido.

**Demo en vivo:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**Repositorio:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

El escritorio **no requiere cuenta ni base de datos**. Idioma, nivel escolar, horario, notas, filas de GPA y otras preferencias se guardan en el `localStorage` del navegador actual con la clave **`13th-desk-v1`**. No renombres esa clave o los datos locales dejarán de encontrarse.

### Funciones

| Página               | Qué incluye                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Hoy** `/`          | Pendientes, horario semanal, cuenta atrás para la próxima clase, clases de hoy, clima, enlaces y próximas fechas      |
| **Campus** `/campus` | Universidad: bibliotecas, comedores y horarios; K–12: tarjetas de campus por distrito                                 |
| **Ciudad** `/town`   | Lugares después de clases y fuera del campus, con textos y categorías según el nivel                                  |
| **Guía** `/guide`    | Universidad: lista de llegada, fechas límite y enlaces de ayuda; guías según el nivel en K–12                         |
| **GPA** `/gpa`       | GPA por nivel, combinación con GPA / créditos previos, metas y gráficos; GPA sin ponderar y ponderado en preparatoria |

Otros detalles:

- **Primera vez:** Elige idioma y nivel escolar al abrir. Luego puedes cambiarlos en la barra superior o en la navegación inferior del móvil.
- **Niveles:** Primaria, secundaria, preparatoria y universidad (`elem` · `mid` · `high` · `uni`).
- **Horario:** Clases de lunes a viernes con edición, eliminación y deshacer, estrellas, ejemplos, avisos de solapamiento y exportación PNG de 1080×1920 para la pantalla de bloqueo.
- **Búsqueda:** Botón superior o `⌘K` / `Ctrl+K` para páginas, lugares, fechas, enlaces y cambio de idioma / nivel. Los filtros y la búsqueda de lugares quedan en la URL.
- **Calendario:** Exporta las próximas fechas vigentes de Hoy y Guía como archivos `.ics`.
- **Barra de distrito (K–12):** Usa la ubicación o elige a mano un distrito cerca del condado de Lane.
- **Seis idiomas:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語.

Los iconos de marca están en `public/brand/`; el favicon es `public/favicon.svg` y las imágenes para compartir son `public/og.jpg` y `public/x-banner.jpg`.

### Stack

- **Node.js 26** (`.nvmrc` / `engines.node`)
- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** para el estado persistente (`13th-desk-v1`)
- SVG propio para el gráfico de GPA (sin librería de gráficos)
- **Fuentes:** Fraunces en títulos y Outfit en la interfaz

La imagen visual usa fondo de papel crema, tinta navy, acentos azul eléctrico, y verdes musgo y dorado de apoyo.

### Ejecutar en local

Usa **Node.js 26** según `.nvmrc`. `dev:local` solo escucha en este equipo; `npm run dev` es para el entorno de vista previa. No hace falta crear `.env` para el escritorio.

Instala Chromium una vez para las pruebas completas: `npx playwright install chromium`. Consulta los [comandos compartidos](#本地运行) y el [índice de scripts](scripts/README.md).

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm ci --include=dev --ignore-scripts
npm run dev:local
```

Abre [http://127.0.0.1:8080](http://127.0.0.1:8080). Comandos útiles:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

### Despliegue

[Verification](https://github.com/9178osage/13th-desk/actions/workflows/verification.yml) ejecuta pruebas completas, auditoría de dependencias, tipos, lint y compilación en cada push / PR. Vercel se despliega por separado: verifica ambos para el mismo commit. [Despliegue y CI](docs/DEPLOY-CI.md).

El proyecto `eugene-desk` está conectado a **Vercel**. Cada push a la rama `main` de GitHub se publica automáticamente en:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

En la raíz del repositorio hay un `vercel.json` (cabeceras de seguridad, etc.). También puedes desplegar en local:

```bash
npx vercel --prod
```

Debes estar autenticado y vinculado al mismo proyecto de Vercel.

### Notas sobre los datos

- **Cookie de preferencias:** `eugene-desk-prefs` solo refleja idioma y nivel para la primera vista del servidor; el contenido sigue en `localStorage`.
- **Varias pestañas:** Siguen los guardados del mismo navegador e intentan combinar cambios simultáneos. Aún puede haber conflictos; no hay sincronización entre dispositivos. Los guardados dañados o incompatibles se protegen contra sobrescritura.
- El estado del escritorio—idioma, nivel, notas, horario, filas de GPA, favoritos y ajustes similares—queda en el **navegador actual** bajo **`13th-desk-v1`**.
- **Copia y restauración:** Debajo de «Guardado en este navegador» en la barra lateral, y también en el pie de página, puedes exportar o importar los datos locales. El archivo se descarga como `eugene-desk-backup-YYYY-MM-DD.json` e incluye los cuatro niveles escolares. Úsalo al cambiar de dispositivo o antes de borrar la caché del navegador. La importación valida el archivo con rigor—si está dañado, no se cambia nada—, muestra conteos por nivel para confirmar; antes de sobrescribir, descarga `eugene-desk-before-import-…json` y guarda una copia previa en `13th-desk-v1:pre-import`, así que se puede deshacer incluso después de recargar (si el almacenamiento está lleno, lo avisa y queda el archivo descargado).
- **Privacidad y estadísticas:** El sitio usa Vercel Web Analytics para estadísticas anónimas y sin cookies: solo conteos agregados por ruta de página. No se recogen nombres, correos ni otros datos personales, no se guarda nada de estadísticas en el navegador, no se registran parámetros de consulta y no hay eventos personalizados. El script no se carga en desarrollo ni dentro de una vista previa enmarcada.
- **Rutas de canal:** `/card`, `/isa`, `/teacher`, `/eld` y `/poster` muestran la página de inicio y se cuentan como rutas separadas; después la barra de direcciones cambia a `/`. Solo funcionan los nombres de `src/lib/channels.ts` (un canal nuevo es una línea ahí); cualquier otra ruta sigue dando 404.
- **Carteles:** un juego por idioma en `public/posters/`, descargable una vez desplegado, p. ej. [https://eugene-desk.vercel.app/posters/eugene-desk-poster-es-letter.pdf](https://eugene-desk.vercel.app/posters/eugene-desk-poster-es-letter.pdf). Cada idioma tiene `-letter.pdf` (impresión US Letter), `-letter.png` (1632×2112 a 192 DPI, se imprime a 8,5×11 pulgadas) y `-story.png` (1080×1920 a 96 DPI); las dimensiones coinciden entre idiomas en cada formato. Códigos: `en`, `zh`, `es`, `ko`, `vi`, `ja`. El código QR abre el canal `/poster`. Los textos están en `scripts/posters/copy.mjs`; ejecuta `npm run posters` para regenerarlos en vez de editar los archivos.
- **Calendario:** Las fechas universitarias se actualizan en `src/data/guide.ts` y `src/lib/calendar-meta.ts`. Las filas K–12 solo cubren Eugene 4J; otros distritos muestran «Calendario de referencia».
- Horarios de lugares, fechas del calendario y detalles parecidos son información de referencia; confirma en el sitio oficial de cada institución.
- El GPA es una herramienta de estimación, no un expediente ni calificaciones oficiales.
- El repositorio se ha llamado Eugene Student Web, 13th-desk y 河谷校园仪表盘; la marca actual del producto es **Eugene Desk**.

---

## 한국어

**Eugene Desk**는 오리건주 Eugene을 위한 학생 데스크입니다. 「오늘 뭐 해야 하지?」에 맞는 대시보드 밀도와, 따뜻한 종이 질감의 책상 느낌을 함께 담았습니다.

**라이브 데모:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**저장소:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

데스크 기능은 **로그인이나 데이터베이스가 필요 없습니다**. 언어, 학령, 시간표, 메모, GPA 행 등은 현재 브라우저의 `localStorage`에 **`13th-desk-v1`** 키로 저장됩니다. 이 키 이름을 바꾸면 기존 로컬 데이터를 찾지 못합니다.

### 기능

| 페이지               | 내용                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------- |
| **오늘** `/`         | 할 일, 주간 시간표, 다음 수업 카운트다운, 오늘 수업, 날씨, 바로가기와 다가오는 학사일정 |
| **캠퍼스** `/campus` | 대학: 도서관·식당 등 장소와 운영 시간; K–12: 학군별 캠퍼스 카드                         |
| **시내** `/town`     | 방과 후·교외 장소 (학령에 따라 문구와 분류 조정)                                        |
| **가이드** `/guide`  | 대학: 도착 체크리스트, 마감, 도움 링크; K–12: 학령에 맞는 가이드                        |
| **GPA** `/gpa`       | 학령별 GPA, 기존 GPA·학점 합산, 목표 추정과 차트; 고등학교 비가중·가중 GPA              |

기타:

- **첫 실행:** 언어와 학령을 고릅니다. 이후 상단 바나 모바일 하단 내비에서 언제든 바꿀 수 있습니다.
- **학령:** 초등 / 중학교 / 고등 / 대학 (`elem` · `mid` · `high` · `uni`)
- **시간표:** 월–금 수업 추가·수정, 삭제·실행 취소, 별표, 예시, 시간 겹침 안내와 1080×1920 잠금 화면 PNG 내보내기
- **검색:** 상단 버튼 또는 `⌘K` / `Ctrl+K`로 페이지·장소·학사일정·바로가기를 찾고 언어·학령을 바꿉니다. 장소 검색과 분류는 URL에 유지됩니다.
- **일정 내보내기:** 오늘과 가이드에서 아직 지나지 않은 유효 날짜를 `.ics` 파일로 내려받습니다.
- **학군 바 (K–12):** 위치 사용 또는 Lane 카운티 근처 학군 직접 선택
- **여섯 언어:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

브랜드 아이콘은 `public/brand/`, favicon은 `public/favicon.svg`, 공유 이미지는 `public/og.jpg`와 `public/x-banner.jpg`에 있습니다.

### 기술 스택

- **Node.js 26** (`.nvmrc` / `engines.node`)
- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** (persist → `13th-desk-v1`)
- 직접 그린 SVG (GPA 차트, 차트 라이브러리 없음)
- **폰트:** 제목 Fraunces, UI Outfit

비주얼은 크림색 종이 배경, 네이비 잉크, 일렉트릭 블루 액센트, 보조색으로 이끼 초록과 골드입니다.

### 로컬 실행

`.nvmrc`의 **Node.js 26**을 사용하세요. `dev:local`은 이 컴퓨터에서만 접속하며 `npm run dev`는 프리뷰 환경용입니다. 데스크 기능에 `.env`는 필요 없습니다.

전체 테스트를 위해 Chromium을 한 번 설치하세요: `npx playwright install chromium`. [공통 명령](#本地运行)과 [스크립트 안내](scripts/README.md)를 참고하세요.

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm ci --include=dev --ignore-scripts
npm run dev:local
```

[http://127.0.0.1:8080](http://127.0.0.1:8080) 을 엽니다. 자주 쓰는 명령:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

### 배포

[Verification](https://github.com/9178osage/13th-desk/actions/workflows/verification.yml)은 push / PR마다 전체 테스트, 의존성 검사, 타입, lint, 프로덕션 빌드를 실행합니다. Vercel 배포는 별도로 진행되므로 같은 커밋의 두 결과를 모두 확인합니다. [배포와 CI](docs/DEPLOY-CI.md).

`eugene-desk` 프로젝트가 **Vercel**에 연결되어 있습니다. GitHub `main`에 푸시하면 자동으로 배포됩니다:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

저장소 루트에 `vercel.json`이 있습니다 (보안 응답 헤더 등). 로컬에서도:

```bash
npx vercel --prod
```

같은 Vercel 프로젝트에 로그인해 연결해 두어야 합니다.

### 데이터 안내

- **환경설정 쿠키:** `eugene-desk-prefs`는 서버의 첫 화면을 위한 언어·학령만 담고, 데스크 내용은 `localStorage`에 남습니다.
- **여러 탭:** 같은 브라우저의 저장 내용을 반영하고 동시 변경 병합을 시도합니다. 충돌은 여전히 가능하며 기기 간 동기화는 없습니다. 손상되거나 지원하지 않는 저장본은 덮어쓰지 않도록 보호합니다.
- 데스크 상태(언어, 학령, 메모, 시간표, GPA 행, 즐겨찾기 등)는 **현재 브라우저**에만 있으며 키는 **`13th-desk-v1`** 입니다.
- **백업 및 복원:** 사이드바의 「이 브라우저에 저장」 아래와 페이지 하단에서 로컬 데이터를 내보내거나 가져올 수 있습니다. 파일 이름은 `eugene-desk-backup-YYYY-MM-DD.json`이며 네 학령 단계의 데이터를 모두 포함합니다. 다른 기기로 옮기거나 브라우저 캐시를 지우기 전에 백업해 두세요. 가져오기는 엄격히 검사하며, 잘못된 파일은 기존 데이터를 건드리지 않습니다. 확인 전에 학령별 할 일·수업 수를 보여 줍니다. 덮어쓰기 전에 `eugene-desk-before-import-…json`을 자동으로 내려받고, 가져오기 전 스냅샷을 별도 키 `13th-desk-v1:pre-import`에 저장하므로 새로고침한 뒤에도 실행 취소할 수 있습니다(저장 공간이 가득 차면 알려 주고 내려받은 파일에 의존합니다).
- **개인정보와 방문 통계:** Vercel Web Analytics로 쿠키 없는 익명 방문 통계를 냅니다. 페이지 경로별 합계만 기록하며 이름·이메일 등 개인정보는 수집하지 않고, 브라우저에 통계 데이터를 저장하지 않으며, 쿼리 문자열과 사용자 정의 이벤트도 기록하지 않습니다. 개발 환경과 프리뷰 iframe에서는 스크립트를 불러오지 않습니다.
- **채널 입구:** `/card`, `/isa`, `/teacher`, `/eld`, `/poster`는 홈 화면을 보여 주고 통계에서 각각 따로 집계되며, 그다음 주소창이 `/`로 바뀝니다. `src/lib/channels.ts`에 있는 이름만 동작하고(새 채널은 거기에 한 줄 추가), 그 밖의 경로는 그대로 404입니다.
- **포스터:** 언어마다 한 세트씩 `public/posters/`에 있고, 배포 후 바로 내려받을 수 있습니다. 예: [https://eugene-desk.vercel.app/posters/eugene-desk-poster-ko-letter.pdf](https://eugene-desk.vercel.app/posters/eugene-desk-poster-ko-letter.pdf). 언어마다 `-letter.pdf`(US Letter 인쇄용), `-letter.png`(1632×2112, 192 DPI, 8.5×11인치 인쇄), `-story.png`(1080×1920, 96 DPI 휴대폰/SNS용) 세 파일이 있으며, 형식별 크기는 모든 언어에서 같습니다. 언어 코드는 `en`, `zh`, `es`, `ko`, `vi`, `ja`입니다. QR 코드는 `/poster` 채널로 연결됩니다. 문구는 `scripts/posters/copy.mjs`에 있으며, 결과 파일을 직접 고치지 말고 `npm run posters`로 다시 만듭니다.
- **학사일정:** 대학 날짜는 `src/data/guide.ts`와 `src/lib/calendar-meta.ts`에서 학기마다 갱신합니다. K–12 날짜는 현재 Eugene 4J만 수록되어 있으며, 다른 학군은 「참고 학사일정」으로 표시합니다.
- 장소 운영 시간·학사일정 등은 참고용입니다. 최신 정보는 각 기관 공식 사이트를 확인하세요.
- GPA는 추정 도구이며 공식 성적표가 아닙니다.
- 저장소는 예전에 Eugene Student Web, 13th-desk, 河谷校园仪表盘 등으로 불렸고, 현재 제품 브랜드는 **Eugene Desk**입니다.

---

## Tiếng Việt

**Eugene Desk** là bàn học dành cho học sinh, sinh viên ở Eugene, Oregon: mật độ của một bảng điều khiển 「hôm nay cần làm gì?」 kết hợp cảm giác bàn giấy ấm.

**Demo trực tiếp:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**Kho mã nguồn:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

Chức năng bàn học **không cần đăng nhập hay cơ sở dữ liệu**. Ngôn ngữ, cấp học, thời khóa biểu, ghi chú, dòng GPA và các tùy chọn khác được lưu trong `localStorage` của trình duyệt hiện tại với khóa **`13th-desk-v1`**. Đừng đổi tên khóa này, nếu không dữ liệu cục bộ sẽ không còn được tìm thấy.

### Tính năng

| Trang                  | Nội dung                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Hôm nay** `/`        | Việc cần làm, lịch tuần, đếm ngược đến tiết tiếp theo, lớp hôm nay, thời tiết, lối tắt và ngày sắp tới |
| **Campus** `/campus`   | Đại học: thư viện, căn tin và giờ mở cửa; K–12: thẻ campus theo học khu                                |
| **Phố** `/town`        | Địa điểm sau giờ học / ngoài khuôn viên (chữ và danh mục đổi theo cấp)                                 |
| **Hướng dẫn** `/guide` | Đại học: checklist đến trường, hạn chót, liên kết trợ giúp; K–12: hướng dẫn theo cấp                   |
| **GPA** `/gpa`         | GPA theo cấp, kết hợp GPA / tín chỉ đã có, mục tiêu và biểu đồ; GPA thường và có trọng số ở THPT       |

Chi tiết khác:

- **Lần đầu mở:** Chọn ngôn ngữ và cấp học. Sau đó đổi được từ thanh trên hoặc thanh điều hướng dưới trên điện thoại.
- **Cấp học:** Tiểu học / THCS / THPT / đại học (`elem` · `mid` · `high` · `uni`)
- **Thời khóa biểu:** Thứ Hai–Thứ Sáu, thêm/sửa, xóa/hoàn tác, đánh sao, lịch mẫu, báo trùng giờ và xuất PNG màn hình khóa 1080×1920.
- **Tìm kiếm:** Nút trên cùng hoặc `⌘K` / `Ctrl+K` để tìm trang, địa điểm, ngày, lối tắt và đổi ngôn ngữ / cấp học. Tìm kiếm và bộ lọc địa điểm nằm trong URL.
- **Xuất lịch:** Tải các ngày sắp tới còn hiệu lực từ Hôm nay và Hướng dẫn thành tệp `.ics`.
- **Thanh học khu (K–12):** Dùng vị trí hoặc chọn thủ công học khu gần Lane County
- **Sáu ngôn ngữ:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

Biểu tượng thương hiệu ở `public/brand/`; favicon là `public/favicon.svg`, ảnh chia sẻ là `public/og.jpg` và `public/x-banner.jpg`.

### Công nghệ

- **Node.js 26** (`.nvmrc` / `engines.node`)
- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** (persist → `13th-desk-v1`)
- SVG tự vẽ (biểu đồ GPA, không dùng thư viện biểu đồ)
- **Font:** Fraunces cho tiêu đề, Outfit cho giao diện

Giao diện dùng nền giấy kem, mực navy, điểm nhấn xanh điện, cùng xanh rêu và vàng hỗ trợ.

### Chạy trên máy

Dùng **Node.js 26** theo `.nvmrc`. `dev:local` chỉ lắng nghe trên máy này; `npm run dev` dành cho môi trường xem trước. Bàn học không cần tệp `.env`.

Cài Chromium một lần cho bộ kiểm thử đầy đủ: `npx playwright install chromium`. Xem [lệnh dùng chung](#本地运行) và [chỉ mục script](scripts/README.md).

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm ci --include=dev --ignore-scripts
npm run dev:local
```

Mở [http://127.0.0.1:8080](http://127.0.0.1:8080). Lệnh hay dùng:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

### Triển khai

[Verification](https://github.com/9178osage/13th-desk/actions/workflows/verification.yml) chạy kiểm thử đầy đủ, kiểm tra bảo mật phụ thuộc, kiểu, lint và bản dựng trong mỗi push / PR. Vercel triển khai riêng; cần kiểm tra cả hai cho cùng một commit. [Triển khai và CI](docs/DEPLOY-CI.md).

Dự án `eugene-desk` đã nối với **Vercel**. Mỗi lần đẩy lên nhánh `main` trên GitHub sẽ tự triển khai tới:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

Thư mục gốc có `vercel.json` (header bảo mật…). Cũng có thể chạy cục bộ:

```bash
npx vercel --prod
```

Bạn cần đã đăng nhập và liên kết cùng một dự án Vercel.

### Ghi chú dữ liệu

- **Cookie tùy chọn:** `eugene-desk-prefs` chỉ ghi ngôn ngữ và cấp học để dựng màn hình đầu tiên từ máy chủ; nội dung bàn học vẫn ở `localStorage`.
- **Nhiều thẻ:** Các thẻ cùng trình duyệt theo dõi bản lưu và thử hợp nhất thay đổi đồng thời. Vẫn có thể xung đột; không đồng bộ giữa thiết bị. Bản lưu hỏng hoặc không được hỗ trợ được bảo vệ khỏi ghi đè.
- Trạng thái bàn học—ngôn ngữ, cấp, ghi chú, thời khóa biểu, dòng GPA, yêu thích…—chỉ nằm trong **trình duyệt hiện tại** với khóa **`13th-desk-v1`**.
- **Sao lưu và khôi phục:** Ngay dưới 「Lưu trong trình duyệt này」 trên thanh bên, và ở chân trang, bạn có thể xuất hoặc nhập dữ liệu cục bộ. Tệp tải về tên `eugene-desk-backup-YYYY-MM-DD.json`, gồm đủ bốn bậc học. Hãy xuất trước khi chuyển máy hoặc xóa bộ nhớ đệm trình duyệt. Nhập vào được kiểm tra nghiêm ngặt—tệp hỏng không đụng tới dữ liệu hiện có—hiển thị số việc/lớp theo từng bậc để xác nhận; trước khi ghi đè, ứng dụng tự tải `eugene-desk-before-import-…json` và lưu bản chụp trước khi nhập vào khóa riêng `13th-desk-v1:pre-import`, nên vẫn hoàn tác được sau khi tải lại trang (nếu bộ nhớ đầy, sẽ báo và dựa vào tệp đã tải).
- **Quyền riêng tư và thống kê:** Trang dùng Vercel Web Analytics để thống kê ẩn danh, không cookie: chỉ đếm tổng theo đường dẫn trang. Không thu thập tên, email hay dữ liệu cá nhân, không lưu dữ liệu thống kê trong trình duyệt, không ghi tham số truy vấn và không có sự kiện tùy chỉnh. Script không tải trong môi trường dev hay trong khung xem trước.
- **Đường dẫn kênh:** `/card`, `/isa`, `/teacher`, `/eld` và `/poster` hiện trang chủ và được đếm riêng, sau đó thanh địa chỉ đổi về `/`. Chỉ các tên trong `src/lib/channels.ts` hoạt động (thêm kênh chỉ cần một dòng ở đó); đường dẫn khác vẫn trả 404.
- **Áp phích:** mỗi ngôn ngữ một bộ trong `public/posters/`, tải được sau khi triển khai, ví dụ [https://eugene-desk.vercel.app/posters/eugene-desk-poster-vi-letter.pdf](https://eugene-desk.vercel.app/posters/eugene-desk-poster-vi-letter.pdf). Mỗi ngôn ngữ có `-letter.pdf` (in khổ US Letter), `-letter.png` (1632×2112 ở 192 DPI, in đúng 8,5×11 inch) và `-story.png` (1080×1920 ở 96 DPI); kích thước của mỗi định dạng giống nhau ở mọi ngôn ngữ. Mã ngôn ngữ: `en`, `zh`, `es`, `ko`, `vi`, `ja`. Mã QR mở kênh `/poster`. Nội dung nằm trong `scripts/posters/copy.mjs`; chạy `npm run posters` để tạo lại, không sửa tay các tệp đầu ra.
- **Lịch học:** Ngày đại học cập nhật trong `src/data/guide.ts` và `src/lib/calendar-meta.ts`. Hàng K–12 hiện chỉ có Eugene 4J; học khu khác hiện 「Lịch tham khảo」.
- Giờ mở cửa địa điểm, ngày trong lịch… chỉ mang tính tham khảo; hãy đối chiếu trang chính thức của từng cơ sở.
- GPA là công cụ ước lượng, không phải bảng điểm chính thức.
- Kho từng mang tên Eugene Student Web, 13th-desk và 河谷校园仪表盘; thương hiệu sản phẩm hiện tại là **Eugene Desk**.

---

## 日本語

**Eugene Desk** は、オレゴン州 Eugene 向けの学生デスクです。「今日、何をすればいい？」に答えるダッシュボードの密度と、あたたかい紙の質感の机をあわせています。

**ライブデモ:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**リポジトリ:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

デスク機能に **ログインもデータベースも不要** です。言語・学年段階・時間割・メモ・GPA 行などの設定は、現在のブラウザの `localStorage` に **`13th-desk-v1`** というキーで保存されます。このキー名を変えると、既存のローカルデータが見つからなくなります。

### 機能

| ページ                   | 内容                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **今日** `/`             | やること、週間時間割、次の授業までの時間、今日の授業、天気、ショートカット、直近の学年暦 |
| **キャンパス** `/campus` | 大学：図書館・食堂などの場所と開館時間；K–12：学区ごとのキャンパスカード                 |
| **街** `/town`           | 放課後・キャンパス外の場所（学年段階に合わせて文言と分類を調整）                         |
| **ガイド** `/guide`      | 大学：到着チェックリスト、締切、ヘルプリンク；K–12：段階に応じたガイド                   |
| **GPA** `/gpa`           | 段階別GPA、既存GPA・単位との合算、目標の試算とチャート；高校は非加重・加重GPAに対応      |

その他：

- **初回起動:** 言語と学年段階を選びます。あとから上部バーやモバイル下部ナビでも変更できます。
- **学年段階:** 小学校 / 中学校 / 高校 / 大学（`elem` · `mid` · `high` · `uni`）
- **時間割:** 月〜金の授業の追加・編集、削除と取り消し、スター、サンプル、時間重複の表示、1080×1920のロック画面PNGの書き出しに対応
- **検索:** 上部のボタンまたは `⌘K` / `Ctrl+K` でページ・場所・日付・リンクを探し、言語や段階も切り替えられます。場所の検索と分類はURLに保存されます。
- **カレンダー出力:** 今日とガイドから、まだ過ぎていない有効な日付を `.ics` ファイルで保存できます。
- **学区バー（K–12）:** 位置情報を使うか、Lane 郡付近の学区を手動で選ぶ
- **6言語:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

ブランドアイコンは `public/brand/`、favicon は `public/favicon.svg`、共有画像は `public/og.jpg` と `public/x-banner.jpg` にあります。

### 技術スタック

- **Node.js 26** (`.nvmrc` / `engines.node`)
- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand**（persist → `13th-desk-v1`）
- 手書き SVG（GPA チャート、グラフライブラリなし）
- **フォント:** 見出し Fraunces、UI Outfit

ビジュアルはクリーム紙の背景、ネイビーのインク、エレクトリックブルーのアクセント、補助色に苔緑とゴールドです。

### ローカル実行

`.nvmrc` の **Node.js 26** を使います。`dev:local` はこの端末だけで接続でき、`npm run dev` はプレビュー環境用です。デスク機能に `.env` は不要です。

全テスト用にChromiumを一度インストールします：`npx playwright install chromium`。[共通コマンド](#本地运行)と[スクリプト一覧](scripts/README.md)も参照してください。

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm ci --include=dev --ignore-scripts
npm run dev:local
```

[http://127.0.0.1:8080](http://127.0.0.1:8080) を開きます。よく使うコマンド：

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
```

### デプロイ

[Verification](https://github.com/9178osage/13th-desk/actions/workflows/verification.yml) はpush / PRごとに全テスト、依存関係の監査、型検査、lint、本番ビルドを実行します。Vercelは独立してデプロイするため、同じコミットの両方の結果を確認します。[デプロイとCI](docs/DEPLOY-CI.md)。

`eugene-desk` プロジェクトは **Vercel** に接続済みです。GitHub の `main` への push で自動デプロイされます：

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

リポジトリ直下に `vercel.json` があります（セキュリティ応答ヘッダなど）。ローカルからも：

```bash
npx vercel --prod
```

同じ Vercel プロジェクトにログイン・リンク済みである必要があります。

### データについて

- **設定Cookie:** `eugene-desk-prefs` はサーバーの初期表示用に言語と段階だけを保持します。デスクの内容は `localStorage` が管理します。
- **複数タブ:** 同じブラウザ内の保存を反映し、同時変更のマージを試みます。編集の競合はあり得ます。端末間の同期はありません。破損・非対応の保存データは上書きから保護します。
- デスクの状態（言語、学年段階、メモ、時間割、GPA 行、お気に入りなど）は **現在のブラウザのみ** にあり、キーは **`13th-desk-v1`** です。
- **バックアップと復元:** サイドバーの「このブラウザに保存」の下、およびページフッターから、ローカルデータを書き出したり取り込んだりできます。ファイル名は `eugene-desk-backup-YYYY-MM-DD.json` で、4つの学校区分すべての状態を含みます。端末を変える前やブラウザのキャッシュを消す前に書き出してください。取り込みは厳格に検証し、壊れたファイルでは既存データを変えません。確認画面で区分ごとのやること・授業数を示します。上書き前に `eugene-desk-before-import-…json` を自動でダウンロードし、取り込み前のスナップショットを別キー `13th-desk-v1:pre-import` に保存するので、再読み込み後も元に戻せます（保存容量が足りない場合はその旨を表示し、ダウンロード済みファイルを頼りにします）。
- **プライバシーとアクセス統計:** Vercel Web Analytics で Cookie を使わない匿名のアクセス統計を取っています。ページのパスごとの合計数だけを記録し、名前やメールなどの個人情報は集めず、統計データをブラウザに保存せず、クエリ文字列やカスタムイベントも記録しません。開発環境とプレビューの iframe ではスクリプトを読み込みません。
- **チャネル入口:** `/card`、`/isa`、`/teacher`、`/eld`、`/poster` はホーム画面を表示し、統計では別々に数えられ、その後アドレスバーは `/` に戻ります。`src/lib/channels.ts` に載っている名前だけが有効で（新しいチャネルはそこに1行追加）、それ以外のパスは今まで通り 404 です。
- **ポスター:** 言語ごとに1セットを `public/posters/` に置き、公開後はそのままダウンロードできます。例: [https://eugene-desk.vercel.app/posters/eugene-desk-poster-ja-letter.pdf](https://eugene-desk.vercel.app/posters/eugene-desk-poster-ja-letter.pdf)。各言語に `-letter.pdf`（US Letter 印刷用）、`-letter.png`（1632×2112、192 DPI、8.5×11インチ印刷）、`-story.png`（1080×1920、96 DPI スマホ・SNS 用）の3ファイルがあり、形式ごとの寸法は全言語で統一されています。言語コードは `en`、`zh`、`es`、`ko`、`vi`、`ja` です。QR コードは `/poster` チャネルを開きます。文言は `scripts/posters/copy.mjs` にあり、出力ファイルは手で直さず `npm run posters` で作り直します。
- **学年暦:** 大学の日付は `src/data/guide.ts` と `src/lib/calendar-meta.ts` を学期ごとに更新します。K–12 の日付行は現状 Eugene 4J のみ。「参考カレンダー」表示で他学区の公式サイトへ案内します。
- 場所の開館時間や学年暦などは参考情報です。最新は各機関の公式サイトで確認してください。
- GPA は推定ツールであり、公式の成績表ではありません。
- リポジトリはかつて Eugene Student Web、13th-desk、河谷校园仪表盘 などと呼ばれていました。現在の製品ブランドは **Eugene Desk** です。
