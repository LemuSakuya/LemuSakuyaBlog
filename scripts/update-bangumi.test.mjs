import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { updateBangumiData } from "./update-bangumi.mjs";

async function createSnapshot(t) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bangumi-test-"));
	t.after(() => fs.rm(directory, { recursive: true, force: true }));
	const file = path.join(directory, "bangumi-data.json");
	const original = '[{"title":"Existing collection"}]\n';
	await fs.writeFile(file, original);
	return { file, original };
}

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

test("an invalid user leaves the existing collection untouched", async (t) => {
	const { file, original } = await createSnapshot(t);
	t.mock.method(globalThis, "fetch", async () => jsonResponse({}, 404));
	await assert.rejects(updateBangumiData("missing-user", file), /404/);
	assert.equal(await fs.readFile(file, "utf-8"), original);
});

test("a failed later page cannot save a partial collection", async (t) => {
	const { file, original } = await createSnapshot(t);
	t.mock.method(globalThis, "fetch", async (url) => {
		const offset = new URL(url).searchParams.get("offset");
		return offset === "0"
			? jsonResponse({
					data: Array.from({ length: 50 }, (_, id) => ({
						subject_id: id,
					})),
					total: 51,
				})
			: jsonResponse({}, 403);
	});
	await assert.rejects(updateBangumiData("713599", file), /403/);
	assert.equal(await fs.readFile(file, "utf-8"), original);
});

test("a malformed API response cannot overwrite the snapshot", async (t) => {
	const { file, original } = await createSnapshot(t);
	t.mock.method(globalThis, "fetch", async () =>
		jsonResponse({ message: "Unavailable" }),
	);
	await assert.rejects(
		updateBangumiData("713599", file),
		/Invalid Bangumi collection/,
	);
	assert.equal(await fs.readFile(file, "utf-8"), original);
});

test("a successfully fetched empty collection clears an old snapshot", async (t) => {
	const { file } = await createSnapshot(t);
	t.mock.method(globalThis, "fetch", async (_url, options) => {
		assert.match(
			options.headers["User-Agent"],
			/LemuSakuya\/LemuSakuyaBlog/,
		);
		assert.ok(options.signal instanceof AbortSignal);
		return jsonResponse({ data: [], total: 0 });
	});
	await updateBangumiData("713599", file);
	assert.deepEqual(JSON.parse(await fs.readFile(file, "utf-8")), []);
});

test("transient failures retry and a missing optional subject detail keeps the entry", async (t) => {
	const { file } = await createSnapshot(t);
	let collectionAttempts = 0;
	t.mock.method(globalThis, "fetch", async (url) => {
		const endpoint = new URL(url);
		if (endpoint.pathname.includes("/subjects/"))
			return jsonResponse({}, 404);
		if (endpoint.searchParams.get("type") !== "3") {
			return jsonResponse({ data: [], total: 0 });
		}
		collectionAttempts++;
		if (collectionAttempts === 1) return jsonResponse({}, 503);
		return jsonResponse({
			total: 1,
			data: [
				{
					subject_id: 42,
					rate: 8,
					ep_status: 3,
					subject: {
						id: 42,
						name_cn: "测试番剧",
						name: "Test anime",
						date: "2026-10-01",
						eps: 12,
						score: 7.5,
						short_summary: "测试简介",
						tags: [{ name: "日常" }],
					},
				},
			],
		});
	});
	await updateBangumiData("713599", file);
	assert.equal(collectionAttempts, 2);
	const [item] = JSON.parse(await fs.readFile(file, "utf-8"));
	assert.equal(item.title, "测试番剧");
	assert.equal(item.status, "watching");
	assert.equal(item.rating, 8);
	assert.equal(item.progress, 3);
	assert.equal(item.totalEpisodes, 12);
	assert.equal(item.description, "测试简介");
	assert.equal(item.link, "https://bgm.tv/subject/42");
});
