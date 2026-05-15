/**
 * Convert Pandoc/LaTeX math delimiters (\( \), \[ \]) to remark-math ($, $$),
 * then re-parse with the same micromark extensions already registered on the processor.
 */
import { fromMarkdown } from "mdast-util-from-markdown";

const FENCED_CODE =
	/(?<fence>```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;

function convertMathInText(text) {
	let out = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
		const body = math.trim();
		return body ? `\n$$\n${body}\n$$\n` : "";
	});

	out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
		const body = math.trim();
		return body ? `$${body}$` : "";
	});

	return out;
}

function convertLatexDelimiters(source) {
	const parts = [];
	let lastIndex = 0;

	for (const match of source.matchAll(FENCED_CODE)) {
		const index = match.index ?? 0;
		parts.push(convertMathInText(source.slice(lastIndex, index)));
		parts.push(match[0]);
		lastIndex = index + match[0].length;
	}

	parts.push(convertMathInText(source.slice(lastIndex)));
	return parts.join("");
}

/**
 * @returns {import('unified').Plugin}
 */
export function remarkLatexDelimiters() {
	const processor = this;

	return function (tree, file) {
		if (file.data?.latexDelimitersConverted) return;
		if (typeof file.value !== "string") return;

		const converted = convertLatexDelimiters(file.value);
		if (converted === file.value) return;

		const extensions = processor.data("micromarkExtensions") ?? [];
		const mdastExtensions = processor.data("fromMarkdownExtensions") ?? [];
		if (extensions.length === 0) return;

		file.data.latexDelimitersConverted = true;
		file.value = converted;

		const parsed = fromMarkdown(converted, {
			extensions,
			mdastExtensions,
		});

		tree.children.splice(0, tree.children.length, ...parsed.children);
	};
}
