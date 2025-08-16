#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
import fs3 from 'node:fs/promises';
import path3 from 'node:path';
import prettier from 'prettier';
import chalk from 'chalk';
import readline from 'readline';
import fs2 from 'fs';
import path2 from 'path';
import { fileURLToPath } from 'url';

readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// src/utils/date.ts
function formatDateTime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
var date_default = formatDateTime;

// src/utils/convertMD.ts
function escapeHTML(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function parseInline(text, collect) {
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, url) => {
    collect?.(url);
    if (!url.startsWith("http")) {
      url = `static/${path3.basename(url)}`;
    }
    return `<img src="${url}" alt="${alt}">`;
  });
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/`(.*?)`/g, "<code>$1</code>");
  return text;
}
function parseMetaData(metaStr) {
  const metaRes = {
    title: "",
    category: "",
    type: "article",
    createTime: "",
    editTime: ""
  };
  metaStr.forEach((item) => {
    const [key, value] = item.split(":");
    metaRes[key] = value.trim();
  });
  return metaRes;
}
function parseMarkdown(content) {
  const lines = content.split("\n");
  let html = "";
  let inList = false;
  let listType = null;
  let inCodeBlock = false;
  let metaBlock = false;
  const originMetaData = [];
  let metaData = {
    title: "",
    category: "",
    type: "article",
    createTime: "",
    editTime: ""
  };
  const staticResources = [];
  function collectStaticResources(url) {
    if (url.startsWith("http")) {
      return;
    }
    if (!staticResources.includes(url)) {
      staticResources.push(url);
    }
  }
  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("======")) {
      if (!metaBlock) {
        metaBlock = true;
      } else {
        metaBlock = false;
        if (originMetaData.length > 0) {
          metaData = parseMetaData(originMetaData);
        }
      }
      continue;
    }
    if (metaBlock) {
      originMetaData.push(line);
      continue;
    }
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        html += "<pre><code>";
        inCodeBlock = true;
      } else {
        html += "</code></pre>\n";
        inCodeBlock = false;
      }
      continue;
    }
    if (inCodeBlock) {
      html += escapeHTML(rawLine) + "\n";
      continue;
    }
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = parseInline(headingMatch[2], collectStaticResources);
      html += `<h${level}>${text}</h${level}>
`;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = parseInline(line.replace(/^>\s?/, ""), collectStaticResources);
      html += `<blockquote>${quote}</blockquote>
`;
      continue;
    }
    if (/^- /.test(line)) {
      if (!inList || listType !== "ul") {
        if (inList) html += `</${listType}>
`;
        html += "<ul>\n";
        inList = true;
        listType = "ul";
      }
      html += `<li>${parseInline(line.slice(2), collectStaticResources)}</li>
`;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== "ol") {
        if (inList) html += `</${listType}>
`;
        html += "<ol>\n";
        inList = true;
        listType = "ol";
      }
      html += `<li>${parseInline(line.replace(/^\d+\.\s/, ""), collectStaticResources)}</li>
`;
      continue;
    }
    if (line === "") {
      if (inList) {
        html += `</${listType}>
`;
        inList = false;
        listType = null;
      }
      continue;
    }
    if (inList) {
      html += `</${listType}>
`;
      inList = false;
      listType = null;
    }
    html += `<p>${parseInline(line, collectStaticResources)}</p>
`;
  }
  if (inList) {
    html += `</${listType}>
`;
  }
  if (inCodeBlock) {
    html += "</code></pre>\n";
  }
  return {
    html,
    metaData,
    staticResources
  };
}
async function convertMDData(mdUrl) {
  const input = await fs3.readFile(mdUrl, "utf-8");
  const stats = await fs3.stat(mdUrl);
  const birthTime = date_default(new Date(stats.birthtime.toISOString()));
  const editTime = date_default(new Date(stats.mtime.toISOString()));
  const { html, metaData, staticResources } = parseMarkdown(input);
  return { html, metaData: { ...metaData, createTime: birthTime, editTime }, staticResources: staticResources.map((item) => path3.resolve(path3.dirname(mdUrl), item)) };
}
var convertMD_default = convertMDData;
function findPkgRoot(startDir) {
  let cur = startDir;
  while (true) {
    if (fs2.existsSync(path2.join(cur, "package.json"))) return cur;
    const parent = path2.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}
function resolveTemplateDir() {
  const __filename = fileURLToPath(import.meta.url);
  const here = path2.dirname(__filename);
  const fromEnv = process.env.TEMPLATE_DIR ? path2.resolve(process.env.TEMPLATE_DIR) : null;
  const pkgRoot = findPkgRoot(here);
  const candidates = [
    fromEnv,
    // 0) 显式指定
    path2.join(here, "templates"),
    // 1) 与当前文件同级（运行期 A 或 B）
    pkgRoot ? path2.join(pkgRoot, "templates") : null
    // 2) 包根/templates（开发期）
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs2.existsSync(p)) return p;
  }
  throw new Error(
    `templates/ not found. Searched:
${candidates.join("\n")}`
  );
}

