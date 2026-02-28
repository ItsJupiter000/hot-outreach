import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "persistent_data");

export async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err: any) {
    if (err.code !== "EEXIST") {
      console.error("Failed to create data directory", err);
    }
  }
}

export class JsonDB<T> {
  private filePath: string;

  constructor(filename: string, private defaultData: T) {
    this.filePath = path.join(DATA_DIR, filename);
  }

  async read(): Promise<T> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(data) as T;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        await this.write(this.defaultData);
        return this.defaultData;
      }
      throw err;
    }
  }

  async write(data: T): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}
