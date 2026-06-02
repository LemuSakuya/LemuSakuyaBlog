<script lang="ts">
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import Icon from "@iconify/svelte";
	import { navigateToPage } from "@utils/navigation-utils";
	import { url } from "@utils/url-utils";
	import { onDestroy, onMount } from "svelte";

	import type { SearchResult } from "@/global";

	let keywordDesktop = $state("");
	let keywordMobile = $state("");
	let searchMode: "site" | "google" = $state("site");
	let result: SearchResult[] = $state([]);
	let pagefindLoaded = false;
	let initialized = $state(false);
	let isDesktopSearchExpanded = $state(false);
	let debounceTimer: NodeJS.Timeout;
	let windowJustFocused = false;
	let focusTimer: NodeJS.Timeout;
	let blurTimer: NodeJS.Timeout;

	const fakeResult: SearchResult[] = [
		{
			url: url("/"),
			meta: {
				title: "This Is a Fake Search Result",
			},
			excerpt:
				"Because the search cannot work in the <mark>dev</mark> environment.",
		},
		{
			url: url("/"),
			meta: {
				title: "If You Want to Test the Search",
			},
			excerpt:
				"Try running <mark>npm build && npm preview</mark> instead.",
		},
	];

	const togglePanel = () => {
		const panel = document.getElementById("search-panel");
		panel?.classList.toggle("float-panel-closed");
		if (
			!panel?.classList.contains("float-panel-closed") &&
			typeof window.loadPagefind === "function"
		) {
			window.loadPagefind();
		}
	};

	const toggleDesktopSearch = () => {
		// 如果窗口刚获得焦点，不自动展开搜索框
		if (windowJustFocused) {
			return;
		}
		isDesktopSearchExpanded = !isDesktopSearchExpanded;
		if (isDesktopSearchExpanded) {
			if (typeof window.loadPagefind === "function") {
				window.loadPagefind();
			}
			setTimeout(() => {
				const input = document.getElementById(
					"search-input-desktop",
				) as HTMLInputElement;
				input?.focus();
			}, 0);
		}
	};

	const collapseDesktopSearch = () => {
		if (!keywordDesktop) {
			isDesktopSearchExpanded = false;
		}
	};

	const handleBlur = () => {
		// 延迟处理以允许搜索结果的点击事件先于折叠逻辑执行
		blurTimer = setTimeout(() => {
			isDesktopSearchExpanded = false;
			// 仅隐藏面板并折叠，保留搜索关键词和结果以便下次展开时查看
			setPanelVisibility(false, true);
		}, 200);
	};

	const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
		const panel = document.getElementById("search-panel");
		if (!panel || !isDesktop) {
			return;
		}
		if (show) {
			panel.classList.remove("float-panel-closed");
		} else {
			panel.classList.add("float-panel-closed");
		}
	};

	const closeSearchPanel = (): void => {
		const panel = document.getElementById("search-panel");
		if (panel) {
			panel.classList.add("float-panel-closed");
		}
		// 清空搜索关键词和结果
		keywordDesktop = "";
		keywordMobile = "";
		result = [];
	};

	const handleResultClick = (event: Event, url: string): void => {
		event.preventDefault();
		closeSearchPanel();
		navigateToPage(url);
	};

	const buildGoogleUrl = (keyword: string): string => {
		const host =
			typeof window !== "undefined" ? window.location.hostname : "";
		const query = host ? `site:${host} ${keyword}` : keyword;
		return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
	};

	const goToGoogle = (keyword: string): void => {
		const trimmed = keyword.trim();
		if (!trimmed || typeof window === "undefined") {
			return;
		}
		window.open(buildGoogleUrl(trimmed), "_blank", "noopener,noreferrer");
	};

	const setSearchMode = (mode: "site" | "google"): void => {
		if (searchMode === mode) {
			return;
		}
		searchMode = mode;
		result = [];
		const keyword = keywordDesktop || keywordMobile;
		const isDesktop = !!keywordDesktop || isDesktopSearchExpanded;
		if (mode === "google") {
			setPanelVisibility(!!keyword, isDesktop);
		} else {
			search(keyword, isDesktop);
		}
	};

	const handleSearchKeydown = (event: KeyboardEvent): void => {
		if (searchMode !== "google" || event.key !== "Enter") {
			return;
		}
		event.preventDefault();
		const keyword = keywordDesktop || keywordMobile;
		goToGoogle(keyword);
	};

	const search = async (
		keyword: string,
		isDesktop: boolean,
	): Promise<void> => {
		if (!keyword) {
			setPanelVisibility(false, isDesktop);
			result = [];
			return;
		}
		if (searchMode === "google") {
			// Google 模式下不调用 pagefind，仅展示跳转入口
			result = [];
			setPanelVisibility(true, isDesktop);
			return;
		}
		if (!initialized) {
			return;
		}
		try {
			let searchResults: SearchResult[] = [];
			if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
				const response = await window.pagefind.search(keyword);
				searchResults = await Promise.all(
					response.results.map((item) => item.data()),
				);
			} else if (import.meta.env.DEV) {
				searchResults = fakeResult;
			} else {
				searchResults = [];
				console.error(
					"Pagefind is not available in production environment.",
				);
			}
			result = searchResults;
			setPanelVisibility(result.length > 0, isDesktop);
		} catch (error) {
			console.error("Search error:", error);
			result = [];
			setPanelVisibility(false, isDesktop);
		}
	};

	onMount(() => {
		const initializeSearch = () => {
			initialized = true;
			pagefindLoaded =
				typeof window !== "undefined" &&
				!!window.pagefind &&
				typeof window.pagefind.search === "function";
			console.log("Pagefind status on init:", pagefindLoaded);
		};
		if (import.meta.env.DEV) {
			console.log(
				"Pagefind is not available in development mode. Using mock data.",
			);
			initializeSearch();
		} else {
			document.addEventListener("pagefindready", () => {
				console.log("Pagefind ready event received.");
				initializeSearch();
			});
			document.addEventListener("pagefindloaderror", () => {
				console.warn(
					"Pagefind load error event received. Search functionality will be limited.",
				);
				initializeSearch(); // Initialize with pagefindLoaded as false
			});
			// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
			setTimeout(() => {
				if (!initialized) {
					console.log("Fallback: Initializing search after timeout.");
					initializeSearch();
				}
			}, 2000); // Adjust timeout as needed
		}

		// 监听窗口焦点事件，防止切换窗口时自动展开搜索框
		const handleFocus = () => {
			windowJustFocused = true;
			clearTimeout(focusTimer);
			focusTimer = setTimeout(() => {
				windowJustFocused = false;
			}, 500); // 500ms 后才允许 mouseenter 触发展开
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			window.removeEventListener("focus", handleFocus);
		};
	});

	$effect(() => {
		const keyword = keywordDesktop || keywordMobile;
		const isDesktop = !!keywordDesktop || isDesktopSearchExpanded;

		clearTimeout(debounceTimer);
		if (!keyword) {
			result = [];
			setPanelVisibility(false, isDesktop);
			return;
		}
		if (searchMode === "google") {
			result = [];
			setPanelVisibility(true, isDesktop);
			return;
		}
		if (initialized) {
			debounceTimer = setTimeout(() => {
				search(keyword, isDesktop);
			}, 300);
		}
	});

	$effect(() => {
		if (typeof document !== "undefined") {
			const navbar = document.getElementById("navbar");
			if (isDesktopSearchExpanded) {
				navbar?.classList.add("is-searching");
			} else {
				navbar?.classList.remove("is-searching");
			}
		}
	});

	onDestroy(() => {
		if (typeof document !== "undefined") {
			const navbar = document.getElementById("navbar");
			navbar?.classList.remove("is-searching");
		}
		clearTimeout(debounceTimer);
		clearTimeout(focusTimer);
	});
