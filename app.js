/**
 * إعدادات المتجر — عدّل هذه القيم قبل النشر
 */
const STORE = {
  name: "Sili Store",
  // رقم واتساب بصيغة دولية بدون + أو 00. مثال: 9639XXXXXXXX
  whatsappNumber: "963991189602",
  // الرقم المعروض للزوار (يمكنك تغييره بالشكل الذي تفضله)
  whatsappDisplay: "0991189602",
  // لاستقبال الطلبات عبر الموقع، أنشئ نموذجاً مجاناً على https://formspree.io
  // ثم ضع رابط النموذج هنا. مثال: "https://formspree.io/f/xxxxxx"
  formEndpoint: "",
  currency: "ر.س",
};

/**
 * المنتجات تُحمّل من products.js (المصدر الأساسي للمتجر).
 * لتعديل المنتجات استخدم لوحة التحكم: /admin
 */
const PRODUCTS = (Array.isArray(window.STORE_PRODUCTS) ? window.STORE_PRODUCTS : [])
  .filter((p) => p && p.available !== false);

const productsGrid = document.getElementById("productsGrid");
const productSelect = document.getElementById("productSelect");
const orderForm = document.getElementById("orderForm");
const formFeedback = document.getElementById("formFeedback");
const siteSubmitBtn = document.getElementById("siteSubmit");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const categoryFilters = document.getElementById("categoryFilters");
let activeCategory = "all";

function formatPrice(price) {
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return `<span class="price-contact">تواصل للسعر</span>`;
  return `${num} <small>${STORE.currency}</small>`;
}

function priceText(price) {
  const num = Number(price);
  if (!Number.isFinite(num) || num <= 0) return "تواصل للسعر";
  return `${num} ${STORE.currency}`;
}

