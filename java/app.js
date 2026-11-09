"use strict";

const API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const API_KEY_STORAGE_KEY = "youtube-clone-api-key";
const HISTORY_STORAGE_KEY = "youtube-clone-history";

const demoVideos = [
  { id: "dQw4w9WgXcQ", title: "Rick Astley - Never Gonna Give You Up (Official Music Video)", channel: "Rick Astley", views: "1.6B views", age: "16 years ago", duration: "3:33", avatar: "R", category: "Music" },
  { id: "2Vv-BfVoq4g", title: "Ed Sheeran - Perfect (Official Music Video)", channel: "Ed Sheeran", views: "3.8B views", age: "8 years ago", duration: "4:40", avatar: "E", category: "Music" },
  { id: "kJQP7kiw5Fk", title: "Luis Fonsi - Despacito ft. Daddy Yankee", channel: "Luis Fonsi", views: "8.6B views", age: "9 years ago", duration: "4:42", avatar: "L", category: "Music" },
  { id: "LXb3EKWsInQ", title: "COSTA RICA IN 4K 60fps HDR (ULTRA HD)", channel: "Jacob + Katie Schwarz", views: "8.2M views", age: "5 years ago", duration: "4:44", avatar: "J", category: "Nature" },
  { id: "9bZkp7q19f0", title: "PSY - GANGNAM STYLE(강남스타일) M/V", channel: "officialpsy", views: "5.5B views", age: "14 years ago", duration: "4:13", avatar: "P", category: "Music" },
  { id: "fJ9rUzIMcZQ", title: "Queen - Bohemian Rhapsody (Official Video Remastered)", channel: "Queen Official", views: "1.8B views", age: "16 years ago", duration: "6:00", avatar: "Q", category: "Music" },
  { id: "CevxZvSJLk8", title: "Katy Perry - Roar (Official)", channel: "Katy Perry", views: "4.0B views", age: "12 years ago", duration: "4:30", avatar: "K", category: "Music" },
  { id: "JGwWNGJdvx8", title: "Ed Sheeran - Shape of You (Official Music Video)", channel: "Ed Sheeran", views: "6.4B views", age: "9 years ago", duration: "4:24", avatar: "E", category: "Music" },
  { id: "M7lc1UVf-VE", title: "Build a YouTube player with the IFrame Player API", channel: "Google for Developers", views: "1.2M views", age: "4 years ago", duration: "8:16", avatar: "G", category: "Technology" },
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film", channel: "Blender", views: "12M views", age: "10 years ago", duration: "9:56", avatar: "B", category: "Animation" },
  { id: "ScMzIvxBSi4", title: "The best moments are the ones we share", channel: "Creative Commons", views: "2.4M views", age: "2 years ago", duration: "2:48", avatar: "C", category: "Film" },
  { id: "ysz5S6PUM-U", title: "Beautiful relaxing music - Calm your mind", channel: "Soothing Relaxation", views: "34M views", age: "3 years ago", duration: "1:01:12", avatar: "S", category: "Music" },
];

