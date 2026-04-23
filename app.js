const DATA_URLS = {
  zh: "./tag.zh.json",
  en: "./tag.json",
};

const UI_TEXT = {
  zh: {
    eyebrow: "Grindr Tag",
    title: "Grindr Tag",
    all: "全部",
    empty: "没有找到匹配的标签。",
    loadError: "数据加载失败，请通过本地服务器打开页面。",
    close: "关闭",
    languageAria: "切换为英文",
    searchPlaceholder: "搜索",
  },
  en: {
    eyebrow: "JSON Tag Library",
    title: "Tag Atlas",
    all: "All",
    empty: "No matching tags found.",
    loadError: "Failed to load data. Open this page through a local server.",
    close: "Close",
    languageAria: "Switch to Simplified Chinese",
    searchPlaceholder: "Search tag or description",
  },
};

const CATEGORY_LABELS = {
  zh: {
    "My Kinks": "癖好",
    "My Hobbies": "爱好",
    "My Personality": "个性",
    "My Other Tags": "其他标签",
  },
  en: {
    "My Kinks": "My Kinks",
    "My Hobbies": "My Hobbies",
    "My Personality": "My Personality",
    "My Other Tags": "My Other Tags",
  },
};

const state = {
  language: "zh",
  activeCategory: "all",
  query: "",
  raw: {},
  items: [],
  activeItem: null,
  activeCardRect: null,
};

const els = {
  html: document.documentElement,
  grid: document.getElementById("tagGrid"),
  tabs: document.getElementById("categoryTabs"),
  toggle: document.getElementById("languageToggle"),
  languageLabel: document.getElementById("languageLabel"),
  searchInput: document.getElementById("searchInput"),
  modalLayer: document.getElementById("modalLayer"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  detailCard: document.getElementById("detailCard"),
  detailHero: document.getElementById("detailHero"),
  detailCategory: document.getElementById("detailCategory"),
  detailTitle: document.getElementById("detailTitle"),
  detailDescription: document.getElementById("detailDescription"),
  closeButton: document.getElementById("closeButton"),
};

async function init() {
  bindEvents();

  try {
    const [zh, en] = await Promise.all([
      fetch(DATA_URLS.zh).then((response) => response.json()),
      fetch(DATA_URLS.en).then((response) => response.json()),
    ]);

    state.raw = { zh, en };
    render();
  } catch (error) {
    console.error(error);
    els.grid.innerHTML = `<div class="empty-state">${UI_TEXT[state.language].loadError}</div>`;
  }
}

function bindEvents() {
  els.toggle.addEventListener("click", () => {
    state.language = state.language === "zh" ? "en" : "zh";
    render();
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    render();
  });

  els.modalBackdrop.addEventListener("click", closeDetail);
  els.closeButton.addEventListener("click", closeDetail);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.modalLayer.classList.contains("is-open")) {
      closeDetail();
    }
  });
}

function render() {
  const data = state.raw[state.language];
  if (!data) return;

  state.items = flattenData(data);
  const categories = Object.keys(data);
  const filteredItems = filterItems(state.items);

  updateLanguageText();
  renderTabs(categories);
  renderCards(filteredItems);
}

function filterItems(items) {
  return items.filter((item) => {
    const categoryMatches =
      state.activeCategory === "all" || item.category === state.activeCategory;
    const queryMatches =
      !state.query ||
      item.tag.toLowerCase().includes(state.query) ||
      item.description.toLowerCase().includes(state.query);

    return categoryMatches && queryMatches;
  });
}

function flattenData(data) {
  return Object.entries(data).flatMap(([category, tags]) =>
    tags.map((item, index) => ({
      ...item,
      id: `${category}-${index}-${item.tag}`,
      index,
      category,
    })),
  );
}

function updateLanguageText() {
  const copy = UI_TEXT[state.language];
  els.html.lang = state.language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = copy[node.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = copy[node.dataset.i18nPlaceholder];
  });
  els.languageLabel.textContent = state.language === "zh" ? "EN" : "中";
  els.toggle.setAttribute("aria-label", copy.languageAria);
  els.closeButton.setAttribute("aria-label", copy.close);
  els.modalBackdrop.setAttribute("aria-label", copy.close);
}

