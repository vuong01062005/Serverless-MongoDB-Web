const app = document.querySelector("#app");

app.innerHTML = `
  <div class="container">
    <div class="page-header">
      <div>
        <p class="eyebrow">QUẢN LÝ KHO HÀNG</p>
        <h1>Danh sách sản phẩm</h1>
      </div>
    </div>

    <form id="product-form" class="product-form">
      <div class="form-field">
        <label for="product-name">Tên sản phẩm</label>
        <input id="product-name" name="name" type="text" placeholder="Nhập tên sản phẩm" />
      </div>
      <div class="form-field">
        <label for="product-price">Giá</label>
        <input id="product-price" name="price" type="text" placeholder="Nhập giá sản phẩm" />
      </div>
      <div class="form-field">
        <label for="product-quantity">Số lượng</label>
        <input id="product-quantity" name="quantity" type="text" placeholder="Nhập số lượng" />
      </div>
      <button type="submit" class="btn btn-add">+ Thêm sản phẩm</button>
      <button type="button" id="cancel-edit" class="btn btn-cancel" style="display: none;">Hủy</button>
    </form>

    <div id="loading" class="loading">Đang tải dữ liệu...</div>
    <div id="error" class="error" style="display: none;"></div>
    <div id="product-list" class="product-list"></div>
  </div>
`;

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const productListEl = document.getElementById("product-list");
const productForm = document.getElementById("product-form");
const cancelEditButton = document.getElementById("cancel-edit");
const submitButton = productForm.querySelector("button[type=submit]");

let editingProductId = null;
let productsCache = [];

function resetProductForm() {
  productForm.reset();
  editingProductId = null;
  submitButton.textContent = "+ Thêm sản phẩm";
  cancelEditButton.style.display = "none";
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.style.display = "none";

  const formData = new FormData(productForm);
  const product = {
    name: String(formData.get("name") || "").trim(),
    price: String(formData.get("price") || "").trim(),
    quantity: String(formData.get("quantity") || "").trim(),
  };

  if (!product.name || !product.price || !product.quantity) {
    showError("Vui lòng nhập đầy đủ thông tin sản phẩm");
    return;
  }

  submitButton.disabled = true;

  try {
    const url = "http://localhost:3000/api/products";
    const method = editingProductId ? "PUT" : "POST";
    const payload = editingProductId ? { id: editingProductId, ...product } : product;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          (editingProductId ? "Không thể cập nhật sản phẩm" : "Không thể thêm sản phẩm")
      );
    }

    resetProductForm();
    await fetchProducts();
  } catch (error) {
    showError(error.message || "Lỗi kết nối đến server");
    console.error(error);
  } finally {
    submitButton.disabled = false;
  }
});

cancelEditButton.addEventListener("click", () => {
  resetProductForm();
  errorEl.style.display = "none";
});

async function fetchProducts() {
  try {
    const response = await fetch("http://localhost:3000/api/products");
    const result = await response.json();

    loadingEl.style.display = "none";

    if (result.success) {
      productsCache = result.data || [];
      renderProducts(productsCache);
    } else {
      showError("Không lấy được dữ liệu sản phẩm");
    }
  } catch (error) {
    loadingEl.style.display = "none";
    showError("Lỗi kết nối đến server");
    console.error(error);
  }
}

function renderProducts(products) {
  if (products.length === 0) {
    productListEl.innerHTML = `<p class="empty">Chưa có sản phẩm nào</p>`;
    return;
  }

  productListEl.innerHTML = `
    <div class="table-wrapper">
      <table class="product-table">
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
            <th>Giá</th>
            <th>Số lượng</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (product) => `
                <tr>
                  <td class="product-name">${product.name}</td>
                  <td class="price">${Number(product.price).toLocaleString("vi-VN")} đ</td>
                  <td>${product.quantity}</td>
                  <td>
                    <div class="card-actions">
                      <button class="btn btn-edit" data-id="${product._id}">Chỉnh sửa</button>
                      <button class="btn btn-delete" data-id="${product._id}">Xóa</button>
                    </div>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const product = productsCache.find((item) => item._id === id || item._id?.toString?.() === id);

      if (!product) {
        showError("Không tìm thấy sản phẩm cần chỉnh sửa");
        return;
      }

      editingProductId = id;
      document.getElementById("product-name").value = product.name;
      document.getElementById("product-price").value = product.price;
      document.getElementById("product-quantity").value = product.quantity;
      submitButton.textContent = "Cập nhật sản phẩm";
      cancelEditButton.style.display = "inline-flex";
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById("product-name").focus();
    });
  });

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;

      const confirmed = window.confirm("Bạn có chắc muốn xóa sản phẩm này?");
      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể xóa sản phẩm");
        }

        if (editingProductId === id) {
          resetProductForm();
        }

        await fetchProducts();
      } catch (error) {
        showError(error.message || "Lỗi kết nối đến server");
        console.error(error);
      }
    });
  });
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

fetchProducts();