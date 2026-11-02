import Key from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

import {
	DEFAULT_METING_API,
	DEFAULT_SONG,
	LOCAL_PLAYLIST,
	SKIP_ERROR_DELAY,
	STORAGE_KEY_VOLUME,
} from "@/components/widgets/music-player/constants";
import type { RepeatMode, Song } from "@/components/widgets/music-player/types";
import { musicPlayerConfig } from "@/config";

export interface MusicPlayerState {
	currentSong: Song;
	playlist: Song[];
	currentIndex: number;
	isPlaying: boolean;
	isLoading: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isMuted: boolean;
	isShuffled: boolean;
	isRepeating: RepeatMode;
	showPlaylist: boolean;
	errorMessage: string;
	showError: boolean;
	isExpanded: boolean;
	isHidden: boolean;
	autoplayFailed: boolean;
	willAutoPlay: boolean;
}

function getAssetPath(path: string): string {
	if (!path) {
		return "";
	}
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}
	if (path.startsWith("/")) {
		return path;
	}
	return `/${path}`;
}

export class MusicPlayerStore {
	private audio: HTMLAudioElement | null = null;
	private state: MusicPlayerState;
	private isInitialized = false;
	private playlistController: AbortController | undefined;
	private errorTimer: ReturnType<typeof setTimeout> | undefined;
	private skipTimer: ReturnType<typeof setTimeout> | undefined;
	private failedSongs = new Set<string>();
	private audioLoadTimer: ReturnType<typeof setTimeout> | undefined;
	private unregisterInteraction: (() => void) | undefined;
	private listeners = new Set<(state: MusicPlayerState) => void>();

	constructor() {
		this.state = this.createInitialState();
	}

	private createInitialState(): MusicPlayerState {
		return {
			currentSong: { ...DEFAULT_SONG },
			playlist: [],
			currentIndex: 0,
			isPlaying: false,
			isLoading: false,
			currentTime: 0,
			duration: 0,
			volume: 0.7,
			isMuted: false,
			isShuffled: false,
			isRepeating: 0,
			showPlaylist: false,
			errorMessage: "",
			showError: false,
			isExpanded: false,
			isHidden: false,
			autoplayFailed: false,
			willAutoPlay: false,
		};
	}

	private createSnapshot(): MusicPlayerState {
		return {
			...this.state,
			currentSong: { ...this.state.currentSong },
			playlist: this.state.playlist.map((song) => ({ ...song })),
		};
	}

	getState(): MusicPlayerState {
		return this.createSnapshot();
	}

	getAudio(): HTMLAudioElement | null {
		return this.audio;
	}

	subscribe(listener: (state: MusicPlayerState) => void): () => void {
		this.listeners.add(listener);
		listener(this.createSnapshot());
		return () => {
			this.listeners.delete(listener);
		};
	}

	async initialize(): Promise<void> {
		if (typeof window === "undefined" || this.isInitialized) {
			return;
		}
		this.isInitialized = true;

		if (!musicPlayerConfig.enable) {
			return;
		}

		this.audio = new Audio();
		this.setupAudioListeners();
		this.loadVolumeFromStorage();
		this.registerInteractionHandler();
		await this.loadPlaylist();
	}

	private setupAudioListeners(): void {
		if (!this.audio) {
			return;
		}

		const audio = this.audio;
		const listen = (event: string, handler: () => void) => {
			audio.addEventListener(event, () => {
				if (this.audio === audio) handler();
			});
		};

		this.audio.volume = this.state.volume;
		this.audio.muted = this.state.isMuted;

		listen("play", () => {
			this.state.isPlaying = true;
			this.broadcastState();
		});

		listen("pause", () => {
			this.state.isPlaying = false;
			this.broadcastState();
		});

		listen("timeupdate", () => {
			if (this.audio) {
				this.state.currentTime = this.audio.currentTime;
				this.broadcastState();
			}
		});

		listen("ended", () => {
			this.handleAudioEnded();
		});

		listen("error", () => {
			this.handleAudioError();
		});

		listen("loadedmetadata", () => this.updateDuration());
		listen("durationchange", () => this.updateDuration());

		listen("loadeddata", () => {
			this.handleAudioLoaded();
		});

		listen("loadstart", () => {
			clearTimeout(this.audioLoadTimer);
			this.audioLoadTimer = setTimeout(() => {
				if (this.audio === audio && this.state.isLoading)
					this.handleAudioError();
			}, 20000);
			this.state.isLoading = true;
			this.broadcastState();
		});
	}