</script>

<!-- search bar for desktop view (collapsed by default) -->
<div class="hidden lg:block relative w-11 h-11 shrink-0">
	<button
		id="search-bar"
		class="flex transition-all items-center h-11 rounded-lg absolute right-0 top-0 shrink-0 border-0 bg-transparent cursor-pointer
            {isDesktopSearchExpanded
			? 'bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10'
			: 'btn-plain active:scale-90'}
            {isDesktopSearchExpanded ? 'w-48' : 'w-11'}"
		aria-label="Search"
		onmouseenter={() => {
			if (!isDesktopSearchExpanded) {
				toggleDesktopSearch();
			}
		}}
		onmouseleave={collapseDesktopSearch}
		onclick={() => {
			const input = document.getElementById(
				"search-input-desktop",
			) as HTMLInputElement;
			input?.focus();
		}}
	>
		<Icon
			icon="material-symbols:search"
			class="absolute text-[1.25rem] pointer-events-none {isDesktopSearchExpanded
				? 'left-3'
				: 'left-1/2 -translate-x-1/2'} transition top-1/2 -translate-y-1/2 {isDesktopSearchExpanded
				? 'text-black/30 dark:text-white/30'
				: ''}"
		></Icon>
		<input
			id="search-input-desktop"
			placeholder={i18n(I18nKey.search)}
			bind:value={keywordDesktop}
			onkeydown={handleSearchKeydown}
			onfocus={() => {
				clearTimeout(blurTimer);
				if (!isDesktopSearchExpanded) {
					toggleDesktopSearch();
				}
				search(keywordDesktop, true);
			}}
			onblur={handleBlur}
			class="transition-all pl-10 text-sm bg-transparent outline-0
                h-full {isDesktopSearchExpanded
				? 'w-36'
				: 'w-0'} text-black/50 dark:text-white/50"
		/>
	</button>
