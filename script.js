document.addEventListener("DOMContentLoaded", () => {
  // منوی موبایل
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
  }

  const CATEGORY_LABELS = {
    boulevard: "بلوارها",
    landmark: "نشانه‌های شهری",
    roundabout: "میدان‌ها",
    road: "سرک‌ها",
    landscape: "فضای سبز",
    construction: "ساخت‌وساز",
    other: "سایر تصاویر",
  };

  // فهرست پشتیبان در صورت عدم دسترسی به images.json
  const FALLBACK_IMAGES = [
    { file: "landmark-01.jpg", category: "landmark", title: "نمای شاخص شهرک" },
    { file: "boulevard-01.jpg", category: "boulevard", title: "بلوار اصلی شهرک" },
    { file: "roundabout-01.jpg", category: "roundabout", title: "میدان و چهارراهی" },
    { file: "road-01.jpg", category: "road", title: "شبکه سرک‌های داخلی" },
    { file: "landscape-01.jpg", category: "landscape", title: "فضای سبز و چشم‌انداز" },
    { file: "construction-01.jpg", category: "construction", title: "روند ساخت‌وساز" },
  ];

  // اگر عکس به images/photos/ منتقل شده یا در ریشه باشد، به شکل خودکار هر دو مسیر را امتحان می‌کند
  function applyImageFallback(imgEl, rawSrc) {
    const cleanName = rawSrc.split("/").pop();
    const candidates = [
      rawSrc,
      `images/photos/${cleanName}`,
      `images/${cleanName}`,
      cleanName,
    ];
    let idx = 0;
    imgEl.src = candidates[idx];
    imgEl.addEventListener("error", () => {
      idx += 1;
      if (idx < candidates.length) {
        imgEl.src = candidates[idx];
      }
    });
  }

  // فعال‌سازی fallback برای عکس‌های ثابت صفحه مثل Hero
  document.querySelectorAll(".smart-img").forEach((img) => {
    const name = img.dataset.filename || img.getAttribute("src");
    if (name) applyImageFallback(img, name);
  });

  function detectCategory(item, src) {
    const raw = (item.category || "").toLowerCase().trim();
    if (CATEGORY_LABELS[raw]) return raw;
    const lowerSrc = src.toLowerCase();
    for (const key of Object.keys(CATEGORY_LABELS)) {
      if (lowerSrc.includes(key)) return key;
    }
    return "other";
  }

  function normalizeImages(data) {
    const list = Array.isArray(data)
      ? data
      : data?.images || data?.photos || data?.items || [];

    return list
      .map((item, i) => {
        if (typeof item === "string") {
          const cat = detectCategory({}, item);
          return {
            src: item,
            category: cat,
            title: `${CATEGORY_LABELS[cat]} ${i + 1}`,
          };
        }
        const src =
          item.src || item.url || item.path || item.file || item.filename || item.image;
        if (!src) return null;
        const cat = detectCategory(item, src);
        const title = item.title || item.caption || item.alt || CATEGORY_LABELS[cat];
        return { src, category: cat, title };
      })
      .filter(Boolean);
  }

  async function loadImages() {
    try {
      const res = await fetch("images.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("images.json not found");
      const data = await res.json();
      const normalized = normalizeImages(data);
      return normalized.length ? normalized : FALLBACK_IMAGES.map((x) => ({
        src: x.file,
        category: x.category,
        title: x.title,
      }));
    } catch {
      return FALLBACK_IMAGES.map((x) => ({
        src: x.file,
        category: x.category,
        title: x.title,
      }));
    }
  }

  // منطق Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  let currentList = [];
  let currentIndex = 0;

  function openLightbox(list, index) {
    if (!lightbox || !list.length) return;
    currentList = list;
    currentIndex = index;
    updateLightbox();
    lightbox.hidden = false;
  }

  function updateLightbox() {
    const item = currentList[currentIndex];
    if (!item) return;
    applyImageFallback(lightboxImg, item.src);
    lightboxImg.alt = item.title;
    lightboxCaption.textContent = `${item.title} (${currentIndex + 1} از ${currentList.length})`;
  }

  if (lightbox) {
    lightboxClose?.addEventListener("click", () => (lightbox.hidden = true));
    lightboxPrev?.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
      updateLightbox();
    });
    lightboxNext?.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % currentList.length;
      updateLightbox();
    });
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (lightbox.hidden) return;
      if (e.key === "Escape") lightbox.hidden = true;
      if (e.key === "ArrowLeft") lightboxNext?.click();
      if (e.key === "ArrowRight") lightboxPrev?.click();
    });
  }

  function renderGallery(container, items) {
    container.innerHTML = "";
    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "gallery-item";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = item.title;
      applyImageFallback(img, item.src);

      const meta = document.createElement("div");
      meta.className = "gallery-item-meta";
      meta.innerHTML = `
        <span>${item.title}</span>
        <em class="gallery-tag">${CATEGORY_LABELS[item.category] || "تصویر"}</em>
      `;

      card.append(img, meta);
      card.addEventListener("click", () => openLightbox(items, index));
      container.appendChild(card);
    });
  }

  // بارگذاری روی صفحه اصلی یا گالری
  const featuredEl = document.getElementById("featured-gallery");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryCount = document.getElementById("gallery-count");
  const filterBtns = document.querySelectorAll(".filter-btn");

  loadImages().then((allImages) => {
    if (featuredEl) {
      renderGallery(featuredEl, allImages.slice(0, 6));
    }

    if (galleryGrid) {
      const applyFilter = (category) => {
        const filtered =
          category === "all"
            ? allImages
            : allImages.filter((item) => item.category === category);
        renderGallery(galleryGrid, filtered);
        if (galleryCount) {
          galleryCount.textContent = `نمایش ${filtered.length} تصویر`;
        }
      };

      applyFilter("all");

      filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          filterBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          applyFilter(btn.dataset.filter || "all");
        });
      });
    }
  });
});