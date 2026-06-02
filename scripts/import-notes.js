/*
 * 把外部 CS 学习笔记仓库里的 markdown 笔记同步进博客。
 *
 * 用法:
 *   pnpm import-notes                # 使用默认源目录，跳过已存在的文章
 *   pnpm import-notes -- --force     # 覆盖已存在的文章（会重新生成 frontmatter）
 *   pnpm import-notes -- "/path/to/CS Learning"   # 指定源目录
 *   NOTES_SOURCE_DIR="/path" pnpm import-notes     # 通过环境变量指定源目录
 *
 * 规则:
 *   - 只导入 markdown（.md / .mdx）笔记，自动跳过代码 / 项目 / 二进制等文件。
 *   - 跳过 projects、templates 等目录（见 EXCLUDE_DIRS）。
 *   - 顶层学科文件夹映射为中文分类，chapters/ 会被拍平到学科目录下。
 *   - 默认不覆盖已存在的文章，以保留手动润色过的标题等内容。
 */

import fs from "fs";
import path from "path";

const DEFAULT_SOURCE = "/Users/lemusakuya/VSCode/Coding/CS Learning";
const DEST_DIR = path.resolve("./src/content/posts/study-notes");
// 笔记里引用的本地图片会被复制到这里，最终通过 /study-notes/... 访问
const PUBLIC_ASSET_DIR = path.resolve("./public/study-notes");

// 解析参数：非 --flag 的第一个参数视为源目录
const argv = process.argv.slice(2);
const force = argv.includes("--force");
const positional = argv.find((a) => !a.startsWith("--"));
const SOURCE_DIR = positional || process.env.NOTES_SOURCE_DIR || DEFAULT_SOURCE;

// 学科文件夹 -> { dir: 输出目录名, category: 英文分类 }
const SUBJECT_MAP = {
	ANN: { dir: "Neural-Networks", category: "Neural Networks" },
	Algorithm: { dir: "Algorithm", category: "Algorithm" },
	Cybersecurity: { dir: "Network-Security", category: "Cybersecurity" },
	DIP: { dir: "Digital-Image-Processing", category: "Digital Image Processing" },
	"Data Structure": { dir: "Data-Structure", category: "Data Structure" },
	Database: { dir: "Database", category: "Database" },
	"MCU Development": { dir: "MCU-Development", category: "MCU Development" },
	NLP: { dir: "NLP", category: "NLP" },
	"Python Basic Note": { dir: "Python-Basics", category: "Python Basics" },
	"Web Crawler": { dir: "Web-Crawler", category: "Web Crawler" },
	"Web Learn": { dir: "Web-Learn", category: "Web Development" },
};

const FALLBACK_SUBJECT = { dir: "Misc", category: "Misc" };

// 学习笔记通用标签
const NOTE_TAG = "Study Notes";

// 这些目录下的内容不导入
const EXCLUDE_DIRS = new Set([
	"projects",
	"templates",
	"__pycache__",
	"node_modules",
	".git",
	".obsidian",
	"fonts",
	"assets",
]);

function getToday() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** 递归收集源目录下所有可导入的 markdown 文件（相对路径） */
function collectMarkdown(baseDir, relDir = "") {
	const results = [];
	const absDir = path.join(baseDir, relDir);
	let entries;
	try {
		entries = fs.readdirSync(absDir, { withFileTypes: true });
	} catch {
		return results;
	}
	for (const entry of entries) {
		const rel = relDir ? path.join(relDir, entry.name) : entry.name;
		if (entry.isDirectory()) {
			if (EXCLUDE_DIRS.has(entry.name)) continue;
			results.push(...collectMarkdown(baseDir, rel));
		} else if (/\.mdx?$/i.test(entry.name)) {
			results.push(rel);
		}
	}
	return results;
}

