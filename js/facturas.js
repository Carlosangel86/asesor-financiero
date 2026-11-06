// ===== MÓDULO ADMINISTRATIVO DE FACTURAS SIMULADAS (js/facturas.js) =====
// Permite consultar comprobantes emitidos, buscar por folio/RFC/UUID, revisar estados,
// descargar representaciones PDF/XML y simular cancelaciones administrativas.

let adminInvoicesCache = [];
let adminInvoiceStatusFilter = 'all';

function setAdminInvoiceFilter(status) {
    adminInvoiceStatusFilter = status || 'all';
    ['all', 'active', 'cancelled'].forEach(key => {
        const btn = document.getElementById(`btn-inv-filter-${key}`);
        if (!btn) return;
        if (key === adminInvoiceStatusFilter) {
            btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 transition';
        } else {
            btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white transition';
        }
    });
    renderAdminInvoicesTable();
}

async function renderAdminInvoicesView() {
    if (!window.InvoiceService) return;
    try {
        // Sembrar configuración fiscal básica si es necesario
        if (typeof window.InvoiceService.ensureFiscalCollectionsSeeded === 'function') {
            window.InvoiceService.ensureFiscalCollectionsSeeded().catch(() => {});
        }
        adminInvoicesCache = await window.InvoiceService.getAllInvoices();
    } catch (e) {
        console.warn('[Facturas Admin] Error obteniendo facturas:', e);
    }

    updateAdminInvoicesKpis();
    renderAdminInvoicesTable();
}

function updateAdminInvoicesKpis() {
    const totalCount = adminInvoicesCache.length;
    const activeList = adminInvoicesCache.filter(inv => inv.status !== 'cancelled');
    const cancelledList = adminInvoicesCache.filter(inv => inv.status === 'cancelled');
    const totalInvoicedAmount = activeList.reduce((acc, inv) => acc + Number(inv.total || 0), 0);

    const elTotal = document.getElementById('inv-kpi-total');
    const elActive = document.getElementById('inv-kpi-active');
    const elCancelled = document.getElementById('inv-kpi-cancelled');
    const elAmount = document.getElementById('inv-kpi-amount');

    if (elTotal) elTotal.textContent = String(totalCount);
    if (elActive) elActive.textContent = String(activeList.length);
    if (elCancelled) elCancelled.textContent = String(cancelledList.length);
    if (elAmount) elAmount.textContent = typeof fmt === 'function' ? fmt(totalInvoicedAmount) : ('$' + totalInvoicedAmount.toFixed(2));
}