</div>

<!-- toggle btn for phone/tablet view -->
<button
	onclick={togglePanel}
	aria-label="Search Panel"
	id="search-switch"
	class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90"
>
	<Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div
	id="search-panel"
	class="float-panel float-panel-closed absolute md:w-[30rem] top-20 left-4 md:left-[unset] right-4 z-50 search-panel shadow-2xl rounded-2xl p-2"
>
	<!-- search bar inside panel for phone/tablet -->
	<div
		id="search-bar-inside"
		class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  "
	>
		<Icon
			icon="material-symbols:search"
			class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"
		></Icon>
		<input
			placeholder={i18n(I18nKey.search)}
			bind:value={keywordMobile}
			onkeydown={handleSearchKeydown}
			class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
		/>
	</div>
	<!-- search mode toggle: site (pagefind) vs google -->
	<div
		class="flex gap-1 mt-2 p-1 rounded-xl bg-black/[0.04] dark:bg-white/5 text-sm"
		role="tablist"
	>
		<button
			type="button"
			role="tab"
			aria-selected={searchMode === "site"}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => setSearchMode("site")}
			class="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg transition
				{searchMode === 'site'
				? 'bg-[var(--primary)] text-white font-bold'
				: 'text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/10'}"
		>
			<Icon icon="material-symbols:search" class="text-[1rem]"></Icon>
			{i18n(I18nKey.searchModeSite)}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={searchMode === "google"}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => setSearchMode("google")}
			class="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg transition
				{searchMode === 'google'
				? 'bg-[var(--primary)] text-white font-bold'
				: 'text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/10'}"
		>
			<Icon icon="fa7-brands:google" class="text-[0.9rem]"></Icon>
			{i18n(I18nKey.searchModeGoogle)}
		</button>
	</div>
	<!-- google search entry -->
	{#if searchMode === "google" && (keywordDesktop || keywordMobile)}
		<button
			type="button"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => goToGoogle(keywordDesktop || keywordMobile)}
			class="transition mt-2 group flex items-center gap-3 w-full text-left
				rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]"
		>
			<Icon
				icon="fa7-brands:google"
				class="text-[1.1rem] text-[var(--primary)] shrink-0"
			></Icon>
			<span class="flex flex-col">
				<span
					class="transition text-90 font-bold group-hover:text-[var(--primary)]"
				>
					{i18n(I18nKey.searchOnGoogle)}
				</span>
				<span class="transition text-sm text-50 break-all">
					{keywordDesktop || keywordMobile}
				</span>
			</span>
		</button>
	{/if}
	<!-- search results -->
	{#each result as item}
		<a
			href={item.url}
			onclick={(e) => handleResultClick(e, item.url)}
			class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]"
		>
			<div
				class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]"
			>
				{item.meta.title}<Icon
					icon="fa7-solid:chevron-right"
					class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"
				></Icon>
			</div>
			<div class="transition text-sm text-50">
				{@html item.excerpt}
			</div>
		</a>
	{/each}
</div>

<style>
	input:focus {
		outline: 0;
	}
	:global(.search-panel) {
		max-height: calc(100vh - 100px);
		overflow-y: auto;
	}
</style>
