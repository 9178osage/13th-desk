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

---

## Español

**Eugene Desk** es un escritorio estudiantil para Eugene, Oregón: la densidad de un panel de «¿qué tengo que hacer hoy?» con la sensación de un escritorio de papel cálido.

**Demo en vivo:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**Repositorio:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

El escritorio **no requiere cuenta ni base de datos**. Idioma, nivel escolar, horario, notas, filas de GPA y otras preferencias se guardan en el `localStorage` del navegador actual con la clave **`13th-desk-v1`**. No renombres esa clave o los datos locales dejarán de encontrarse.

### Funciones

| Página | Qué incluye |
|--------|-------------|
| **Hoy** `/` | Pendientes de hoy, tareas de la semana, avisos, accesos rápidos, clima y el ritmo del día |
| **Campus** `/campus` | Universidad: bibliotecas, comedores y horarios; K–12: tarjetas de campus por distrito |
| **Ciudad** `/town` | Lugares después de clases y fuera del campus, con textos y categorías según el nivel |
| **Guía** `/guide` | Universidad: lista de llegada, fechas límite y enlaces de ayuda; guías según el nivel en K–12 |
| **GPA** `/gpa` | Estimador de GPA ponderado por créditos con gráficos (no es un expediente oficial) |

Otros detalles:

- **Primera vez:** Elige idioma y nivel escolar al abrir. Luego puedes cambiarlos en la barra superior o en la navegación inferior del móvil.
- **Niveles:** Primaria, secundaria, preparatoria y universidad (`elem` · `mid` · `high` · `uni`).
- **Horario:** Bloques de lunes a viernes, con opción de fijar.
- **Barra de distrito (K–12):** Usa la ubicación o elige a mano un distrito cerca del condado de Lane.
- **Seis idiomas:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語.

Los recursos de marca están en `public/brand/` (logo, mark, favicon y archivos relacionados).

### Stack

- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** para el estado persistente (`13th-desk-v1`)
- **Recharts** para el gráfico de GPA
- **Fuentes:** Fraunces en títulos y Outfit en la interfaz

La imagen visual usa fondo de papel crema, tinta navy, acentos azul eléctrico, y verdes musgo y dorado de apoyo.

### Ejecutar en local

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm install
npm run dev
```

Abre [http://localhost:8080](http://localhost:8080). Comandos útiles:

```bash
npm run typecheck
npm run build
npm run preview
```

### Despliegue

El proyecto `eugene-desk` está conectado a **Vercel**. Cada push a la rama `main` de GitHub se publica automáticamente en:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

En la raíz del repositorio hay un `vercel.json` (cabeceras de seguridad, etc.). También puedes desplegar en local:

```bash
npx vercel --prod
```

Debes estar autenticado y vinculado al mismo proyecto de Vercel.

### Notas sobre los datos

- El estado del escritorio—idioma, nivel, notas, horario, filas de GPA, favoritos y ajustes similares—queda en el **navegador actual** bajo **`13th-desk-v1`**.
- Horarios de lugares, avisos y detalles parecidos son información de referencia; confirma en el sitio oficial de cada institución.
- El GPA es una herramienta de estimación, no un expediente ni calificaciones oficiales.
- El repositorio se ha llamado Eugene Student Web, 13th-desk y 河谷校园仪表盘; la marca actual del producto es **Eugene Desk**.

---

## 한국어

**Eugene Desk**는 오리건주 Eugene을 위한 학생 데스크입니다. 「오늘 뭐 해야 하지?」에 맞는 대시보드 밀도와, 따뜻한 종이 질감의 책상 느낌을 함께 담았습니다.

**라이브 데모:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**저장소:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

데스크 기능은 **로그인이나 데이터베이스가 필요 없습니다**. 언어, 학령, 시간표, 메모, GPA 행 등은 현재 브라우저의 `localStorage`에 **`13th-desk-v1`** 키로 저장됩니다. 이 키 이름을 바꾸면 기존 로컬 데이터를 찾지 못합니다.

### 기능

| 페이지 | 내용 |
|--------|------|
| **오늘** `/` | 오늘 할 일, 이번 주 과제, 공지, 바로가기, 날씨, 오늘의 리듬 |
| **캠퍼스** `/campus` | 대학: 도서관·식당 등 장소와 운영 시간; K–12: 학군별 캠퍼스 카드 |
| **시내** `/town` | 방과 후·교외 장소 (학령에 따라 문구와 분류 조정) |
| **가이드** `/guide` | 대학: 도착 체크리스트, 마감, 도움 링크; K–12: 학령에 맞는 가이드 |
| **GPA** `/gpa` | 학점 가중 GPA 추정과 차트 (공식 성적표 아님) |

기타:

- **첫 실행:** 언어와 학령을 고릅니다. 이후 상단 바나 모바일 하단 내비에서 언제든 바꿀 수 있습니다.
- **학령:** 초등 / 중등 / 고등 / 대학 (`elem` · `mid` · `high` · `uni`)
- **시간표:** 월–금 블록, 핀 고정 가능
- **학군 바 (K–12):** 위치 사용 또는 Lane 카운티 근처 학군 직접 선택
- **여섯 언어:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

브랜드 자산은 `public/brand/`에 있습니다 (logo, mark, favicon 등).

### 기술 스택

- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** (persist → `13th-desk-v1`)
- **Recharts** (GPA 차트)
- **폰트:** 제목 Fraunces, UI Outfit

비주얼은 크림색 종이 배경, 네이비 잉크, 일렉트릭 블루 액센트, 보조색으로 이끼 초록과 골드입니다.

### 로컬 실행

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm install
npm run dev
```

