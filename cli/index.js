#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
import fs2 from 'node:fs/promises';
import path2 from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import readline from 'readline';

// src/template/index.html.ts
var index_html_default = `<!DOCTYPE html>
<html lang="en">
<head>
  <base href="$baseUrl" />
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$title</title>
  <link rel="stylesheet" href="./static/style.css" />
</head>
<body>
  $content
</body>
</html>`;

// src/template/style.css.ts
var style_css_default = `html {
  font-family: Fira Code,Monaco,Consolas,Ubuntu Mono,PingFang SC,Hiragino Sans GB,Microsoft YaHei,WenQuanYi Micro Hei,monospace,sans-serif;;
  font-size: 1em;
}

body {
  max-width: 72em;
  margin: 0 auto;
  padding: 1em;
  line-height: 1.6em;
}

h1 {
  text-align: center;
}

img {
  max-width: 60%;
  background-color: #fff;
}

p > img {
  margin: 1em auto;
  display: block;
}

/* \u9ED8\u8BA4\u662F\u660E\u4EAE\u6A21\u5F0F\u7684\u6837\u5F0F */
body {
  background-color: white;
  color: black;
}

/* \u5F53\u7CFB\u7EDF\u5904\u4E8E\u6697\u9ED1\u6A21\u5F0F\u65F6\uFF0C\u5E94\u7528\u4EE5\u4E0B\u6837\u5F0F */
@media (prefers-color-scheme: dark) {
  body {
      background-color: #282828;
      color: #eaeaea;
  }
}

nav {
  margin-bottom: 1em;
}

nav span {
  margin-right: 1em;
}

nav span a {
  padding: 0.5em;
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}

nav span a:visited {
  color: grey;
}

nav span::before {
  content: '[';
}

nav span::after {
  content: ']';
}

article {
  margin-bottom: 1em;
}

article > a {
  display: block;
}`;
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function confirm(message) {
  return new Promise((resolve, reject) => {
    rl.question(message, (answer) => {
      rl.close();
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        resolve(true);
      } else {
        reject("\u64CD\u4F5C\u5DF2\u53D6\u6D88");
      }
    });
  });
}
var confirm_default = confirm;

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
      url = `./static/${path2.basename(url)}`;
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
    createTime: ""
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
    createTime: ""
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
        html += "<pre><code>\n";
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
  const input = await fs2.readFile(mdUrl, "utf-8");
  const stats = await fs2.stat(mdUrl);
  const birthTime = date_default(new Date(stats.birthtime.toISOString()));
  const { html, metaData, staticResources } = parseMarkdown(input);
  return { html, metaData: { ...metaData, createTime: birthTime }, staticResources: staticResources.map((item) => path2.resolve(path2.dirname(mdUrl), item)) };
}
var convertMD_default = convertMDData;

