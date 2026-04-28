<script lang="ts">
	import { onMount } from "svelte";
	import { siteConfig } from "@/config";

	export let type: "global" | "post" = "global";
	export let postId: string | undefined = undefined;
	export let showLabel: boolean = true;
	export let compact: boolean = false;
	export let tooltipText: string | undefined = undefined;

	let count = 0;
	let isLoading = true;
	let hasLiked = false;

	const namespace = new URL(siteConfig.siteURL).hostname.replace(
		/[^a-zA-Z0-9_-]/g,
		"-",
	);
	const key = type === "post" ? `post-${postId || "unknown"}` : "global";
	const storageKey =
		type === "post" ? `liked-post-${postId}` : "liked-global";

	function getCountApiUrl(action: "get" | "hit") {
		return `https://api.countapi.xyz/${action}/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
	}

	onMount(async () => {
		try {
			const response = await fetch(getCountApiUrl("get"));
			const data = await response.json();
			count = data.value || 0;
			hasLiked = localStorage.getItem(storageKey) === "true";
		} catch (error) {
			console.error("Failed to load likes:", error);
		} finally {
			isLoading = false;
		}
	});

	async function likeOnce() {
		if (isLoading || hasLiked) return;

		try {
			const response = await fetch(getCountApiUrl("hit"));
			if (!response.ok) throw new Error("Failed to update like");

			const data = await response.json();
			count = data.value || count + 1;
			hasLiked = true;
			localStorage.setItem(storageKey, "true");
		} catch (error) {
			console.error("Failed to update like:", error);
		}
	}
</script>

{#if compact || tooltipText}
	<div class="relative inline-flex w-fit group">
		<button
			onclick={likeOnce}
			type="button"
			aria-disabled={isLoading || hasLiked}
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
		onclick={likeOnce}
		type="button"
		aria-disabled={isLoading || hasLiked}
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