[http://localhost:8080](http://localhost:8080) 을 엽니다. 자주 쓰는 명령:

```bash
npm run typecheck
npm run build
npm run preview
```

### 배포

`eugene-desk` 프로젝트가 **Vercel**에 연결되어 있습니다. GitHub `main`에 푸시하면 자동으로 배포됩니다:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

저장소 루트에 `vercel.json`이 있습니다 (보안 응답 헤더 등). 로컬에서도:

```bash
npx vercel --prod
```

같은 Vercel 프로젝트에 로그인해 연결해 두어야 합니다.

### 데이터 안내

- 데스크 상태(언어, 학령, 메모, 시간표, GPA 행, 즐겨찾기 등)는 **현재 브라우저**에만 있으며 키는 **`13th-desk-v1`** 입니다.
- 장소 운영 시간·공지 등은 참고용입니다. 최신 정보는 각 기관 공식 사이트를 확인하세요.
- GPA는 추정 도구이며 공식 성적표가 아닙니다.
- 저장소는 예전에 Eugene Student Web, 13th-desk, 河谷校园仪表盘 등으로 불렸고, 현재 제품 브랜드는 **Eugene Desk**입니다.

---

## Tiếng Việt

**Eugene Desk** là bàn học dành cho học sinh, sinh viên ở Eugene, Oregon: mật độ của một bảng điều khiển 「hôm nay cần làm gì?」 kết hợp cảm giác bàn giấy ấm.

**Demo trực tiếp:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**Kho mã nguồn:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

Chức năng bàn học **không cần đăng nhập hay cơ sở dữ liệu**. Ngôn ngữ, cấp học, thời khóa biểu, ghi chú, dòng GPA và các tùy chọn khác được lưu trong `localStorage` của trình duyệt hiện tại với khóa **`13th-desk-v1`**. Đừng đổi tên khóa này, nếu không dữ liệu cục bộ sẽ không còn được tìm thấy.

### Tính năng

| Trang | Nội dung |
|-------|----------|
| **Hôm nay** `/` | Việc hôm nay, nhiệm vụ tuần, thông báo, lối tắt, thời tiết, nhịp trong ngày |
| **Campus** `/campus` | Đại học: thư viện, căn tin và giờ mở cửa; K–12: thẻ campus theo học khu |
| **Phố** `/town` | Địa điểm sau giờ học / ngoài khuôn viên (chữ và danh mục đổi theo cấp) |
| **Hướng dẫn** `/guide` | Đại học: checklist đến trường, hạn chót, liên kết trợ giúp; K–12: hướng dẫn theo cấp |
| **GPA** `/gpa` | Ước lượng GPA theo tín chỉ kèm biểu đồ (không phải bảng điểm chính thức) |

Chi tiết khác:

- **Lần đầu mở:** Chọn ngôn ngữ và cấp học. Sau đó đổi được từ thanh trên hoặc thanh điều hướng dưới trên điện thoại.
- **Cấp học:** Tiểu học / THCS / trung học / đại học (`elem` · `mid` · `high` · `uni`)
- **Thời khóa biểu:** Khối giờ thứ Hai–Thứ Sáu, có thể ghim
- **Thanh học khu (K–12):** Dùng vị trí hoặc chọn thủ công học khu gần Lane County
- **Sáu ngôn ngữ:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

Tài nguyên thương hiệu nằm trong `public/brand/` (logo, mark, favicon…).

### Công nghệ

- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand** (persist → `13th-desk-v1`)
- **Recharts** (biểu đồ GPA)
- **Font:** Fraunces cho tiêu đề, Outfit cho giao diện

Giao diện dùng nền giấy kem, mực navy, điểm nhấn xanh điện, cùng xanh rêu và vàng hỗ trợ.

### Chạy trên máy

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm install
npm run dev
```

Mở [http://localhost:8080](http://localhost:8080). Lệnh hay dùng:

```bash
npm run typecheck
npm run build
npm run preview
```

### Triển khai

Dự án `eugene-desk` đã nối với **Vercel**. Mỗi lần đẩy lên nhánh `main` trên GitHub sẽ tự triển khai tới:

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

Thư mục gốc có `vercel.json` (header bảo mật…). Cũng có thể chạy cục bộ:

```bash
npx vercel --prod
```

Bạn cần đã đăng nhập và liên kết cùng một dự án Vercel.

### Ghi chú dữ liệu

- Trạng thái bàn học—ngôn ngữ, cấp, ghi chú, thời khóa biểu, dòng GPA, yêu thích…—chỉ nằm trong **trình duyệt hiện tại** với khóa **`13th-desk-v1`**.
- Giờ mở cửa địa điểm, thông báo… chỉ mang tính tham khảo; hãy đối chiếu trang chính thức của từng cơ sở.
- GPA là công cụ ước lượng, không phải bảng điểm chính thức.
- Kho từng mang tên Eugene Student Web, 13th-desk và 河谷校园仪表盘; thương hiệu sản phẩm hiện tại là **Eugene Desk**.

---

## 日本語

**Eugene Desk** は、オレゴン州 Eugene 向けの学生デスクです。「今日、何をすればいい？」に答えるダッシュボードの密度と、あたたかい紙の質感の机をあわせています。

**ライブデモ:** [eugene-desk.vercel.app](https://eugene-desk.vercel.app)  
**リポジトリ:** [9178osage/13th-desk](https://github.com/9178osage/13th-desk)

デスク機能に **ログインもデータベースも不要** です。言語・学年段階・時間割・メモ・GPA 行などの設定は、現在のブラウザの `localStorage` に **`13th-desk-v1`** というキーで保存されます。このキー名を変えると、既存のローカルデータが見つからなくなります。

### 機能

| ページ | 内容 |
|--------|------|
| **今日** `/` | 今日のやること、今週の課題、お知らせ、ショートカット、天気、今日のリズム |
| **キャンパス** `/campus` | 大学：図書館・食堂などの場所と開館時間；K–12：学区ごとのキャンパスカード |
| **街** `/town` | 放課後・キャンパス外の場所（学年段階に合わせて文言と分類を調整） |
| **ガイド** `/guide` | 大学：到着チェックリスト、締切、ヘルプリンク；K–12：段階に応じたガイド |
| **GPA** `/gpa` | 単位加重の GPA 推定とチャート（公式の成績表ではありません） |

その他：

- **初回起動:** 言語と学年段階を選びます。あとから上部バーやモバイル下部ナビでも変更できます。
- **学年段階:** 小学校 / 中学校 / 高校 / 大学（`elem` · `mid` · `high` · `uni`）
- **時間割:** 月〜金のブロック。ピン留め可能
- **学区バー（K–12）:** 位置情報を使うか、Lane 郡付近の学区を手動で選ぶ
- **6言語:** English · 中文 · Español · 한국어 · Tiếng Việt · 日本語

ブランド素材は `public/brand/` にあります（logo、mark、favicon など）。

### 技術スタック

- **Vite** + **React 19**
- **TanStack** Router / Start / Query
- **Tailwind CSS 4**
- **zustand**（persist → `13th-desk-v1`）
- **Recharts**（GPA チャート）
- **フォント:** 見出し Fraunces、UI Outfit

ビジュアルはクリーム紙の背景、ネイビーのインク、エレクトリックブルーのアクセント、補助色に苔緑とゴールドです。

### ローカル実行

```bash
git clone https://github.com/9178osage/13th-desk.git
cd 13th-desk
npm install
npm run dev
```

[http://localhost:8080](http://localhost:8080) を開きます。よく使うコマンド：

```bash
npm run typecheck
npm run build
npm run preview
```

### デプロイ

`eugene-desk` プロジェクトは **Vercel** に接続済みです。GitHub の `main` への push で自動デプロイされます：

[https://eugene-desk.vercel.app](https://eugene-desk.vercel.app)

リポジトリ直下に `vercel.json` があります（セキュリティ応答ヘッダなど）。ローカルからも：

```bash
npx vercel --prod
```

同じ Vercel プロジェクトにログイン・リンク済みである必要があります。

### データについて

- デスクの状態（言語、学年段階、メモ、時間割、GPA 行、お気に入りなど）は **現在のブラウザのみ** にあり、キーは **`13th-desk-v1`** です。
- 場所の開館時間やお知らせなどは参考情報です。最新は各機関の公式サイトで確認してください。
- GPA は推定ツールであり、公式の成績表ではありません。
- リポジトリはかつて Eugene Student Web、13th-desk、河谷校园仪表盘 などと呼ばれていました。現在の製品ブランドは **Eugene Desk** です。
