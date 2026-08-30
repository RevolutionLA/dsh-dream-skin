#!/usr/bin/env node
/**
 * svg-to-png.mjs — 用 @resvg/resvg-js 把 docs/stats.svg 转成 docs/stats.png。
 *
 * 为什么转 PNG：GitHub 的 README 渲染器对仓库内的 .svg 有安全限制，
 * 引用会报 "Invalid image source"；PNG 则任何 Markdown 渲染器都能稳定显示。
 *
 * 为什么放在这里而不是仓库根：这个脚本是整个增长图唯一需要第三方
 * 依赖（@resvg/resvg-js）的地方。仓库根的 package.json 声明了一些 npm 上
 * 不存在的可选 peer 依赖，导致根目录 `npm ci` 会以 E404 崩溃（曾有每日
 * 任务因此停下）。本目录是独立的锁定依赖作用域，只安装 resvg 一个包，
 * 与主项目依赖彻底解耦。
 *
 * 用法：
 *   cd scripts/chart && npm ci && node svg-to-png.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..'); // scripts/chart -> 仓库根
const SVG = join(ROOT, 'docs', 'stats.svg');
const PNG = join(ROOT, 'docs', 'stats.png');

async function main() {
  const svg = await readFile(SVG);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 960 },
    background: '#ffffff',
    // 显式加载系统字体：GitHub Actions 需先装 fonts-noto-cjk，否则中文渲染成方块
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  await writeFile(PNG, png);
  console.log(`[svg-to-png] 已输出 ${PNG}（${png.length} 字节）`);
}

main().catch((err) => {
  console.error('[svg-to-png] 失败:', err.message);
  process.exit(1);
});
