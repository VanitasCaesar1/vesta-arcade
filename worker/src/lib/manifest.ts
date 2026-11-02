// Checks the file list of a web game build before anything is uploaded.
// Uploads are then accepted only for paths in the list, at the declared size.

export const MAX_FILES = 1000;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
/** A Worker on the free plan accepts request bodies up to 100 MB; stay well under it. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_PATH_LENGTH = 512;
export const ENTRY_PATH = "index.html";

export interface ManifestFile {
  path: string;
  size: number;
}

// Files that could run outside the browser have no place in a web game.
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".dll", ".msi", ".bat", ".cmd", ".com", ".scr", ".ps1", ".vbs", ".sh",
  ".app", ".dmg", ".pkg", ".apk", ".jar", ".so", ".dylib", ".deb", ".rpm",
]);

export class ManifestError extends Error {}

export function extname(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase() : "";
}

/** Accepts only plain relative paths that stay inside the build. */
export function validatePath(p: unknown): string {
  if (typeof p !== "string" || p === "") throw new ManifestError("empty file path");
  if (p.length > MAX_PATH_LENGTH) throw new ManifestError(`file path too long: ${p.slice(0, 60)}…`);
  if (/[\\\u0000-\u001f\u007f]/.test(p)) throw new ManifestError(`file path has a backslash or control character: ${JSON.stringify(p)}`);
  if (p.startsWith("/")) throw new ManifestError(`file path must be relative: ${p}`);
  for (const seg of p.split("/")) {
    if (seg === "") throw new ManifestError(`file path is not clean: ${p}`);
    if (seg === "..") throw new ManifestError(`file path escapes the build folder: ${p}`);
    // Catches .git/ and .env, which people leak by accident.
    if (seg.startsWith(".")) throw new ManifestError(`hidden files and folders are not allowed: ${p}`);
  }
  if (BLOCKED_EXTENSIONS.has(extname(p))) throw new ManifestError(`executable files are not allowed: ${p}`);
  return p;
}

/** Validates the whole list and returns it normalised, with the total size. */
export function validateManifest(input: unknown): { files: ManifestFile[]; totalBytes: number } {
  if (!Array.isArray(input) || input.length === 0) throw new ManifestError("no files to upload");
  if (input.length > MAX_FILES) throw new ManifestError(`too many files: ${input.length} (limit ${MAX_FILES})`);

  const seen = new Set<string>();
  const files: ManifestFile[] = [];
  let totalBytes = 0;
  for (const raw of input) {
    const path = validatePath((raw as ManifestFile | null)?.path);
    const size = (raw as ManifestFile).size;
    if (!Number.isSafeInteger(size) || size < 0) throw new ManifestError(`invalid size for ${path}`);
    if (size > MAX_FILE_BYTES) throw new ManifestError(`${path} is larger than ${MAX_FILE_BYTES >> 20} MB`);
    if (seen.has(path)) throw new ManifestError(`duplicate file: ${path}`);
    seen.add(path);
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new ManifestError(`build is larger than ${MAX_TOTAL_BYTES >> 20} MB`);
    files.push({ path, size });
  }
  if (!seen.has(ENTRY_PATH)) throw new ManifestError("index.html must be at the top level of the build");
  return { files, totalBytes };
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set(["api", "admin", "g", "embed", "cover", "badge", "static", "new", "__vesta"]);

export function validateSlug(slug: unknown): string {
  if (typeof slug !== "string" || !SLUG_RE.test(slug) || slug.includes("--") || RESERVED_SLUGS.has(slug)) {
    throw new ManifestError("slug must be 1-48 lowercase letters, numbers and single hyphens");
  }
  return slug;
}
