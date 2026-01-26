
// Initialize Supabase Client
const SUPABASE_URL = 'https://hjyacgotqmapwskzkfpu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeWFjZ290cW1hcHdza3prZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMjAzOTQsImV4cCI6MjA4MTY5NjM5NH0.HX-K0lpOmGKj508MSg3LTF7Y-9r_LB62TJkb_rdgsx4';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Chart Instances
let chartForecast = null;
let chartContacts = null;

document.addEventListener('DOMContentLoaded', () => {
    // Dashboard Initialized

    // Default View
    switchView('dashboard');
});

// --- Navigation ---
window.switchView = function (viewName) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Show target section
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('hidden');

        // Load data for view
        if (viewName === 'dashboard') loadDashboard();
        if (viewName === 'contacts') loadContacts();
        if (viewName === 'reservations') loadReservations();
        if (viewName === 'payments') loadPayments();
    }

    // Update Sidebar state
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-slate-800', 'text-white');
        el.classList.add('text-slate-300');
    });
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) {
        activeNav.classList.add('bg-slate-800', 'text-white');
        activeNav.classList.remove('text-slate-300');
    }
}

// --- Dashboard Logic ---
window.loadDashboard = async function () {
    if (!supabase) return;

    // 1. Fetch Metrics (RPC)
    const { data: stats, error } = await supabase.rpc('get_dashboard_stats');

    if (!error && stats) {
        document.getElementById('metric-revenue').textContent = `S/ ${stats.revenue}`;
        document.getElementById('metric-conversion').textContent = `${stats.tourists} / ${stats.leads}`;
        document.getElementById('metric-top-tour').textContent = stats.top_tour;
        document.getElementById('metric-top-origin').textContent = stats.top_origin;
    }

    // 2. Fetch Forecast Graph (RPC)
    const { data: forecastData } = await supabase.rpc('get_operational_forecast');
    renderForecastChart(forecastData || []);

    // 3. Fetch Contacts Evolution (RPC)
    const { data: contactsData } = await supabase.rpc('get_contacts_evolution');
    renderContactsChart(contactsData || []);
}