	private handleAudioEnded(): void {
		if (this.state.isRepeating === 1) {
			if (this.audio) {
				this.audio.currentTime = 0;
				this.requestPlayback();
			}
		} else {
			this.next(true);
		}
	}

	private handleAudioError(): void {
		clearTimeout(this.audioLoadTimer);
		this.state.isLoading = false;
		this.state.isPlaying = false;
		this.failedSongs.add(this.state.currentSong.url);
		clearTimeout(this.skipTimer);
		const nextIndex = this.state.playlist.findIndex(
			(song, index) =>
				index !== this.state.currentIndex &&
				!this.failedSongs.has(song.url),
		);
		if (nextIndex < 0) {
			this.state.willAutoPlay = false;
			this.showError(i18n(Key.musicPlayerErrorEmpty));
			return;
		}
		this.showError(i18n(Key.musicPlayerErrorSong));
		const failedUrl = this.state.currentSong.url;
		this.skipTimer = setTimeout(() => {
			if (this.state.currentSong.url !== failedUrl || !this.audio) return;
			this.state.currentIndex = nextIndex;
			this.loadSong(
				this.state.playlist[nextIndex],
				this.state.willAutoPlay,
			);
		}, SKIP_ERROR_DELAY);
	}

	private updateDuration(): void {
		const duration = this.audio?.duration;
		if (duration && Number.isFinite(duration) && duration > 0) {
			this.state.duration = duration;
			this.state.currentSong = { ...this.state.currentSong, duration };
			this.broadcastState();
		}
	}

	private requestPlayback(): void {
		const audio = this.audio;
		if (!audio || !this.state.currentSong.url) return;
		this.state.willAutoPlay = true;
		const songUrl = this.state.currentSong.url;
		void audio.play().catch((error: unknown) => {
			if (
				this.audio !== audio ||
				this.state.currentSong.url !== songUrl ||
				!this.state.willAutoPlay
			)
				return;
			this.state.isPlaying = false;
			this.state.isLoading = false;
			this.state.autoplayFailed =
				error instanceof Error && error.name === "NotAllowedError";
			this.state.willAutoPlay = false;
			this.showError(i18n(Key.musicPlayerErrorPlayback));
		});
	}

	private handleAudioLoaded(): void {
		clearTimeout(this.audioLoadTimer);
		this.state.isLoading = false;
		this.updateDuration();
		if (this.state.willAutoPlay) this.requestPlayback();
		this.broadcastState();
	}

	private loadVolumeFromStorage(): void {
		if (typeof localStorage !== "undefined") {
			let savedVolume: string | null = null;
			try {
				savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
			} catch {
				return;
			}
			if (savedVolume) {
				const volume = parseFloat(savedVolume);
				if (!isNaN(volume) && volume >= 0 && volume <= 1) {
					this.state.volume = volume;
					this.state.isMuted = volume === 0;
					if (this.audio) {
						this.audio.volume = volume;
						this.audio.muted = this.state.isMuted;
					}
				}
			}
		}
	}

	private registerInteractionHandler(): void {
		const handler = () => {
			if (this.state.autoplayFailed && this.audio) {
				const playPromise = this.audio.play();
				if (playPromise !== undefined) {
					playPromise
						.then(() => {
							this.state.autoplayFailed = false;
						})
						.catch(() => {});
				}
			}
		};
		document.addEventListener("click", handler, { once: true });
		document.addEventListener("keydown", handler, { once: true });
		this.unregisterInteraction = () => {
			document.removeEventListener("click", handler);
			document.removeEventListener("keydown", handler);
		};
	}

	private async loadPlaylist(): Promise<void> {
		const mode = musicPlayerConfig.mode ?? "meting";
		const meting_api = musicPlayerConfig.meting_api ?? DEFAULT_METING_API;
		const meting_id = musicPlayerConfig.id ?? "14164869977";
		const meting_server = musicPlayerConfig.server ?? "netease";
		const meting_type = musicPlayerConfig.type ?? "playlist";

		if (mode === "meting") {
			await this.fetchMetingPlaylist(
				meting_api,
				meting_server,
				meting_type,
				meting_id,
			);
		} else {
			this.loadLocalPlaylist();
		}
	}

