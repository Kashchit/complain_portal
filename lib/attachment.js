const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function magicMatchesBuffer(mime, buf) {
  if (!buf || buf.length < 4) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === "application/pdf") {
    return buf.slice(0, 4).toString("ascii") === "%PDF";
  }
  return false;
}

/**
 * Parse optional attachment from JSON body (base64).
 * @returns {{ attachment_mime: string|null, attachment_base64: string|null }}
 */
function parseOptionalAttachment(body) {
  const mime = body.attachmentMime != null ? String(body.attachmentMime).trim() : "";
  const b64 = body.attachmentBase64 != null ? String(body.attachmentBase64).trim() : "";

  if (!mime && !b64) {
    return { attachment_mime: null, attachment_base64: null };
  }
  if (!mime || !b64) {
    const err = new Error("Both attachmentMime and attachmentBase64 are required when attaching a file");
    err.status = 400;
    throw err;
  }
  if (!ALLOWED_MIMES.has(mime)) {
    const err = new Error("Unsupported attachment type");
    err.status = 400;
    throw err;
  }

  let buf;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    const err = new Error("Invalid attachment encoding");
    err.status = 400;
    throw err;
  }
  if (!buf.length || buf.length > MAX_BYTES) {
    const err = new Error("Attachment must be between 1 byte and 2MB");
    err.status = 400;
    throw err;
  }
  if (!magicMatchesBuffer(mime, buf)) {
    const err = new Error("File content does not match declared type");
    err.status = 400;
    throw err;
  }

  return { attachment_mime: mime, attachment_base64: b64 };
}

function complaintWithoutBlob(row) {
  if (!row || typeof row !== "object") return row;
  const { attachment_base64, ...rest } = row;
  return rest;
}

module.exports = {
  parseOptionalAttachment,
  complaintWithoutBlob,
  ALLOWED_MIMES,
  MAX_BYTES
};
