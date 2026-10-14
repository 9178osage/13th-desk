import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import type { Deadline } from "@/data/guide";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { tr, type Lang } from "@/lib/text";

/** "Export to calendar (.ics)": every date passed in (callers pass the not-yet-passed ones). */
export function IcsButton({ items, lang, href }: { items: Deadline[]; lang: Lang; href?: string }) {
  const [status, setStatus] = useState<DeskCopyKey | null>(null);
  return (
    <span className="ics-export">
      <button
        type="button"
        className="ics-button"
        onClick={() => {
          if (!items.length) {
            setStatus("icsNone");
            return;
          }
          downloadIcs(
            buildIcs(
              items.map((item) => ({
                id: item.id,
                ymd: item.ymd,
                time: item.time,
                title: tr(lang, item.title),
                detail: tr(lang, item.detail),
                url: href,
              })),
            ),
          );
          setStatus("icsDone");
        }}
      >
        <CalendarPlus size={16} aria-hidden="true" />
        {c(lang, "exportIcs")}
      </button>
      <span className="ics-status" role="status">
        {status && c(lang, status)}
      </span>
    </span>
  );
}
