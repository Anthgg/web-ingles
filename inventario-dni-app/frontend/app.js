const API = '/api';
let token = localStorage.getItem('token');
let usuario = null;

const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');

async function request(path, options = {}) {
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...headers } }).then(r => {
    if (r.status === 401) {
      logout();
    }
    return r.json();
  });
}

function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('panel-title').innerText = document.querySelector(`[data-target="${id}"]`).innerText;
}

async function loadProductos() {
  const search = document.getElementById('buscar').value;
  const categoria = document.getElementById('filtro-categoria').value;
  const stock = document.getElementById('filtro-stock').value;
  const productos = await request(`/productos?search=${encodeURIComponent(search)}&categoria=${encodeURIComponent(categoria)}&stockMinimo=${stock}`);
  const tbody = document.getElementById('tabla-productos');
  tbody.innerHTML = productos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td>$${p.precio}</td>
      <td>${p.stock} ${p.stock <= 5 ? '<span class="tag low">Bajo</span>' : ''}</td>
      <td>${p.sku}</td>
      <td>${p.proveedor || '-'}</td>
      <td>${p.fecha_ingreso || '-'}</td>
      <td>
        <button class="small outline" onclick="editarProducto(${p.id})">Editar</button>
        <button class="small" onclick="eliminarProducto(${p.id})">Eliminar</button>
      </td>
    </tr>`).join('');
  actualizarResumen(productos);
}

async function actualizarResumen(productos = []) {
  const movs = await request('/movimientos');
  const consultas = await request('/dni/historial');
  document.getElementById('stat-total').innerText = productos.length;
  document.getElementById('stat-bajo').innerText = productos.filter(p => p.stock <= 5).length;
  document.getElementById('stat-movs').innerText = movs.length;
  document.getElementById('stat-dni').innerText = consultas.length;
  const porCategoria = productos.reduce((acc, p) => { acc[p.categoria] = (acc[p.categoria] || 0) + 1; return acc; }, {});
  const chart = document.getElementById('chart-categorias');
  chart.innerHTML = Object.entries(porCategoria).map(([cat, cant]) => `<div class="bar" style="height:${40+cant*20}px">${cat}<br>${cant}</div>`).join('');
}

async function loadMovimientos() {
  const movs = await request('/movimientos');
  document.getElementById('tabla-movimientos').innerHTML = movs.map(m => `
    <tr>
      <td>${m.producto}</td><td>${m.tipo}</td><td>${m.cantidad}</td><td>${new Date(m.created_at).toLocaleString()}</td>
    </tr>`).join('');
}

async function loadConsultas() {
  const consultas = await request('/dni/historial');
  document.getElementById('tabla-dni').innerHTML = consultas.map(c => `
    <tr><td>${c.dni}</td><td>${c.nombres}</td><td>${c.apellidos}</td><td>${c.estado}</td><td>${new Date(c.created_at).toLocaleString()}</td></tr>
  `).join('');
}

async function loadUsuarios() {
  if (usuario?.rol !== 'admin') return;
  const users = await request('/usuarios');
  document.getElementById('tabla-usuarios').innerHTML = users.map(u => `
    <tr><td>${u.nombre}</td><td>${u.email}</td><td>${u.usuario}</td><td>${u.rol}</td><td>${u.foto_url || '-'}</td></tr>
  `).join('');
}

async function login() {
  const usuarioField = document.getElementById('login-usuario').value;
  const password = document.getElementById('login-password').value;
  const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: usuarioField, usuario: usuarioField, password }) });
  if (data.token) {
    token = data.token;
    usuario = data.usuario;
    localStorage.setItem('token', token);
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-name').innerText = usuario.nombre;
    document.getElementById('user-role').innerText = usuario.rol;
    if (usuario.rol !== 'admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    await loadProductos();
    await loadMovimientos();
    await loadConsultas();
    await loadUsuarios();
  } else {
    alert(data.message || 'Error de inicio de sesión');
  }
}

function logout() {
  token = null;
  usuario = null;
  localStorage.removeItem('token');
  dashboard.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

async function crearDemoAdmin() {
  const existe = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@local', usuario: 'admin@local', password: 'admin123' }) });
  if (existe.token) return;
  await request('/auth/register', { method: 'POST', body: JSON.stringify({ nombre: 'Administrador', email: 'admin@local', usuario: 'admin', password: 'admin123', rol: 'admin' }) });
}

async function nuevoProducto() {
  const nombre = prompt('Nombre del producto');
  if (!nombre) return;
  const categoria = prompt('Categoría');
  const precio = Number(prompt('Precio')); 
  const stock = Number(prompt('Stock')); 
  const sku = prompt('SKU');
  const proveedor = prompt('Proveedor');
  const fecha_ingreso = prompt('Fecha de ingreso (YYYY-MM-DD)');
  await request('/productos', { method: 'POST', body: JSON.stringify({ nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso }) });
  loadProductos();
}

async function editarProducto(id) {
  const producto = (await request('/productos')).find(p => p.id === id);
  const nombre = prompt('Nombre', producto.nombre);
  if (!nombre) return;
  const categoria = prompt('Categoría', producto.categoria);
  const precio = Number(prompt('Precio', producto.precio));
  const stock = Number(prompt('Stock', producto.stock));
  const sku = prompt('SKU', producto.sku);
  const proveedor = prompt('Proveedor', producto.proveedor);
  const fecha_ingreso = prompt('Fecha de ingreso', producto.fecha_ingreso);
  await request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify({ nombre, categoria, precio, stock, sku, proveedor, fecha_ingreso }) });
  loadProductos();
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar producto?')) return;
  const resp = await fetch(`${API}/productos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (resp.status === 403) return alert('Solo administradores pueden eliminar');
  loadProductos();
}

async function registrarMovimiento() {
  const producto_id = Number(document.getElementById('mov-producto').value);
  const tipo = document.getElementById('mov-tipo').value;
  const cantidad = Number(document.getElementById('mov-cantidad').value);
  const descripcion = document.getElementById('mov-desc').value;
  await request('/movimientos', { method: 'POST', body: JSON.stringify({ producto_id, tipo, cantidad, descripcion }) });
  loadMovimientos();
  loadProductos();
}

async function consultarDni() {
  const dni = document.getElementById('dni-input').value;
  const data = await request('/dni', { method: 'POST', body: JSON.stringify({ dni }) });
  document.getElementById('dni-resultado').innerText = `${data.nombres} ${data.apellidos} (${data.estado})`;
  loadConsultas();
}

async function exportar() {
  const resp = await fetch(`${API}/productos/export/csv`, { headers: { Authorization: `Bearer ${token}` } });
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productos.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPanel(btn.dataset.target));
  });
}

// Eventos
if (document.getElementById('btn-login')) {
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-nuevo').addEventListener('click', nuevoProducto);
  document.getElementById('buscar').addEventListener('input', loadProductos);
  document.getElementById('filtro-categoria').addEventListener('change', loadProductos);
  document.getElementById('filtro-stock').addEventListener('change', loadProductos);
  document.getElementById('btn-mov').addEventListener('click', registrarMovimiento);
  document.getElementById('btn-dni').addEventListener('click', consultarDni);
  document.getElementById('btn-export').addEventListener('click', exportar);
  initNavigation();
}

(async function bootstrap() {
  await crearDemoAdmin();
  if (token) {
    try { await loadProductos(); dashboard.classList.remove('hidden'); loginSection.classList.add('hidden'); } catch (e) { logout(); }
  }
})();
