<script lang="ts">
	import { onMount } from "svelte";

	import type { DiaryItem } from "../../../data/diary";
	import MomentCard from "./MomentCard.svelte";

	const {
		initial,
		labels,
	}: { initial: DiaryItem[]; labels: Record<string, string> } = $props();
	let entries = $state<DiaryItem[]>([]);
	let loaded = $state(false);
	let failed = $state(false);
	let active = $state<string | null>(null);
	const list = $derived((loaded ? entries : initial).slice(0, 30));
	const tags = $derived(
		[...new Set(list.flatMap((item) => item.tags || []))].sort(),
	);
	const shown = $derived(
		active === null
			? list
			: list.filter((item) => item.tags?.includes(active!)),
	);

	onMount(() => {
		let controller: AbortController | undefined;
		async function refresh() {
			controller?.abort();
			const request = new AbortController();
			controller = request;
			try {
				const response = await fetch("/api/diary", {
					cache: "no-store",
					signal: request.signal,
				});
				if (!response.ok) {
					throw Error();
				}
				const data = await response.json();
				if (!Array.isArray(data.entries)) {
					throw Error();
				}
				if (request.signal.aborted) {
					return;
				}
				entries = data.entries;
				loaded = true;
				failed = false;
				if (
					active !== null &&
					!entries
						.slice(0, 30)
						.some((entry) => entry.tags?.includes(active!))
				) {
					active = null;
				}
			} catch {
				if (!request.signal.aborted) {
					failed = true;
				}
			}
		}
		function visible() {
			if (document.visibilityState === "visible") {
				void refresh();
			}
		}
		void refresh();
		document.addEventListener("visibilitychange", visible);
		window.addEventListener("pageshow", visible);
		return () => {
			controller?.abort();
			document.removeEventListener("visibilitychange", visible);
			window.removeEventListener("pageshow", visible);
		};
	});
</script>

<div class="card-base w-full px-6 sm:px-9 py-6">
	<header
		class="flex flex-wrap items-start justify-between gap-4 pb-5 mb-6 border-b border-black/10 dark:border-white/10"
	>
		<div class="pl-4 relative">
			<span
				class="w-1 h-7 rounded-md bg-[var(--primary)] absolute left-0 top-1"
			></span>
			<h1
				class="text-2xl sm:text-3xl font-bold text-black/90 dark:text-white/90 mb-1"
			>
				{labels.title}
			</h1>
			<p class="text-sm text-black/55 dark:text-white/55">{labels.subtitle}</p>
		</div>
		<div class="flex items-center gap-3">
			<div
				class="px-3 py-1.5 rounded-lg bg-[var(--btn-regular-bg)] text-center"
			>
				<span class="text-base font-bold text-[var(--primary)]"
					>{list.length}</span
				>
				<span class="text-xs text-black/55 dark:text-white/55 ml-1"
					>{labels.count}</span
				>
			</div>
			<a
				data-no-swup
				href="/diary/edit/"
				class="btn-regular h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center"
				>{labels.edit}</a
			>
		</div>
	</header>
	<div class="flex flex-wrap gap-2 mb-6">
		<button
			class="tab"
			class:active={active === null}
			aria-pressed={active === null}
			onclick={() => (active = null)}
			>{labels.all} ({list.length})</button
		>
		{#each tags as tag}<button
				class="tab"
				class:active={active === tag}
				aria-pressed={active === tag}
				onclick={() => (active = tag)}
				>{tag} ({list.filter((item) => item.tags?.includes(tag))
					.length})</button
			>{/each}
	</div>
	{#if failed}<p
			role="status"
			class="text-sm text-black/60 dark:text-white/60 mb-4"
		>
			{labels.offline}
		</p>{/if}
	<div id="diary-list" class="space-y-4">
		{#each shown as moment (moment.id)}<MomentCard
				{moment}
				minutesAgo={labels.minutes}
				hoursAgo={labels.hours}
				daysAgo={labels.days}
			/>{:else}<p class="text-center py-12 text-black/55 dark:text-white/55">
				{labels.empty}
			</p>{/each}
	</div>
	<p class="mt-8 text-center text-sm text-black/50 dark:text-white/50">
		{labels.tips}
	</p>
</div>

<style>
	.tab {
		padding: 0.4rem 0.85rem;
		border-radius: 0.55rem;
		background: var(--btn-regular-bg);
		color: var(--btn-content);
		font-size: 0.875rem;
		transition: background 0.15s ease;
	}
	.tab:hover {
		background: var(--btn-regular-bg-hover);
	}
	.tab.active {
		background: var(--primary);
		color: #fff;
		font-weight: 600;
	}
	:global(.dark) .tab.active {
		color: #241922;
	}
</style>
