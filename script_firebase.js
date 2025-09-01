// ==============================
// Configuración de Firebase
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyBmqrpy393YAIihqf64ZaJ6s6GQncLN_YU",
  authDomain: "controlstock-abb5b.firebaseapp.com",
  databaseURL: "https://controlstock-abb5b-default-rtdb.firebaseio.com",
  projectId: "controlstock-abb5b",
  storageBucket: "controlstock-abb5b.firebasestorage.app",
  messagingSenderId: "204177076833",
  appId: "1:204177076833:web:a9a8fa8deba1614c783020",
  measurementId: "G-S8G1H8KGD0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==============================
// Variables globales
// ==============================
const form = document.getElementById('productForm');
const productList = document.getElementById('productList');

let products = {};
let totalVentas = 0;
let historialVentas = [];
let ventasPorProducto = {};
let productoActualId = null;

let turnoId = null;
let turnoActivo = false;

// ==============================
// Listeners Firebase
// ==============================
db.ref("products").on("value", (snapshot) => {
  products = snapshot.val() || {};
  renderProducts();
});

db.ref("historialVentas").on("value", (snapshot) => {
  historialVentas = snapshot.val() || [];
  renderHistorialVentas();
});

db.ref("ventasPorProducto").on("value", (snapshot) => {
  ventasPorProducto = snapshot.val() || {};
});

db.ref("totalVentas").on("value", (snapshot) => {
  totalVentas = parseFloat(snapshot.val()) || 0;
  renderTotalVentas();
});

// ==============================
// Guardar en Firebase
// ==============================
function saveProductToFirebase(id, product) {
  db.ref("products/" + id).set(product);
}

function deleteProductFromFirebase(id) {
  db.ref("products/" + id).remove();
}

function saveHistorialToFirebase() {
  db.ref("historialVentas").set(historialVentas);
}

function saveVentasPorProducto() {
  db.ref("ventasPorProducto").set(ventasPorProducto);
}

function saveTotalVentas() {
  db.ref("totalVentas").set(totalVentas.toFixed(2));
}

// ==============================
// Manejo de productos
// ==============================
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const price = parseFloat(document.getElementById('price').value);
  const quantity = parseInt(document.getElementById('quantity').value);

  const id = db.ref().child("products").push().key; // ID único
  const product = { id, name, price, quantity };

  saveProductToFirebase(id, product);

  form.reset();
});

function sellProduct(id) {
  if (!turnoActivo) return alert('Debes abrir un turno para vender.');

  const producto = products[id];
  if (producto.quantity <= 0) return alert('Sin stock disponible.');

  productoActualId = id;
  document.getElementById('metodoPagoModal').classList.remove('hidden');
}

function confirmarMetodoPago(metodo) {
  const producto = products[productoActualId];
  document.getElementById('metodoPagoModal').classList.add('hidden');

  producto.quantity--;
  saveProductToFirebase(productoActualId, producto);

  totalVentas += producto.price;
  saveTotalVentas();

  const hora = new Date().toLocaleString();
  historialVentas.push({
    nombre: producto.name,
    precio: producto.price,
    hora,
    metodo
  });
  saveHistorialToFirebase();

  if (!ventasPorProducto[turnoId]) ventasPorProducto[turnoId] = {};
  if (!ventasPorProducto[turnoId][producto.name]) {
    ventasPorProducto[turnoId][producto.name] = {
      unidades: 0,
      total: 0,
      efectivo: 0,
      mp: 0
    };
  }

  ventasPorProducto[turnoId][producto.name].unidades++;
  ventasPorProducto[turnoId][producto.name].total += producto.price;
  ventasPorProducto[turnoId][producto.name][metodo] += producto.price;
  saveVentasPorProducto();
}

function deleteProduct(id) {
  deleteProductFromFirebase(id);
}

