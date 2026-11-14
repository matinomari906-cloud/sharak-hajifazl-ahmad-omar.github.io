document.addEventListener("DOMContentLoaded", () => {
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

  // فایل‌های واقعی موجود در مخزن به عنوان پشتیبان
  const FALLBACK_IMAGES = [
    { id: "landmark-gate-street-01", category: "landmark", title_fa: "دروازه و نمای ورودی شهرک", featured: true },
    { id: "landmark-tower-dusk-01", category: "landmark", title_fa: "برج و نمای عصرگاهی", featured: true },
    { id: "boulevard-junction-haze-01", category: "boulevard", title_fa: "بلوار و تقاطع شهرک", featured: true },
    { id: "roundabout-blue-fountain-warehouse-01", category: "roundabout", title_fa: "میدان فواره آبی", featured: true },
    { id: "road-dusk-cars-01", category: "road", title_fa: "سرک اصلی در غروب", featured: true },
    { id: "landscape-plain-mountains-wide-01", category: "landscape", title_fa: "چشم‌انداز کلی و کوه‌ها", featured: true },
    { id: "construction-concrete-frame-field-01", category: "construction", title_fa: "پروژه‌های در حال ساخت", featured: false },
  ];

  function applyImageFallback(imgEl, rawSrc) {
    const cleanName = rawSrc.split("/").pop();
    const candidates = [rawSrc, cleanName, `images/photos/${cleanName}`, `images/${cleanName}`];
    let idx = 0;
    imgEl.src = candidates[idx];
    imgEl.addEventListener("error", () => {
      idx += 1;
      if (idx < candidates.length) imgEl.src = candidates[idx];
    });
  }

  document.querySelectorAll(".smart-img").forEach((img) => {
    const name = img.dataset.filename || img.getAttribute("src");
    if (name) applyImageFallback(img, name);
  });

  function detectCategory(item, src) {
    const lowerSrc = src.toLowerCase();
    if (lowerSrc.startsWith("boulevard-")) return "boulevard";
    const raw = (item.category || "").toLowerCase().trim();
    if (CATEGORY_LABELS[raw]) return raw;
    for (const key of Object.keys(CATEGORY_LABELS)) {
      if (lowerSrc.includes(key)) return key;
    }
    return "other";
  }

  function normalizeImages(data) {
    const list = Array.isArray(data) ? data : data?.images || data?.photos || data?.items || [];
    return list
      .map((item, i) => {
        if (typeof item === "string") {
          const cat = detectCategory({}, item);
          return { src: item, category: cat, title: `${CATEGORY_LABELS[cat]} ${i + 1}`, alt: "", featured: false };
        }
        // اولویت با <id>.jpg در ریشه طبق README مخزن
        const src = item.id ? `${item.id}.jpg` : (item.file || item.src || item.url || item.path || item.image);
        if (!src) return null;
        const cat = detectCategory(item, src);
        return {
          src,
          category: cat,
          categoryLabel: item.category_fa || CATEGORY_LABELS[cat] || "تصویر",
          title: item.title_fa || item.title || item.caption || CATEGORY_LABELS[cat],
          alt: item.alt_fa || item.title_fa || item.alt || CATEGORY_LABELS[cat],
          width: item.width || null,
          height: item.height || null,
          featured: Boolean(item.featured),
        };
      })
      .filter(Boolean);
  }

  async function loadImages() {
    if (Array.isArray(window.GALLERY) && window.GALLERY.length) {
      return normalizeImages(window.GALLERY);
    }
    try {
      const res = await fetch("images.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("images.json not found");
      const data = await res.json();
      const normalized = normalizeImages(data);
      return normalized.length ? normalized : normalizeImages(FALLBACK_IMAGES);
    } catch {
      return normalizeImages(FALLBACK_IMAGES);
    }
  }

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
    lightboxImg.alt = item.alt || item.title;
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
      img.decoding = "async";
      img.alt = item.alt || item.title;
      if (item.width) img.width = item.width;
      if (item.height) img.height = item.height;
      applyImageFallback(img, item.src);

      const meta = document.createElement("div");
      meta.className = "gallery-item-meta";
      meta.innerHTML = `
        <span>${item.title}</span>
        <em class="gallery-tag">${item.categoryLabel || CATEGORY_LABELS[item.category] || "تصویر"}</em>
      `;

      card.append(img, meta);
      card.addEventListener("click", () => openLightbox(items, index));
      container.appendChild(card);
    });
  }

  const featuredEl = document.getElementById("featured-gallery");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryCount = document.getElementById("gallery-count");
  const filterBtns = document.querySelectorAll(".filter-btn");

  loadImages().then((allImages) => {
    if (featuredEl) {
      const featured = allImages.filter((x) => x.featured);
      renderGallery(featuredEl, (featured.length ? featured : allImages).slice(0, 6));
    }

    if (galleryGrid) {
      const applyFilter = (category) => {
        const filtered = category === "all" ? allImages : allImages.filter((x) => x.category === category);
        renderGallery(galleryGrid, filtered);
        if (galleryCount) galleryCount.textContent = `نمایش ${filtered.length} تصویر`;
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