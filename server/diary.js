import {
	createHash,
	createHmac,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import { Readable } from "node:stream";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import seed from "../src/data/diary-seed.json" with { type: "json" };

const feedPath = "diary/published.json";
const sessionName = "__Host-diary-session";
const imageName = /^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/;
const conflict = "另一個分頁已更新日記。請保留草稿，重新載入最新版本。";

class RequestError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

function sameSecret(left, right) {
	const digest = (value) => createHash("sha256").update(value).digest();
	return timingSafeEqual(digest(left), digest(right));
}

function signature(key, expires) {
	return createHmac("sha256", key)
		.update("diary/session/" + expires)
		.digest("base64url");
}

function loggedIn(req, key, cookieName = sessionName) {
	if (!key || key.length < 24) return false;
	const cookie = (req.headers.cookie || "")
		.split(";")
		.map((s) => s.trim())
		.find((s) => s.startsWith(cookieName + "="))
		?.slice(cookieName.length + 1);
	const parts = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(cookie || "");
	return Boolean(
		parts &&
		Number(parts[1]) > Date.now() &&
		sameSecret(parts[2], signature(key, parts[1])),
	);
}

function json(res, status, value) {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.end(JSON.stringify(value));
}

async function readBody(req, limit) {
	if (Number(req.headers["content-length"]) > limit)
		throw new RequestError(413, "檔案或日記太大。");
	// Vercel may have parsed JSON or binary request bodies before invoking the function.
	if (req.body !== undefined) {
		const value = Buffer.isBuffer(req.body)
			? req.body
			: Buffer.from(
					typeof req.body === "string"
						? req.body
						: JSON.stringify(req.body),
				);
		if (value.length > limit)
			throw new RequestError(413, "檔案或日記太大。");
		return value;
	}
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > limit) throw new RequestError(413, "檔案或日記太大。");
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

function textField(value, max, required = false) {
	if (value == null && !required) return "";
	if (
		typeof value !== "string" ||
		value.length > max ||
		(required && !value.trim())
	)
		throw new RequestError(400, "請檢查必填欄位及文字長度。");
	return value.trim();
}

function listField(value, maxCount, convert) {
	if (value == null) return [];
	if (!Array.isArray(value) || value.length > maxCount)
		throw new RequestError(400, "標籤或圖片數量超過限制。");
	return [...new Set(value.map(convert))];
}

function imageUrl(value) {
	const url = textField(value, 2048, true);
	if (/^\/images\/diary\/[\w./%-]+$/.test(url) && !url.includes(".."))
		return url;
	if (url.startsWith("/api/diary?image=") && imageName.test(url.slice(17)))
		return url;
	try {
		if (new URL(url).protocol === "https:") return url;
	} catch {
		/* invalid URL */
	}
	throw new RequestError(400, "請選擇圖片檔案或使用 HTTPS 圖片網址。");
}

function entryFrom(input, id) {
	if (!input || typeof input !== "object")
		throw new RequestError(400, "缺少日記。");
	const date = textField(input.date, 40, true);
	if (!Number.isFinite(Date.parse(date)))
		throw new RequestError(400, "日期無效。");
	const link = textField(input.link, 2048);
	if (link) {
		try {
			if (!["https:", "http:"].includes(new URL(link).protocol))
				throw Error();
		} catch {
			throw new RequestError(400, "原文連結必須是 HTTP 或 HTTPS 網址。");
		}
	}
	return {
		id,
		date: new Date(date).toISOString(),
		title: textField(input.title, 200),
		content: textField(input.content, 100000, true),
		tags: listField(input.tags, 20, (v) => textField(v, 50, true)),
		images: listField(input.images, 12, imageUrl),
		location: textField(input.location, 150),
		mood: textField(input.mood, 100),
		link,
	};
}

function detectImage(bytes) {
	if (
		bytes
			.subarray(0, 8)
			.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
	)
		return ["png", "image/png"];
	if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
		return ["jpg", "image/jpeg"];
	if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)))
		return ["gif", "image/gif"];
	if (
		bytes.toString("ascii", 0, 4) === "RIFF" &&
		bytes.toString("ascii", 8, 12) === "WEBP"
	)
		return ["webp", "image/webp"];
	throw new RequestError(415, "支援 JPG、PNG、WebP 和 GIF 圖片。");
}

