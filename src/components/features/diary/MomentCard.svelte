<script lang="ts">
	import { formatRelativeTime } from "../../../utils/timeFormat";
	import type { MomentCardProps } from "./types";

	const { moment, minutesAgo, hoursAgo, daysAgo }: MomentCardProps = $props();
	const paragraphs = $derived(
		moment.content
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.filter(Boolean),
	);
</script>

<article
	class="moment-card group rounded-xl border border-black/10 dark:border-white/10 p-5 transition-shadow hover:shadow-xl"
>
	{#if moment.title}<h2
			class="text-base md:text-lg font-semibold text-black/90 dark:text-white/90 mb-3"
		>
			{moment.title}
		</h2>{/if}
	<div
		class="text-sm md:text-base text-black/90 dark:text-white/90 leading-relaxed mb-3 space-y-3"
	>
		{#each paragraphs as paragraph}<p class="whitespace-pre-wrap">
				{paragraph}
			</p>{/each}
	</div>
	{#if moment.images?.length}
		<div
			class="diary-images grid gap-2 mb-3"
			class:diary-images-single={moment.images.length === 1}
			class:diary-images-double={moment.images.length === 2}
			class:diary-images-triple={moment.images.length === 3}
			class:diary-images-grid={moment.images.length >= 4}
		>
			{#each moment.images as image, i}
				<a
					href={image}
					data-no-swup
					data-src={image}
					data-fancybox={"diary-" + moment.id}
					class="block relative rounded-lg overflow-hidden aspect-square"
				>
					<img
						src={image}
						alt={(moment.title || "日記") + " · " + (i + 1)}
						class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
						loading="lazy"
						decoding="async"
					/>
				</a>
			{/each}
		</div>
	{/if}
	{#if moment.tags?.length}
		<div class="flex flex-wrap gap-1.5 mb-3">
			{#each moment.tags as tag}<span
					class="btn-regular h-6 text-xs px-2 rounded-lg">{tag}</span
				>{/each}
		</div>
	{/if}
	<footer
		class="border-t border-black/5 dark:border-white/5 pt-3 flex items-center justify-between text-xs text-black/50 dark:text-white/50 flex-wrap gap-2"
	>
		<time datetime={moment.date} title={moment.date}
			>{formatRelativeTime(
				moment.date,
				minutesAgo,
				hoursAgo,
				daysAgo,
			)}</time
		>
		<div class="flex items-center gap-3">
			{#if moment.location}<span>{moment.location}</span
				>{/if}{#if moment.mood}<span>{moment.mood}</span>{/if}
			{#if moment.link}<a
					href={moment.link}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-[var(--primary)]">原文 ↗</a
				>{/if}
		</div>
	</footer>
</article>

<style>
	.moment-card {
		animation: fadeInUp 0.5s ease-out forwards;
		opacity: 0;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.moment-card:nth-child(1) {
		animation-delay: 0.03s;
	}
	.moment-card:nth-child(2) {
		animation-delay: 0.06s;
	}
	.moment-card:nth-child(3) {
		animation-delay: 0.09s;
	}
	.moment-card:nth-child(4) {
		animation-delay: 0.12s;
	}
	.moment-card:nth-child(5) {
		animation-delay: 0.15s;
	}
	.moment-card:nth-child(6) {
		animation-delay: 0.18s;
	}
	.moment-card:nth-child(7) {
		animation-delay: 0.21s;
	}
	.moment-card:nth-child(8) {
		animation-delay: 0.24s;
	}
	.moment-card:nth-child(9) {
		animation-delay: 0.27s;
	}
	.moment-card:nth-child(10) {
		animation-delay: 0.3s;
	}
	.moment-card:nth-child(11) {
		animation-delay: 0.33s;
	}
	.moment-card:nth-child(12) {
		animation-delay: 0.36s;
	}

	/* 1 image: large, max-width constrained */
	.diary-images-single {
		grid-template-columns: 1fr;
		max-width: 400px;
	}

	/* 2 images: two columns, medium size */
	.diary-images-double {
		grid-template-columns: repeat(2, 1fr);
		max-width: 500px;
	}

	/* 3 images: first large + two small */
	.diary-images-triple {
		grid-template-columns: repeat(2, 1fr);
		max-width: 500px;
	}
	.diary-images-triple > :first-child {
		grid-row: span 2;
	}

	/* 4+ images: auto-fit grid with max-width */
	.diary-images-grid {
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		max-width: 600px;
	}

	@media (min-width: 768px) {
		.diary-images-single {
			max-width: 500px;
		}
		.diary-images-double {
			max-width: 560px;
		}
		.diary-images-triple {
			max-width: 560px;
		}
		.diary-images-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			max-width: 700px;
		}
	}

	@media (max-width: 480px) {
		.diary-images-triple {
			grid-template-columns: repeat(2, 1fr);
		}
		.diary-images-triple > :first-child {
			grid-row: span 1;
		}
	}
</style>
