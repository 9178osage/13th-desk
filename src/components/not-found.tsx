import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { deskText as c } from "@/lib/desk-copy";
import { useLang } from "@/lib/store";

/**
 * Router-level 404. Without it TanStack renders its bare English "Not Found" inside the
 * shell. The shell (navigation, saved desk, backup links) stays usable, and the way back
 * is one click.
 */
export function NotFoundPage() {
  const lang = useLang();
  return (
    <section className="not-found-page" aria-labelledby="not-found-heading">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1 id="not-found-heading">{c(lang, "notFoundTitle")}</h1>
      <p>{c(lang, "notFoundBody")}</p>
      <Link to="/" className="not-found-home">
        <ArrowLeft size={17} aria-hidden="true" />
        {c(lang, "notFoundHome")}
      </Link>
    </section>
  );
}
