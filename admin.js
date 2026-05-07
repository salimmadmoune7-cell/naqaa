// admin.js - Naqaa Dashboard — connecté à Supabase

// ============================================
// CONFIG SUPABASE
// ============================================
const SUPABASE_URL = 'https://qruwcmqhlslxueoelffr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_64JA6cYECHd1Jz1ClBdN0A_qU8ofVyI';

async function sbFetch(path, options = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation',
            ...(options.headers || {})
        }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
}

// ============================================
// VÉRIFICATION LOGIN
// ============================================
if (!localStorage.getItem('isAdminLoggedIn')) {
    window.location.href = 'admin-login.html';
}

// ============================================
// ÉTAT GLOBAL
// ============================================
let allOrders = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    loadOrders();
    loadStock();
    showSection('orders');
});

// ============================================
// NAVIGATION
// ============================================
function showSection(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));

    if (section === 'orders') {
        document.getElementById('ordersSection').style.display = 'block';
        document.querySelector('.admin-sidebar a[onclick*="orders"]').classList.add('active');
        loadOrders();
    } else if (section === 'stock') {
        document.getElementById('stockSection').style.display = 'block';
        document.querySelector('.admin-sidebar a[onclick*="stock"]').classList.add('active');
        loadStock();
    } else if (section === 'stats') {
        document.getElementById('statsSection').style.display = 'block';
        document.querySelector('.admin-sidebar a[onclick*="stats"]').classList.add('active');
        updateStats();
    }
}

