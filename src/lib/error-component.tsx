import { useSyncExternalStore } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { ERROR_FALLBACK, ERROR_TITLE, errorPageLang, type Lang } from "@/lib/error-copy";

function shownMessage(error: unknown, lang: Lang): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return ERROR_FALLBACK[lang];
}

function subscribe(): () => void {
  return () => {};
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  // Server HTML stays English. After hydration, use the language the boot script
  // or cookie already chose, without reading the desk store.
  const lang = useSyncExternalStore(subscribe, errorPageLang, () => "en" as Lang);
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">{ERROR_TITLE[lang]}</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {shownMessage(error, lang)}
      </p>
    </main>
  );
}
