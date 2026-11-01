import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const CONFIG_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/config.ts",
);

function runScript(scriptPath) {
	return new Promise((resolve, reject) => {
		const script = spawn(process.execPath, [scriptPath], {
			stdio: "inherit",
		});

		script.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Script exited with code ${code}`));
			}
		});

		script.on("error", (err) => {
			reject(err);
		});
	});
}

async function main() {
	const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
	const mode =
		configContent.match(
			/anime:\s*\{[\s\S]*?mode:\s*["']([^"']+)["']/,
		)?.[1] ?? "bangumi";
	const featurePages = configContent.match(
		/featurePages:\s*\{([^}]+)\}/,
	)?.[1];
	if (featurePages && /anime:\s*false\b/.test(featurePages)) {
		console.log("Anime page is disabled, skipping data update.");
		return;
	}
	if (process.argv.includes("--dev")) {
		const sourceConfig = configContent.match(
			new RegExp(`\\b${mode}:\\s*\\{([^}]+)\\}`),
		)?.[1];
		if (!sourceConfig || !/fetchOnDev:\s*true\b/.test(sourceConfig)) {
			console.log(`Development data update is disabled for ${mode}.`);
			return;
		}
	}
	const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

	if (mode === "bilibili") {
		console.log(
			"Detected anime mode: bilibili, running update-bilibili.mjs",
		);
		await runScript(path.join(scriptsDir, "update-bilibili.mjs"));
	} else if (mode === "bangumi") {
		console.log("Detected anime mode: bangumi, running update-bangumi.mjs");
		await runScript(path.join(scriptsDir, "update-bangumi.mjs"));
	} else {
		console.log(`Anime mode is "${mode}", skipping data update.`);
	}
}

main().catch((err) => {
	console.error("\n✘ Script execution error:");
	console.error(err);
	process.exit(1);
});