// src/build/index.ts
path2.dirname(fileURLToPath(import.meta.url));
var rootDir = process.cwd();
async function dirExists(dirPath) {
  const fullPath = path2.resolve(dirPath);
  try {
    const stat = await fs2.stat(fullPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path "${fullPath}" exists but is not a directory.`);
    }
    return true;
  } catch {
    return false;
  }
}
async function clearHtmlDir(htmlDir) {
  const htmlDirExists = await dirExists(htmlDir);
  if (!htmlDirExists) {
    return;
  }
  try {
    await confirm_default(".html\u76EE\u5F55\u5DF2\u5B58\u5728\uFF0C\u662F\u5426\u5220\u9664\uFF1F[(Y)es/(N)o]:");
    await fs2.rm(htmlDir, { recursive: true });
  } catch (e) {
    throw e;
  }
}
async function createHtmlDir() {
  const htmlDir = `${rootDir}/.html`;
  await clearHtmlDir(htmlDir);
  await fs2.mkdir(htmlDir);
}
async function getAllMarkdownFiles(dirName) {
  const fullPath = path2.resolve(dirName);
  const res = [];
  const list = await fs2.readdir(fullPath);
  for (let item of list) {
    const itemPath = path2.resolve(fullPath, item);
    const stat = await fs2.stat(itemPath);
    if (stat.isDirectory()) {
      const subList = await getAllMarkdownFiles(itemPath);
      res.push(...subList);
    } else if (stat.isFile() && item.endsWith(".md")) {
      res.push(itemPath);
    }
  }
  return res;
}
async function getCategories(pathlist) {
  const categories = {};
  for (let item of pathlist) {
    const { html, metaData, staticResources } = await convertMD_default(item);
    const title = metaData.title || path2.basename(item, ".md");
    const folderName = title.replace(/\s+/g, "-");
    const { type, category, createTime } = metaData;
    const route = `${type === "single" ? "" : `/${type}`}/${folderName}`;
    if (category) {
      categories[category] = [...categories[category] || [], { type, title, route, createTime, html }];
    }
    categories.Home = [...categories.Home || [], { type, title, route, createTime, html }];
    let baseDir = `${rootDir}/.html`;
    if (["article"].includes(type)) {
      baseDir = `${rootDir}/.html/${type}`;
      await fs2.mkdir(`${rootDir}/.html/${type}`, { recursive: true });
    }
    await fs2.mkdir(`${baseDir}/${folderName}`, { recursive: true });
    await fs2.mkdir(`${baseDir}/${folderName}/static`, { recursive: true });
    for (let url of staticResources) {
      await fs2.copyFile(url, `${baseDir}/${folderName}/static/${path2.basename(url)}`);
    }
    await fs2.writeFile(`${baseDir}/${folderName}/static/style.css`, style_css_default);
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
  categoriesList.Home.forEach(async (item) => {
    const { type, title, route, createTime, html } = item;
    const folderName = title.replace(/\s+/g, "-");
    const baseDir = ["article"].includes(type) ? `${rootDir}/.html/${type}` : `${rootDir}/.html`;
    const output = index_html_default.replace(/\$baseUrl/, ["article"].includes(type) ? `/${type}/${folderName}/` : `/${folderName}/`).replace(/\$title/, title).replace(/\$content/, `<header><nav>${navBar}</nav></header>
<article>${html}</article>`);
    const formattedHtml = await prettier.format(output, {
      parser: "html",
      // 指定解析器为 HTML
      htmlWhitespaceSensitivity: "ignore"
      // 对空白字符不敏感
    });
    await fs2.writeFile(`${baseDir}/${folderName}/index.html`, formattedHtml);
  });
}
async function generateListAndIndex(categories, navBar) {
  for (let [category, value] of Object.entries(categories)) {
    if (category !== "Home" && value.some((c) => c.type === "single")) continue;
    let folderPath = `${rootDir}/.html`;
    if (category !== "Home") {
      folderPath = `${rootDir}/.html/${category.replace(/\s+/g, "-")}`;
    }
    await fs2.mkdir(folderPath, { recursive: true });
    await fs2.mkdir(`${folderPath}/static`, { recursive: true });
    await fs2.writeFile(`${folderPath}/static/style.css`, style_css_default);
    const output = index_html_default.replace(/\$baseUrl/, category === "Home" ? "/" : `/${category.replace(/\s+/g, "-")}/`).replace(/\$title/, category).replace(
      /\$content/,
      `<header><nav>${navBar}</nav></header>
      <div class="category-list">
        ${value.filter((item) => item.type !== "single").map((item) => `<article class="category-item"><a href="${item.route}">${item.title}</a><small>${item.createTime}</small></article>`).join("\n")}
      </div>`
    );
    const formattedHtml = await prettier.format(output, {
      parser: "html",
      htmlWhitespaceSensitivity: "ignore"
    });
    await fs2.writeFile(`${folderPath}/index.html`, formattedHtml);
  }
}
async function build() {
  try {
    await createHtmlDir();
    const mdFiles = await getAllMarkdownFiles(rootDir);
    await convertMarkdownToHtml(mdFiles);
  } catch (e) {
    console.error(e);
  }
}
var build_default = build;

// src/index.ts
var require2 = createRequire(import.meta.url);
var version = require2("../package.json").version;
var program = new Command();
program.name("smpb").description("A simple blog application").version(version);
program.command("build").description("Build the project").action(() => {
  build_default();
});
program.command("publish").description("Publish the project").action(() => {
  console.log("Publishing...");
});
program.parse(process.argv);
