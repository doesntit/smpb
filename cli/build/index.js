import fs from 'node:fs/promises';
import path from 'node:path';
import prettier from 'prettier';
import { confirm, convertMDData } from '../utils';
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
// 将markdown文件转换为html，建立分类目录，复制页面目录到分类目录中，并将静态资源复制到对应目录中
async function convertMarkdownToHtml(pathlist) {
    const categories = [];
    for (let item of pathlist) {
        const { html, metaData, staticResources } = await convertMDData(item);
        const { type } = metaData;
        let baseDir = `${rootDir}/.html`;
        if (['article'].includes(type)) {
            baseDir = `${rootDir}/.html/${type}`;
            await fs.mkdir(`${rootDir}/.html/${type}`, { recursive: true });
        }
        const title = metaData.title || path.basename(item, '.md');
        // 将title空格替换为短横
        const folderName = title.replace(/\s+/g, '-');
        await fs.mkdir(`${baseDir}/${folderName}`, { recursive: true });
        await fs.mkdir(`${baseDir}/${folderName}/static`, { recursive: true });
        const output = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Markdown Output</title></head>
      <body>
      ${html}
      </body>
      </html>
        `.trim();
        for (let url of staticResources) {
            await fs.copyFile(url, `${baseDir}/${folderName}/static/${path.basename(url)}`);
        }
        const formattedHtml = await prettier.format(output, {
            parser: "html", // 指定解析器为 HTML
            htmlWhitespaceSensitivity: "ignore", // 对空白字符不敏感
        });
        await fs.writeFile(`${baseDir}/${folderName}/index.html`, formattedHtml);
        // console.log(metaData);
        console.log(staticResources);
    }
}
// 统计分类, 生成分类列表html，生成首页，以及处理特殊页面
function generateListAndIndex() { }
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
