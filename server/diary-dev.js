import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { BlobPreconditionFailedError } from "@vercel/blob";
import { loadEnv } from "../scripts/load-env.js";
import { diaryHandler } from "./diary.js";

function etagFor(buffer) {
	return '"' + createHash("sha256").update(buffer).digest("hex").slice(0, 24) + '"';
}

export function createLocalBlobStore(baseDir = path.resolve("cache/diary-dev")) {
	function resolveFiles(pathname) {
		const normalized = path.posix.normalize(pathname).replace(/^\/+/, "");
		if (normalized.startsWith("..")) {
			throw new Error("Invalid blob path");
		}
		const filePath = path.join(baseDir, normalized);
		return { filePath, metaPath: filePath + ".meta.json" };
	}

	async function read(pathname) {
		const { filePath, metaPath } = resolveFiles(pathname);
		if (!fs.existsSync(filePath)) {
			return null;
		}
		const buffer = fs.readFileSync(filePath);
		let contentType = "application/octet-stream";
		let etag = etagFor(buffer);
		if (fs.existsSync(metaPath)) {
			try {
				const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
				if (meta.contentType) contentType = meta.contentType;
				if (meta.etag) etag = meta.etag;
			} catch {
				/* ignore malformed metadata */
			}
		}
		return {
			blob: { contentType, etag },
			stream: Readable.toWeb(Readable.from([buffer])),
		};
	}

	async function write(pathname, body, options = {}) {
		const { filePath, metaPath } = resolveFiles(pathname);
		const exists = fs.existsSync(filePath);
		if (options.allowOverwrite === false && exists) {
			throw new BlobPreconditionFailedError();
		}
		if (options.ifMatch) {
			if (!exists) {
				throw new BlobPreconditionFailedError();
			}
			const existing = await read(pathname);
			if (!existing || existing.blob.etag !== options.ifMatch) {
				throw new BlobPreconditionFailedError();
			}
		}
		const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
		const etag = etagFor(buffer);
		const contentType = options.contentType || "application/octet-stream";
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, buffer);
		fs.writeFileSync(metaPath, JSON.stringify({ contentType, etag }));
		return { etag, contentType };
	}

	return { read, write };
}

export function diaryDevPlugin() {
	return {
		name: "diary-dev-api",
		configureServer(server) {
			loadEnv();
			const useRemoteBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
			const store = useRemoteBlob ? null : createLocalBlobStore();
			const handler = diaryHandler({
				...(store ? { read: store.read, write: store.write } : {}),
				ownerKey: () => process.env.DIARY_ADMIN_PASSWORD,
				secureCookie: false,
			});

			server.middlewares.use((req, res, next) => {
				const pathname = (req.url || "").split("?")[0];
				if (pathname === "/api/diary" || pathname === "/api/diary/") {
					void handler(req, res);
					return;
				}
				next();
			});
		},
	};
}
