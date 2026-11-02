import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
	new URL("../src/stores/musicPlayerStore.ts", import.meta.url),
	"utf8",
);
const code = ts.transpileModule(source, {
	compilerOptions: {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.CommonJS,
	},
}).outputText;
const require = createRequire(import.meta.url);

function setup({ mode = "local", fetchImpl, blockedStorage = false } = {}) {
	const timers = new Map();
	let timerId = 0;
	class AudioMock extends EventTarget {
		src = "";
		currentTime = 0;
		duration = NaN;
		volume = 0.7;
		muted = false;
		playCalls = 0;
		playError;
		load() {
			this.currentTime = 0;
			this.dispatchEvent(new Event("loadstart"));
		}
		play() {
			this.playCalls++;
			if (this.playError) return Promise.reject(this.playError);
			this.dispatchEvent(new Event("play"));
			return Promise.resolve();
		}
		pause() {
			this.dispatchEvent(new Event("pause"));
		}
		removeAttribute() {
			this.src = "";
		}
	}
	const playlist = [1, 2].map((id) => ({
		id,
		title: `Song ${id}`,
		artist: "Artist",
		url: `/song${id}.mp3`,
		cover: "",
		duration: 0,
	}));
	const mocks = {
		"@i18n/i18nKey": { default: new Proxy({}, { get: (_, key) => key }) },
		"@i18n/translation": { i18n: (key) => key },
		"@/config": { musicPlayerConfig: { enable: true, mode } },
		"@/components/widgets/music-player/constants": {
			DEFAULT_METING_API: "https://example.test/:server/:type/:id",
			LOCAL_PLAYLIST: playlist,
			DEFAULT_SONG: { ...playlist[0], url: "" },
			SKIP_ERROR_DELAY: 1000,
			STORAGE_KEY_VOLUME: "volume",
		},
	};
	const exports = {};
	const context = vm.createContext({
		exports,
		require: (name) => mocks[name] ?? require(name),
		Audio: AudioMock,
		window: new EventTarget(),
		document: new EventTarget(),
		CustomEvent,
		Error,
		AbortController,
		fetch:
			fetchImpl ??
			(() => Promise.resolve({ ok: true, json: async () => playlist })),
		localStorage: {
			getItem() {
				if (blockedStorage) throw new Error("SecurityError");
				return null;
			},
			setItem() {
				if (blockedStorage) throw new Error("SecurityError");
			},
		},
		setTimeout: (fn, delay) => {
			const id = ++timerId;
			timers.set(id, { fn, delay });
			return id;
		},
		clearTimeout: (id) => timers.delete(id),
	});
	vm.runInContext(code, context);
	const store = new exports.MusicPlayerStore();
	return {
		store,
		fireTimers(delay) {
			for (const [id, timer] of [...timers])
				if (timer.delay === delay) {
					timers.delete(id);
					timer.fn();
				}
		},
	};
}

test("switching tracks clears stale progress and metadata unlocks seeking", async () => {
	const { store } = setup();
	await store.initialize();
	const audio = store.getAudio();
	audio.duration = 250;
	audio.dispatchEvent(new Event("loadedmetadata"));
	store.seek(120);
	store.next(false);
	assert.equal(store.getState().currentTime, 0);
	assert.equal(store.getState().duration, 0);
	store.setProgress(NaN);
	assert.equal(audio.currentTime, 0);
	audio.duration = 140;
	audio.dispatchEvent(new Event("durationchange"));
	store.setProgress(2);
	assert.equal(audio.currentTime, 140);
	store.destroy();
});

test("pause cancels pending autoplay when audio finishes loading", async () => {
	const { store } = setup();
	await store.initialize();
	store.next(true);
	store.pause();
	const audio = store.getAudio();
	audio.dispatchEvent(new Event("loadeddata"));
	assert.equal(audio.playCalls, 0);
	assert.equal(store.getState().willAutoPlay, false);
	store.destroy();
});

test("rejected playback reports an error and clears loading", async () => {
	const { store } = setup();
	await store.initialize();
	store.getAudio().playError = Object.assign(new Error("Denied"), {
		name: "NotAllowedError",
	});
	store.play();
	await Promise.resolve();
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().showError, true);
	assert.equal(store.getState().autoplayFailed, true);
	store.destroy();
});

test("blocked localStorage does not prevent initialization or volume control", async () => {
	const { store } = setup({ blockedStorage: true });
	await store.initialize();
	assert.equal(store.getState().playlist.length, 2);
	assert.doesNotThrow(() => store.setVolume(0.5));
	assert.equal(store.getAudio().volume, 0.5);
	store.destroy();
});

test("playlist requests time out and leave a visible recoverable error", async () => {
	const { store, fireTimers } = setup({
		mode: "meting",
		fetchImpl: (_, { signal }) =>
			new Promise((_, reject) => {
				signal.addEventListener(
					"abort",
					() => reject(new Error("Aborted")),
					{ once: true },
				);
			}),
	});
	const pending = store.initialize();
	fireTimers(15000);
	await pending;
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().showError, true);
	store.destroy();
});

test("destroy prevents late playlist responses from recreating player state", async () => {
	let resolve;
	const { store } = setup({
		mode: "meting",
		fetchImpl: () =>
			new Promise((r) => {
				resolve = r;
			}),
	});
	const pending = store.initialize();
	store.destroy();
	resolve({
		ok: true,
		json: async () => [{ name: "Late", url: "/late.mp3" }],
	});
	await pending;
	assert.equal(store.getAudio(), null);
	assert.equal(store.getState().playlist.length, 0);
});

test("failed sources are tried once and stop instead of cycling forever", async () => {
	const { store, fireTimers } = setup();
	await store.initialize();
	store.getAudio().dispatchEvent(new Event("error"));
	fireTimers(1000);
	assert.equal(store.getState().currentIndex, 1);
	store.getAudio().dispatchEvent(new Event("error"));
	fireTimers(1000);
	assert.equal(store.getState().currentIndex, 1);
	assert.equal(store.getState().willAutoPlay, false);
	assert.equal(store.getState().isLoading, false);
	store.destroy();
});

test("stalled audio advances after timeout instead of loading indefinitely", async () => {
	const { store, fireTimers } = setup();
	await store.initialize();
	fireTimers(20000);
	assert.equal(store.getState().isLoading, false);
	fireTimers(1000);
	assert.equal(store.getState().currentIndex, 1);
	store.destroy();
});

test("play retries a failed playlist request", async () => {
	let attempts = 0;
	const { store } = setup({
		mode: "meting",
		fetchImpl: async () => {
			if (++attempts === 1) throw new Error("Offline");
			return {
				ok: true,
				json: async () => [
					{ name: "Recovered", url: "/recovered.mp3" },
				],
			};
		},
	});
	await store.initialize();
	store.play();
	await new Promise(setImmediate);
	assert.equal(attempts, 2);
	assert.equal(store.getState().currentSong.title, "Recovered");
	assert.equal(store.getAudio().playCalls, 1);
	store.destroy();
});