function renderForecastChart(data) {
    const ctx = document.getElementById('chartForecast').getContext('2d');

    if (chartForecast) chartForecast.destroy();

    chartForecast = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'PAX Estimados',
                data: data.map(d => d.total_pax),
                backgroundColor: '#059669', // emerald-600
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderContactsChart(data) {
    const ctx = document.getElementById('chartContacts').getContext('2d');

    if (chartContacts) chartContacts.destroy();

    chartContacts = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Nuevos Contactos',
                data: data.map(d => d.count),
                borderColor: '#4f46e5', // indigo-600
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- Contacts Logic ---
window.loadContacts = async function () {
    if (!supabase) {
        console.error("Supabase client not initialized");
        return;
    }

    const tbody = document.getElementById('table-contacts-body');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">Cargando...</td></tr>';

    try {
        const { data, error } = await supabase
            .from('contactos')
            .select('*')
            .order('creado_en', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No hay contactos registrados aun.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-medium text-slate-900">${c.nombre_completo}</td>
                <td class="px-6 py-4">${c.whatsapp}</td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-800">${c.ciudad || '-'}</div>
                    <div class="text-xs text-slate-500">${c.fuente || 'Desconocido'}</div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${c.estado === 'Cliente' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                        ${c.estado}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="text-slate-400 hover:text-emerald-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Error loading contacts:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error: ${err.message}</td></tr>`;
    }
}

// --- Reservations Logic ---
window.loadReservations = async function () {
    const tbody = document.getElementById('table-reservations-body');
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center">Cargando...</td></tr>';

    const { data, error } = await supabase
        .from('reservas')
        .select(`
            id,
            PAX,
            fecha_reserva,
            monto_total,
            estado,
            estado_pago,
            contactos(nombre_completo),
            tours(nombre)
        `)
        .order('fecha_reserva', { ascending: true });

    if (error || !data) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Error al cargar</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(r => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-medium text-slate-900">${r.contactos?.nombre_completo || 'Desconocido'}</td>
            <td class="px-6 py-4 text-xs">${r.tours?.nombre || 'Tour eliminado'}</td>
            <td class="px-6 py-4 text-center">${r.PAX}</td>
            <td class="px-6 py-4 text-center">${r.fecha_reserva}</td>
            <td class="px-6 py-4 text-right font-medium">S/ ${r.monto_total}</td>
            <td class="px-6 py-4 text-center">
                 <span class="px-2 py-1 rounded-full text-xs font-semibold ${r.estado_pago === 'Pagado' ? 'bg-emerald-100 text-emerald-700' :
            r.estado_pago === 'Parcial' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
        }">
                    ${r.estado_pago}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${r.estado === 'Confirmada' ? 'bg-emerald-100 text-emerald-800' :
            r.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-800'
        }">
                    ${r.estado}
                </span>
            </td>
        </tr>
    `).join('');
}

// --- Payments Logic ---
window.loadPayments = async function () {
    const tbody = document.getElementById('table-payments-body');
    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">Cargando...</td></tr>';

    const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .order('fecha_pago', { ascending: false });

    if (error || !data) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Error al cargar</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 text-xs font-mono text-slate-500">${p.reserva_id.split('-')[0]}...</td>
            <td class="px-6 py-4 font-bold text-slate-700">S/ ${p.monto}</td>
            <td class="px-6 py-4">${p.metodo_pago}</td>
            <td class="px-6 py-4 text-slate-500 text-xs">${p.fecha_pago}</td>
        </tr>
    `).join('');
}

// --- Save Contact Logic ---
window.saveContact = async function () {
    const name = document.getElementById('inp-c-name').value.trim();
    const phone = document.getElementById('inp-c-phone').value.trim();
    const dni = document.getElementById('inp-c-dni').value.trim() || null;
    const city = document.getElementById('inp-c-city').value;
    const source = document.getElementById('inp-c-source').value;
    const status = document.getElementById('inp-c-status').value;

    if (!name || !phone) {
        alert("Nombre y Whatsapp son obligatorios");
        return;
    }

    if (!phone.startsWith('+')) {
        alert("El WhatsApp debe empezar con + (Ej: +51...)");
        return;
    }

    // Generate ID (Legacy Composite Style or let DB handle it? 
    // Schema says ID is TEXT PRIMARY KEY. If we don't provide it, it fails unless we changed default.
    // User wants UUIDs now. But if schema is still TEXT PK without Default, we MUST provide it.
    // Wait, the new row had a UUID. How? 
    // If I Insert without ID, does it auto-gen?
    // Let's try inserting WITHOUT ID first. If schema has no default, it will fail.
    // Actually, I can generate a UUID here or use the legacy ID. 
    // User liked the UUIDs. I'll NOT send 'id' and let Supabase generate it (if configured)
    // OR I generate a simple UUID here to be safe.
    // crypto.randomUUID() is available in browsers.
    const id = crypto.randomUUID();

    const { error } = await supabase
        .from('contactos')
        .insert({
            id: id,
            nombre_completo: name,
            whatsapp: phone,
            dni: dni,
            ciudad: city,
            fuente: source,
            estado: status
        });

    if (error) {
        alert("Error al guardar: " + error.message);
        console.error(error);
    } else {
        closeModal('contact');
        loadContacts();
        // Clear form
        document.getElementById('inp-c-name').value = '';
        document.getElementById('inp-c-phone').value = '';
        document.getElementById('inp-c-dni').value = '';
    }
}

// --- Modal Logic ---
window.openModal = function (modalName) {
    const modal = document.getElementById(`modal-${modalName}`);
    if (modal) modal.classList.remove('hidden');
}

window.closeModal = function (modalName) {
    const modal = document.getElementById(`modal-${modalName}`);
    if (modal) modal.classList.add('hidden');
}

window.openContactModal = function () {
    // Clear fields
    document.getElementById('inp-c-id').value = '';
    document.getElementById('inp-c-name').value = '';
    document.getElementById('inp-c-phone').value = '';
    document.getElementById('inp-c-dni').value = '';
    document.getElementById('inp-c-city').value = 'Lima'; // Default
    document.getElementById('inp-c-source').value = 'Dashboard'; // Default

    document.getElementById('lbl-contact-modal-title').innerText = 'Nuevo Contacto';
    openModal('contact');
}
