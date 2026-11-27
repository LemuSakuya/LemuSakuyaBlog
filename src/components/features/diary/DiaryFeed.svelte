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
		class="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] p-5 sm:p-6 flex justify-between items-center gap-4"
	>
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-white mb-1">
				{labels.title}
			</h1>
			<p class="text-sm sm:text-base text-white/85">{labels.subtitle}</p>
		</div>
		<div class="text-center text-white">
			<strong class="block text-2xl sm:text-3xl">{list.length}</strong
			><span class="text-xs">{labels.count}</span>
		</div>
	</header>
	<div class="flex justify-between items-start flex-wrap gap-3 my-6">
		<div class="flex flex-wrap gap-2">
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
		<a
			data-no-swup
			href="/diary/edit/"
			class="text-sm text-[var(--btn-content)] underline underline-offset-4"
			>{labels.edit}</a
		>
	</div>
	{#if failed}<p role="status" class="text-sm mb-4">{labels.offline}</p>{/if}
	<div id="diary-list" class="space-y-4">
		{#each shown as moment (moment.id)}<MomentCard
				{moment}
				minutesAgo={labels.minutes}
				hoursAgo={labels.hours}
				daysAgo={labels.days}
			/>{:else}<p class="text-center py-12">{labels.empty}</p>{/each}
	</div>
	<p class="mt-8 text-center text-sm text-black/50 dark:text-white/50">
		{labels.tips}
	</p>
</div>

<style>
	.tab {
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-large);
		background: var(--btn-regular-bg);
		color: var(--btn-content);
		font-size: 0.875rem;
	}
	.tab.active {
		background: var(--primary);
		color: #fff;
	}
</style>