function abrirEditorProducto(id) {
  const producto = products[id];

  const nuevoNombre = prompt("Modificar nombre:", producto.name);
  if (nuevoNombre === null) return;

  const nuevoPrecio = parseFloat(prompt("Modificar precio:", producto.price));
  if (isNaN(nuevoPrecio) || nuevoPrecio < 0) return alert("Precio inválido.");

  const nuevaCantidad = parseInt(prompt("Modificar cantidad:", producto.quantity));
  if (isNaN(nuevaCantidad) || nuevaCantidad < 0) return alert("Cantidad inválida.");

  const confirmarEliminar = confirm("¿Deseas eliminar este producto?");
  if (confirmarEliminar) {
    deleteProduct(id);
  } else {
    producto.name = nuevoNombre;
    producto.price = nuevoPrecio;
    producto.quantity = nuevaCantidad;
    saveProductToFirebase(id, producto);
  }
}

// ==============================
// Renderizado de la interfaz
// ==============================
function renderProducts() {
  productList.innerHTML = '';
  Object.values(products).forEach((product) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td>$${product.price.toFixed(2)}</td>
      <td>${product.quantity}</td>
      <td>$${(product.price * product.quantity).toFixed(2)}</td>
      <td>
        <button onclick="sellProduct('${product.id}')">Vender</button>
        <button onclick="abrirEditorProducto('${product.id}')">Editar</button>
      </td>
    `;
    productList.appendChild(row);
  });
}

function renderHistorialVentas() {
  const lista = document.getElementById('historialVentas');
  lista.innerHTML = '';
  historialVentas.forEach(venta => {
    const li = document.createElement('li');
    li.textContent = `${venta.hora} - ${venta.nombre} - $${venta.precio.toFixed(2)} - ${venta.metodo}`;
    lista.appendChild(li);
  });
}

function renderTotalVentas() {
  document.getElementById('totalVentasDisplay').textContent =
    `Total de Ventas: $${totalVentas.toFixed(2)}`;
}

function renderEstadoTurno() {
  document.getElementById('estadoTurno').textContent =
    turnoActivo ? 'Turno abierto' : 'Turno cerrado';
}

function filtrarProductos() {
  const texto = document.getElementById('buscador').value.toLowerCase();
  const filas = productList.querySelectorAll('tr');

  Object.values(products).forEach((product, index) => {
    const visible = product.name.toLowerCase().includes(texto);
    filas[index].style.display = visible ? '' : 'none';
  });
}

// ==============================
// Exportar funciones globales
// ==============================
window.sellProduct = sellProduct;
window.confirmarMetodoPago = confirmarMetodoPago;
window.deleteProduct = deleteProduct;
window.abrirEditorProducto = abrirEditorProducto;
window.filtrarProductos = filtrarProductos;

// ==============================
// BACKUP de productos (Exportar / Importar)
// ==============================

// Exportar a JSON
function exportarProductosJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "productos_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Exportar a Excel
function exportarProductosExcel() {
  const wb = XLSX.utils.book_new();
  const data = [["ID", "Nombre", "Precio", "Cantidad"]];

  Object.values(products).forEach(p => {
    data.push([p.id, p.name, p.price, p.quantity]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  XLSX.writeFile(wb, "productos_backup.xlsx");
}

// Importar desde JSON o Excel
function importarProductos(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  if (file.name.endsWith(".json")) {
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.values(data).forEach(p => {
          if (!p.id) p.id = db.ref().child("products").push().key; // asignar id si no tiene
          saveProductToFirebase(p.id, p);
        });
        alert("Productos importados desde JSON");
      } catch (err) {
        alert("Error al importar JSON: " + err);
      }
    };
    reader.readAsText(file);
  } else if (file.name.endsWith(".xlsx")) {
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        rows.slice(1).forEach(row => {
          if (row.length >= 4) {
            const id = row[0] || db.ref().child("products").push().key;
            const product = {
              id,
              name: row[1],
              price: parseFloat(row[2]),
              quantity: parseInt(row[3])
            };
            saveProductToFirebase(id, product);
          }
        });
        alert("Productos importados desde Excel");
      } catch (err) {
        alert("Error al importar Excel: " + err);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("Formato no soportado. Usa JSON o XLSX.");
  }
}

// Hacer funciones globales
window.exportarProductosJSON = exportarProductosJSON;
window.exportarProductosExcel = exportarProductosExcel;
window.importarProductos = importarProductos;
