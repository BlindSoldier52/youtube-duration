const WATCH_LABEL_ID = "yt-duration-label";
const ITEM_LABEL_CLASS = "yt-duration-item";
const ITEM_SELECTOR = "ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-rich-grid-media, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer, yt-lockup-view-model";
const TIME_PATTERN = /^\d{1,2}(:\d{2}){1,2}$/;
const MAX_REQUESTS = 2;
const FALLBACK_DELAY = 3000;
const TICK_INTERVAL = 1000;

const durations = new Map();
const queue = [];
const states = new WeakMap();
const observed = new WeakSet();
const visible = new Set();
let active = 0;

const observer = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (entry.isIntersecting) {
			visible.add(entry.target);
		} else {
			visible.delete(entry.target);
		}
	}
}, { rootMargin: "200px" });

function pad(value) {
	return String(value).padStart(2, "0");
}

function format(seconds) {
	if (!Number.isFinite(seconds)) {
		return "Live";
	}
	const total = Math.floor(seconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const rest = total % 60;
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

function removeWatchLabel() {
	document.getElementById(WATCH_LABEL_ID)?.remove();
}

function updateWatch() {
	if (location.pathname !== "/watch") {
		removeWatchLabel();
		return;
	}
	const player = document.querySelector("#movie_player");
	const video = document.querySelector("video.html5-main-video");
	const title = document.querySelector("ytd-watch-metadata #title h1");
	if (!player || !video || !title || player.classList.contains("ad-showing") || !video.duration) {
		return;
	}
	let label = document.getElementById(WATCH_LABEL_ID);
	if (!label) {
		label = document.createElement("p");
		label.id = WATCH_LABEL_ID;
	}
	const text = `Duration: ${format(video.duration)}`;
	if (label.textContent !== text) {
		label.textContent = text;
	}
	if (title.nextElementSibling !== label) {
		title.after(label);
	}
}

function readVideoId(item) {
	const link = item.querySelector('a[href*="/watch?v="]');
	return link ? new URL(link.href).searchParams.get("v") : null;
}

function readBadge(item) {
	for (const element of item.querySelectorAll("span, div, p")) {
		const text = element.textContent.trim();
		if (element.childElementCount === 0 && TIME_PATTERN.test(text)) {
			return text;
		}
	}
	return null;
}

async function fetchDuration(id) {
	const response = await fetch("/youtubei/v1/player?prettyPrint=false", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			context: { client: { clientName: "WEB", clientVersion: "2.20260101.00.00" } },
			videoId: id
		})
	});
	const details = (await response.json()).videoDetails;
	if (!details) {
		return null;
	}
	return details.isLive ? "Live" : format(Number(details.lengthSeconds));
}

function drain() {
	while (active < MAX_REQUESTS && queue.length > 0) {
		const { id, resolve } = queue.shift();
		active++;
		fetchDuration(id)
			.then(resolve, () => resolve(null))
			.finally(() => {
				active--;
				drain();
			});
	}
}

function requestDuration(id) {
	if (!durations.has(id)) {
		durations.set(id, new Promise((resolve) => {
			queue.push({ id, resolve });
			drain();
		}));
	}
	return durations.get(id);
}

function findItemLabel(title) {
	const next = title.nextElementSibling;
	return next?.classList.contains(ITEM_LABEL_CLASS) ? next : null;
}

function writeLabel(title, id, duration) {
	let label = findItemLabel(title);
	if (!label) {
		label = document.createElement("span");
		label.className = ITEM_LABEL_CLASS;
		title.after(label);
	}
	label.dataset.videoId = id;
	label.textContent = `Duration: ${duration}`;
}

function labelItem(item, now) {
	const id = readVideoId(item);
	const title = item.querySelector("h3") ?? item.querySelector("#video-title");
	if (!id || !title || findItemLabel(title)?.dataset.videoId === id) {
		return;
	}
	let state = states.get(title);
	if (state?.id !== id) {
		state = { id, since: now, requested: false };
		states.set(title, state);
	}
	if (state.requested) {
		return;
	}
	const badge = readBadge(item);
	if (badge) {
		writeLabel(title, id, badge);
		return;
	}
	if (now - state.since < FALLBACK_DELAY) {
		return;
	}
	state.requested = true;
	requestDuration(id).then((duration) => {
		if (duration && readVideoId(item) === id) {
			writeLabel(title, id, duration);
		}
	});
}

function observeItems() {
	for (const item of document.querySelectorAll(ITEM_SELECTOR)) {
		if (!observed.has(item)) {
			observed.add(item);
			observer.observe(item);
		}
	}
}

function update() {
	updateWatch();
	observeItems();
	const now = performance.now();
	for (const item of visible) {
		if (item.isConnected) {
			labelItem(item, now);
		} else {
			visible.delete(item);
		}
	}
}

function schedule() {
	requestIdleCallback(() => {
		update();
		setTimeout(schedule, TICK_INTERVAL);
	}, { timeout: TICK_INTERVAL * 2 });
}

document.addEventListener("yt-navigate-start", removeWatchLabel);

if (document.readyState === "complete") {
	schedule();
} else {
	addEventListener("load", schedule, { once: true });
}
