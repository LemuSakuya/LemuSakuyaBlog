<script lang="ts">
	import { onMount } from "svelte";

	import type { DiaryItem } from "../../../data/diary";

	type Feed = { entries: DiaryItem[]; version: string };
	type Draft = Omit<DiaryItem, "id"> & { id?: DiaryItem["id"] };

	let authenticated = $state(false);
	let ready = $state(false);
	let busy = $state(false);
	let password = $state("");
	let message = $state("");
	let messageTone = $state<"info" | "error">("info");
	let dirty = $state(false);
	let conflict = $state(false);
	let entries = $state<DiaryItem[]>([]);
	let version = $state("");
	let draft = $state<Draft>(blank());
	let tags = $state("");
	let imageUrls = $state("");
	let files = $state<File[]>([]);
	let fileInput = $state<HTMLInputElement | undefined>(undefined);

	function localDate(iso: string) {
		const d = new Date(iso);
		return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 19);
	}

	function blank(): Draft {
		return {
			title: "",
			content: "",
			date: localDate(new Date().toISOString()),
			location: "",
			mood: "",
			link: "",
		};
	}

	function select(entry?: DiaryItem) {
		if (dirty && !window.confirm("放棄這次尚未發布的修改？")) {
			return;
		}
		draft = entry
			? {
					...entry,
					title: entry.title || "",
					location: entry.location || "",
					mood: entry.mood || "",
					link: entry.link || "",
					date: localDate(entry.date),
				}
			: blank();
		tags = (entry?.tags || []).join("，");
		imageUrls = (entry?.images || []).join("\n");
		files = [];
		if (fileInput) {
			fileInput.value = "";
		}
		dirty = false;
		message = "";
	}

	class ApiError extends Error {
		status: number;
		constructor(status: number, message: string) {
			super(message);
			this.status = status;
		}
	}

	async function api(action: string, body?: unknown) {
		const upload = body instanceof File;
		const res = await fetch(
			"/api/diary?action=" + action,
			body === undefined
				? { cache: "no-store" }
				: {
						method: "POST",
						cache: "no-store",
						headers: {
							"Content-Type": upload
								? "application/octet-stream"
								: "application/json",
						},
						body: upload ? body : JSON.stringify(body),
					},
		);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new ApiError(
				res.status,
				data.error || "服務暫時無法使用，請稍後重試。",
			);
		}
		return data;
	}

	function setFeed(data: Feed) {
		entries = data.entries;
		version = data.version;
	}

	async function run(task: () => Promise<void>) {
		if (busy) {
			return;
		}
		busy = true;
		message = "";
		messageTone = "info";
		try {
			await task();
		} catch (e) {
			messageTone = "error";
			message = e instanceof Error ? e.message : "連線失敗，請重試。";
			if (e instanceof ApiError && e.status === 401) {
				authenticated = false;
			}
			if (e instanceof ApiError && e.status === 409) {
				conflict = true;
			}
		} finally {
			busy = false;
			ready = true;
		}
	}

	onMount(() => {
		void run(async () => {
			authenticated = (await api("session")).authenticated;
			if (authenticated) {
				setFeed(await api("feed"));
			}
		});
		const warn = (e: BeforeUnloadEvent) => {
			if (dirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	});

	function login(e: SubmitEvent) {
		e.preventDefault();
		void run(async () => {
			await api("login", { password });
			password = "";
			authenticated = true;
			if (!dirty || !version) {
				setFeed(await api("feed"));
			}
		});
	}

	function reload() {
		if (
			dirty &&
			!window.confirm("重新載入會捨棄尚未發布的修改。要繼續嗎？")
		) {
			return;
		}
		void run(async () => {
			const id = draft.id;
			setFeed(await api("feed"));
			dirty = false;
			conflict = false;
			select(entries.find((i) => i.id === id));
		});
	}

	function logout() {
		if (dirty && !window.confirm("登出會捨棄尚未發布的修改。要繼續嗎？")) {
			return;
		}
		void run(async () => {
			await api("logout", {});
			authenticated = false;
			dirty = false;
			conflict = false;
			select();
			entries = [];
			version = "";
		});
	}

	function removeEntry() {
		if (draft.id === undefined) {
			return;
		}
		const targetId = draft.id;
		const title = draft.title?.trim() || draft.content.slice(0, 24);
		if (!window.confirm(`確定要刪除「${title}」嗎？刪除後無法復原。`)) {
			return;
		}
		void run(async () => {
			const data = await api("delete", { version, id: targetId });
			setFeed(data);
			dirty = false;
			conflict = false;
			select();
			messageTone = "info";
			message = "已刪除這篇日記。";
		});
	}

	function save(e: SubmitEvent) {
		e.preventDefault();
		void run(async () => {
			const urls = imageUrls
				.split("\n")
				.map((x) => x.trim())
				.filter(Boolean);
			if (urls.length + files.length > 12) {
				throw Error("每篇最多 12 張圖片。");
			}
			if (files.some((file) => file.size > 3 * 1024 * 1024)) {
				throw Error("每張圖片上限為 3 MB。");
			}
			const date = new Date(draft.date).toISOString();
			while (files.length) {
				messageTone = "info";
				message = "正在上傳圖片…";
				const uploaded = await api("upload", files[0]);
				urls.push(uploaded.url);
				imageUrls = urls.join("\n");
				files = files.slice(1);
			}
			if (fileInput) {
				fileInput.value = "";
			}
			const entry = {
				...draft,
				date,
				tags: tags
					.split(/[,，]/)
					.map((t) => t.trim())
					.filter(Boolean),
				images: urls,
			};
			const data = await api("save", { version, entry });
			setFeed(data);
			dirty = false;
			conflict = false;
			select(entries.find((i) => i.id === data.id));
			messageTone = "info";
			message = "已發布，讀者現在可以看到這篇日記。";
		});
	}

	const previewUrls = $derived(
		imageUrls
			.split("\n")
			.map((s) => s.trim())
			.filter(
				(s) =>
					/^https:\/\//.test(s) ||
					s.startsWith("/api/diary?image=") ||
					s.startsWith("/images/diary/"),
			),
	);
</script>

<div class="card-base w-full px-6 sm:px-9 py-6 text-black/90 dark:text-white/90">
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
				日記編輯室
			</h1>
			<p class="text-sm text-black/55 dark:text-white/55">
				即時撰寫、修改或刪除站內日記
			</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/diary/"
				data-no-swup
				class="btn-regular h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center gap-1"
			>
				← 返回日記
			</a>
			{#if authenticated}
				<button
					type="button"
					class="btn-regular h-9 px-3.5 rounded-lg text-sm font-medium disabled:opacity-50"
					disabled={busy}
					onclick={logout}
				>
					登出
				</button>
			{/if}
		</div>
	</header>

	{#if !ready}
		<p
			role="status"
			class="py-12 text-center text-sm text-black/55 dark:text-white/55"
		>
			正在確認登入狀態…
		</p>
	{:else if !authenticated}
		<form class="editor-panel max-w-md mx-auto my-8" onsubmit={login}>
			<div class="flex items-center gap-2.5 mb-5">
				<span class="w-1 h-5 rounded-md bg-[var(--primary)]"></span>
				<h2 class="text-base font-bold text-black/90 dark:text-white/90 m-0">
					站主身分驗證
				</h2>
			</div>
			<label class="field">
				<span class="field-label">站主密碼</span>
				<input
					type="password"
					autocomplete="current-password"
					required
					placeholder="請輸入站主密碼"
					bind:value={password}
				/>
			</label>
			<button type="submit" class="btn-primary w-full mt-2" disabled={busy}>
				{busy ? "登入中…" : "登入"}
			</button>
		</form>
	{:else}
		<div class="workspace">
			<aside class="editor-panel">
				<button
					type="button"
					class="btn-primary w-full"
					disabled={busy || conflict}
					onclick={() => select()}
				>
					＋ 新日記
				</button>
				<h2
					class="text-xs font-semibold tracking-wider text-black/50 dark:text-white/50 mt-5 mb-2.5 flex items-center gap-2"
				>
					<span class="w-1 h-3.5 rounded-full bg-[var(--primary)]"></span>
					已發布日記（{entries.length}）
				</h2>
				<div class="entry-list">
					{#each entries as entry (entry.id)}
						<button
							type="button"
							class="entry"
							class:selected={draft.id === entry.id}
							disabled={busy || conflict}
							onclick={() => select(entry)}
						>
							<span class="entry-title">
								{entry.title || entry.content.slice(0, 28)}
							</span>
							<small class="entry-date">
								{localDate(entry.date).slice(0, 10)}
							</small>
						</button>
					{:else}
						<p
							class="text-xs text-black/50 dark:text-white/50 py-4 text-center"
						>
							尚無日記
						</p>
					{/each}
				</div>
			</aside>

			<form
				class="editor-panel"
				onsubmit={save}
				oninput={() => (dirty = true)}
			>
				<fieldset disabled={busy}>
					<div
						class="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-black/10 dark:border-white/10"
					>
						<div class="flex items-center gap-2.5">
							<span class="w-1 h-5 rounded-md bg-[var(--primary)]"></span>
							<h2
								class="text-base font-bold text-black/90 dark:text-white/90 m-0"
							>
								{draft.id === undefined ? "寫新日記" : "編輯日記"}
							</h2>
						</div>
						{#if dirty}
							<span
								class="text-xs px-2.5 py-0.5 rounded-full bg-[var(--btn-regular-bg)] text-[var(--btn-content)]"
							>
								尚未發布
							</span>
						{/if}
					</div>

					<label class="field">
						<span class="field-label">標題 <small>選填</small></span>
						<input maxlength="200" bind:value={draft.title} />
					</label>

					<label class="field">
						<span class="field-label">正文</span>
						<textarea
							required
							rows="11"
							maxlength="100000"
							bind:value={draft.content}
						></textarea>
					</label>

					<div class="row">
						<label class="field">
							<span class="field-label">發布時間</span>
							<input
								required
								type="datetime-local"
								step="1"
								bind:value={draft.date}
							/>
						</label>
						<label class="field">
							<span class="field-label">標籤 <small>以逗號分隔</small></span>
							<input bind:value={tags} />
						</label>
					</div>

					<div class="row">
						<label class="field">
							<span class="field-label">地點 <small>選填</small></span>
							<input maxlength="150" bind:value={draft.location} />
						</label>
						<label class="field">
							<span class="field-label">心情 <small>選填</small></span>
							<input maxlength="100" bind:value={draft.mood} />
						</label>
					</div>

					<label class="field">
						<span class="field-label">原文連結 <small>選填</small></span>
						<input type="url" bind:value={draft.link} />
					</label>

					<label class="field">
						<span class="field-label"
							>配圖 <small>每張 3 MB 以內，最多 12 張</small></span
						>
						<input
							type="file"
							multiple
							accept="image/jpeg,image/png,image/webp,image/gif"
							bind:this={fileInput}
							onchange={(e) => {
								files = Array.from(e.currentTarget.files || []);
								dirty = true;
							}}
						/>
					</label>

					{#if files.length}
						<small class="block -mt-2 mb-3 text-black/55 dark:text-white/55">
							待上傳：{files.map((f) => f.name).join("、")}
						</small>
					{/if}

					{#if previewUrls.length}
						<div class="thumbs">
							{#each previewUrls as url}
								<img src={url} alt="日記配圖預覽" />
							{/each}
						</div>
					{/if}

					<details class="mb-5">
						<summary
							class="cursor-pointer text-sm text-[var(--primary)] font-medium select-none"
						>
							圖片網址與順序
						</summary>
						<label class="field mt-2">
							<small class="field-hint">每行一張，移除該行即可移除配圖</small>
							<textarea rows="3" bind:value={imageUrls}></textarea>
						</label>
					</details>

					<div
						class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/10 dark:border-white/10"
					>
						<button
							type="submit"
							class="btn-primary"
							disabled={!version || busy || conflict}
						>
							{busy
								? "處理中…"
								: draft.id === undefined
									? "發布日記"
									: "儲存並發布"}
						</button>

						{#if draft.id !== undefined}
							<button
								type="button"
								class="btn-danger"
								disabled={!version || busy || conflict}
								onclick={removeEntry}
							>
								刪除日記
							</button>
						{/if}
					</div>
				</fieldset>
			</form>
		</div>
	{/if}

	{#if message}
		<p
			class="status mt-5"
			class:status-error={messageTone === "error"}
			role="status"
		>
			{message}
		</p>
	{/if}

	{#if authenticated && (conflict || !version) && ready}
		<div class="mt-3">
			<button
				type="button"
				class="text-sm text-[var(--primary)] underline underline-offset-4 disabled:opacity-50"
				disabled={busy}
				onclick={reload}
			>
				重新載入最新版本
			</button>
		</div>
	{/if}
</div>

<style>
	.workspace {
		display: grid;
		grid-template-columns: minmax(200px, 1fr) minmax(0, 3fr);
		gap: 1.25rem;
		align-items: start;
	}

	.editor-panel {
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: var(--radius-large);
		padding: clamp(1rem, 2.5vw, 1.5rem);
	}

	:global(.dark) .editor-panel {
		background: rgba(255, 255, 255, 0.025);
		border-color: rgba(255, 255, 255, 0.08);
	}

	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}

	.field {
		display: block;
		margin-bottom: 1rem;
	}

	.field-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(0, 0, 0, 0.78);
	}

	:global(.dark) .field-label {
		color: rgba(255, 255, 255, 0.82);
	}

	.field-label small,
	.field-hint {
		font-size: 0.78rem;
		font-weight: 400;
		color: rgba(0, 0, 0, 0.45);
	}

	:global(.dark) .field-label small,
	:global(.dark) .field-hint {
		color: rgba(255, 255, 255, 0.45);
	}

	input,
	textarea {
		display: block;
		box-sizing: border-box;
		width: 100%;
		margin-top: 0.4rem;
		padding: 0.6rem 0.85rem;
		border-radius: 0.55rem;
		border: 1px solid rgba(0, 0, 0, 0.12);
		background: rgba(0, 0, 0, 0.025);
		color: rgba(0, 0, 0, 0.9);
		font: inherit;
		font-size: 0.92rem;
		color-scheme: light;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			background-color 0.15s ease;
	}

	:global(.dark) input,
	:global(.dark) textarea {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.9);
		color-scheme: dark;
	}

	input::placeholder,
	textarea::placeholder {
		color: rgba(0, 0, 0, 0.35);
	}

	:global(.dark) input::placeholder,
	:global(.dark) textarea::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 24%, transparent);
	}

	textarea {
		resize: vertical;
	}

	.row {
		display: flex;
		gap: 1rem;
	}

	.row > * {
		flex: 1;
		min-width: 0;
	}

	.btn-primary {
		border: 0;
		background: var(--primary);
		color: #fff;
		border-radius: 0.55rem;
		padding: 0.62rem 1.25rem;
		font-weight: 600;
		font-size: 0.92rem;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	:global(.dark) .btn-primary {
		color: #241922;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.88;
	}

	.btn-primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.btn-danger {
		border: 1px solid oklch(0.6 0.18 20 / 0.4);
		background: oklch(0.6 0.18 20 / 0.08);
		color: oklch(0.55 0.18 20);
		border-radius: 0.55rem;
		padding: 0.55rem 1rem;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	:global(.dark) .btn-danger {
		color: oklch(0.76 0.15 20);
		background: oklch(0.6 0.18 20 / 0.14);
	}

	.btn-danger:hover:not(:disabled) {
		background: oklch(0.6 0.18 20 / 0.2);
	}

	.btn-danger:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.entry-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-height: 28rem;
		overflow-y: auto;
	}

	.entry {
		position: relative;
		display: block;
		text-align: left;
		width: 100%;
		border: 1px solid transparent;
		border-radius: 0.55rem;
		background: transparent;
		color: rgba(0, 0, 0, 0.82);
		padding: 0.55rem 0.75rem;
		cursor: pointer;
		overflow-wrap: anywhere;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	:global(.dark) .entry {
		color: rgba(255, 255, 255, 0.82);
	}

	.entry:hover:not(:disabled) {
		background: var(--btn-plain-bg-hover);
	}

	.entry.selected {
		background: var(--btn-regular-bg);
		border-color: color-mix(in oklch, var(--primary) 35%, transparent);
		color: var(--btn-content);
	}

	.entry-title {
		display: block;
		font-size: 0.88rem;
		font-weight: 500;
	}

	.entry-date {
		display: block;
		font-size: 0.75rem;
		opacity: 0.55;
		margin-top: 0.15rem;
	}

	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		margin: 0.5rem 0 1rem;
	}

	.thumbs img {
		height: 68px;
		width: 68px;
		object-fit: cover;
		border-radius: 0.5rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .thumbs img {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.status {
		padding: 0.75rem 1rem;
		border-radius: 0.55rem;
		font-size: 0.88rem;
		background: var(--btn-regular-bg);
		color: var(--btn-content);
	}

	.status.status-error {
		background: oklch(0.6 0.18 20 / 0.12);
		color: oklch(0.5 0.18 20);
	}

	:global(.dark) .status.status-error {
		color: oklch(0.78 0.14 20);
	}

	@media (max-width: 720px) {
		.workspace {
			grid-template-columns: 1fr;
		}
		.row {
			display: block;
		}
		.entry-list {
			max-height: 12rem;
		}
	}
</style>