export function diaryHandler({
	read = get,
	write = put,
	ownerKey = () => process.env.DIARY_ADMIN_PASSWORD,
	secureCookie = true,
} = {}) {
	const cookieName = secureCookie ? sessionName : "diary-session";
	async function feed() {
		const result = await read(feedPath, {
			access: "private",
			useCache: false,
		});
		if (!result) return { entries: seed, version: "initial" };
		const entries = await new Response(result.stream).json();
		if (!Array.isArray(entries)) throw Error("Invalid stored diary");
		return { entries, version: result.blob.etag };
	}
	async function persistFeed(entries, currentVersion) {
		const payload = JSON.stringify(entries);
		if (Buffer.byteLength(payload) > 3000000)
			throw new RequestError(413, "日記資料已達儲存上限。");
		try {
			return await write(feedPath, payload, {
				access: "private",
				contentType: "application/json",
				addRandomSuffix: false,
				...(currentVersion === "initial"
					? { allowOverwrite: false }
					: { ifMatch: currentVersion }),
			});
		} catch (e) {
			if (
				e instanceof BlobPreconditionFailedError ||
				(currentVersion === "initial" &&
					(await feed()).version !== "initial")
			)
				throw new RequestError(409, conflict);
			throw e;
		}
	}
	return async (req, res) => {
		res.setHeader("Cache-Control", "private, no-store");
		res.setHeader("X-Content-Type-Options", "nosniff");
		try {
			const url = new URL(req.url, "http://localhost");
			const action = url.searchParams.get("action") || "feed";
			const key = ownerKey();
			if (req.method === "GET") {
				if (action === "session")
					return json(res, 200, {
						authenticated: loggedIn(req, key, cookieName),
					});
				if (url.searchParams.has("image")) {
					const name = url.searchParams.get("image");
					if (!imageName.test(name))
						throw new RequestError(404, "找不到圖片。");
					const result = await read("diary/images/" + name, {
						access: "private",
					});
					if (!result) throw new RequestError(404, "找不到圖片。");
					res.setHeader("Content-Type", result.blob.contentType);
					res.setHeader(
						"Cache-Control",
						"public, max-age=31536000, immutable",
					);
					Readable.fromWeb(result.stream)
						.on("error", () => res.destroy())
						.pipe(res);
					return;
				}
				if (action === "feed") return json(res, 200, await feed());
				throw new RequestError(404, "找不到此操作。");
			}
			if (req.method !== "POST") {
				res.setHeader("Allow", "GET, POST");
				throw new RequestError(405, "不支援此操作。");
			}
			let origin;
			try {
				origin = new URL(req.headers.origin);
			} catch {
				/* missing or invalid */
			}
			if (
				!origin ||
				!["https:", "http:"].includes(origin.protocol) ||
				origin.host !== req.headers.host
			)
				throw new RequestError(403, "只能由本站提交。");
			if (!key || key.length < 24)
				throw new RequestError(503, "站主登入尚未設定。");
			const cookie = (v, age) =>
				res.setHeader(
					"Set-Cookie",
					cookieName +
						"=" +
						v +
						"; Path=/; HttpOnly" +
						(secureCookie ? "; Secure" : "") +
						"; SameSite=Strict; Max-Age=" +
						age,
				);
			if (action === "logout") {
				cookie("", 0);
				return json(res, 200, { authenticated: false });
			}
			if (action !== "login" && !loggedIn(req, key, cookieName))
				throw new RequestError(401, "請先登入。");
			if (action === "upload") {
				if (
					req.headers["content-type"]?.split(";")[0] !==
					"application/octet-stream"
				)
					throw new RequestError(415, "請選擇圖片。");
				const bytes = await readBody(req, 3 * 1024 * 1024);
				const [ext, contentType] = detectImage(bytes);
				const name = randomUUID() + "." + ext;
				await write("diary/images/" + name, bytes, {
					access: "private",
					contentType,
					addRandomSuffix: false,
				});
				return json(res, 201, { url: "/api/diary?image=" + name });
			}
			if (
				req.headers["content-type"]?.split(";")[0] !==
				"application/json"
			)
				throw new RequestError(415, "需要 JSON 格式。");
			let body;
			try {
				body = JSON.parse(
					(
						await readBody(req, action === "login" ? 2048 : 512000)
					).toString(),
				);
			} catch (e) {
				if (e instanceof RequestError) throw e;
				throw new RequestError(400, "資料格式錯誤。");
			}
			if (!body || typeof body !== "object")
				throw new RequestError(400, "資料格式錯誤。");
			if (action === "login") {
				if (
					typeof body.password !== "string" ||
					!sameSecret(body.password, key)
				)
					throw new RequestError(401, "站主密碼不正確。");
				const expires = String(Date.now() + 8 * 3600000);
				cookie(expires + "." + signature(key, expires), 8 * 3600);
				return json(res, 200, { authenticated: true });
			}
			if (action === "delete") {
				const current = await feed();
				if (current.version !== body.version)
					throw new RequestError(409, conflict);
				if (body.id == null)
					throw new RequestError(400, "缺少日記編號。");
				const index = current.entries.findIndex(
					(e) => e.id === body.id,
				);
				if (index < 0)
					throw new RequestError(404, "找不到這篇日記。");
				const entries = current.entries.filter((_, i) => i !== index);
				const saved = await persistFeed(entries, current.version);
				return json(res, 200, {
					entries,
					version: saved.etag,
					deletedId: body.id,
				});
			}
			if (action !== "save")
				throw new RequestError(404, "找不到此操作。");
			const current = await feed();
			if (current.version !== body.version)
				throw new RequestError(409, conflict);
			const id = body.entry?.id;
			const index =
				id == null ? -1 : current.entries.findIndex((e) => e.id === id);
			if (id != null && index < 0)
				throw new RequestError(404, "找不到這篇日記。");
			const entry = entryFrom(body.entry, id ?? randomUUID());
			const entries = [...current.entries];
			if (index < 0) entries.push(entry);
			else entries[index] = entry;
			entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
			const saved = await persistFeed(entries, current.version);
			return json(res, 200, {
				entries,
				version: saved.etag,
				id: entry.id,
			});
		} catch (e) {
			if (!(e instanceof RequestError))
				console.error("Diary storage operation failed", e?.name);
			return json(res, e instanceof RequestError ? e.status : 503, {
				error:
					e instanceof RequestError
						? e.message
						: "日記服務暫時無法連線，請稍後再試。",
			});
		}
	};
}
