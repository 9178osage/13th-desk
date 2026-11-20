/** The part of `FileReader` used here, so tests can drive reads in any order. */
export type TextReader = Pick<FileReader, "result" | "onload" | "onerror" | "readAsText" | "abort">;

export type ReadOutcome = { ok: true; text: string } | { ok: false };

/**
 * Reads one picked file at a time, and only the latest pick may report back. Picking
 * again aborts the previous read, and every read carries a sequence number, so a large
 * file picked first can never finish after (and replace) the file picked last.
 */
export function createLatestFileRead(makeReader: () => TextReader) {
  let sequence = 0;
  let current: TextReader | null = null;
  return {
    read(file: Blob, done: (outcome: ReadOutcome) => void) {
      const id = ++sequence;
      current?.abort();
      const reader = makeReader();
      current = reader;
      reader.onload = () => {
        if (id !== sequence) return;
        current = null;
        done({ ok: true, text: typeof reader.result === "string" ? reader.result : "" });
      };
      reader.onerror = () => {
        if (id !== sequence) return;
        current = null;
        done({ ok: false });
      };
      reader.readAsText(file);
    },
    /** Forget any read in flight (a newer pick was refused, or the panel unmounted). */
    cancel() {
      sequence++;
      current?.abort();
      current = null;
    },
  };
}
