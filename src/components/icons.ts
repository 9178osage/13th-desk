/**
 * Every icon the app uses, imported one file each (audit 2026-11-28 P2-06).
 *
 * `import { X } from "lucide-react"` goes through the package's barrel, which re-exports all
 * ~1,600 icons: the bundler parses and tree-shakes every one of them on each build, for the
 * 40 the app draws. Importing the per-icon modules keeps the same components (and the same
 * tree-shaken output) while the build only reads what is used. App code imports icons from
 * here; scripts/constraints.test.mjs fails on a direct "lucide-react" import and on a path
 * that does not exist. To add an icon, add one line (file name = the icon's kebab-case name
 * in node_modules/lucide-react/dist/esm/icons/).
 *
 * Their types come from src/lucide-icons.d.ts (each one is the package's own LucideIcon).
 */
export { default as AlertTriangle } from "lucide-react/dist/esm/icons/triangle-alert.js";
export { default as ArrowLeft } from "lucide-react/dist/esm/icons/arrow-left.js";
export { default as ArrowRight } from "lucide-react/dist/esm/icons/arrow-right.js";
export { default as ArrowUpRight } from "lucide-react/dist/esm/icons/arrow-up-right.js";
export { default as BookOpen } from "lucide-react/dist/esm/icons/book-open.js";
export { default as Calculator } from "lucide-react/dist/esm/icons/calculator.js";
export { default as CalendarDays } from "lucide-react/dist/esm/icons/calendar-days.js";
export { default as CalendarPlus } from "lucide-react/dist/esm/icons/calendar-plus.js";
export { default as Check } from "lucide-react/dist/esm/icons/check.js";
export { default as CheckCheck } from "lucide-react/dist/esm/icons/check-check.js";
export { default as Cloud } from "lucide-react/dist/esm/icons/cloud.js";
export { default as CloudFog } from "lucide-react/dist/esm/icons/cloud-fog.js";
export { default as CloudLightning } from "lucide-react/dist/esm/icons/cloud-lightning.js";
export { default as CloudRain } from "lucide-react/dist/esm/icons/cloud-rain.js";
export { default as CloudSnow } from "lucide-react/dist/esm/icons/cloud-snow.js";
export { default as Compass } from "lucide-react/dist/esm/icons/compass.js";
export { default as Download } from "lucide-react/dist/esm/icons/download.js";
export { default as ExternalLink } from "lucide-react/dist/esm/icons/external-link.js";
export { default as Heart } from "lucide-react/dist/esm/icons/heart.js";
export { default as House } from "lucide-react/dist/esm/icons/house.js";
export { default as ImageDown } from "lucide-react/dist/esm/icons/image-down.js";
export { default as Languages } from "lucide-react/dist/esm/icons/languages.js";
export { default as LibraryBig } from "lucide-react/dist/esm/icons/library-big.js";
export { default as LifeBuoy } from "lucide-react/dist/esm/icons/life-buoy.js";
export { default as MapPin } from "lucide-react/dist/esm/icons/map-pin.js";
export { default as MapPinned } from "lucide-react/dist/esm/icons/map-pinned.js";
export { default as Megaphone } from "lucide-react/dist/esm/icons/megaphone.js";
export { default as Pencil } from "lucide-react/dist/esm/icons/pencil.js";
export { default as Plus } from "lucide-react/dist/esm/icons/plus.js";
export { default as RotateCcw } from "lucide-react/dist/esm/icons/rotate-ccw.js";
export { default as Search } from "lucide-react/dist/esm/icons/search.js";
export { default as ShieldCheck } from "lucide-react/dist/esm/icons/shield-check.js";
export { default as Sparkles } from "lucide-react/dist/esm/icons/sparkles.js";
export { default as Star } from "lucide-react/dist/esm/icons/star.js";
export { default as Sun } from "lucide-react/dist/esm/icons/sun.js";
export { default as Trash2 } from "lucide-react/dist/esm/icons/trash-2.js";
export { default as TriangleAlert } from "lucide-react/dist/esm/icons/triangle-alert.js";
export { default as Upload } from "lucide-react/dist/esm/icons/upload.js";
export { default as X } from "lucide-react/dist/esm/icons/x.js";