const elements = {
  body: document.body,
  grid: document.querySelector("#videoGrid"),
  emptyState: document.querySelector("#emptyState"),
  loadingState: document.querySelector("#loadingState"),
  noticeBar: document.querySelector("#noticeBar"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  sidebar: document.querySelector("#sidebar"),
  settingsBackdrop: document.querySelector("#settingsBackdrop"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  settingsError: document.querySelector("#settingsError"),
  playerBackdrop: document.querySelector("#playerBackdrop"),
  playerFrame: document.querySelector("#playerFrame"),
  playerTitle: document.querySelector("#playerTitle"),
  playerChannel: document.querySelector("#playerChannel"),
  toast: document.querySelector("#toast"),
};

let currentVideos = demoVideos;
let activeCategory = "All";
let toastTimeout;

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() ?? "";
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elements.toast.classList.remove("visible"), 2800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatCount(count) {
  const value = Number(count);
  if (!Number.isFinite(value)) return "";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B views`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${value} views`;
}

function formatAge(publishedAt) {
  if (!publishedAt) return "";
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000));
  if (elapsedDays < 1) return "today";
  if (elapsedDays < 30) return `${elapsedDays} days ago`;
  const months = Math.floor(elapsedDays / 30.44);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function formatDuration(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(duration ?? "");
  if (!match) return "";
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const parts = [minutes % 60, seconds].map((part) => String(part).padStart(2, "0"));
  if (hours) return `${hours}:${parts[0]}:${parts[1]}`;
  return `${minutes}:${parts[1]}`;
}

function getHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveToHistory(videoId) {
  const history = [videoId, ...getHistory().filter((id) => id !== videoId)].slice(0, 50);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function renderVideos(videos) {
  const filteredVideos = activeCategory === "All"
    ? videos
    : activeCategory === "Watched"
      ? videos.filter((video) => getHistory().includes(video.id))
      : activeCategory === "Recently uploaded"
        ? videos
        : videos.filter((video) => video.category?.toLowerCase() === activeCategory.toLowerCase());

  elements.grid.innerHTML = filteredVideos.map((video) => {
    const title = escapeHtml(video.title);
    const channel = escapeHtml(video.channel);
    const avatar = video.channelImage
      ? `<img src="${escapeHtml(video.channelImage)}" alt="" loading="lazy">`
      : escapeHtml(video.avatar || channel.charAt(0).toUpperCase());
    return `
      <article class="video-card" data-video-id="${escapeHtml(video.id)}" tabindex="0" aria-label="Play ${title}">
        <div class="thumbnail-wrap">
          <img class="thumbnail" src="https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg" alt="" loading="lazy">
          ${video.duration ? `<span class="video-duration">${escapeHtml(video.duration)}</span>` : ""}
        </div>
        <div class="video-details">
          <span class="channel-avatar">${avatar}</span>
          <div class="video-copy">
            <h2 class="video-title">${title}</h2>
            <div class="channel-name">${channel}</div>
            <div class="video-meta">${escapeHtml(video.views || "")}${video.views && video.age ? " · " : ""}${escapeHtml(video.age || "")}</div>
          </div>
          <button class="video-more" type="button" aria-label="More options for ${title}">⋮</button>
        </div>
      </article>`;
  }).join("");

  elements.emptyState.hidden = filteredVideos.length > 0;
  elements.grid.hidden = filteredVideos.length === 0;
}

function toVideo(item, statistics = {}, contentDetails = {}) {
  const snippet = item.snippet ?? {};
  const id = typeof item.id === "string" ? item.id : item.id?.videoId;
  if (!id) return null;
  return {
    id,
    title: snippet.title ?? "Untitled video",
    channel: snippet.channelTitle ?? "YouTube creator",
    views: statistics.viewCount ? formatCount(statistics.viewCount) : "",
    age: formatAge(snippet.publishedAt),
    duration: formatDuration(contentDetails.duration),
    avatar: (snippet.channelTitle ?? "Y").charAt(0).toUpperCase(),
    channelImage: "",
    category: activeCategory === "All" ? "" : activeCategory,
  };
}

async function requestYouTube(endpoint, parameters) {
  const key = getApiKey();
  if (!key) throw new Error("Add your YouTube Data API key in settings to search live YouTube results.");
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  Object.entries({ ...parameters, key }).forEach(([name, value]) => url.searchParams.set(name, value));

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Could not reach the YouTube API. Check your internet connection and try again. (${error.message})`);
  }
  const data = await response.json();
  if (!response.ok) {
    const apiError = data.error?.errors?.[0]?.reason;
    const message = data.error?.message ?? `YouTube API request failed (${response.status}).`;
    if (apiError === "keyInvalid") throw new Error("That API key is invalid. Check the key and try again.");
    if (apiError === "quotaExceeded" || apiError === "dailyLimitExceeded") {
      throw new Error("The YouTube API quota for this key has been reached. Try again later.");
    }
    throw new Error(message);
  }
  return data;
}

async function loadPopularVideos() {
  const key = getApiKey();
  if (!key) {
    currentVideos = demoVideos;
    renderVideos(currentVideos);
    elements.noticeBar.hidden = false;
    elements.noticeBar.textContent = "Showing demo videos. Add a YouTube Data API key in settings to load live recommendations and search YouTube.";
    return;
  }

  elements.loadingState.hidden = false;
  elements.grid.hidden = true;
  elements.emptyState.hidden = true;
  elements.noticeBar.hidden = true;
  try {
    const data = await requestYouTube("videos", {
      part: "snippet,statistics,contentDetails",
      chart: "mostPopular",
      maxResults: "24",
      regionCode: "US",
    });
    currentVideos = data.items.map((item) => toVideo(item, item.statistics, item.contentDetails)).filter(Boolean);
    renderVideos(currentVideos);
    if (currentVideos.length === 0) showNotice("The YouTube API returned no popular videos for this region.");
  } catch (error) {
    currentVideos = demoVideos;
    renderVideos(currentVideos);
    showNotice(`${error.message} Showing demo videos instead.`);
  } finally {
    elements.loadingState.hidden = true;
  }
}

function showNotice(message) {
  elements.noticeBar.textContent = message;
  elements.noticeBar.hidden = false;
}

async function searchVideos(query) {
  const term = query.trim();
  if (!term && activeCategory !== "Recently uploaded") {
    await loadPopularVideos();
    return;
  }

  if (!getApiKey()) {
    currentVideos = term
      ? demoVideos.filter((video) =>
        `${video.title} ${video.channel} ${video.category}`.toLowerCase().includes(term.toLowerCase()),
      )
      : demoVideos;
    renderVideos(currentVideos);
    showNotice(term
      ? "Demo search is showing matching sample videos. Add a YouTube Data API key in settings to search all of YouTube."
      : "Showing demo videos. Add a YouTube Data API key in settings to load recent uploads from YouTube.");
    return;
  }

  elements.noticeBar.hidden = true;
  elements.grid.hidden = true;
  elements.emptyState.hidden = true;
  elements.loadingState.hidden = false;
  try {
    const data = await requestYouTube("search", {
      part: "snippet",
      type: "video",
      q: term,
      maxResults: "24",
      safeSearch: "moderate",
      order: activeCategory === "Recently uploaded" ? "date" : "relevance",
    });
    const searchResults = data.items.map((item) => toVideo(item)).filter(Boolean);
    const ids = searchResults.map((video) => video.id).join(",");
    let details = {};
    if (ids) {
      const detailData = await requestYouTube("videos", {
        part: "statistics,contentDetails",
        id: ids,
        maxResults: "24",
      });
      details = Object.fromEntries(detailData.items.map((item) => [
        item.id,
        { statistics: item.statistics, contentDetails: item.contentDetails },
      ]));
    }
    currentVideos = searchResults.map((video) => {
      const extra = details[video.id] ?? {};
      return {
        ...video,
        views: extra.statistics?.viewCount ? formatCount(extra.statistics.viewCount) : "",
        duration: formatDuration(extra.contentDetails?.duration),
      };
    });
    renderVideos(currentVideos);
  } catch (error) {
    renderVideos([]);
    showNotice(error.message);
  } finally {
    elements.loadingState.hidden = true;
  }
}

function openPlayer(video) {
  elements.playerTitle.textContent = video.title;
  elements.playerChannel.textContent = video.channel;
  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0`;
  frame.title = video.title;
  frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.allowFullscreen = true;
  elements.playerFrame.replaceChildren(frame);
  elements.playerBackdrop.hidden = false;
  elements.body.classList.add("modal-open");
  saveToHistory(video.id);
  document.querySelector(".player-close").focus();
}

function closePlayer() {
  elements.playerBackdrop.hidden = true;
  elements.playerFrame.replaceChildren();
  elements.body.classList.remove("modal-open");
}

function openSettings() {
  elements.apiKeyInput.value = getApiKey();
  elements.settingsError.hidden = true;
  elements.settingsBackdrop.hidden = false;
  elements.body.classList.add("modal-open");
  elements.apiKeyInput.focus();
}

function closeSettings() {
  elements.settingsBackdrop.hidden = true;
  elements.body.classList.remove("modal-open");
}

function setActiveCategory(category) {
  activeCategory = category;
  document.querySelectorAll(".category-chip").forEach((chip) => {
    const selected = chip.dataset.category === category;
    chip.classList.toggle("selected", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  renderVideos(currentVideos);
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchVideos(elements.searchInput.value);
  elements.searchInput.blur();
});

elements.grid.addEventListener("click", (event) => {
  if (event.target.closest(".video-more")) {
    event.preventDefault();
    showToast("More video options are coming soon.");
    return;
  }
  const card = event.target.closest(".video-card");
  if (card) {
    const video = currentVideos.find((item) => item.id === card.dataset.videoId);
    if (video) openPlayer(video);
  }
});

elements.grid.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".video-card")) {
    event.preventDefault();
    const video = currentVideos.find((item) => item.id === event.target.dataset.videoId);
    if (video) openPlayer(video);
  }
});

