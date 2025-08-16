import fs from 'node:fs/promises';
import path from 'node:path';
// import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import chalk from 'chalk';
import { confirm, convertMDData, resolveTemplateDir } from '../utils';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// const rootDir = process.cwd();
let rootDir = '';

let htmlTpl = '';
let cssTplPath = '';
let faviconFilePaths: string[] = [];

async function copyFavicoFiles (currentFolder: string) {
  for (const faviconFilePath of faviconFilePaths) {
    const basename = path.basename(faviconFilePath);
    const target = path.resolve(currentFolder, basename);
    await fs.copyFile(faviconFilePath, target);
  }
}

async function copyStaticFiles () {
  const htmlDir = path.resolve(rootDir, '../html');
  await copyFavicoFiles(htmlDir);
  await fs.copyFile(cssTplPath, path.resolve(htmlDir, 'style.css'));
}

/**
 * 期望输出的目录结构为
 * - html
 *    index.html
 *  - static
 *  - article
 *    - article one
 *      index.html
 *      - static
 *    - article two
 *    - article three
 *  - category one
 *  - single
 *      index.html
 *    - static
 */

async function getTemplates() {
  const templatePath = resolveTemplateDir();
  const htmlTplPath = path.resolve(templatePath, './index.html');
  cssTplPath = path.resolve(templatePath, './style.css');
  faviconFilePaths = ['apple-touch-icon.png', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon.ico']
    .map(filename => path.resolve(templatePath, filename));
  try {
    htmlTpl = await fs.readFile(htmlTplPath, { encoding: 'utf8' });
  } catch (e) {
    console.error(e);
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  const fullPath = path.resolve(dirPath);
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path "${fullPath}" exists but is not a directory.`);
    }
    return true;
  } catch {
    return false;
  }
}

async function checkRootDir(path: string) {
  const rootDirExist = await dirExists(path);
  if (rootDirExist) {
    return;
  }
  throw new Error(`${path} not exist, please create work folder first.`)
}

async function clearHtmlDir(htmlDir: string) {
  const htmlDirExists = await dirExists(htmlDir);
  if (!htmlDirExists) {
    return;
  }

  try {
    // await confirm('.html目录已存在，是否删除？[(Y)es/(N)o]:');
    await fs.rm(htmlDir, { recursive: true });
  } catch (e) {
    throw e;
  }
}

// 在工作目录下建立html目录，如果已存在，则经用户手动确认后删除
async function createHtmlDir() {
  const htmlDir = path.resolve(rootDir, '../html');
  await clearHtmlDir(htmlDir);
  await fs.mkdir(htmlDir, { recursive: true });
  return htmlDir;
}

const pathReaded: string[]  = [];
// 递归获取根目录下所有的markdown文件
async function getAllMarkdownFiles(dirName: string): Promise<string[]> {
  const fullPath = path.resolve(dirName);
  const stat = await fs.lstat(fullPath);
  if (stat.isSymbolicLink()) return [];
  pathReaded.push(fullPath);
  const res = [];
  const list = await fs.readdir(fullPath);
  // const filteredList = filterDistFolder(list, fullPath);
  for (let item of list) {
    const itemPath = path.resolve(fullPath, item);
    const stat = await fs.stat(itemPath);
    if (stat.isDirectory()) {
      const subList = await getAllMarkdownFiles(itemPath);
      res.push(...subList);
    } else if (stat.isFile() && item.endsWith('.md')) {
      res.push(itemPath);
    }
  }
  return res;
}

type categoriesType = {
  [key: string]: {
    type: string
    title: string
    route: string
    createTime: string
    editTime: string
    html: string
  }[]
}

async function getCategories (pathlist: string[]): Promise<categoriesType> {
  const categories: categoriesType = {};
  for (let item of pathlist) {
    const { html, metaData, staticResources } = await convertMDData(item);
    const title = metaData.title || path.basename(item, '.md');
    // 将title空格替换为短横
    const folderName = title.replace(/\s+/g, '-');

    const { type, category, createTime, editTime } = metaData;
    const route = `${type === 'single' ? '' : `/${type}`}/${folderName}`;
    if (category) {
      categories[category] = [...categories[category] || [], { type, title, route, createTime, editTime, html }];
    }
    categories.Home = [...categories.Home || [], { type, title, route, createTime, editTime, html }];

    let baseDir = path.resolve(rootDir, '../html');
    if (['article'].includes(type)) {
      baseDir = `${baseDir}/${type}`;
      await fs.mkdir(`${baseDir}/${type}`, { recursive: true });
    }

    await fs.mkdir(`${baseDir}/${folderName}`, { recursive: true });
    await fs.mkdir(`${baseDir}/${folderName}/static`, { recursive: true });

    for (let url of staticResources) {
      await fs.copyFile(url, `${baseDir}/${folderName}/static/${path.basename(url)}`);
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

function sortNavItems (list: string[]) {
  return list.sort((a, b) => {
    if (a === 'About Me') {
      return 1;
    } else if (b === 'About Me') {
      return -1;
    } else {
      return 0;
    }
  })
}
// 将markdown文件转换为html，建立分类目录，复制页面目录到分类目录中，并将静态资源复制到对应目录中
async function convertMarkdownToHtml(pathlist: string[]) {
  // const categories: categoriesType = {};
  // 先获取到所有的分类
  const categoriesList = await getCategories(pathlist);
  let navItems = Object.keys(categoriesList);
  navItems = sortNavItems(navItems);

  // 生成通用导航栏
  const navBar = navItems.reduce((navbar, item) => {
    return `${navbar}\n<span><a href="/${item === 'Home' ? '' : item.replace(/\s+/g, '-')}">${item}</a></span>`
  }, '');

  // 生成分类列表
  generateListAndIndex(categoriesList, navBar);

  for (let item of categoriesList.Home) {
    const { type, title, route, createTime, html } = item;
    const folderName = title.replace(/\s+/g, '-');
    let baseDir = path.resolve(rootDir, '../html');
    baseDir = ['article'].includes(type) ? `${baseDir}/${type}` : baseDir;
    const output = htmlTpl
    .replace(/\$baseUrl/, ['article'].includes(type) ? `/${type}/${folderName}/` : `/${folderName}/`)
    .replace(/\$title/, title)
    .replace(/\$content/, `<header><nav>${navBar}</nav></header>\n<article>${html}</article>`);

    const formattedHtml = await prettier.format(output, {
      parser: "html",  // 指定解析器为 HTML
      htmlWhitespaceSensitivity: "ignore",  // 对空白字符不敏感
    });
    await fs.writeFile(`${baseDir}/${folderName}/index.html`, formattedHtml);
  }
}

// 统计分类, 生成分类列表html，生成首页，以及处理特殊页面
async function generateListAndIndex(categories: categoriesType, navBar: string): Promise<void> {
  for (let [category, value] of Object.entries(categories)) {
    if (category !== 'Home' && value.some(c => c.type === 'single')) continue;
    let folderPath = path.resolve(rootDir, '../html');
    if (category !== 'Home') {
      folderPath = `${folderPath}/${category.replace(/\s+/g, '-')}`;
    }
    await fs.mkdir(folderPath, { recursive: true });
    await fs.mkdir(`${folderPath}/static`, { recursive: true });
    const output = htmlTpl
    .replace(/\$baseUrl/, category === 'Home' ? '/' : `/${category.replace(/\s+/g, '-')}/`)
    .replace(/\$title/, category)
    .replace(/\$content/,
      `<header><nav>${navBar}</nav></header>
      <div class="category-list">
        ${value.filter(item => item.type !== 'single').map(item => `<article class="category-item"><a href="${item.route}">${item.title}</a><small title="${item.editTime}">${item.createTime}</small></article>`).join('\n')}
      </div>`
    );
    const formattedHtml = await prettier.format(output, {
      parser: "html",
      htmlWhitespaceSensitivity: "ignore",
    });
    await fs.writeFile(`${folderPath}/index.html`, formattedHtml);
  }
}

async function build(rootPath: string) {
  rootDir = path.resolve(rootPath);
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

export default build;
