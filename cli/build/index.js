import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { confirm, convertMDData } from '../utils';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlTpl = await fs.readFile(path.resolve(__dirname, '../template/index.html'), 'utf-8');
const rootDir = process.cwd();
/**
 * 期望输出的目录结构为
 * - .html
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
// const files: string[] = await fs.readdir(rootDir);
async function dirExists(dirPath) {
    const fullPath = path.resolve(dirPath);
    try {
        const stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) {
            throw new Error(`Path "${fullPath}" exists but is not a directory.`);
        }
        return true;
    }
    catch {
        return false;
    }
}
async function clearHtmlDir(htmlDir) {
    const htmlDirExists = await dirExists(htmlDir);
    if (!htmlDirExists) {
        return;
    }
    try {
        await confirm('.html目录已存在，是否删除？[(Y)es/(N)o]:');
        await fs.rm(htmlDir, { recursive: true });
    }
    catch (e) {
        throw e;
    }
}
// 在工作目录下建立html目录，如果已存在，则经用户手动确认后删除
async function createHtmlDir() {
    const htmlDir = `${rootDir}/.html`;
    await clearHtmlDir(htmlDir);
    await fs.mkdir(htmlDir);
}
// 递归获取根目录下所有的markdown文件
async function getAllMarkdownFiles(dirName) {
    const fullPath = path.resolve(dirName);
    const res = [];
    const list = await fs.readdir(fullPath);
    for (let item of list) {
        const itemPath = path.resolve(fullPath, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
            const subList = await getAllMarkdownFiles(itemPath);
            res.push(...subList);
        }
        else if (stat.isFile() && item.endsWith('.md')) {
            res.push(itemPath);
        }
    }
    return res;
}
async function getCategories(pathlist) {
    const categories = {};
    for (let item of pathlist) {
        const { html, metaData, staticResources } = await convertMDData(item);
        const title = metaData.title || path.basename(item, '.md');
        // 将title空格替换为短横
        const folderName = title.replace(/\s+/g, '-');
        const { type, category, createTime } = metaData;
        const route = `${type === 'single' ? '' : `/${type}`}/${folderName}`;
        if (category) {
            categories[category] = [...categories[category] || [], { type, title, route, createTime, html }];
        }
        categories.Home = [...categories.Home || [], { type, title, route, createTime, html }];
        let baseDir = `${rootDir}/.html`;
        if (['article'].includes(type)) {
            baseDir = `${rootDir}/.html/${type}`;
            await fs.mkdir(`${rootDir}/.html/${type}`, { recursive: true });
        }
        await fs.mkdir(`${baseDir}/${folderName}`, { recursive: true });
        await fs.mkdir(`${baseDir}/${folderName}/static`, { recursive: true });
        for (let url of staticResources) {
            await fs.copyFile(url, `${baseDir}/${folderName}/static/${path.basename(url)}`);
        }
        await fs.copyFile(path.resolve(__dirname, '../template/style.css'), `${baseDir}/${folderName}/static/style.css`);
    }
    return categories;
}
function sortNavItems(list) {
    return list.sort((a, b) => {
        if (a === 'About Me') {
            return 1;
        }
        else if (b === 'About Me') {
            return -1;
        }
        else {
            return 0;
        }
    });
}
// 将markdown文件转换为html，建立分类目录，复制页面目录到分类目录中，并将静态资源复制到对应目录中
async function convertMarkdownToHtml(pathlist) {
    // const categories: categoriesType = {};
    // 先获取到所有的分类
    const categoriesList = await getCategories(pathlist);
    let navItems = Object.keys(categoriesList);
    navItems = sortNavItems(navItems);
    // 生成通用导航栏
    const navBar = navItems.reduce((navbar, item) => {
        return `${navbar}\n<span><a href="/${item === 'Home' ? '' : item.replace(/\s+/g, '-')}">${item}</a></span>`;
    }, '');
    // 生成分类列表
    generateListAndIndex(categoriesList, navBar);
    categoriesList.Home.forEach(async (item) => {
        const { type, title, route, createTime, html } = item;
        const folderName = title.replace(/\s+/g, '-');
        const baseDir = ['article'].includes(type) ? `${rootDir}/.html/${type}` : `${rootDir}/.html`;
        const output = htmlTpl
            .replace(/\$baseUrl/, ['article'].includes(type) ? `/${type}/${folderName}/` : `/${folderName}/`)
            .replace(/\$title/, title)
            .replace(/\$content/, `<header><nav>${navBar}</nav></header>\n<article>${html}</article>`);
        const formattedHtml = await prettier.format(output, {
            parser: "html", // 指定解析器为 HTML
            htmlWhitespaceSensitivity: "ignore", // 对空白字符不敏感
        });
        await fs.writeFile(`${baseDir}/${folderName}/index.html`, formattedHtml);
    });
}
// 统计分类, 生成分类列表html，生成首页，以及处理特殊页面
async function generateListAndIndex(categories, navBar) {
    for (let [category, value] of Object.entries(categories)) {
        if (category !== 'Home' && value.some(c => c.type === 'single'))
            continue;
        let folderPath = `${rootDir}/.html`;
        if (category !== 'Home') {
            folderPath = `${rootDir}/.html/${category.replace(/\s+/g, '-')}`;
        }
        await fs.mkdir(folderPath, { recursive: true });
        await fs.mkdir(`${folderPath}/static`, { recursive: true });
        await fs.copyFile(path.resolve(__dirname, '../template/style.css'), `${folderPath}/static/style.css`);
        const output = htmlTpl
            .replace(/\$baseUrl/, category === 'Home' ? '/' : `/${category.replace(/\s+/g, '-')}/`)
            .replace(/\$title/, category)
            .replace(/\$content/, `<header><nav>${navBar}</nav></header>
      <div class="category-list">
        ${value.filter(item => item.type !== 'single').map(item => `<article class="category-item"><a href="${item.route}">${item.title}</a><small>${item.createTime}</small></article>`).join('\n')}
      </div>`);
        const formattedHtml = await prettier.format(output, {
            parser: "html",
            htmlWhitespaceSensitivity: "ignore",
        });
        await fs.writeFile(`${folderPath}/index.html`, formattedHtml);
    }
}
async function build() {
    try {
        await createHtmlDir();
        const mdFiles = await getAllMarkdownFiles(rootDir);
        await convertMarkdownToHtml(mdFiles);
    }
    catch (e) {
        console.error(e);
    }
}
export default build;
