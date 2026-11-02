<script lang="ts">
	interface Props {
		currentTime: number;
		duration: number;
		onSeek: (time: number) => void;
	}

	const { currentTime, duration, onSeek }: Props = $props();

	const progressPercent = $derived(
		duration > 0
			? Math.max(0, Math.min(100, (currentTime / duration) * 100))
			: 0,
	);

	let dragging = false;

	function handlePointer(event: PointerEvent) {
		const el = event.currentTarget as HTMLElement | null;
		if (!el || duration <= 0) {
			return;
		}
		const rect = el.getBoundingClientRect();
		const percent = (event.clientX - rect.left) / rect.width;
		const clamped = Math.max(0, Math.min(1, percent));
		const time = clamped * duration;
		dragging = true;
		el.setPointerCapture(event.pointerId);
		onSeek(time);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (duration <= 0) return;
		let time: number;
		switch (event.key) {
			case "ArrowLeft":
			case "ArrowDown":
				time = currentTime - 5;
				break;
			case "ArrowRight":
			case "ArrowUp":
				time = currentTime + 5;
				break;
			case "Home":
				time = 0;
				break;
			case "End":
				time = duration;
				break;
			case "Enter":
			case " ":
				time = duration * 0.5;
				break;
			default:
				return;
		}
		event.preventDefault();
		onSeek(Math.max(0, Math.min(duration, time)));
	}
</script>

<div class="sidebar-progress-wrapper">
	<div
		class="sidebar-progress-bar"
		onpointerdown={handlePointer}
		onpointermove={(event) => {
			if (dragging) handlePointer(event);
		}}
		onpointerup={() => {
			dragging = false;
		}}
		onpointercancel={() => {
			dragging = false;
		}}
		onlostpointercapture={() => {
			dragging = false;
		}}
		onkeydown={handleKeyDown}
		role="slider"
		tabindex="0"
		aria-label="Music progress"
		aria-valuemin="0"
		aria-valuemax="100"
		aria-valuenow={progressPercent}
		aria-disabled={duration <= 0}
	>
		<div
			class="sidebar-progress-fill"
			style={`width: ${progressPercent}%`}
		></div>
	</div>
</div>

<style>
	.sidebar-progress-wrapper {
		margin-top: 0.15rem;
	}

	.sidebar-progress-bar {
		position: relative;
		width: 100%;
		height: 0.375rem;
		border-radius: 9999px;
		background: color-mix(
			in srgb,
			var(--btn-regular-bg) 80%,
			var(--content-meta) 20%
		);
		overflow: hidden;
		cursor: pointer;
		touch-action: none;
	}

	.sidebar-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: var(--primary);
		transition: width 100ms linear;
		min-width: 0;
	}

	.sidebar-progress-bar:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
</style>
