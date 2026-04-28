<script lang="ts">
	import { onMount } from "svelte";
	import { siteConfig } from "@/config";
	import { attachBucket, safeKey, type LikeBucketState } from "./likeButtonState";

	export let type: "global" | "post" = "global";
	export let postId: string | undefined = undefined;
	export let showLabel: boolean = true;
	export let compact: boolean = false;
	export let tooltipText: string | undefined = undefined;

	let isLoading = true;

	let serverCount = 0;
	let pendingHits = 0;
	let myClicks = 0;
	$: count = serverCount + pendingHits;
	$: hasLiked = myClicks > 0;

	type Particle = { id: number; x: number; y: number; rot: number };
	let particleSeq = 0;
	let particles: Particle[] = [];

	const namespace = new URL(siteConfig.siteURL).hostname.replace(
		/[^a-zA-Z0-9_-]/g,
		"-",
	);
	const rawKey = type === "post" ? `post-${postId || "unknown"}` : "global";
	const key = safeKey(rawKey);

	const legacyLikedKey =
		type === "post" ? `liked-post-${postId}` : "liked-global";
	const legacyCountKey =
		type === "post" ? `like-count-post-${postId}` : "like-count-global";

	const myClicksKey =
		type === "post" ? `like-my-clicks-post-${postId}` : "like-my-clicks-global";
	const countCacheKey =
		type === "post" ? `like-server-count-post-${postId}` : "like-server-count-global";

	let detach: (() => void) | null = null;
	let unsubscribe: (() => void) | null = null;

	function spawnHeartParticle() {
		const id = ++particleSeq;
		const x = (Math.random() - 0.5) * 18;
		const y = -10 - Math.random() * 8;
		const rot = (Math.random() - 0.5) * 30;
		particles = [...particles, { id, x, y, rot }];
		setTimeout(() => {
			particles = particles.filter((p) => p.id !== id);
		}, 700);
	}

	function loadInitialFromStorage(): { serverCount: number; myClicks: number } {
		const cachedCount = Number(localStorage.getItem(countCacheKey));
		const legacyCount = Number(localStorage.getItem(legacyCountKey));
		const count =
			(Number.isFinite(cachedCount) ? cachedCount : 0) ||
			(Number.isFinite(legacyCount) ? legacyCount : 0) ||
			0;

		const cachedMyClicks = Number(localStorage.getItem(myClicksKey));
		let clicks = Number.isFinite(cachedMyClicks) ? cachedMyClicks : 0;

		// migrate: old "liked-*" boolean => myClicks = 1
		if (clicks <= 0 && localStorage.getItem(legacyLikedKey) === "true") {
			clicks = 1;
		}

		return {
			serverCount: Math.max(0, count),
			myClicks: Math.max(0, clicks),
		};
	}

	function persistServerCount(n: number) {
		try {
			localStorage.setItem(countCacheKey, String(Math.max(0, n)));
		} catch {
			/* ignore */
		}
	}

	function persistMyClicks(n: number) {
		try {
			localStorage.setItem(myClicksKey, String(Math.max(0, n)));
			// keep legacy boolean for backwards compatibility (read only elsewhere)
			if (n > 0) localStorage.setItem(legacyLikedKey, "true");
		} catch {
			/* ignore */
		}
	}

	function handleLike() {
		if (isLoading) return;
		spawnHeartParticle();
		likeApi?.click();
	}

	let likeApi:
		| {
				state: { subscribe: (fn: (s: LikeBucketState) => void) => () => void };
				click: () => void;
				detach: () => void;
		  }
		| null = null;

	onMount(() => {
		likeApi = attachBucket(namespace, key, {
			onServerCountPersist: persistServerCount,
			onMyClicksPersist: persistMyClicks,
			loadInitial: loadInitialFromStorage,
		});

		unsubscribe = likeApi.state.subscribe((s) => {
			serverCount = s.serverCount;
			pendingHits = s.pendingHits;
			myClicks = s.myClicks;
		});

		isLoading = false;

		detach = () => {
			unsubscribe?.();
			likeApi?.detach();
			unsubscribe = null;
			likeApi = null;
		};

		return detach;
	});
</script>

