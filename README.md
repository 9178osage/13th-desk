# 13th Desk · 河谷

Eugene student desk — a fusion of the warm **13th Desk / 尤金学生网** paper desk and the dense **河谷校园仪表盘** home. Chinese-first by default, six languages, no auth or database required for the desk.

**Stack:** Vite · React · TanStack Router · Tailwind · zustand · Recharts  
**Repo:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

## Visual fusion
- Cream paper background + navy ink + one electric-blue accent
- Fraunces (display) + Outfit (UI)
- Soft moss-teal and gold as secondary warmth
- Brand in the shell: **13th Desk · 河谷** / Eugene student desk · 尤金学生网

## What stays
- Schedule, places hours, GPA charts, K12 campus cards
- i18n: en / zh / es / ko / vi / ja + deferred lang persist (`13th-desk-v1`)
- Levels (elem / mid / high / uni), district bar, notes, weather
- Dense home: 今天要做什么, today/week tasks, announcements, shortcuts, mobile tab bar

## Run locally
```bash
cd "Eugene Student Web"   # or clone this repo
npm install
npm run dev
```
Open http://localhost:8080

```bash
npm run typecheck
npm run build
```

Notes stay in this browser (`13th-desk-v1`). Language and school level live in the header (and mobile tab bar).

## 中文
**13th Desk · 河谷** 把「尤金学生网」的书桌功能与「河谷校园仪表盘」的今日密度合在一起：待办、课表、公告、快捷入口、校园与绩点。无需登录或数据库即可使用书桌功能。

```bash
npm install
npm run dev
```
打开 http://localhost:8080