/** 去掉源文件已有的 frontmatter（如果有的话） */
function stripFrontmatter(content) {
	return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

/** 取第一个一级标题 */
function firstH1(content) {
	const m = content.match(/^#\s+(.+?)\s*$/m);
	return m ? m[1].trim() : null;
}

/** 由文件名推导标题：去掉序号前缀、下划线转空格 */
function titleFromFilename(base) {
	let t = base.replace(/\.mdx?$/i, "");
	t = t.replace(/^\d+[\s._-]+/, "");
	t = t.replace(/_/g, " ").trim();
	return t || base.replace(/\.mdx?$/i, "");
}

function yamlString(s) {
	return JSON.stringify(s); // 双引号 + 自动转义
}

function isExternalUrl(url) {
	return /^(https?:)?\/\//i.test(url) || /^(data|mailto):/i.test(url);
}

/**
 * 处理正文里引用的本地图片：
 *  - 已存在的图片复制到 public/study-notes/<subjectDir>/assets 下，路径改成绝对 URL
 *  - 找不到的图片把路径改成绝对路径（不会让 Astro 构建报 ImageNotFound），并打印警告
 * 返回 { body, missing: string[] }
 */
function processImages(body, sourceFileAbs, subjectDir) {
	const sourceFileDir = path.dirname(sourceFileAbs);
	const missing = [];

	const rewriteUrl = (rawUrl) => {
		const url = rawUrl.trim();
		// 外链 / data / 已是绝对路径的，保持不变
		if (!url || isExternalUrl(url) || url.startsWith("/")) return rawUrl;

		const decoded = decodeURIComponent(url.split(/[?#]/)[0]);
		const absImg = path.resolve(sourceFileDir, decoded);
		if (fs.existsSync(absImg) && fs.statSync(absImg).isFile()) {
			const baseName = path.basename(absImg);
			const destDir = path.join(PUBLIC_ASSET_DIR, subjectDir, "assets");
			fs.mkdirSync(destDir, { recursive: true });
			fs.copyFileSync(absImg, path.join(destDir, baseName));
			return `/study-notes/${subjectDir}/assets/${encodeURIComponent(baseName)}`;
		}
		// 图片不存在：改成绝对路径以避免构建中断（会是 404 破图）
		missing.push(decoded);
		return "/" + url.replace(/^\.?\//, "");
	};

	// Markdown 图片：![alt](url "title")
	let out = body.replace(
		/!\[([^\]]*)\]\(\s*<?([^()\s">]+)>?((?:\s+"[^"]*")?)\s*\)/g,
		(_m, alt, url, title) => `![${alt}](${rewriteUrl(url)}${title})`,
	);
	// HTML <img src="url">
	out = out.replace(
		/(<img\b[^>]*?\bsrc\s*=\s*")([^"]+)(")/gi,
		(_m, pre, url, post) => `${pre}${rewriteUrl(url)}${post}`,
	);

	return { body: out, missing };
}

function buildFrontmatter({ title, description, category }) {
	return [
		"---",
		`title: ${yamlString(title)}`,
		`published: ${getToday()}`,
		`description: ${yamlString(description)}`,
		`tags: [${NOTE_TAG}, ${category}]`,
		`category: ${yamlString(category)}`,
		"draft: false",
		"pinned: false",
		"comment: true",
		"---",
		"",
		"",
	].join("\n");
}

function main() {
	if (!fs.existsSync(SOURCE_DIR)) {
		console.error(`✗ 源目录不存在: ${SOURCE_DIR}`);
		process.exit(1);
	}

	const files = collectMarkdown(SOURCE_DIR);
	if (files.length === 0) {
		console.warn(`未在 ${SOURCE_DIR} 找到任何 markdown 笔记。`);
		return;
	}

	let imported = 0;
	let skipped = 0;
	let overwritten = 0;

	for (const rel of files) {
		const segments = rel.split(path.sep);
		const subjectKey = segments.length > 1 ? segments[0] : null;
		const subject = subjectKey
			? SUBJECT_MAP[subjectKey] || {
					dir: subjectKey.replace(/\s+/g, "-"),
					category: subjectKey,
				}
			: FALLBACK_SUBJECT;

		// 计算输出子路径：去掉学科段，去掉 chapters/ 这一层（拍平）
		const inner = segments.slice(subjectKey ? 1 : 0);
		const flattened = inner.filter((seg) => seg !== "chapters");
		const fileName = flattened.pop();
		const safeName = fileName.replace(/\s+/g, "-");
		const outRelDir = path.join(subject.dir, ...flattened);
		const outPath = path.join(DEST_DIR, outRelDir, safeName);

		const exists = fs.existsSync(outPath);
		if (exists && !force) {
			skipped++;
			continue;
		}

		const raw = fs.readFileSync(path.join(SOURCE_DIR, rel), "utf-8");
		const stripped = stripFrontmatter(raw);
		const { body, missing } = processImages(
			stripped,
			path.join(SOURCE_DIR, rel),
			subject.dir,
		);
		if (missing.length > 0) {
			console.warn(
				`  ⚠ ${rel} 引用了找不到的图片（已改为绝对路径，避免构建中断）: ${missing.join(", ")}`,
			);
		}

		const isReadme = /^readme\.mdx?$/i.test(fileName);
		const title = isReadme
			? firstH1(body) || `${subject.category}学习总览`
			: titleFromFilename(fileName);
		const description = isReadme
			? `《${subject.category}》学习总览与学习路线`
			: `《${subject.category}》学习笔记：${fileName.replace(/\.mdx?$/i, "")}`;

		const frontmatter = buildFrontmatter({
			title,
			description,
			category: subject.category,
		});

		fs.mkdirSync(path.dirname(outPath), { recursive: true });
		fs.writeFileSync(outPath, frontmatter + body);

		if (exists) {
			overwritten++;
			console.log(`↻ 覆盖  ${path.relative(process.cwd(), outPath)}`);
		} else {
			imported++;
			console.log(`+ 新增  ${path.relative(process.cwd(), outPath)}`);
		}
	}

	console.log(
		`\n完成：新增 ${imported} 篇，覆盖 ${overwritten} 篇，跳过 ${skipped} 篇（已存在）。`,
	);
	if (skipped > 0 && !force) {
		console.log("提示：如需覆盖已存在的文章，使用 pnpm import-notes -- --force");
	}
}

main();