{#if compact || tooltipText}
	<div class="relative inline-flex w-fit group">
		<button
			onclick={handleLike}
			type="button"
			aria-disabled={isLoading}
			class={`like-fab btn-card ${hasLiked ? "active" : ""} ${isLoading ? "is-loading" : ""}`}
			title={hasLiked ? "已点赞" : "点赞"}
			aria-label={hasLiked ? "已点赞" : "点赞"}
		>
			<span class="like-fab__icon" aria-hidden="true">
				<svg
					class="h-5 w-5 transition-all duration-300"
					class:scale-125={hasLiked}
					class:text-red-500={hasLiked}
					class:text-gray-400={!hasLiked}
					fill={hasLiked ? "currentColor" : "none"}
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
				>
					<path
						d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
					/>
				</svg>
			</span>
			{#if showLabel && !isLoading}
				<span class="like-fab__badge">{count}</span>
			{/if}
		</button>
		<div class="like-particles" aria-hidden="true">
			{#each particles as p (p.id)}
				<span
					class="heart-particle"
					style={`--x:${p.x}px;--y:${p.y}px;--r:${p.rot}deg;`}
					>+1</span
				>
			{/each}
		</div>
		{#if tooltipText}
			<div
				class="pointer-events-none absolute right-full top-1/2 z-50 mr-3 w-[14rem] -translate-y-1/2 translate-x-1 rounded-xl border border-[var(--line-divider)] bg-[var(--card-bg)] px-3.5 py-2.5 text-left text-sm leading-relaxed text-black/80 opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 dark:text-white/85"
			>
				{tooltipText}
			</div>
		{/if}
	</div>
{:else}
	<button
		onclick={handleLike}
		type="button"
		aria-disabled={isLoading}
		class={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-300 hover:bg-red-100 active:scale-95 cursor-pointer dark:hover:bg-red-900/30 ${hasLiked ? "bg-red-50 dark:bg-red-900/20" : ""} ${isLoading ? "opacity-70" : ""}`}
		title={hasLiked ? "已点赞" : "点赞"}
		aria-label={hasLiked ? "已点赞" : "点赞"}
	>
		<svg
			class="h-5 w-5 transition-all duration-300"
			class:scale-125={hasLiked}
			class:text-red-500={hasLiked}
			class:text-gray-400={!hasLiked}
			fill={hasLiked ? "currentColor" : "none"}
			stroke="currentColor"
			stroke-width="2"
			viewBox="0 0 24 24"
		>
			<path
				d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
			/>
		</svg>
		{#if showLabel && !isLoading}
			<span class="text-sm font-medium text-white">{count}</span>
		{/if}
	</button>
{/if}

<style>
	.like-particles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.heart-particle {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)))
			rotate(var(--r));
		font-weight: 800;
		font-size: 0.9rem;
		line-height: 1;
		color: rgb(239 68 68);
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		animation: floatUp 700ms ease-out forwards;
	}

	@keyframes floatUp {
		0% {
			opacity: 0;
			transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)))
				rotate(var(--r))
				scale(0.9);
		}
		10% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(
					calc(-50% + var(--x)),
					calc(-50% + var(--y) - 22px)
				)
				rotate(var(--r))
				scale(1.05);
		}
	}

	.like-fab {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--fab-button-size, 3rem);
		height: var(--fab-button-size, 3rem);
		min-width: 0;
		min-height: 0;
		padding: 0.25rem;
		border-radius: 1rem;
		border: 1px solid rgba(148, 163, 184, 0.45);
		pointer-events: auto;
		color: var(--primary);
		transition:
			transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.3s ease,
			background 0.3s ease;
	}

	.like-fab:hover {
		box-shadow: var(--shadow-button);
	}

	.like-fab:active {
		transform: scale(0.94);
	}

	.like-fab.active {
		background: var(--btn-card-bg-active);
	}

	.like-fab.is-loading {
		opacity: 0.72;
	}

	.like-fab__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		line-height: 1;
	}

	.like-fab__badge {
		position: absolute;
		right: -0.3rem;
		bottom: -0.28rem;
		display: inline-flex;
		min-width: 1.15rem;
		height: 1.15rem;
		align-items: center;
		justify-content: center;
		padding: 0 0.3rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1;
		color: #fff;
		background: color-mix(in srgb, var(--primary) 72%, #111827);
		box-shadow: 0 0 0 2px var(--card-bg);
	}

	:global(.dark) .like-fab {
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--primary, #60a5fa);
	}

	:global(.dark) .like-fab:hover {
		box-shadow: var(--shadow-button-dark);
	}

	@media (max-width: 768px) {
		.like-fab {
			border-radius: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.like-fab {
			border-radius: 0.5rem;
		}
	}
</style>
