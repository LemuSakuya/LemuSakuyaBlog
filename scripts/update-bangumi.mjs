import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const API_BASE = "https://api.bgm.tv";
const USER_AGENT =
	"LemuSakuya/LemuSakuyaBlog (https://github.com/LemuSakuya/LemuSakuyaBlog)";
const CONFIG_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/config.ts",
);
const OUTPUT_FILE = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/data/bangumi-data.json",
);

async function getUserIdFromConfig() {
	try {
		const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
		const match = configContent.match(
			/bangumi:\s*\{[\s\S]*?userId:\s*["']([^"']+)["']/,
		);

		if (match && match[1]) {
			const userId = match[1].trim();
			if (
				userId === "your-bangumi-id" ||
				userId === "your-user-id" ||
				!userId
			) {
				throw new Error("Set a valid bangumi.userId in src/config.ts.");
			}
			return userId;
		}
		throw new Error("Could not find bangumi.userId in config.ts");
	} catch (error) {
		console.error("✘ Failed to read Bangumi ID from config.ts");
		throw error;
	}
}

async function getAnimeModeFromConfig() {
	try {
		const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
		const match = configContent.match(
			/anime:\s*\{[\s\S]*?mode:\s*["']([^"']+)["']/,
		);

		if (match && match[1]) {
			return match[1];
		}
		return "bangumi";
	} catch (error) {
		return "bangumi";
	}
}

// 模拟延迟防止 API 限制
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBangumiJson(endpoint) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(`${API_BASE}${endpoint}`, {
				headers: {
					Accept: "application/json",
					"User-Agent": USER_AGENT,
				},
				signal: AbortSignal.timeout(15_000),
			});
			if (!response.ok) {
				const error = new Error(
					`Bangumi API ${response.status}: ${endpoint}`,
				);
				error.status = response.status;
				throw error;
			}
			return await response.json();
		} catch (error) {
			const retryable =
				!error.status || error.status === 429 || error.status >= 500;
			if (!retryable || attempt === 2) throw error;
			console.warn(
				`Bangumi request failed, retrying (${attempt + 1}/2)...`,
			);
			await delay(500 * 2 ** attempt);
		}
	}
}

async function fetchSubjectDetail(subjectId) {
	try {
		return await fetchBangumiJson(`/v0/subjects/${subjectId}`);
	} catch (error) {
		return null;
	}
}

function getStudioFromInfobox(infobox) {
	if (!Array.isArray(infobox)) return "Unknown";

	const targetKeys = ["动画制作", "制作", "製作", "开发"];

	for (const key of targetKeys) {
		const item = infobox.find((i) => i.key === key);
		if (item) {
			if (typeof item.value === "string") {
				return item.value;
			}
			if (Array.isArray(item.value)) {
				const validItem = item.value.find((v) => v.v);
				if (validItem) return validItem.v;
			}
		}
	}
	return "Unknown";
}

async function fetchCollection(userId, type) {
	const allData = [];
	let offset = 0;
	const limit = 50;

	console.log(`Fetching type: ${type}...`);

	while (true) {
		const data = await fetchBangumiJson(
			`/v0/users/${encodeURIComponent(userId)}/collections?subject_type=2&type=${type}&limit=${limit}&offset=${offset}`,
		);
		if (
			!Array.isArray(data.data) ||
			!Number.isInteger(data.total) ||
			data.total < 0
		) {
			throw new Error(
				`Invalid Bangumi collection response (type ${type}).`,
			);
		}
		allData.push(...data.data);
		process.stdout.write(`   Fetched ${allData.length} records...\r`);
		if (allData.length >= data.total) break;
		if (data.data.length === 0) {
			throw new Error(`Incomplete Bangumi collection (type ${type}).`);
		}
		offset += data.data.length;
		await delay(300);
	}
	console.log("");
	return allData;
}

async function processData(items, status) {
	const results = [];
	let count = 0;
	const total = items.length;

	for (const item of items) {
		count++;
		process.stdout.write(
			`[${status}] Processing progress: ${count}/${total} (${item.subject_id})\r`,
		);

		const subjectDetail = await fetchSubjectDetail(item.subject_id);
		await delay(150);

		const year = item.subject?.date
			? item.subject.date.slice(0, 4)
			: "Unknown";

		const rating = item.rate
			? Number.parseFloat(item.rate.toFixed(1))
			: item.subject?.score
				? Number.parseFloat(item.subject.score.toFixed(1))
				: 0;

		const progress = item.ep_status || 0;
		const totalEpisodes = item.subject?.eps || progress;

		const studio = subjectDetail
			? getStudioFromInfobox(subjectDetail.infobox)
			: "Unknown";

		const description = (
			subjectDetail?.summary ||
			item.subject?.short_summary ||
			item.subject?.name_cn ||
			""
		).trimStart();

		results.push({
			title:
				item.subject?.name_cn || item.subject?.name || "Unknown Title",
			status: status,
			rating: rating,
			cover: item.subject?.images?.medium || "/assets/anime/default.webp",
			description: description,
			episodes: `${totalEpisodes} episodes`,
			year: year,
			genre: item.subject?.tags
				? item.subject.tags.slice(0, 3).map((tag) => tag.name)
				: ["Unknown"],
			studio: studio,
			link: item.subject?.id
				? `https://bgm.tv/subject/${item.subject.id}`
				: "#",
			progress: progress,
			totalEpisodes: totalEpisodes,
			startDate: item.subject?.date || "",
			endDate: item.subject?.date || "",
		});
	}
	console.log(`\n✓ Completed ${status} list processing`);
	return results;
}

async function main() {
	console.log("Initializing Bangumi data update script...");

	const animeMode = await getAnimeModeFromConfig();
	if (animeMode !== "bangumi") {
		console.log(
			`Detected current anime mode is "${animeMode}", skipping Bangumi data update.`,
		);
		return;
	}

	const USER_ID = await getUserIdFromConfig();
	console.log(`Read User ID: ${USER_ID}`);
	await updateBangumiData(USER_ID);
}

export async function updateBangumiData(userId, outputFile = OUTPUT_FILE) {
	const collections = [
		{ type: 3, status: "watching" },
		{ type: 1, status: "planned" },
		{ type: 2, status: "completed" },
		{ type: 4, status: "onhold" },
		{ type: 5, status: "dropped" },
	];

	let finalAnimeList = [];

	for (const c of collections) {
		const rawData = await fetchCollection(userId, c.type);
		if (rawData.length > 0) {
			const processed = await processData(rawData, c.status);
			finalAnimeList = [...finalAnimeList, ...processed];
		}
	}

	await fs.mkdir(path.dirname(outputFile), { recursive: true });
	const temporaryFile = `${outputFile}.${process.pid}.tmp`;
	try {
		await fs.writeFile(
			temporaryFile,
			JSON.stringify(finalAnimeList, null, 2),
		);
		await fs.rename(temporaryFile, outputFile);
	} finally {
		await fs.rm(temporaryFile, { force: true });
	}
	console.log(`\nUpdate complete! Data saved to: ${outputFile}`);
	console.log(`Total collected: ${finalAnimeList.length} anime series`);
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main().catch((err) => {
		console.error("\n✘ Script execution error (existing data preserved):");
		console.error(err);
		process.exitCode = 1;
	});
}
