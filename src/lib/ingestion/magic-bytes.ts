const PDF_MAGIC = Buffer.from("%PDF");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]);

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Guards parser dispatch against type confusion: the declared MIME is
 * attacker-controlled, so a payload claiming to be DOCX could instead drive
 * mammoth/jszip on hostile zip content (zip bomb). We gate on the leading
 * magic bytes before storing. This is the agreed minimal mitigation alongside
 * the lowered size cap; it does not bound decompressed size inside mammoth.
 * Text-family formats carry no reliable signature, so they pass through.
 */
export function matchesDeclaredType(mime: string, buffer: Buffer): boolean {
  if (mime === "application/pdf") {
    return buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
  }
  if (mime === DOCX_MIME) {
    return buffer.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC);
  }
  return true;
}