	private async fetchMetingPlaylist(
		api: string,
		server: string,
		type: string,
		id: string,
	): Promise<void> {
		if (!api || !id) {
			return;
		}

		this.state.isLoading = true;
		this.broadcastState();

		const apiUrl = api
			.replace(":server", server)
			.replace(":type", type)
			.replace(":id", id)
			.replace(":auth", "")
			.replace(":r", Date.now().toString());

		this.playlistController?.abort();
		const controller = new AbortController();
		this.playlistController = controller;
		const timeout = setTimeout(() => controller.abort(), 15000);
		try {
			const res = await fetch(apiUrl, { signal: controller.signal });
			if (!res.ok) {
				throw new Error("meting api error");
			}
			const list: unknown = await res.json();
			if (this.playlistController !== controller) return;
			if (!Array.isArray(list))
				throw new Error("Invalid playlist response");
			this.state.playlist = list
				.filter(
					(song) =>
						song && typeof song.url === "string" && song.url.trim(),
				)
				.map((song) => this.convertMetingSong(song));
			this.state.isLoading = false;

			if (this.state.playlist.length > 0) {
				this.loadSong(this.state.playlist[0], false);
			} else {
				this.showError(i18n(Key.musicPlayerErrorEmpty));
			}
		} catch {
			if (this.playlistController !== controller) return;
			this.showError(i18n(Key.musicPlayerErrorPlaylist));
			this.state.isLoading = false;
		} finally {
			clearTimeout(timeout);
			if (this.playlistController === controller)
				this.playlistController = undefined;
		}
		this.broadcastState();
	}

	private convertMetingSong(song: any): Song {
		const title = song.name ?? song.title ?? i18n(Key.unknownSong);
		const artist = song.artist ?? song.author ?? i18n(Key.unknownArtist);
		let dur = song.duration ?? 0;
		if (typeof dur === "string") {
			dur = parseInt(dur, 10);
		}
		if (dur > 10000) {
			dur = Math.floor(dur / 1000);
		}
		if (!Number.isFinite(dur) || dur <= 0) {
			dur = 0;
		}

		return {
			id:
				typeof song.id === "string"
					? parseInt(song.id, 10)
					: (song.id ?? 0),
			title,
			artist,
			cover: song.pic ?? "",
			url: song.url ?? "",
			duration: dur,
		};
	}

	private loadLocalPlaylist(): void {
		this.state.playlist = [...LOCAL_PLAYLIST];
		if (this.state.playlist.length === 0) {
			this.showError("本地播放列表为空");
		} else {
			this.loadSong(this.state.playlist[0], false);
		}
	}

	private loadSong(song: Song, autoPlay = true): void {
		if (!song) {
			return;
		}
		clearTimeout(this.skipTimer);
		clearTimeout(this.audioLoadTimer);
		this.state.currentSong = { ...song };
		this.state.currentTime = 0;
		this.state.duration = Number.isFinite(song.duration)
			? Math.max(0, song.duration)
			: 0;
		this.state.isPlaying = false;
		this.state.autoplayFailed = false;
		this.state.isLoading = Boolean(song.url);
		this.state.willAutoPlay = autoPlay;
		if (this.audio) {
			if (this.audio.src && song.url) {
				this.audio.pause();
				this.audio.removeAttribute("src");
			}
			this.audio.src = getAssetPath(song.url);
			this.audio.load();
		}
		this.broadcastState();
	}

	private showError(message: string): void {
		this.state.errorMessage = message;
		this.state.showError = true;
		clearTimeout(this.errorTimer);
		this.errorTimer = setTimeout(() => {
			this.state.showError = false;
			this.broadcastState();
		}, 3000);
		this.broadcastState();
	}

	hideError(): void {
		this.state.showError = false;
		this.broadcastState();
	}

	toggle(): void {
		if (
			this.state.isPlaying ||
			(this.state.willAutoPlay && this.state.isLoading)
		) {
			this.pause();
		} else {
			this.play();
		}
	}

	play(): void {
		if (!this.audio) return;
		this.failedSongs.clear();
		if (!this.state.currentSong.url) {
			if (!this.state.isLoading)
				void this.loadPlaylist().then(() => this.requestPlayback());
			return;
		}
		this.requestPlayback();
	}

	pause(): void {
		this.state.willAutoPlay = false;
		this.state.autoplayFailed = false;
		clearTimeout(this.skipTimer);
		if (!this.audio) {
			return;
		}
		this.audio.pause();
	}

	next(autoPlay = true): void {
		if (this.state.playlist.length <= 1) {
			return;
		}

		let newIndex: number;
		if (this.state.isShuffled) {
			do {
				newIndex = Math.floor(
					Math.random() * this.state.playlist.length,
				);
			} while (
				newIndex === this.state.currentIndex &&
				this.state.playlist.length > 1
			);
		} else {
			newIndex =
				this.state.currentIndex < this.state.playlist.length - 1
					? this.state.currentIndex + 1
					: 0;
		}

		this.state.currentIndex = newIndex;
		this.loadSong(this.state.playlist[newIndex], autoPlay);
	}

