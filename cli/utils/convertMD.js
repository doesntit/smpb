import fs from 'node:fs/promises';
import path from 'node:path';
// 转义 HTML 保留字符
function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
// 处理内联 Markdown（粗体、斜体、链接、图片、代码等）
function parseInline(text, collect) {
    // text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
    // 收集图片
    text = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, url) => {
        collect?.(url);
        // 将静态资源替换为相对于自身的静态资源目录相对路径
        if (!url.startsWith('http')) {
            url = `./static/${path.basename(url)}`;
        }
        return `<img src="${url}" alt="${alt}">`;
    });
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    return text;
}
function parseMetaData(metaStr) {
    const metaRes = {
        title: '',
        category: '',
        type: 'article',
    };
    metaStr.forEach(item => {
        const [key, value] = item.split(':');
        metaRes[key] = value.trim();
    });
    return metaRes;
}
// 主 Markdown 编译函数
function parseMarkdown(content) {
    const lines = content.split('\n');
    let html = '';
    let inList = false;
    let listType = null;
    let inCodeBlock = false;
    let metaBlock = false;
    const originMetaData = [];
    let metaData = {
        title: '',
        category: '',
        type: 'article',
    };
    const staticResources = [];
    function collectStaticResources(url) {
        if (url.startsWith('http')) {
            return;
        }
        if (!staticResources.includes(url)) {
            staticResources.push(url);
        }
    }
    for (let rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith('======')) {
            if (!metaBlock) {
                metaBlock = true;
            }
            else {
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
        // 代码块（多行）
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                html += '<pre><code>\n';
                inCodeBlock = true;
            }
            else {
                html += '</code></pre>\n';
                inCodeBlock = false;
            }
            continue;
        }
        if (inCodeBlock) {
            html += escapeHTML(rawLine) + '\n';
            continue;
        }
        // 标题
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = parseInline(headingMatch[2], collectStaticResources);
            html += `<h${level}>${text}</h${level}>\n`;
            continue;
        }
        // 引用
        if (/^>\s?/.test(line)) {
            const quote = parseInline(line.replace(/^>\s?/, ''), collectStaticResources);
            html += `<blockquote>${quote}</blockquote>\n`;
            continue;
        }
        // 无序列表
        if (/^- /.test(line)) {
            if (!inList || listType !== 'ul') {
                if (inList)
                    html += `</${listType}>\n`;
                html += '<ul>\n';
                inList = true;
                listType = 'ul';
            }
            html += `<li>${parseInline(line.slice(2), collectStaticResources)}</li>\n`;
            continue;
        }
        // 有序列表
        if (/^\d+\.\s/.test(line)) {
            if (!inList || listType !== 'ol') {
                if (inList)
                    html += `</${listType}>\n`;
                html += '<ol>\n';
                inList = true;
                listType = 'ol';
            }
            html += `<li>${parseInline(line.replace(/^\d+\.\s/, ''), collectStaticResources)}</li>\n`;
            continue;
        }
        // 空行（结束列表）
        if (line === '') {
            if (inList) {
                html += `</${listType}>\n`;
                inList = false;
                listType = null;
            }
            continue;
        }
        // 普通段落
        if (inList) {
            html += `</${listType}>\n`;
            inList = false;
            listType = null;
        }
        html += `<p>${parseInline(line, collectStaticResources)}</p>\n`;
    }
    if (inList) {
        html += `</${listType}>\n`;
    }
    if (inCodeBlock) {
        html += '</code></pre>\n';
    }
    return {
        html,
        metaData,
        staticResources,
    };
}
// 主函数
async function convertMDData(mdUrl) {
    const input = await fs.readFile(mdUrl, 'utf-8');
    const { html, metaData, staticResources } = parseMarkdown(input);
    //   const output = `
    // <!DOCTYPE html>
    // <html>
    // <head><meta charset="utf-8"><title>Markdown Output</title></head>
    // <body>
    // ${html}
    // </body>
    // </html>
    //   `.trim();
    return { html, metaData, staticResources: staticResources.map(item => path.resolve(path.dirname(mdUrl), item)) };
}
export default convertMDData;