function getWhatsAppUrl(message) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${STORE.whatsappNumber}?text=${text}`;
}

function buildOrderMessage(data) {
  const lines = [
    `مرحباً، أرغب في طلب من متجر ${STORE.name}:`,
    "",
    `الاسم: ${data.name}`,
    `رقم الجوال: ${data.phone}`,
    `المنتج: ${data.product}`,
    `المقاس: ${data.size}`,
    `المدينة/العنوان: ${data.address || "غير محدد"}`,
    `ملاحظات: ${data.notes || "لا يوجد"}`,
  ];
  return lines.join("\n");
}

function getSelectedProduct() {
  return PRODUCTS.find((p) => p.id === productSelect.value) || PRODUCTS[0];
}

function setFeedback(message, type = "") {
  formFeedback.textContent = message;
  formFeedback.className = `form-feedback ${type}`.trim();
}

function getCategories() {
  return ["all", ...new Set(PRODUCTS.map((p) => p.category).filter(Boolean))];
}

function renderCategoryFilters() {
  if (!categoryFilters) return;
  const categories = getCategories();
  categoryFilters.innerHTML = categories.map((cat) => {
    const label = cat === "all" ? "الكل" : cat;
    const active = cat === activeCategory ? "active" : "";
    return `<button type="button" class="filter-btn ${active}" data-category="${escapeAttr(cat)}">${escapeHtml(label)}</button>`;
  }).join("");

  categoryFilters.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category || "all";
      renderCategoryFilters();
      renderProducts();
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function renderProducts() {
  const visible = activeCategory === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);
  productsGrid.innerHTML = visible.map((product) => {
    const code = product.code ? `<span class="product-code">${escapeHtml(product.code)}</span>` : "";
    const badge = product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : "";
    return `
    <article class="product-card">
      <div class="product-media">
        <img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" loading="lazy">
        ${badge}
      </div>
      <div class="product-body">
        <div class="product-title-row">
          ${code}
          <h3>${escapeHtml(product.name)}</h3>
        </div>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-meta">
          <div class="price">${formatPrice(product.price)}</div>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm order-product" data-product-id="${escapeAttr(product.id)}">اطلبي الآن</button>
          <a class="btn btn-ghost btn-sm" href="${getWhatsAppUrl(`مرحباً، أرغب بالاستفسار عن ${product.code ? product.code + " - " : ""}${product.name} (${priceText(product.price)})`)}" target="_blank" rel="noopener">استفسار</a>
        </div>
      </div>
    </article>
  `;
  }).join("");

  document.querySelectorAll(".order-product").forEach((button) => {
    button.addEventListener("click", () => {
      const { productId } = button.dataset;
      productSelect.value = productId;
      document.getElementById("order").scrollIntoView({ behavior: "smooth", block: "start" });
      setFeedback(`تم اختيار ${PRODUCTS.find((p) => p.id === productId)?.name || "المنتج"}. أكملي البيانات لإرسال الطلب.`, "success");
      document.getElementById("name").focus({ preventScroll: true });
    });
  });
}

function renderProductSelect() {
  productSelect.innerHTML = [
    '<option value="">اختاري المنتج</option>',
    ...PRODUCTS.map((p) => {
      const code = p.code ? `${p.code} - ` : "";
      return `<option value="${escapeAttr(p.id)}">${escapeHtml(code + p.name)} — ${escapeHtml(priceText(p.price))}</option>`;
    }),
  ].join("");
}

function readForm() {
  const formData = new FormData(orderForm);
  const product = PRODUCTS.find((p) => p.id === formData.get("product"));
  const productLabel = product
    ? `${product.code ? product.code + " - " : ""}${product.name} (${priceText(product.price)})`
    : "";
  return {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    productId: String(formData.get("product") || "").trim(),
    product: productLabel,
    size: String(formData.get("size") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };
}

function validateForm(data) {
  if (!data.name) return "يرجى كتابة الاسم.";
  if (!data.phone) return "يرجى كتابة رقم الجوال.";
  if (!data.productId) return "يرجى اختيار المنتج.";
  if (!data.size) return "يرجى اختيار المقاس.";
  return "";
}

function setupWhatsAppLinks() {
  const defaultMessage = `مرحباً، أرغب بالاستفسار عن المشدات الطبية والتجميلية من ${STORE.name}.`;
  const url = getWhatsAppUrl(defaultMessage);
  const float = document.getElementById("whatsappFloat");
  const footerWhatsapp = document.getElementById("footerWhatsapp");
  const footerPhone = document.getElementById("footerPhone");
  float.href = url;
  footerWhatsapp.href = url;
  footerPhone.href = `tel:+${STORE.whatsappNumber}`;
  document.getElementById("whatsappDisplay").textContent = STORE.whatsappDisplay;
}

function setupMenu() {
  menuToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (!navLinks.classList.contains("open")) return;
    if (navLinks.contains(event.target) || menuToggle.contains(event.target)) return;
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
}

async function submitToSite(data) {
  if (!STORE.formEndpoint) {
    setFeedback("استقبال الطلبات عبر الموقع غير مفعّل حالياً. أضف رابط Formspree في app.js أو استخدم واتساب.", "error");
    return;
  }

  siteSubmitBtn.disabled = true;
  siteSubmitBtn.textContent = "جارٍ الإرسال...";
  setFeedback("جارٍ إرسال الطلب...", "");

  try {
    const response = await fetch(STORE.formEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        product: data.product,
        size: data.size,
        address: data.address,
        notes: data.notes,
        source: window.location.href,
      }),
    });

    if (!response.ok) throw new Error("Request failed");

    orderForm.reset();
    setFeedback("تم إرسال طلبك بنجاح عبر الموقع. سنتواصل معك قريباً.", "success");
  } catch {
    setFeedback("تعذر إرسال الطلب عبر الموقع حالياً. يمكنك إرساله عبر واتساب.", "error");
  } finally {
    siteSubmitBtn.disabled = false;
    siteSubmitBtn.textContent = "إرسال عبر الموقع";
  }
}

function setupForm() {
  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readForm();
    const error = validateForm(data);
    if (error) {
      setFeedback(error, "error");
      return;
    }
    const message = buildOrderMessage(data);
    window.open(getWhatsAppUrl(message), "_blank", "noopener");
    setFeedback("تم فتح واتساب مع تفاصيل طلبك. راجعي الرسالة ثم اضغطي إرسال.", "success");
  });

  siteSubmitBtn.addEventListener("click", async () => {
    const data = readForm();
    const error = validateForm(data);
    if (error) {
      setFeedback(error, "error");
      return;
    }
    await submitToSite(data);
  });
}

function hidePreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;
  const hide = () => preloader.classList.add("hidden");
  const fallback = setTimeout(hide, 4000);
  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    }),
  ]).then(() => {
    clearTimeout(fallback);
    setTimeout(hide, 150);
  });
}

function init() {
  hidePreloader();
  document.getElementById("year").textContent = String(new Date().getFullYear());
  renderCategoryFilters();
  renderProducts();
  renderProductSelect();
  setupWhatsAppLinks();
  setupMenu();
  setupForm();
}

init();
