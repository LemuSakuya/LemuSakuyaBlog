import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRenderer } from "astro-expressive-code";
import katex from "katex";
import { securityLanguages } from "../src/plugins/expressive-code/security-languages.mjs";

test("security code fences render with syntax colors and no fallback warnings", async () => {
	const warnings = [];
	const { ec } = await createRenderer({
		themes: ["github-light", "github-dark"],
		shiki: { langs: securityLanguages },
		logger: { warn: (message) => warnings.push(message) },
	});
	const examples = {
		redis: 'SET session "hello"',
		nasl: 'if (port == 80) return "http";',
		yara: 'rule sample { strings: $a = "hello" condition: $a }',
		eql: 'process where process.name == "cmd.exe"',
		smali: 'const-string v0, "hello"',
	};
	for (const [language, code] of Object.entries(examples)) {
		const { renderedGroupAst } = await ec.render({ language, code });
		const colors = new Set();
		const visit = (node) => {
			if (node.tagName === "span" && node.properties?.style) colors.add(node.properties.style);
			for (const child of node.children ?? []) visit(child);
		};
		visit(renderedGroupAst);
		assert.ok(colors.size > 1, `${language} should highlight distinct token types`);
	}
	assert.deepEqual(warnings, []);
});

test("repaired display formulas pass strict KaTeX rendering", async () => {
	const files = [
		"Neural-Networks/07_序列模型_RNN_LSTM_GRU_注意力入门.md",
		"Digital-Image-Processing/10_图像分割.md",
		"Digital-Image-Processing/11_特征提取与表示.md",
	];
	for (const file of files) {
		const source = await readFile(new URL(`../src/content/posts/study-notes/${file}`, import.meta.url), "utf8");
		for (const match of source.matchAll(/\$\$([\s\S]*?)\$\$/g)) {
			assert.doesNotThrow(() => katex.renderToString(match[1], {
				displayMode: true, strict: "error", throwOnError: true,
			}), file);
		}
	}
});