	prev(): void {
		if (this.state.playlist.length <= 1) {
			return;
		}
		const newIndex =
			this.state.currentIndex > 0
				? this.state.currentIndex - 1
				: this.state.playlist.length - 1;
		this.state.currentIndex = newIndex;
		this.loadSong(this.state.playlist[newIndex], true);
	}

	playIndex(index: number): void {
		this.failedSongs.clear();
		if (index < 0 || index >= this.state.playlist.length) {
			return;
		}
		this.state.currentIndex = index;
		this.loadSong(this.state.playlist[index], true);
	}

	seek(time: number): void {
		if (!this.audio) {
			return;
		}
		if (Number.isFinite(time) && time >= 0 && time <= this.state.duration) {
			this.audio.currentTime = time;
			this.state.currentTime = time;
			this.broadcastState();
		}
	}

	setVolume(volume: number): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.state.volume = clampedVolume;
		this.state.isMuted = clampedVolume === 0;
		if (this.audio) {
			this.audio.volume = clampedVolume;
			this.audio.muted = this.state.isMuted;
		}
		if (typeof localStorage !== "undefined") {
			try {
				localStorage.setItem(STORAGE_KEY_VOLUME, String(clampedVolume));
			} catch {
				/* Playback works without saved preferences. */
			}
		}
		this.broadcastState();
	}

	toggleMute(): void {
		this.state.isMuted = !this.state.isMuted;
		if (this.audio) {
			this.audio.muted = this.state.isMuted;
		}
		this.broadcastState();
	}

	toggleShuffle(): void {
		this.state.isShuffled = !this.state.isShuffled;
		if (this.state.isShuffled) {
			this.state.isRepeating = 0;
		}
		this.broadcastState();
	}

	toggleRepeat(): void {
		this.state.isRepeating = ((this.state.isRepeating + 1) %
			3) as RepeatMode;
		if (this.state.isRepeating !== 0) {
			this.state.isShuffled = false;
		}
		this.broadcastState();
	}

	toggleMode(): void {
		if (this.state.isShuffled) {
			this.toggleShuffle();
			return;
		}
		if (this.state.isRepeating === 2) {
			this.toggleRepeat();
			this.toggleShuffle();
			return;
		}
		this.toggleRepeat();
	}

	togglePlaylist(): void {
		this.state.showPlaylist = !this.state.showPlaylist;
		this.broadcastState();
	}

	toggleExpanded(): void {
		this.state.isExpanded = !this.state.isExpanded;
		// 保持与原先 usePlayerState.toggleExpandedUI 一致的联动行为：
		// 展开时强制取消隐藏，并关闭播放列表，避免状态组合异常
		if (this.state.isExpanded) {
			this.state.showPlaylist = false;
			this.state.isHidden = false;
		}
		this.broadcastState();
	}

	toggleHidden(): void {
		this.state.isHidden = !this.state.isHidden;
		// 保持与原先 usePlayerState.toggleHiddenUI 一致的联动行为：
		// 隐藏时收起播放器并关闭播放列表，防止展开 UI 悬挂在小球旁边
		if (this.state.isHidden) {
			this.state.isExpanded = false;
			this.state.showPlaylist = false;
		}
		this.broadcastState();
	}

	canSkip(): boolean {
		return this.state.playlist.length > 1;
	}

	setProgress(percent: number): void {
		if (!this.audio) {
			return;
		}
		if (!Number.isFinite(percent) || this.state.duration <= 0) return;
		this.seek(Math.max(0, Math.min(1, percent)) * this.state.duration);
	}

	private broadcastState(): void {
		const snapshot = this.createSnapshot();

		for (const listener of this.listeners) {
			listener(snapshot);
		}

		if (typeof window === "undefined") {
			return;
		}
		window.dispatchEvent(
			new CustomEvent("music-sidebar:state", {
				detail: snapshot,
			}),
		);
	}

	destroy(): void {
		this.playlistController?.abort();
		this.playlistController = undefined;
		clearTimeout(this.skipTimer);
		clearTimeout(this.errorTimer);
		clearTimeout(this.audioLoadTimer);
		this.failedSongs.clear();
		this.state.willAutoPlay = false;
		this.state.isPlaying = false;
		this.state.isLoading = false;
		if (this.unregisterInteraction) {
			this.unregisterInteraction();
		}
		if (this.audio) {
			this.audio.pause();
			this.audio.src = "";
			this.audio = null;
		}
		this.isInitialized = false;
	}
}

export const musicPlayerStore = new MusicPlayerStore();
