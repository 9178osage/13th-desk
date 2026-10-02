# Eugene Desk

尤金学生书桌 —— 把「今天要做什么」的仪表盘密度，和温暖纸感书桌合在一起。

**在线演示：** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**仓库：** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

书桌功能**不需要登录或数据库**。语言、学段、课表、笔记、绩点等存在本机浏览器的 `localStorage`（键名 `13th-desk-v1`，请勿改名以免丢数据）。

---

## 功能

| 页面 | 说明 |
|------|------|
| **今日** `/` | 今日待办、本周任务、公告、快捷入口、天气、今日节奏 |
| **校园** `/campus` | 大学：图书馆 / 食堂等场所与开放时间；K12：学区校园卡片 |
| **城里** `/town` | 放学后 / 校外场所（按学段调整文案与分类） |
| **指南** `/guide` | 大学：到校清单、截止日期、帮助链接；K12：对应学段指南 |
| **绩点** `/gpa` | 学分绩点估算与图表（非正式成绩单） |

其它：

- **首次打开**：语言 + 学段选择（顶栏与移动端底栏可随时改）
- **学段**：小学 / 初中 / 高中 / 大学（`elem` · `mid` · `high` · `uni`）
- **课表**：周一至周五时段，可置顶
- **学区条**（K12）：可选定位或手动选 Lane 县附近学区
- **六种语言**：English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

品牌资源在 `public/brand/`（logo、mark、favicon 等）。

---

## 技术栈

- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand**（persist → `13th-desk-v1`）
- **Recharts**（GPA 图）
- 字体：Fraunces（标题）+ Outfit（界面）

视觉：奶油纸底 + 海军墨色 + 电蓝点缀；辅色苔绿与金色。

---

## 本地运行

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm install
npm run dev
```

打开 [http://localhost:8080](http://localhost:8080)。

常用命令：

```bash
npm run typecheck
npm run build
npm run preview
```

---

## 部署

已连接 **Vercel** 项目 `eugene-desk`，推送到 GitHub `main` 会自动部署到：

https://eugene-desk.vercel.app

仓库根目录有 `vercel.json`（安全响应头等）。本地也可：

```bash
npx vercel --prod
```

（需已登录并链到同一 Vercel 项目。）

---

## 数据与说明

- 书桌状态（语言、学段、笔记、课表、绩点行、收藏等）只存在**当前浏览器**，键名 **`13th-desk-v1`**。
- 场所开放时间、公告等为参考信息；以各机构官网为准。
- GPA 为估算工具，不以成绩单为准。
- 仓库历史名曾为 Eugene Student Web / 13th-desk / 河谷校园仪表盘；产品品牌现为 **Eugene Desk**。

---

## English

**Eugene Desk** is a student dashboard for Eugene, Oregon, combining a dense “what do I need to do today?” home screen with the feel of a warm, paper-textured desk.

**Live demo:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**Repository:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

The desk does **not require an account or a database**. Language, school level, schedule, notes, GPA rows, and other preferences are stored in the current browser's `localStorage` under **`13th-desk-v1`**. Do not rename this key or existing local data will no longer be found.

### Features

| Page | What it includes |
|------|------------------|
| **Today** `/` | Today's to-dos, weekly tasks, announcements, quick links, weather, and the day's rhythm |
| **Campus** `/campus` | University locations such as libraries and dining halls with hours; K–12 campus cards by district |
| **Town** `/town` | After-school and off-campus places, with copy and categories adjusted by school level |
| **Guide** `/guide` | University arrival checklist, deadlines, and help links; level-appropriate guides for K–12 |
| **GPA** `/gpa` | A credit-weighted GPA estimator with charts (not an official transcript) |

Other details:

- **First run:** Choose a language and school level on first launch. Both can be changed later from the top bar or mobile bottom navigation.
- **School levels:** Elementary, middle, high school, and university (`elem` · `mid` · `high` · `uni`).
- **Schedule:** Monday–Friday time slots, with the option to pin items.
- **District bar (K–12):** Use location or manually choose a school district near Lane County.
- **Six languages:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語.

Brand assets live in `public/brand/` (logo, mark, favicon, and related files).

### Stack

- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** for persisted state (`13th-desk-v1`)
- **Recharts** for the GPA chart
- **Fonts:** Fraunces for headings and Outfit for the interface

The visual system uses a cream paper background, navy ink, electric-blue accents, and moss-green and gold supporting colors.

### Run locally

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). Useful commands:

```bash
npm run typecheck
npm run build
npm run preview
```

### Deploy

The `eugene-desk` project is connected to **Vercel**. Every push to the GitHub `main` branch deploys automatically to:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

The repository root includes `vercel.json` for settings such as security response headers. You can also deploy locally:

```bash
npx vercel --prod
```

You must already be logged in and linked to the same Vercel project.

### Data notes

- Desk state—language, school level, notes, schedule, GPA rows, favorites, and similar settings—stays in the **current browser** under **`13th-desk-v1`**.
- Location hours, announcements, and similar details are reference information; check each institution's official website for the latest information.
- GPA is an estimation tool, not an official transcript or grades record.
- The repository has previously been called Eugene Student Web, 13th-desk, and 河谷校园仪表盘; the current product brand is **Eugene Desk**.