function renderTabs(categories) {
  const allTabs = ["all", ...categories];

  els.tabs.innerHTML = allTabs
    .map((category) => {
      const label =
        category === "all" ? UI_TEXT[state.language].all : getCategoryLabel(category);
      const active = category === state.activeCategory;

      return `<button class="tab-button" type="button" data-category="${escapeAttr(
        category,
      )}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
    })
    .join("");

  els.tabs.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      render();
    });
  });
}

function renderCards(items) {
  if (!items.length) {
    els.grid.innerHTML = `<div class="empty-state">${UI_TEXT[state.language].empty}</div>`;
    return;
  }

  els.grid.innerHTML = items
    .map((item) => {
      return `
        <button
          class="tag-card"
          type="button"
          data-id="${escapeAttr(item.id)}"
        >
          <div class="poster" aria-hidden="true">
            <span class="poster-mark"></span>
            <span class="poster-title">${escapeHtml(item.tag)}</span>
          </div>
          <div class="card-copy">
            <span class="card-category">${escapeHtml(getCategoryLabel(item.category))}</span>
            <p class="card-description">${escapeHtml(item.description)}</p>
          </div>
        </button>
      `;
    })
    .join("");

  els.grid.querySelectorAll(".tag-card").forEach((card) => {
    card.addEventListener("click", () => {
      const item = state.items.find((entry) => entry.id === card.dataset.id);
      if (item) openDetail(item, card);
    });
  });
}

function openDetail(item, sourceCard) {
  state.activeItem = item;
  state.activeCardRect = sourceCard.getBoundingClientRect();

  els.detailCategory.textContent = getCategoryLabel(item.category);
  els.detailTitle.textContent = item.tag;
  els.detailDescription.textContent = item.description;

  document.body.classList.add("modal-open");
  els.modalLayer.classList.add("is-open");
  els.modalLayer.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    const targetRect = els.detailCard.getBoundingClientRect();
    const source = state.activeCardRect;
    const deltaX = source.left - targetRect.left;
    const deltaY = source.top - targetRect.top;
    const scaleX = source.width / targetRect.width;
    const scaleY = source.height / targetRect.height;

    els.modalBackdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 260,
      easing: "ease-out",
      fill: "forwards",
    });

    els.detailCard.animate(
      [
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
          borderRadius: "8px",
          opacity: 0.82,
        },
        {
          transform: "translate(0, 0) scale(1, 1)",
          borderRadius: "12px",
          opacity: 1,
        },
      ],
      {
        duration: 360,
        easing: "cubic-bezier(.2, .8, .2, 1)",
        fill: "both",
      },
    );

    els.detailCard.focus({ preventScroll: true });
  });
}

function closeDetail() {
  if (!els.modalLayer.classList.contains("is-open")) return;

  const targetRect = els.detailCard.getBoundingClientRect();
  const source = state.activeCardRect || targetRect;
  const deltaX = source.left - targetRect.left;
  const deltaY = source.top - targetRect.top;
  const scaleX = source.width / targetRect.width;
  const scaleY = source.height / targetRect.height;

  const backdropAnimation = els.modalBackdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 180,
    easing: "ease-in",
    fill: "forwards",
  });

  const cardAnimation = els.detailCard.animate(
    [
      {
        transform: "translate(0, 0) scale(1, 1)",
        opacity: 1,
      },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
        opacity: 0.4,
      },
    ],
    {
      duration: 220,
      easing: "cubic-bezier(.4, 0, 1, 1)",
      fill: "both",
    },
  );

  Promise.allSettled([backdropAnimation.finished, cardAnimation.finished]).then(() => {
    els.modalLayer.classList.remove("is-open");
    els.modalLayer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    els.detailCard.getAnimations().forEach((animation) => animation.cancel());
    els.modalBackdrop.getAnimations().forEach((animation) => animation.cancel());
    state.activeItem = null;
    state.activeCardRect = null;
  });
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[state.language][category] || category;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

init();