document.querySelector("#categoryBar").addEventListener("click", (event) => {
  const chip = event.target.closest(".category-chip");
  if (!chip) return;
  const category = chip.dataset.category;
  setActiveCategory(category);
  if (getApiKey() && category !== "Watched") {
    searchVideos(category === "All" ? "" : category === "Recently uploaded" ? "" : category);
  }
});

document.querySelector("#menuButton").addEventListener("click", () => {
  if (window.matchMedia("(max-width: 1250px)").matches) {
    elements.body.classList.toggle("sidebar-expanded");
    return;
  }
  elements.body.classList.toggle("sidebar-collapsed");
});

document.querySelector("#settingsButton").addEventListener("click", openSettings);
document.querySelector(".settings-close").addEventListener("click", closeSettings);
elements.settingsBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.settingsBackdrop) closeSettings();
});

document.querySelector("#saveKeyButton").addEventListener("click", async () => {
  const key = elements.apiKeyInput.value.trim();
  if (!key) {
    elements.settingsError.textContent = "Enter an API key, or choose Remove key to use demo videos.";
    elements.settingsError.hidden = false;
    return;
  }
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
  closeSettings();
  await loadPopularVideos();
  showToast("API key saved in this browser.");
});

document.querySelector("#clearKeyButton").addEventListener("click", async () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  elements.apiKeyInput.value = "";
  closeSettings();
  await loadPopularVideos();
  showToast("API key removed. Showing demo videos.");
});

