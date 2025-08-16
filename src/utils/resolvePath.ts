// src/utils/resolveTemplateDir.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function findPkgRoot(startDir: string): string | null {
  let cur = startDir;
  while (true) {
    if (fs.existsSync(path.join(cur, "package.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

export function resolveTemplateDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const here = path.dirname(__filename);

  // 允许手动覆盖（应急/测试方便）
  const fromEnv = process.env.TEMPLATE_DIR
    ? path.resolve(process.env.TEMPLATE_DIR)
    : null;

  const pkgRoot = findPkgRoot(here);

  // 候选路径按优先级尝试：
  const candidates = [
    fromEnv,                          // 0) 显式指定
    path.join(here, "templates"),     // 1) 与当前文件同级（运行期 A 或 B）
    pkgRoot ? path.join(pkgRoot, "templates") : null, // 2) 包根/templates（开发期）
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `templates/ not found. Searched:\n${candidates.join("\n")}`
  );
}