// ============================================
// COMMANDES
// ============================================
async function loadOrders() {
    const tbody = document.getElementById('ordersBody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;">⏳ Chargement...</td></tr>';

    try {
        allOrders = await sbFetch('orders?select=*&order=created_at.desc');
        renderOrders(allOrders);
        updateStats();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:red;">❌ Erreur: ${err.message}</td></tr>`;
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersBody');

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#aaa;">📦 Aucune commande pour le moment</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong style="color:#7fb069;">${order.order_number}</strong></td>
            <td>${formatDate(order.created_at)}</td>
            <td>${order.nom || '-'}</td>
            <td>${order.tel || '-'}</td>
            <td>${order.wilaya || '-'}</td>
            <td style="text-align:center;">${order.quantite || 1}</td>
            <td><strong>${order.total || '-'}</strong></td>
            <td><span class="status-badge status-${getStatusClass(order.status)}">${order.status}</span></td>
            <td>
                <button onclick="viewOrder('${order.id}')" class="btn-primary" style="padding:5px 10px;font-size:0.85rem;margin-right:5px;">👁️ Voir</button>
                <button onclick="updateOrderStatus('${order.id}')" class="btn-warning" style="padding:5px 10px;font-size:0.85rem;">✏️ Modifier</button>
            </td>
        </tr>
    `).join('');
}

function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusClass(status) {
    const map = {
        'En attente': 'pending',
        'Confirmée': 'confirmed',
        'En livraison': 'shipping',
        'Livrée': 'delivered',
        'Annulée': 'cancelled'
    };
    return map[status] || 'pending';
}

function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchOrder').value.toLowerCase();

    let filtered = allOrders;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
    }
    if (searchTerm) {
        filtered = filtered.filter(o =>
            (o.order_number || '').toLowerCase().includes(searchTerm) ||
            (o.nom || '').toLowerCase().includes(searchTerm) ||
            (o.tel || '').includes(searchTerm)
        );
    }

    renderOrders(filtered);
}

function viewOrder(id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) { alert('Commande introuvable'); return; }

    document.getElementById('orderDetailContent').innerHTML = `
        <div style="text-align:left;">
            <h3 style="color:#7fb069;margin-bottom:20px;">📦 Commande ${order.order_number}</h3>

            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:15px;">
                <h4 style="color:#5a8a5a;margin-bottom:10px;">👤 Client</h4>
                <p><strong>Nom:</strong> ${order.nom || '-'}</p>
                <p><strong>Téléphone:</strong> ${order.tel || '-'}</p>
                <p><strong>Email:</strong> ${order.email || 'Non renseigné'}</p>
            </div>

            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:15px;">
                <h4 style="color:#5a8a5a;margin-bottom:10px;">📦 Produit</h4>
                <p><strong>Produit:</strong> ${order.produit || 'Kit Dentaire Naqaa'}</p>
                <p><strong>Couleur:</strong> ${order.couleur || '-'}</p>
                <p><strong>Quantité:</strong> ${order.quantite || 1}</p>
                <p><strong>Total:</strong> <strong style="color:#7fb069;">${order.total || '-'}</strong></p>
            </div>

            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:15px;">
                <h4 style="color:#5a8a5a;margin-bottom:10px;">🚚 Livraison</h4>
                <p><strong>Type:</strong> ${order.type_livraison || '-'}</p>
                <p><strong>Wilaya:</strong> ${order.wilaya || '-'}</p>
                <p><strong>Commune:</strong> ${order.commune || '-'}</p>
                <p><strong>Adresse:</strong> ${order.adresse || '-'}</p>
            </div>

            <div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:15px;">
                <h4 style="color:#5a8a5a;margin-bottom:10px;">💳 Paiement & Statut</h4>
                <p><strong>Paiement:</strong> ${order.paiement || '-'}</p>
                <p><strong>Statut:</strong> <span class="status-badge status-${getStatusClass(order.status)}">${order.status}</span></p>
                <p><strong>Date:</strong> ${formatDate(order.created_at)}</p>
            </div>

            ${order.notes ? `<div style="background:#fff9e6;padding:15px;border-radius:10px;border-left:4px solid #f0c040;">
                <strong>📝 Notes:</strong> ${order.notes}
            </div>` : ''}

            <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
                <button onclick="updateOrderStatus('${order.id}')" class="btn-primary">✏️ Changer le statut</button>
                <button onclick="printOrder('${order.id}')" class="btn-secondary">🖨️ Imprimer</button>
            </div>
        </div>
    `;
    document.getElementById('orderDetailModal').style.display = 'block';
}

async function updateOrderStatus(id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    const statuts = ['En attente', 'Confirmée', 'En livraison', 'Livrée', 'Annulée'];
    const choix = prompt(
        `Commande: ${order.order_number}\nStatut actuel: ${order.status}\n\nChoisissez le nouveau statut:\n${statuts.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nEntrez le numéro (1-5):`
    );

    if (!choix) return;
    const index = parseInt(choix) - 1;
    if (index < 0 || index >= statuts.length) { alert('Numéro invalide'); return; }

    const newStatus = statuts[index];
    if (newStatus === order.status) { alert('Statut inchangé'); return; }

    try {
        await sbFetch(`orders?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        alert(`✅ Statut mis à jour: ${newStatus}`);
        closeOrderModal();
        loadOrders();
    } catch (err) {
        alert('❌ Erreur: ' + err.message);
    }
}

function printOrder(id) {
    const order = allOrders.find(o => o.id === id);
    if (!order) return;
    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Commande ${order.order_number}</title>
        <style>body{font-family:Arial;padding:20px;} h2{color:#7fb069;} table{width:100%;border-collapse:collapse;} td{padding:8px;border-bottom:1px solid #eee;}</style>
        </head><body>
        <h2>🌿 Naqaa — Commande ${order.order_number}</h2>
        <table>
            <tr><td><strong>Client</strong></td><td>${order.nom}</td></tr>
            <tr><td><strong>Téléphone</strong></td><td>${order.tel}</td></tr>
            <tr><td><strong>Wilaya</strong></td><td>${order.wilaya}</td></tr>
            <tr><td><strong>Commune</strong></td><td>${order.commune}</td></tr>
            <tr><td><strong>Adresse</strong></td><td>${order.adresse}</td></tr>
            <tr><td><strong>Produit</strong></td><td>${order.produit || 'Kit Dentaire Naqaa'} — ${order.couleur}</td></tr>
            <tr><td><strong>Quantité</strong></td><td>${order.quantite}</td></tr>
            <tr><td><strong>Total</strong></td><td><strong>${order.total}</strong></td></tr>
            <tr><td><strong>Livraison</strong></td><td>${order.type_livraison}</td></tr>
            <tr><td><strong>Paiement</strong></td><td>${order.paiement}</td></tr>
            <tr><td><strong>Statut</strong></td><td>${order.status}</td></tr>
            <tr><td><strong>Date</strong></td><td>${formatDate(order.created_at)}</td></tr>
            ${order.notes ? `<tr><td><strong>Notes</strong></td><td>${order.notes}</td></tr>` : ''}
        </table>
        <script>window.print();<\/script>
        </body></html>
    `);
    win.document.close();
}

function closeOrderModal() {
    document.getElementById('orderDetailModal').style.display = 'none';
}

// ============================================
// STOCK
// ============================================
async function loadStock() {
    try {
        const data = await sbFetch('stock?id=eq.1&select=*');
        const stock = data[0]?.quantite ?? 100;
        document.getElementById('currentStock').textContent = stock;

        if (stock < 20) {
            document.getElementById('currentStock').style.color = 'red';
        } else {
            document.getElementById('currentStock').style.color = '';
        }
    } catch (err) {
        console.error('Erreur chargement stock:', err);
    }
}

async function addStock() {
    const qty = parseInt(document.getElementById('stockAdjustment').value);
    if (!qty || qty <= 0) { alert('Entrez une quantité valide'); return; }

    try {
        const data = await sbFetch('stock?id=eq.1&select=quantite');
        const current = data[0]?.quantite ?? 0;
        const newQty = current + qty;

        await sbFetch('stock?id=eq.1', {
            method: 'PATCH',
            body: JSON.stringify({ quantite: newQty, updated_at: new Date().toISOString() })
        });

        document.getElementById('stockAdjustment').value = '';
        loadStock();
        alert(`✅ +${qty} unités ajoutées. Nouveau stock: ${newQty}`);
    } catch (err) {
        alert('❌ Erreur: ' + err.message);
    }
}

async function removeStock() {
    const qty = parseInt(document.getElementById('stockAdjustment').value);
    if (!qty || qty <= 0) { alert('Entrez une quantité valide'); return; }

    try {
        const data = await sbFetch('stock?id=eq.1&select=quantite');
        const current = data[0]?.quantite ?? 0;

        if (qty > current) {
            alert(`❌ Stock insuffisant! Stock actuel: ${current}`);
            return;
        }

        const newQty = current - qty;
        await sbFetch('stock?id=eq.1', {
            method: 'PATCH',
            body: JSON.stringify({ quantite: newQty, updated_at: new Date().toISOString() })
        });

        document.getElementById('stockAdjustment').value = '';
        loadStock();

        if (newQty < 20) {
            alert(`⚠️ -${qty} unités retirées. Nouveau stock: ${newQty}\n⚠️ ATTENTION: Stock faible!`);
        } else {
            alert(`✅ -${qty} unités retirées. Nouveau stock: ${newQty}`);
        }
    } catch (err) {
        alert('❌ Erreur: ' + err.message);
    }
}

// ============================================
// STATISTIQUES
// ============================================
function updateStats() {
    if (!allOrders || allOrders.length === 0) {
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('totalRevenue').textContent = '0 DA';
        document.getElementById('pendingOrders').textContent = '0';
        document.getElementById('deliveredOrders').textContent = '0';
        displayWilayaChart({});
        return;
    }

    document.getElementById('totalOrders').textContent = allOrders.length;

    const revenue = allOrders
        .filter(o => o.status !== 'Annulée')
        .reduce((sum, o) => {
            const amount = parseInt((o.total || '0').replace(/\D/g, ''));
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    document.getElementById('totalRevenue').textContent = revenue.toLocaleString('fr-FR') + ' DA';

    document.getElementById('pendingOrders').textContent =
        allOrders.filter(o => o.status === 'En attente').length;

    document.getElementById('deliveredOrders').textContent =
        allOrders.filter(o => o.status === 'Livrée').length;

    const wilayaCount = {};
    allOrders.forEach(o => {
        if (o.status !== 'Annulée' && o.wilaya) {
            wilayaCount[o.wilaya] = (wilayaCount[o.wilaya] || 0) + 1;
        }
    });
    displayWilayaChart(wilayaCount);
}

function displayWilayaChart(data) {
    const chartDiv = document.getElementById('wilayaChart');
    if (Object.keys(data).length === 0) {
        chartDiv.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px;">📊 Aucune donnée disponible</p>';
        return;
    }
    const maxVal = Math.max(...Object.values(data));
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    chartDiv.innerHTML = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .map(([wilaya, count]) => {
            const pct = ((count / maxVal) * 100).toFixed(0);
            const pctTotal = ((count / total) * 100).toFixed(1);
            return `
                <div style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <strong>${wilaya}</strong>
                        <span style="color:#aaa;">${count} commande(s) (${pctTotal}%)</span>
                    </div>
                    <div style="background:#eee;height:28px;border-radius:5px;overflow:hidden;">
                        <div style="background:linear-gradient(90deg,#7fb069,#5a8a5a);width:${pct}%;height:100%;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;">
                            <span style="color:white;font-weight:bold;font-size:0.85rem;">${count}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
}

// ============================================
// EXPORT CSV
// ============================================
function exportOrdersToCSV() {
    if (!allOrders || allOrders.length === 0) { alert('Aucune commande à exporter'); return; }

    let csv = 'N° Commande,Date,Client,Téléphone,Email,Wilaya,Commune,Adresse,Type Livraison,Paiement,Quantité,Total,Statut,Notes\n';
    allOrders.forEach(o => {
        csv += `${o.order_number},${formatDate(o.created_at)},"${o.nom || ''}","${o.tel || ''}","${o.email || ''}","${o.wilaya || ''}","${o.commune || ''}","${o.adresse || ''}","${o.type_livraison || ''}","${o.paiement || ''}",${o.quantite || ''},"${o.total || ''}","${o.status || ''}","${o.notes || ''}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_naqaa_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`;
    link.click();
}

// ============================================
// DÉCONNEXION
// ============================================
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
        localStorage.removeItem('isAdminLoggedIn');
        window.location.href = 'admin-login.html';
    }
}

// ============================================
// ÉVÉNEMENTS GLOBAUX
// ============================================
window.onclick = function (event) {
    const modal = document.getElementById('orderDetailModal');
    if (event.target === modal) closeOrderModal();
};

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeOrderModal();
});

// Auto-refresh toutes les 60 secondes
setInterval(() => {
    const visible = document.querySelector('.admin-section:not([style*="display: none"])');
    if (visible?.id === 'ordersSection') loadOrders();
}, 60000);

console.log('%c🌿 Naqaa Admin — Supabase Connected', 'color:#7fb069;font-size:16px;font-weight:bold;');