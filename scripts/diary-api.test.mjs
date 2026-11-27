import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";

import { diaryHandler } from "../server/diary.js";
import { createLocalBlobStore } from "../server/diary-dev.js";

const TEST_PASSWORD = "test-owner-password-at-least-24-chars";

function createRequest({
	method = "GET",
	url = "/api/diary",
	headers = {},
	body,
} = {}) {
	const chunks =
		body === undefined
			? []
			: [Buffer.isBuffer(body) ? body : Buffer.from(body)];
	const req = Readable.from(chunks);
	req.method = method;
	req.url = url;
	req.headers = {
		host: "localhost:4321",
		...headers,
	};
	return req;
}

function createResponse() {
	const headers = new Map();
	const chunks = [];
	let ended = false;
	const res = {
		statusCode: 200,
		setHeader(name, value) {
			headers.set(name.toLowerCase(), value);
		},
		getHeader(name) {
			return headers.get(name.toLowerCase());
		},
		write(chunk) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			return true;
		},
		end(chunk) {
			if (chunk !== undefined) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}
			ended = true;
			if (this._resolve) {
				this._resolve();
			}
		},
		on() {
			return this;
		},
		once() {
			return this;
		},
		emit() {
			return false;
		},
		destroy() {
			ended = true;
			if (this._resolve) {
				this._resolve();
			}
		},
		waitUntilDone() {
			if (ended) {
				return Promise.resolve();
			}
			return new Promise((resolve) => {
				this._resolve = resolve;
			});
		},
		bodyBuffer() {
			return Buffer.concat(chunks);
		},
		json() {
			return JSON.parse(this.bodyBuffer().toString("utf-8"));
		},
	};
	return res;
}

async function callHandler(handler, options) {
	const req = createRequest(options);
	const res = createResponse();
	await handler(req, res);
	await res.waitUntilDone();
	return res;
}

function setupHandler() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diary-api-test-"));
	const store = createLocalBlobStore(dir);
	const handler = diaryHandler({
		read: store.read,
		write: store.write,
		ownerKey: () => TEST_PASSWORD,
		secureCookie: false,
	});
	return {
		handler,
		cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
	};
}

test("diary API supports login, create, edit, conflict detection, delete, and image upload", async () => {
	const { handler, cleanup } = setupHandler();
	try {
		// 1. Initial feed falls back to seed
		const initialRes = await callHandler(handler, {
			method: "GET",
			url: "/api/diary",
		});
		assert.equal(initialRes.statusCode, 200);
		const initialFeed = initialRes.json();
		assert.equal(initialFeed.version, "initial");
		assert.ok(initialFeed.entries.length >= 1);

		// 2. Reject cross-origin POST
		const badOriginRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=login",
			headers: {
				origin: "https://evil.example",
				"content-type": "application/json",
			},
			body: JSON.stringify({ password: TEST_PASSWORD }),
		});
		assert.equal(badOriginRes.statusCode, 403);

		// 3. Reject unauthenticated save
		const unauthRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=save",
			headers: {
				origin: "http://localhost:4321",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				version: "initial",
				entry: {
					content: "unauthorized",
					date: "2026-11-27T12:00:00Z",
				},
			}),
		});
		assert.equal(unauthRes.statusCode, 401);

		// 4. Login with valid password
		const loginRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=login",
			headers: {
				origin: "http://localhost:4321",
				"content-type": "application/json",
			},
			body: JSON.stringify({ password: TEST_PASSWORD }),
		});
		assert.equal(loginRes.statusCode, 200);
		const setCookie = loginRes.getHeader("set-cookie");
		assert.ok(typeof setCookie === "string" && setCookie.includes("diary-session="));
		const cookieHeader = setCookie.split(";")[0];

		// 5. Session check succeeds with cookie
		const sessionRes = await callHandler(handler, {
			method: "GET",
			url: "/api/diary?action=session",
			headers: { cookie: cookieHeader },
		});
		assert.equal(sessionRes.statusCode, 200);
		assert.equal(sessionRes.json().authenticated, true);

		// 6. Upload a PNG image
		const pngBytes = Buffer.from([
			137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
		]);
		const uploadRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=upload",
			headers: {
				origin: "http://localhost:4321",
				cookie: cookieHeader,
				"content-type": "application/octet-stream",
			},
			body: pngBytes,
		});
		assert.equal(uploadRes.statusCode, 201);
		const uploadedUrl = uploadRes.json().url;
		assert.match(uploadedUrl, /^\/api\/diary\?image=[a-f0-9-]{36}\.png$/);

		// 7. Create a new diary entry
		const createRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=save",
			headers: {
				origin: "http://localhost:4321",
				cookie: cookieHeader,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				version: "initial",
				entry: {
					title: "Test Diary",
					content: "Hello from unit test",
					date: "2026-11-27T13:00:00Z",
					tags: ["测试"],
					images: [uploadedUrl],
				},
			}),
		});
		assert.equal(createRes.statusCode, 200);
		const created = createRes.json();
		assert.ok(created.id);
		assert.notEqual(created.version, "initial");
		assert.equal(created.entries.length, initialFeed.entries.length + 1);

		// 8. Edit existing diary entry
		const editRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=save",
			headers: {
				origin: "http://localhost:4321",
				cookie: cookieHeader,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				version: created.version,
				entry: {
					id: created.id,
					title: "Updated Diary",
					content: "Updated content",
					date: "2026-11-27T13:05:00Z",
					tags: ["测试", "更新"],
					images: [uploadedUrl],
				},
			}),
		});
		assert.equal(editRes.statusCode, 200);
		const edited = editRes.json();
		assert.equal(
			edited.entries.find((e) => e.id === created.id).title,
			"Updated Diary",
		);

		// 9. Stale version returns 409 on delete
		const staleDeleteRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=delete",
			headers: {
				origin: "http://localhost:4321",
				cookie: cookieHeader,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				version: created.version,
				id: created.id,
			}),
		});
		assert.equal(staleDeleteRes.statusCode, 409);

		// 10. Delete with current version succeeds
		const deleteRes = await callHandler(handler, {
			method: "POST",
			url: "/api/diary?action=delete",
			headers: {
				origin: "http://localhost:4321",
				cookie: cookieHeader,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				version: edited.version,
				id: created.id,
			}),
		});
		assert.equal(deleteRes.statusCode, 200);
		const deleted = deleteRes.json();
		assert.equal(deleted.deletedId, created.id);
		assert.equal(deleted.entries.length, initialFeed.entries.length);
		assert.equal(
			deleted.entries.find((e) => e.id === created.id),
			undefined,
		);
	} finally {
		cleanup();
	}
});