function renderAdminInvoicesTable() {
    const listContainer = document.getElementById('admin-invoices-list');
    const countBadge = document.getElementById('admin-invoices-count');
    if (!listContainer) return;

    const queryRaw = (document.getElementById('inv-search-input')?.value || '').trim().toLowerCase();

    const filtered = adminInvoicesCache.filter(inv => {
        if (adminInvoiceStatusFilter === 'active' && inv.status === 'cancelled') return false;
        if (adminInvoiceStatusFilter === 'cancelled' && inv.status !== 'cancelled') return false;

        if (!queryRaw) return true;
        const folio = String(inv.folioCompleto || `${inv.serie || 'FA'}-${inv.folio || ''}`).toLowerCase();
        const uuid = String(inv.uuidSimulado || '').toLowerCase();
        const saleId = String(inv.saleId || '').toLowerCase();
        const token = String(inv.invoiceToken || '').toLowerCase();
        const rfc = String((inv.receptor && inv.receptor.rfc) || '').toLowerCase();
        const nombre = String((inv.receptor && inv.receptor.nombre) || '').toLowerCase();

        return folio.includes(queryRaw) ||
               uuid.includes(queryRaw) ||
               saleId.includes(queryRaw) ||
               token.includes(queryRaw) ||
               rfc.includes(queryRaw) ||
               nombre.includes(queryRaw);
    });

    if (countBadge) {
        countBadge.textContent = `${filtered.length} comprobante(s)`;
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10 px-4 bg-slate-900/40 rounded-xl border border-slate-800/70 text-slate-400 text-xs space-y-2">
                <i data-lucide="file-Spreadsheet" class="w-8 h-8 mx-auto text-slate-600"></i>
                <div class="font-semibold text-slate-300">No se encontraron comprobantes fiscales simulados</div>
                <p class="text-[11px] text-slate-500 max-w-md mx-auto">
                    Las facturas generadas desde el Portal de Autofacturación (<span class="mono text-sky-400">facturacion.html</span>) o mediante el código QR de los tickets aparecerán aquí automáticamente.
                </p>
            </div>
        `;
        if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
        return;
    }

    const canCancelInvoice = typeof hasPermission === 'function'
        ? (hasPermission('sales.cancel_direct') || hasPermission('sales.approve_cancel') || (typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor')))
        : true;

    listContainer.innerHTML = filtered.map(inv => {
        const isCancelled = inv.status === 'cancelled';
        const folioStr = inv.folioCompleto || `${inv.serie || 'FA'}-${inv.folio || '0001'}`;
        const rec = inv.receptor || {};
        const dateStr = typeof formatAppDate === 'function'
            ? formatAppDate(inv.issuedAt)
            : new Date(inv.issuedAt || Date.now()).toLocaleString('es-MX');
        const totalFormatted = typeof fmt === 'function' ? fmt(inv.total || 0) : ('$' + Number(inv.total || 0).toFixed(2));
        const subFormatted = typeof fmt === 'function' ? fmt(inv.subtotal || 0) : ('$' + Number(inv.subtotal || 0).toFixed(2));
        const ivaFormatted = typeof fmt === 'function' ? fmt(inv.totalImpuestosTrasladados || 0) : ('$' + Number(inv.totalImpuestosTrasladados || 0).toFixed(2));

        const statusBadge = isCancelled
            ? `<span class="pill bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9.5px] font-bold flex items-center gap-1"><i data-lucide="ban" class="w-2.5 h-2.5"></i>CANCELADA</span>`
            : `<span class="pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-[9.5px] font-bold flex items-center gap-1"><i data-lucide="check-circle" class="w-2.5 h-2.5"></i>ACTIVA</span>`;

        const cancelBtn = (!isCancelled && canCancelInvoice)
            ? `<button type="button" onclick="promptAdminCancelInvoice('${inv.id}')" class="pos-btn bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] py-1.5 px-2.5 flex items-center gap-1" title="Simular Cancelación de Factura">
                   <i data-lucide="x-circle" class="w-3.5 h-3.5"></i><span>Cancelar</span>
               </button>`
            : '';

        return `
            <div class="pos-row flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 ${isCancelled ? 'opacity-70 bg-slate-900/40' : ''}">
                <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-white text-sm mono">${folioStr}</span>
                        ${statusBadge}
                        <span class="pill bg-slate-800 text-sky-300 border border-slate-700 text-[9.5px] font-mono">RFC: ${rec.rfc || 'XAXX010101000'}</span>
                        <span class="pill bg-slate-900 text-slate-400 border border-slate-800 text-[9.5px] font-mono">Ticket: #${inv.saleId || 'N/A'}</span>
                        <span class="pill bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[8.5px] font-bold">SIMULACIÓN SIN VALIDEZ FISCAL</span>
                    </div>
                    <div class="text-xs text-slate-200 font-medium truncate">
                        ${rec.nombre || 'PÚBLICO EN GENERAL'}
                        <span class="text-slate-400 font-normal"> · C.P. ${rec.codigoPostal || '56100'} · Régimen ${rec.regimenFiscal || '616'} · Uso ${rec.usoCfdi || 'S01'}</span>
                    </div>
                    <div class="flex items-center gap-3 text-[10.5px] text-slate-400 flex-wrap mono">
                        <span>UUID: <b class="text-slate-300">${inv.uuidSimulado || '—'}</b></span>
                        <span>Emisión: ${dateStr}</span>
                        <span>Subtotal: ${subFormatted} · IVA: ${ivaFormatted}</span>
                    </div>
                    ${isCancelled ? `<div class="text-[10px] text-rose-400 font-medium">Motivo de cancelación: ${inv.cancelReason || '02 - Comprobante emitido con errores sin relación'} (${inv.cancelledBy || 'admin'})</div>` : ''}
                </div>
                <div class="flex items-center gap-2 shrink-0 flex-wrap">
                    <div class="text-right mr-2">
                        <div class="text-[9.5px] text-slate-400 uppercase font-bold">Total CFDI</div>
                        <div class="text-sm font-bold mono ${isCancelled ? 'line-through text-slate-500' : 'text-emerald-400'}">${totalFormatted}</div>
                    </div>
                    <button type="button" onclick="adminDownloadInvoicePdf('${inv.id}')" class="pos-btn bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-[11px] py-1.5 px-2.5 flex items-center gap-1" title="Descargar PDF de Simulación">
                        <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i><span>PDF</span>
                    </button>
                    <button type="button" onclick="adminDownloadInvoiceXml('${inv.id}')" class="pos-btn bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] py-1.5 px-2.5 flex items-center gap-1" title="Descargar XML de Simulación">
                        <i data-lucide="code-2" class="w-3.5 h-3.5 text-sky-400"></i><span>XML</span>
                    </button>
                    ${cancelBtn}
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

async function adminDownloadInvoicePdf(invoiceId) {
    const inv = adminInvoicesCache.find(x => x.id === invoiceId);
    if (!inv) {
        alert('Comprobante no encontrado.');
        return;
    }
    try {
        await window.PdfGenerator.generateInvoicePdf(inv, { download: true });
    } catch (e) {
        alert('Error al descargar el PDF: ' + e.message);
    }
}

function adminDownloadInvoiceXml(invoiceId) {
    const inv = adminInvoicesCache.find(x => x.id === invoiceId);
    if (!inv) {
        alert('Comprobante no encontrado.');
        return;
    }
    try {
        window.XmlGenerator.downloadInvoiceXml(inv);
    } catch (e) {
        alert('Error al descargar el XML: ' + e.message);
    }
}

async function promptAdminCancelInvoice(invoiceId) {
    const inv = adminInvoicesCache.find(x => x.id === invoiceId);
    if (!inv) return;

    const folioStr = inv.folioCompleto || `${inv.serie || 'FA'}-${inv.folio || '0001'}`;
    const motivo = prompt(
        `Simular Cancelación Administrativa del Comprobante ${folioStr}\n` +
        `Receptor: ${inv.receptor ? inv.receptor.rfc : ''} (${inv.receptor ? inv.receptor.nombre : ''})\n\n` +
        `Ingresa la clave y motivo de cancelación SAT:\n` +
        `• 01 - Comprobante emitido con errores con relación\n` +
        `• 02 - Comprobante emitido con errores sin relación\n` +
        `• 03 - No se llevó a cabo la operación\n` +
        `• 04 - Operación nominativa relacionada en una factura global`,
        '02 - Comprobante emitido con errores sin relación'
    );

    if (motivo === null) return;
    const reasonClean = motivo.trim() || '02 - Comprobante emitido con errores sin relación';
    const actor = (typeof currentUser !== 'undefined' && currentUser && currentUser.username)
        ? `@${currentUser.username}`
        : 'admin';

    try {
        await window.InvoiceService.cancelSimulatedInvoice(invoiceId, reasonClean, actor);
        if (typeof logActivity === 'function') {
            logActivity('Factura Simulada Cancelada', `Comprobante ${folioStr} (Venta #${inv.saleId}) cancelado por ${actor}. Motivo: ${reasonClean}`, 'warn');
        }
        if (typeof showGlobalToast === 'function') {
            showGlobalToast(`✓ Comprobante ${folioStr} marcado como CANCELADO.`, 'info');
        }
        await renderAdminInvoicesView();
        if (typeof upPosSummary === 'function') upPosSummary();
    } catch (e) {
        alert('No fue posible cancelar la factura: ' + e.message);
    }
}

// Suscripción en tiempo real a nuevas facturas en Firestore cuando el POS está abierto
window.addEventListener('firebase-initialized', () => {
    if (window.FirebaseService && window.FirebaseService.invoices) {
        window.FirebaseService.invoices.subscribe((updatedList) => {
            if (Array.isArray(updatedList)) {
                adminInvoicesCache = updatedList;
                const panel = document.getElementById('pos-panel-invoices');
                if (panel && !panel.classList.contains('hidden')) {
                    updateAdminInvoicesKpis();
                    renderAdminInvoicesTable();
                }
            }
        });
    }
});