document.querySelector("#toggleKeyButton").addEventListener("click", (event) => {
  const reveal = elements.apiKeyInput.type === "password";
  elements.apiKeyInput.type = reveal ? "text" : "password";
  event.currentTarget.textContent = reveal ? "Hide" : "Show";
  event.currentTarget.setAttribute("aria-label", reveal ? "Hide API key" : "Show API key");
});

document.querySelector("#playerBackdrop").addEventListener("click", (event) => {
  if (event.target === elements.playerBackdrop || event.target.closest(".player-close")) closePlayer();
});

document.querySelector("#mobileSearchButton").addEventListener("click", () => {
  elements.searchForm.classList.toggle("mobile-search-open");
  if (elements.searchForm.classList.contains("mobile-search-open")) elements.searchInput.focus();
  else elements.searchInput.value = "";
});

document.querySelector("#voiceButton").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Voice search is not supported in this browser.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || "en-US";
  recognition.onresult = (event) => {
    elements.searchInput.value = event.results[0][0].transcript;
    elements.searchForm.requestSubmit();
  };
  recognition.onerror = () => showToast("Voice search could not hear you. Please try again.");
  recognition.start();
});

document.querySelector("#profileButton").addEventListener("click", () => {
  if (window.matchMedia("(max-width: 720px)").matches) openSettings();
  else showToast("Add an API key in settings to connect YouTube.");
});

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    const view = item.dataset.view;
    if (!view) return;
    document.querySelectorAll(".nav-item").forEach((navItem) => navItem.classList.remove("active"));
    item.classList.add("active");
    if (view === "Home") {
      elements.searchInput.value = "";
      setActiveCategory("All");
      loadPopularVideos();
    } else if (view === "Trending") {
      elements.searchInput.value = "";
      setActiveCategory("All");
      loadPopularVideos();
    } else if (view === "Music" || view === "Gaming") {
      elements.searchInput.value = "";
      searchVideos(view);
    } else if (view === "History") {
      setActiveCategory("Watched");
    } else {
      showToast(`${view} is not available in this demo.`);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!elements.playerBackdrop.hidden) closePlayer();
    if (!elements.settingsBackdrop.hidden) closeSettings();
  }
});

setActiveCategory("All");
loadPopularVideos();
