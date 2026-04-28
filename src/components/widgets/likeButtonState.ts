/**
 * Shared like counter state + hit queue per (namespace, key).
 * Multiple LikeButton instances (e.g. sidebar + article footer) share one bucket.
 */
type Unsubscribe = () => void;

export type Store<T> = {
	subscribe: (fn: (v: T) => void) => Unsubscribe;
	set: (v: T) => void;
	update: (fn: (v: T) => T) => void;
	get: () => T;
};

function createStore<T>(initial: T): Store<T> {
	let value = initial;
	const subs = new Set<(v: T) => void>();

	function set(v: T) {
		value = v;
		for (const fn of subs) fn(value);
	}

	function update(fn: (v: T) => T) {
		set(fn(value));
	}

	function subscribe(fn: (v: T) => void): Unsubscribe {
		subs.add(fn);
		fn(value);
		return () => subs.delete(fn);
	}

	function get() {
		return value;
	}

	return { subscribe, set, update, get };
}

const ABACUS_BASE = "https://abacus.jasoncameron.dev";
const HIT_INTERVAL_MS = 350;
const POLL_MS = 30_000;
const ERR_BACKOFF_MS = 1500;
const RATE429_DEFAULT_MS = 2000;

export type LikeBucketState = {
	serverCount: number;
	pendingHits: number;
	myClicks: number;
};

type BucketMeta = {
	state: Store<LikeBucketState>;
	queueRunning: boolean;
	nextAvailableAt: number;
	refCount: number;
	bc: BroadcastChannel | null;
	pollTimer: ReturnType<typeof setInterval> | null;
	onVis: (() => void) | null;
	namespace: string;
	key: string;
};

const buckets = new Map<string, BucketMeta>();

function bucketId(namespace: string, key: string) {
	return `${namespace}::${key}`;
}

function abacusUrl(action: "hit" | "get", namespace: string, key: string) {
	return `${ABACUS_BASE}/${action}/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(res: Response): number {
	const raw = res.headers.get("Retry-After");
	if (raw == null || raw === "") return RATE429_DEFAULT_MS;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) return RATE429_DEFAULT_MS;
	// Abacus documents ms (not seconds).
	return n;
}

async function runQueue(meta: BucketMeta) {
	if (meta.queueRunning) return;
	meta.queueRunning = true;

	while (meta.state.get().pendingHits > 0) {
		const wait = Math.max(
			0,
			meta.nextAvailableAt - Date.now(),
			HIT_INTERVAL_MS,
		);
		await sleep(wait);

		const st = meta.state.get();
		if (st.pendingHits <= 0) break;

		try {
			const res = await fetch(abacusUrl("hit", meta.namespace, meta.key));
			if (res.status === 429) {
				meta.nextAvailableAt = Date.now() + parseRetryAfterMs(res);
				continue;
			}

			const data: unknown = await res.json();
			const value =
				data &&
				typeof data === "object" &&
				"value" in data &&
				typeof (data as { value: unknown }).value === "number"
					? (data as { value: number }).value
					: null;

			meta.state.update((s) => {
				if (value != null) {
					return {
						...s,
						serverCount: Math.max(s.serverCount, value),
						pendingHits: Math.max(0, s.pendingHits - 1),
					};
				}
				return { ...s, pendingHits: Math.max(0, s.pendingHits - 1) };
			});
		} catch {
			meta.nextAvailableAt = Date.now() + ERR_BACKOFF_MS;
		}
	}

	meta.queueRunning = false;
}

export function safeKey(raw: string): string {
	if (raw.length <= 32) return raw;
	let h = 0;
	for (let i = 0; i < raw.length; i++) {
		h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
	}
	return `${raw.slice(0, 20)}-${(h >>> 0).toString(36)}`;
}

export function ensureBucket(namespace: string, key: string): BucketMeta {
	const id = bucketId(namespace, key);
	let meta = buckets.get(id);
	if (!meta) {
		meta = {
			state: createStore<LikeBucketState>({
				serverCount: 0,
				pendingHits: 0,
				myClicks: 0,
			}),
			queueRunning: false,
			nextAvailableAt: 0,
			refCount: 0,
			bc: null,
			pollTimer: null,
			onVis: null,
			namespace,
			key,
		};
		buckets.set(id, meta);
	}
	return meta;
}

export function attachBucket(
	namespace: string,
	key: string,
	handlers: {
		onServerCountPersist: (n: number) => void;
		onMyClicksPersist: (n: number) => void;
		loadInitial: () => {
			serverCount: number;
			myClicks: number;
		};
	},
): {
	state: Store<LikeBucketState>;
	click: () => void;
	refresh: () => Promise<void>;
	detach: () => void;
} {
	const meta = ensureBucket(namespace, key);
	meta.refCount += 1;

	const init = handlers.loadInitial();
	meta.state.update((s) => ({
		...s,
		serverCount: Math.max(s.serverCount, init.serverCount),
		myClicks: Math.max(s.myClicks, init.myClicks),
	}));

	async function refresh() {
		try {
			const res = await fetch(abacusUrl("get", meta.namespace, meta.key));
			const data: unknown = await res.json();
			const value =
				data &&
				typeof data === "object" &&
				"value" in data &&
				typeof (data as { value: unknown }).value === "number"
					? (data as { value: number }).value
					: null;
			if (value != null) {
				meta.state.update((s) => ({
					...s,
					serverCount: Math.max(s.serverCount, value),
				}));
			}
		} catch {
			/* ignore */
		}
	}

	function click() {
		meta.state.update((s) => ({
			...s,
			myClicks: s.myClicks + 1,
			pendingHits: s.pendingHits + 1,
		}));

		const st = meta.state.get();
		handlers.onMyClicksPersist(st.myClicks);

		try {
			meta.bc?.postMessage({ type: "myhit" });
		} catch {
			/* ignore */
		}

		void runQueue(meta);
	}

	function onBcMessage(ev: MessageEvent) {
		const t = ev.data?.type;
		if (t === "myhit" || t === "refresh") {
			void refresh();
		}
	}

	if (meta.refCount === 1) {
		meta.bc = new BroadcastChannel(`like-${namespace}-${key}`);
		meta.bc.addEventListener("message", onBcMessage);

		meta.onVis = () => {
			if (document.visibilityState === "visible") void refresh();
		};
		document.addEventListener("visibilitychange", meta.onVis);

		meta.pollTimer = setInterval(() => {
			void refresh();
		}, POLL_MS);

		void refresh();
	}

	const unsubPersist = meta.state.subscribe((s) => {
		handlers.onServerCountPersist(s.serverCount);
	});

	function detach() {
		unsubPersist();
		meta.refCount -= 1;
		if (meta.refCount <= 0) {
			if (meta.pollTimer) clearInterval(meta.pollTimer);
			meta.pollTimer = null;

			if (meta.onVis) {
				document.removeEventListener("visibilitychange", meta.onVis);
				meta.onVis = null;
			}

			meta.bc?.removeEventListener("message", onBcMessage);
			meta.bc?.close();
			meta.bc = null;

			buckets.delete(bucketId(namespace, key));
		}
	}

	return { state: meta.state, click, refresh, detach };
}
