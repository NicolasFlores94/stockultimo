
// Firebase Configuración

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

let products = [];
let totalVentas = 0;
let ventasTurno = 0;
let historialVentas = [];
let ventasPorProducto = {};
let productoActualIndex = null;

let turnoId = null;
let turnoActivo = false;

// ==============================
// Listeners Firebase
// ==============================
db.ref("products").on("value", (snapshot) => {
  products = snapshot.val() || [];
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
// Funciones Firebase
// ==============================
function saveToFirebase() {
  db.ref("products").set(products);
  db.ref("historialVentas").set(historialVentas);
  db.ref("ventasPorProducto").set(ventasPorProducto);
  db.ref("totalVentas").set(totalVentas.toFixed(2));
}

// ==============================
// Funciones de turno
// ==============================
function abrirTurno() {
  if (turnoActivo) return alert('Ya hay un turno activo.');

  turnoActivo = true;
  totalVentas = 0;
  historialVentas = [];
  ventasTurno = 0;

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-ES');
  const hora = ahora.toLocaleTimeString('es-ES');
  turnoId = `${fecha} ${hora}`;

  ventasPorProducto[turnoId] = {};

  alert('Turno iniciado.');
  saveToFirebase();
  renderEstadoTurno();
}

function cerrarTurno() {
  if (!turnoActivo) return alert('No hay un turno activo.');

  turnoActivo = false;
  alert(`Turno cerrado.\nTotal vendido: $${ventasTurno.toFixed(2)}`);
  ventasTurno = 0;
  renderEstadoTurno();
}

// ==============================
// Funciones de productos
// ==============================
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const price = parseFloat(document.getElementById('price').value);
  const quantity = parseInt(document.getElementById('quantity').value);

  products.push({ name, price, quantity });
  form.reset();
  saveToFirebase();
});

function sellProduct(index) {
  if (!turnoActivo) return alert('Debes abrir un turno para vender.');

  const producto = products[index];
  if (producto.quantity <= 0) return alert('Sin stock disponible.');

  productoActualIndex = index;
  document.getElementById('metodoPagoModal').classList.remove('hidden');
}

function confirmarMetodoPago(metodo) {
  const producto = products[productoActualIndex];
  document.getElementById('metodoPagoModal').classList.add('hidden');

  producto.quantity--;
  totalVentas += producto.price;
  ventasTurno += producto.price;

  const hora = new Date().toLocaleString();
  historialVentas.push({
    nombre: producto.name,
    precio: producto.price,
    hora,
    metodo
  });

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

  saveToFirebase();
}

function deleteProduct(index) {
  products.splice(index, 1);
  saveToFirebase();
}

function abrirEditorProducto(index) {
  const producto = products[index];

  const nuevoNombre = prompt("Modificar nombre:", producto.name);
  if (nuevoNombre === null) return;

  const nuevoPrecio = parseFloat(prompt("Modificar precio:", producto.price));
  if (isNaN(nuevoPrecio) || nuevoPrecio < 0) return alert("Precio inválido.");

  const nuevaCantidad = parseInt(prompt("Modificar cantidad:", producto.quantity));
  if (isNaN(nuevaCantidad) || nuevaCantidad < 0) return alert("Cantidad inválida.");

  const confirmarEliminar = confirm("¿Deseas eliminar este producto?");
  if (confirmarEliminar) {
    deleteProduct(index);
  } else {
    producto.name = nuevoNombre;
    producto.price = nuevoPrecio;
    producto.quantity = nuevaCantidad;
    saveToFirebase();
  }
}

// ==============================
// Funciones de interfaz
// ==============================
function renderProducts() {
  productList.innerHTML = '';
  products.forEach((product, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td>$${product.price.toFixed(2)}</td>
      <td>${product.quantity}</td>
      <td>$${(product.price * product.quantity).toFixed(2)}</td>
      <td>
        <button onclick="sellProduct(${index})">Vender</button>
        <button onclick="abrirEditorProducto(${index})">Editar</button>
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

  products.forEach((product, index) => {
    const visible = product.name.toLowerCase().includes(texto);
    filas[index].style.display = visible ? '' : 'none';
  });
}

// ==============================
// Exportar PDF
// ==============================
async function exportarReportePDF() {
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF();

  // Título centrado
  doc.setFontSize(18);
  doc.text("Reporte de Ventas por Producto", 105, 20, null, null, "center");

  let y = 30;
  for (const [turno, productos] of Object.entries(ventasPorProducto)) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Turno: ${turno}`, 14, y);
    y += 8;

    // Encabezados
    doc.setFillColor(220, 220, 220); // gris claro
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, y - 6, 180, 8, 'F');

    doc.setFontSize(12);
    doc.text("Producto", 16, y);
    doc.text("Unidades", 70, y);
    doc.text("Total", 110, y);
    doc.text("Efectivo", 140, y);
    doc.text("MP", 170, y);
    y += 8;

    for (const [nombre, datos] of Object.entries(productos)) {
      doc.setFontSize(11);
      doc.text(nombre, 16, y);
      doc.text(`${datos.unidades}`, 70, y);
      doc.text(`$${datos.total.toFixed(2)}`, 110, y);
      doc.text(`$${(datos.efectivo || 0).toFixed(2)}`, 140, y);
      doc.text(`$${(datos.mp || 0).toFixed(2)}`, 170, y);
      y += 8;

      // Salto de página si es necesario
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }

    y += 10;
  }

  doc.save("reporte_ventas.pdf");
}

// Hacer funciones accesibles desde el HTML
// ==============================
window.abrirTurno = abrirTurno;
window.cerrarTurno = cerrarTurno;
window.exportarReportePDF = exportarReportePDF;
window.confirmarMetodoPago = confirmarMetodoPago;
window.filtrarProductos = filtrarProductos;
window.sellProduct = sellProduct;
window.abrirEditorProducto = abrirEditorProducto;
