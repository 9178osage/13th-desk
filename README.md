# 河谷校园仪表盘 · Eugene Student Web

Chinese-first student portal for Eugene, Oregon — courses overview, todos, announcements, and campus shortcuts. Built on TanStack React (Vite) with browser-only state (no auth / no DB required for the desk).

**Stack:** Vite · React · TanStack Router · Tailwind · zustand  
**Repo:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

## Visual
- Deep navy text, ice-gray background, electric-blue CTA
- Fonts: Fraunces (display) + Outfit (UI)
- Home leads with **今天要做什么** / What to do today

## Pages
- **今日** — next class, schedule, tasks (today/week), announcements, shortcuts, deadlines
- **校园 / 城里 / 指南 / 绩点** — existing campus, town, guide, GPA tools

## Run locally
```bash
cd "Eugene Student Web"   # or clone this repo
npm install
npm run dev
```
Open http://localhost:8080

Optional checks:
```bash
npm run typecheck
npm run build
```

Notes stay in this browser (`13th-desk-v1`). Language and school level are in the header (and mobile tab bar).

## 中文
**河谷校园仪表盘** 是尤金学生门户预览：今日待办、课表、公告、快捷入口。无需登录或数据库即可使用书桌功能。

```bash
npm install
npm run dev
```
打开 http://localhost:8080
