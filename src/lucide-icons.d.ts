// The per-icon lucide-react modules that src/components/icons.ts imports ship without
// declarations; each default export is the package's own LucideIcon component.
declare module "lucide-react/dist/esm/icons/*.js" {
  import type { LucideIcon } from "lucide-react";
  const icon: LucideIcon;
  export default icon;
}
