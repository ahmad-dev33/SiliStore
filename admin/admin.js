const DEFAULT_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // admin123
const AUTH_SESSION_KEY = "corset_admin_auth";
const HASH_STORAGE_KEY = "corset_admin_hash";
const DRAFT_STORAGE_KEY = "corset_admin_products_draft";

const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginFeedback = document.getElementById("loginFeedback");
const passwordInput = document.getElementById("passwordInput");

const productForm = document.getElementById("productForm");
const formTitle = document.getElementById("formTitle");
const formFeedback = document.getElementById("formFeedback");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const productsTableBody = document.getElementById("productsTableBody");
const emptyState = document.getElementById("emptyState");

const passwordModal = document.getElementById("passwordModal");
const passwordChangeForm = document.getElementById("passwordChangeForm");
const passwordFeedback = document.getElementById("passwordFeedback");

let products = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getStoredHash() {
  return localStorage.getItem(HASH_STORAGE_KEY) || DEFAULT_PASSWORD_HASH;
}

function setFeedback(el, message, type = "") {
  el.textContent = message;
  el.className = `feedback ${type}`.trim();
}

function normalizeImagePath(src) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
  if (value.startsWith("../") || value.startsWith("./")) return value;
  return `../${value}`;
}

function loadProducts() {
  const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore invalid draft */ }
  }
  return Array.isArray(window.STORE_PRODUCTS) ? structuredClone(window.STORE_PRODUCTS) : [];
}

function saveDraft() {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(products));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function uid() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function updateStats() {
  const total = products.length;
  const available = products.filter((p) => p.available !== false).length;
  document.getElementById("statTotal").textContent = String(total);
  document.getElementById("statAvailable").textContent = String(available);
  document.getElementById("statHidden").textContent = String(total - available);
}

function renderProducts() {
  updateStats();
  if (!products.length) {
    productsTableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  productsTableBody.innerHTML = products.map((product, index) => {
    const available = product.available !== false;
    const imgSrc = normalizeImagePath(product.image);
    const safeName = escapeHtml(product.name);
    const safeDesc = escapeHtml(product.description);
    const safeCode = escapeHtml(product.code || "");
    const safeCategory = escapeHtml(product.category || "—");
    const safeImage = escapeHtml(product.image || "");
    const price = Number(product.price) || 0;
    const priceLabel = price > 0 ? String(price) : "تواصل للسعر";
    return `
      <tr>
        <td>
          <div class="product-cell">
            <img class="thumb" src="${escapeHtml(imgSrc)}" alt="${safeName}" onerror="this.style.opacity='.25'">
            <div>
              <strong>${safeCode ? `<span style="color:#8b5e4b">${safeCode}</span> - ` : ""}${safeName}</strong>
              <span>${safeDesc}</span>
            </div>
          </div>
        </td>
        <td>${safeCategory}</td>
        <td><strong>${escapeHtml(priceLabel)}</strong></td>
        <td><span class="status ${available ? "on" : "off"}">${available ? "متوفر" : "مخفي"}</span></td>
        <td class="path-cell" title="${safeImage}">${safeImage}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost" type="button" data-action="edit" data-index="${index}">تعديل</button>
            <button class="btn btn-ghost" type="button" data-action="toggle" data-index="${index}">${available ? "إخفاء" : "إظهار"}</button>
            <button class="btn btn-danger" type="button" data-action="delete" data-index="${index}">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function resetForm() {
  productForm.reset();
  document.getElementById("productId").value = "";
  document.getElementById("available").checked = true;
  formTitle.textContent = "إضافة منتج جديد";
  document.getElementById("saveProductBtn").textContent = "حفظ المنتج";
  cancelEditBtn.classList.add("hidden");
  setFeedback(formFeedback, "");
}

function fillForm(product) {
  document.getElementById("productId").value = product.id;
  document.getElementById("code").value = product.code || "";
  document.getElementById("category").value = product.category || "";
  document.getElementById("name").value = product.name || "";
  document.getElementById("price").value = product.price ?? "";
  document.getElementById("badge").value = product.badge || "";
  document.getElementById("image").value = product.image || "";
  document.getElementById("description").value = product.description || "";
  document.getElementById("available").checked = product.available !== false;
  formTitle.textContent = "تعديل المنتج";
  document.getElementById("saveProductBtn").textContent = "تحديث المنتج";
  cancelEditBtn.classList.remove("hidden");
  formTitle.scrollIntoView({ behavior: "smooth", block: "center" });
}

function readProductForm() {
  const id = document.getElementById("productId").value.trim();
  const code = document.getElementById("code").value.trim();
  return {
    id: id || code || uid(),
    code: code,
    category: document.getElementById("category").value.trim(),
    name: document.getElementById("name").value.trim(),
    price: Number(document.getElementById("price").value),
    badge: document.getElementById("badge").value.trim(),
    image: document.getElementById("image").value.trim(),
    description: document.getElementById("description").value.trim(),
    available: document.getElementById("available").checked,
  };
}

function validateProduct(product) {
  if (!product.name) return "اسم المنتج مطلوب.";
  if (!Number.isFinite(product.price) || product.price < 0) return "السعر غير صالح.";
  if (!product.image) return "الصورة مطلوبة (اسم ملف أو رابط).";
  if (!product.description) return "الوصف مطلوب.";
  return "";
}

function exportProductsFile() {
  const content = `/**\n * ملف المنتجات — هذا هو المصدر الأساسي لمنتجات المتجر.\n * تم تصديره من لوحة التحكم /admin\n * تاريخ التصدير: ${new Date().toLocaleString("ar-SA")}\n */\nwindow.STORE_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
  const blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setFeedback(formFeedback, "تم تصدير products.js. استبدل الملف في مستودع GitHub ثم ارفع التحديث.", "success");
}

async function copyProducts() {
  const content = JSON.stringify(products, null, 2);
  try {
    await navigator.clipboard.writeText(content);
    setFeedback(formFeedback, "تم نسخ بيانات المنتجات بصيغة JSON.", "success");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = content;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    setFeedback(formFeedback, "تم نسخ بيانات المنتجات.", "success");
  }
}

function bindTableActions() {
  productsTableBody.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const product = products[index];
    if (!product) return;

    if (btn.dataset.action === "edit") {
      fillForm(product);
      return;
    }

    if (btn.dataset.action === "toggle") {
      product.available = product.available === false;
      saveDraft();
      renderProducts();
      setFeedback(formFeedback, `تم ${product.available ? "إظهار" : "إخفاء"} المنتج.`, "success");
      return;
    }

    if (btn.dataset.action === "delete") {
      const ok = confirm(`هل أنت متأكد من حذف "${product.name}"؟`);
      if (!ok) return;
      const editingId = document.getElementById("productId").value;
      products.splice(index, 1);
      saveDraft();
      renderProducts();
      if (editingId === product.id) resetForm();
      setFeedback(formFeedback, "تم حذف المنتج من المسودة.", "success");
    }
  });
}

function bindForm() {
  productForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const product = readProductForm();
    const error = validateProduct(product);
    if (error) {
      setFeedback(formFeedback, error, "error");
      return;
    }

    const existingIndex = products.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
      setFeedback(formFeedback, "تم تحديث المنتج في المسودة.", "success");
    } else {
      products.unshift(product);
      setFeedback(formFeedback, "تمت إضافة المنتج إلى المسودة.", "success");
    }

    saveDraft();
    renderProducts();
    resetForm();
  });

  cancelEditBtn.addEventListener("click", resetForm);

  document.getElementById("exportBtn").addEventListener("click", exportProductsFile);
  document.getElementById("copyBtn").addEventListener("click", copyProducts);
  document.getElementById("resetBtn").addEventListener("click", () => {
    const ok = confirm("سيتم حذف المسودة المحلية واستعادة المنتجات من products.js الأصلي. هل تريد المتابعة؟");
    if (!ok) return;
    clearDraft();
    products = loadProducts();
    resetForm();
    renderProducts();
    setFeedback(formFeedback, "تمت استعادة المنتجات من الملف الأصلي.", "success");
  });
}