// src/build/index.ts
var rootDir = "";
var htmlTpl = "";
var cssTplPath = "";
var faviconFilePaths = [];
async function copyFavicoFiles(currentFolder) {
  for (const faviconFilePath of faviconFilePaths) {
    const basename = path3.basename(faviconFilePath);
    const target = path3.resolve(currentFolder, basename);
    await fs3.copyFile(faviconFilePath, target);
  }
}
async function copyStaticFiles() {
  const htmlDir = path3.resolve(rootDir, "../html");
  await copyFavicoFiles(htmlDir);
  await fs3.copyFile(cssTplPath, path3.resolve(htmlDir, "style.css"));
}
async function getTemplates() {
  const templatePath = resolveTemplateDir();
  const htmlTplPath = path3.resolve(templatePath, "./index.html");
  cssTplPath = path3.resolve(templatePath, "./style.css");
  faviconFilePaths = ["apple-touch-icon.png", "favicon-16x16.png", "favicon-32x32.png", "favicon.ico"].map((filename) => path3.resolve(templatePath, filename));
  try {
    htmlTpl = await fs3.readFile(htmlTplPath, { encoding: "utf8" });
  } catch (e) {
    console.error(e);
  }
}
async function dirExists(dirPath) {
  const fullPath = path3.resolve(dirPath);
  try {
    const stat = await fs3.stat(fullPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path "${fullPath}" exists but is not a directory.`);
    }
    return true;
  } catch {
    return false;
  }
}
async function checkRootDir(path4) {
  const rootDirExist = await dirExists(path4);
  if (rootDirExist) {
    return;
  }
  throw new Error(`${path4} not exist, please create work folder first.`);
}
async function clearHtmlDir(htmlDir) {
  const htmlDirExists = await dirExists(htmlDir);
  if (!htmlDirExists) {
    return;
  }
  try {
    await fs3.rm(htmlDir, { recursive: true });
  } catch (e) {
    throw e;
  }
}
async function createHtmlDir() {
  const htmlDir = path3.resolve(rootDir, "../html");
  await clearHtmlDir(htmlDir);
  await fs3.mkdir(htmlDir, { recursive: true });
  return htmlDir;
}
async function getAllMarkdownFiles(dirName) {
  const fullPath = path3.resolve(dirName);
  const stat = await fs3.lstat(fullPath);
  if (stat.isSymbolicLink()) return [];
  const res = [];
  const list = await fs3.readdir(fullPath);
  for (let item of list) {
    const itemPath = path3.resolve(fullPath, item);
    const stat2 = await fs3.stat(itemPath);
    if (stat2.isDirectory()) {
      const subList = await getAllMarkdownFiles(itemPath);
      res.push(...subList);
    } else if (stat2.isFile() && item.endsWith(".md")) {
      res.push(itemPath);
    }
  }
  return res;
}
async function getCategories(pathlist) {
  const categories = {};
  for (let item of pathlist) {
    const { html, metaData, staticResources } = await convertMD_default(item);
    const title = metaData.title || path3.basename(item, ".md");
    const folderName = title.replace(/\s+/g, "-");
    const { type, category, createTime, editTime } = metaData;
    const route = `${type === "single" ? "" : `/${type}`}/${folderName}`;
    if (category) {
      categories[category] = [...categories[category] || [], { type, title, route, createTime, editTime, html }];
    }
    categories.Home = [...categories.Home || [], { type, title, route, createTime, editTime, html }];
    let baseDir = path3.resolve(rootDir, "../html");
    if (["article"].includes(type)) {
      baseDir = `${baseDir}/${type}`;
      await fs3.mkdir(`${baseDir}/${type}`, { recursive: true });
    }
    await fs3.mkdir(`${baseDir}/${folderName}`, { recursive: true });
    await fs3.mkdir(`${baseDir}/${folderName}/static`, { recursive: true });
    for (let url of staticResources) {
      await fs3.copyFile(url, `${baseDir}/${folderName}/static/${path3.basename(url)}`);
    }
  }
  const sorttedlist = Object.entries(categories).map(([key, value]) => {
    return [key, value.sort((a, b) => {
      if (a.createTime > b.createTime) {
        return -1;
      } else if (a.createTime < b.createTime) {
        return 1;
      } else {
        return 0;
      }
    })];
  });
  return Object.fromEntries(sorttedlist);
}
function sortNavItems(list) {
  return list.sort((a, b) => {
    if (a === "About Me") {
      return 1;
    } else if (b === "About Me") {
      return -1;
    } else {
      return 0;
    }
  });
}
async function convertMarkdownToHtml(pathlist) {
  const categoriesList = await getCategories(pathlist);
  let navItems = Object.keys(categoriesList);
  navItems = sortNavItems(navItems);
  const navBar = navItems.reduce((navbar, item) => {
    return `${navbar}
<span><a href="/${item === "Home" ? "" : item.replace(/\s+/g, "-")}">${item}</a></span>`;
  }, "");
  generateListAndIndex(categoriesList, navBar);
  for (let item of categoriesList.Home) {
    const { type, title, route, createTime, html } = item;
    const folderName = title.replace(/\s+/g, "-");
    let baseDir = path3.resolve(rootDir, "../html");
    baseDir = ["article"].includes(type) ? `${baseDir}/${type}` : baseDir;
    const output = htmlTpl.replace(/\$baseUrl/, ["article"].includes(type) ? `/${type}/${folderName}/` : `/${folderName}/`).replace(/\$title/, title).replace(/\$content/, `<header><nav>${navBar}</nav></header>
<article>${html}</article>`);
    const formattedHtml = await prettier.format(output, {
      parser: "html",
      // 指定解析器为 HTML
      htmlWhitespaceSensitivity: "ignore"
      // 对空白字符不敏感
    });
    await fs3.writeFile(`${baseDir}/${folderName}/index.html`, formattedHtml);
  }
}
async function generateListAndIndex(categories, navBar) {
  for (let [category, value] of Object.entries(categories)) {
    if (category !== "Home" && value.some((c) => c.type === "single")) continue;
    let folderPath = path3.resolve(rootDir, "../html");
    if (category !== "Home") {
      folderPath = `${folderPath}/${category.replace(/\s+/g, "-")}`;
    }
    await fs3.mkdir(folderPath, { recursive: true });
    await fs3.mkdir(`${folderPath}/static`, { recursive: true });
    const output = htmlTpl.replace(/\$baseUrl/, category === "Home" ? "/" : `/${category.replace(/\s+/g, "-")}/`).replace(/\$title/, category).replace(
      /\$content/,
      `<header><nav>${navBar}</nav></header>
      <div class="category-list">
        ${value.filter((item) => item.type !== "single").map((item) => `<article class="category-item"><a href="${item.route}">${item.title}</a><small title="${item.editTime}">${item.createTime}</small></article>`).join("\n")}
      </div>`
    );
    const formattedHtml = await prettier.format(output, {
      parser: "html",
      htmlWhitespaceSensitivity: "ignore"
    });
    await fs3.writeFile(`${folderPath}/index.html`, formattedHtml);
  }
}
async function build(rootPath) {
  rootDir = path3.resolve(rootPath);
  try {
    await checkRootDir(rootDir);
    await createHtmlDir();
    const mdFiles = await getAllMarkdownFiles(rootDir);
    await getTemplates();
    await copyStaticFiles();
    await convertMarkdownToHtml(mdFiles);
  } catch (e) {
    console.error(chalk.red(e));
  }
}
var build_default = build;

// src/index.ts
var require2 = createRequire(import.meta.url);
var version = require2("../package.json").version;
var program = new Command();
program.name("smpb").description("A simple blog application").version(version);
program.command("build [path]").description("Build the project").action((path4 = "./") => {
  console.log(`smpb version: ${version}`);
  console.time("Compile");
  build_default(path4);
  console.timeEnd("Compile");
});
program.command("publish").description("Publish the project").action(() => {
  console.log("Publishing...");
});
program.parse(process.argv);
