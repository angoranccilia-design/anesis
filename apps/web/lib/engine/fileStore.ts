import "server-only";
import { mkdir, readFile, writeFile, rename, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { parseModel, serializeModel, type ModelStore, type PropertyModel } from "@anesis/engine";

/**
 * FileModelStore — durable storage of the property model, one JSON file per property.
 * STATUS: IMPLEMENTED. Directory from ANESIS_DATA_DIR (default `.anesis-data` under the app, git-ignored).
 * Writes are atomic (temp file + rename), so a crash mid-write never leaves a half model. A database
 * store can replace this behind the same `ModelStore` interface without touching the engine.
 */
export class FileModelStore implements ModelStore {
  constructor(private readonly dir: string) {}
  private path(id: string) { return join(this.dir, `${id.replace(/[^A-Za-z0-9_-]/g, "_")}.json`); }
  async load(id: string): Promise<PropertyModel | null> {
    try { return parseModel(await readFile(this.path(id), "utf8")); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
  }
  async save(m: PropertyModel): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const tmp = `${this.path(m.propertyId)}.${process.pid}.tmp`;
    await writeFile(tmp, serializeModel(m), "utf8");
    await rename(tmp, this.path(m.propertyId));
  }
  async list(): Promise<string[]> {
    try { return (await readdir(this.dir)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  }
  async remove(id: string): Promise<void> {
    try { await unlink(this.path(id)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
}

export const defaultStore = (): ModelStore => new FileModelStore(process.env.ANESIS_DATA_DIR ?? join(process.cwd(), ".anesis-data"));