function bindAuth() {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(loginFeedback, "جارٍ التحقق...", "");
    try {
      const hash = await sha256(passwordInput.value);
      if (hash === getStoredHash()) {
        sessionStorage.setItem(AUTH_SESSION_KEY, "1");
        passwordInput.value = "";
        showApp();
      } else {
        setFeedback(loginFeedback, "كلمة المرور غير صحيحة.", "error");
      }
    } catch {
      setFeedback(loginFeedback, "تعذر التحقق من كلمة المرور في هذا المتصفح.", "error");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    adminApp.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    setFeedback(loginFeedback, "تم تسجيل الخروج.", "success");
  });
}

function bindPasswordChange() {
  const openBtn = document.getElementById("changePasswordBtn");
  const closeBtn = document.getElementById("closePasswordModal");

  openBtn.addEventListener("click", () => {
    passwordChangeForm.reset();
    setFeedback(passwordFeedback, "");
    passwordModal.showModal();
  });

  closeBtn.addEventListener("click", () => passwordModal.close());
  passwordModal.addEventListener("click", (e) => {
    if (e.target === passwordModal) passwordModal.close();
  });

  passwordChangeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(passwordFeedback, "", "");

    const current = document.getElementById("currentPassword").value;
    const next = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (next.length < 6) {
      setFeedback(passwordFeedback, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.", "error");
      return;
    }
    if (next !== confirm) {
      setFeedback(passwordFeedback, "تأكيد كلمة المرور غير مطابق.", "error");
      return;
    }

    const currentHash = await sha256(current);
    if (currentHash !== getStoredHash()) {
      setFeedback(passwordFeedback, "كلمة المرور الحالية غير صحيحة.", "error");
      return;
    }

    const nextHash = await sha256(next);
    localStorage.setItem(HASH_STORAGE_KEY, nextHash);
    setFeedback(passwordFeedback, "تم تغيير كلمة المرور على هذا المتصفح.", "success");
    setTimeout(() => passwordModal.close(), 700);
  });
}

function showApp() {
  loginScreen.classList.add("hidden");
  adminApp.classList.remove("hidden");
  products = loadProducts();
  renderProducts();
}

function init() {
  bindAuth();
  bindForm();
  bindTableActions();
  bindPasswordChange();

  if (sessionStorage.getItem(AUTH_SESSION_KEY) === "1") {
    showApp();
  }
}

init();
