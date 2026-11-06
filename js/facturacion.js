// ===== CONTROLADOR DEL PORTAL PÚBLICO DE AUTOFACTURACIÓN (facturacion.js) =====
// Gestiona la búsqueda de ticket por Token/Folio, validación post-interacción y descarga de PDF/XML
// DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL

let currentPortalSale = null;
let currentPortalInvoice = null;
const touchedFields = new Set();

function fmtCurrency(n) {
    const num = Number(n || 0);
    return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setLookupStatus(message, type = 'info') {
    const box = document.getElementById('lookup-status-box');
    if (!box) return;
    if (!message) {
        box.classList.add('hidden');
        return;
    }
    box.classList.remove('hidden');
    if (type === 'error') {
        box.className = 'mt-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-rose-500/15 border border-rose-500/35 text-rose-200';
        box.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400 shrink-0"></i><span>${message}</span>`;
    } else if (type === 'success') {
        box.className = 'mt-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/35 text-emerald-200';
        box.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0"></i><span>${message}</span>`;
    } else {
        box.className = 'mt-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-sky-500/15 border border-sky-500/35 text-sky-200';
        box.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 text-sky-400 shrink-0 animate-spin"></i><span>${message}</span>`;
    }
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function populateRegimenSelect(rfcType, preserveValue = '') {
    const sel = document.getElementById('fiscal-regimen');
    if (!sel || !window.ValidationService) return;
    const list = window.ValidationService.getCompatibleRegimenes(rfcType);
    const currentVal = preserveValue || sel.value;

    sel.innerHTML = `<option value="">— Selecciona un Régimen Fiscal (${list.length} disponibles) —</option>` +
        list.map(r => `<option value="${r.code}">${r.code} - ${r.name}</option>`).join('');

    if (currentVal && list.some(r => r.code === currentVal)) {
        sel.value = currentVal;
    }
    populateUsoCfdiSelect(rfcType, sel.value);
}

function populateUsoCfdiSelect(rfcType, regimenCode, preserveValue = '') {
    const sel = document.getElementById('fiscal-uso');
    if (!sel || !window.ValidationService) return;
    const list = window.ValidationService.getCompatibleUsosCfdi(rfcType, regimenCode);
    const currentVal = preserveValue || sel.value;

    sel.innerHTML = `<option value="">— Selecciona el Uso del CFDI (${list.length} compatibles) —</option>` +
        list.map(u => `<option value="${u.code}">${u.code} - ${u.name}</option>`).join('');

    if (currentVal && list.some(u => u.code === currentVal)) {
        sel.value = currentVal;
    } else if (list.some(u => u.code === 'G03')) {
        sel.value = 'G03';
    }
}

function onRfcInputChange() {
    const input = document.getElementById('fiscal-rfc');
    const badge = document.getElementById('rfc-person-type-badge');
    if (!input || !window.ValidationService) return;

    const clean = window.ValidationService.sanitizeRfc(input.value);
    if (input.value !== clean) {
        input.value = clean;
    }

    const res = window.ValidationService.validateRfc(clean);
    if (badge) {
        if (clean.length === 12) {
            badge.classList.remove('hidden');
            badge.textContent = 'Persona Moral (12 car.)';
            populateRegimenSelect('moral');
        } else if (clean.length === 13) {
            badge.classList.remove('hidden');
            badge.textContent = res.type === 'generico' ? 'RFC Genérico' : 'Persona Física (13 car.)';
            populateRegimenSelect(res.type === 'generico' ? 'generico' : 'fisica');
        } else {
            badge.classList.add('hidden');
            populateRegimenSelect(null);
        }
    }

    if (touchedFields.has('rfc')) {
        validateSingleFieldOnBlur('rfc');
    }
}

function onRegimenChange() {
    const rfcInput = document.getElementById('fiscal-rfc');
    const regSelect = document.getElementById('fiscal-regimen');
    if (!regSelect || !window.ValidationService) return;
    const rfcRes = window.ValidationService.validateRfc(rfcInput ? rfcInput.value : '');
    populateUsoCfdiSelect(rfcRes.type, regSelect.value);

    if (touchedFields.has('regimenFiscal')) {
        validateSingleFieldOnBlur('regimenFiscal');
    }
}

function fillPublicoEnGeneral() {
    const rfcEl = document.getElementById('fiscal-rfc');
    const nomEl = document.getElementById('fiscal-nombre');
    const cpEl = document.getElementById('fiscal-cp');
    const regEl = document.getElementById('fiscal-regimen');
    const usoEl = document.getElementById('fiscal-uso');

    if (rfcEl) rfcEl.value = 'XAXX010101000';
    if (nomEl) nomEl.value = 'PÚBLICO EN GENERAL';
    if (cpEl) cpEl.value = '56100';

    populateRegimenSelect('generico', '616');
    if (regEl) regEl.value = '616';
    populateUsoCfdiSelect('generico', '616', 'S01');
    if (usoEl) usoEl.value = 'S01';

    ['rfc', 'nombre', 'codigoPostal', 'regimenFiscal', 'usoCfdi'].forEach(f => clearFieldError(f));
}

function getFieldDomMap(fieldName) {
    const map = {
        rfc: { inputId: 'fiscal-rfc', errId: 'err-fiscal-rfc' },
        nombre: { inputId: 'fiscal-nombre', errId: 'err-fiscal-nombre' },
        codigoPostal: { inputId: 'fiscal-cp', errId: 'err-fiscal-cp' },
        email: { inputId: 'fiscal-email', errId: 'err-fiscal-email' },
        regimenFiscal: { inputId: 'fiscal-regimen', errId: 'err-fiscal-regimen' },
        usoCfdi: { inputId: 'fiscal-uso', errId: 'err-fiscal-uso' }
    };
    return map[fieldName] || null;
}

function showFieldError(fieldName, message) {
    const dom = getFieldDomMap(fieldName);
    if (!dom) return;
    const input = document.getElementById(dom.inputId);
    const errEl = document.getElementById(dom.errId);
    if (input) {
        input.classList.add('user-invalid-fallback');
        input.setAttribute('aria-invalid', 'true');
    }
    if (errEl) {
        errEl.textContent = message;
        errEl.classList.add('visible');
    }
}

function clearFieldError(fieldName) {
    const dom = getFieldDomMap(fieldName);
    if (!dom) return;
    const input = document.getElementById(dom.inputId);
    const errEl = document.getElementById(dom.errId);
    if (input) {
        input.classList.remove('user-invalid-fallback');
        input.removeAttribute('aria-invalid');
    }
    if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('visible');
    }
}

function getCurrentFormValues() {
    return {
        rfc: (document.getElementById('fiscal-rfc')?.value || '').trim(),
        nombre: (document.getElementById('fiscal-nombre')?.value || '').trim(),
        codigoPostal: (document.getElementById('fiscal-cp')?.value || '').trim(),
        email: (document.getElementById('fiscal-email')?.value || '').trim(),
        regimenFiscal: (document.getElementById('fiscal-regimen')?.value || '').trim(),
        usoCfdi: (document.getElementById('fiscal-uso')?.value || '').trim()
    };
}

function validateSingleFieldOnBlur(fieldName) {
    touchedFields.add(fieldName);
    if (!window.ValidationService) return true;
    const vals = getCurrentFormValues();

    if (fieldName === 'rfc') {
        const r = window.ValidationService.validateRfc(vals.rfc);
        if (!r.valid) { showFieldError('rfc', r.message); return false; }
        clearFieldError('rfc');
        return true;
    }
    if (fieldName === 'nombre') {
        const r = window.ValidationService.validateRazonSocial(vals.nombre);
        if (!r.valid) { showFieldError('nombre', r.message); return false; }
        clearFieldError('nombre');
        return true;
    }
    if (fieldName === 'codigoPostal') {
        const r = window.ValidationService.validatePostalCode(vals.codigoPostal);
        if (!r.valid) { showFieldError('codigoPostal', r.message); return false; }
        clearFieldError('codigoPostal');
        return true;
    }
    if (fieldName === 'email') {
        const r = window.ValidationService.validateEmailOptional(vals.email);
        if (!r.valid) { showFieldError('email', r.message); return false; }
        clearFieldError('email');
        return true;
    }
    if (fieldName === 'regimenFiscal' || fieldName === 'usoCfdi') {
        const r = window.ValidationService.validateRegimenAndUso(vals.rfc, vals.regimenFiscal, vals.usoCfdi);
        if (!r.valid && r.field === fieldName) {
            showFieldError(fieldName, r.message);
            return false;
        }
        clearFieldError(fieldName);
        return true;
    }
    return true;
}

function renderSaleSummary(sale) {
    const workspace = document.getElementById('billing-workspace');
    if (workspace) workspace.classList.remove('hidden');

    const taxBreakdown = window.TaxEngine ? window.TaxEngine.calculateInvoiceTaxes(sale) : null;

    document.getElementById('summary-sale-id').textContent = sale.id || '—';
    document.getElementById('summary-sale-token').textContent = sale.invoiceToken || '—';
    document.getElementById('summary-sale-date').textContent = sale.date ? new Date(sale.date).toLocaleString('es-MX') : '—';
    document.getElementById('summary-sale-payment').textContent = taxBreakdown ? taxBreakdown.formaPagoDesc : '01 - Efectivo';

    const itemsContainer = document.getElementById('summary-items-list');
    if (itemsContainer && taxBreakdown) {
        itemsContainer.innerHTML = taxBreakdown.conceptos.map(c => `
            <div class="py-2 flex items-start justify-between gap-2 text-xs">
                <div class="min-w-0 flex-1">
                    <div class="font-semibold text-white truncate">${c.descripcion}</div>
                    <div class="text-[10.5px] text-slate-400 mono">
                        Cant: <b>${c.cantidad}</b> · ClaveSAT: ${c.claveProdServ} · V.Unit: ${fmtCurrency(c.valorUnitario)} + IVA (${c.impuesto.tasaPct}%)
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <div class="mono font-bold text-slate-200">${fmtCurrency(c.importeBase)}</div>
                    <div class="text-[10px] text-slate-400 mono">c/IVA: ${fmtCurrency(c.totalConcepto)}</div>
                </div>
            </div>
        `).join('');
    }

    if (taxBreakdown) {
        document.getElementById('summary-subtotal').textContent = fmtCurrency(taxBreakdown.subtotal);
        document.getElementById('summary-tax-label').textContent = `IVA Trasladado (${taxBreakdown.tasaGlobalPct}%):`;
        document.getElementById('summary-tax').textContent = fmtCurrency(taxBreakdown.totalImpuestosTrasladados);
        document.getElementById('summary-total').textContent = fmtCurrency(taxBreakdown.total);
        document.getElementById('summary-total-letras').textContent = window.TaxEngine.numeroALetrasMXN(taxBreakdown.total);
    }
}

function renderInvoiceResult(invoice) {
    currentPortalInvoice = invoice;

    const formCard = document.getElementById('billing-form-card');
    const resultCard = document.getElementById('invoice-result-card');
    const pill = document.getElementById('sale-status-pill');

    if (formCard) formCard.classList.add('hidden');
    if (resultCard) resultCard.classList.remove('hidden');

    if (pill) {
        pill.className = 'pill bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 text-[10px] font-bold';
        pill.textContent = 'FACTURADA';
    }

    const folioCompleto = invoice.folioCompleto || `${invoice.serie || 'FA'}-${invoice.folio || '0001'}`;
    document.getElementById('res-invoice-title').textContent = `Comprobante Fiscal Simulado ${folioCompleto}`;
    document.getElementById('res-folio').textContent = folioCompleto;
    document.getElementById('res-uuid').textContent = invoice.uuidSimulado || '—';

    const rec = invoice.receptor || {};
    document.getElementById('res-receptor').textContent = `${rec.rfc || ''} — ${rec.nombre || ''} (C.P. ${rec.codigoPostal || ''})`;
    document.getElementById('res-regimen-uso').textContent = `Régimen ${rec.regimenFiscal || ''} · Uso ${rec.usoCfdi || ''}`;
    document.getElementById('res-issued-at').textContent = invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString('es-MX') : '—';
    document.getElementById('res-total').textContent = fmtCurrency(invoice.total);

    const statusBadge = document.getElementById('res-invoice-status-badge');
    if (statusBadge) {
        if (invoice.status === 'cancelled') {
            statusBadge.className = 'pill bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold';
            statusBadge.textContent = 'CANCELADA';
        } else {
            statusBadge.className = 'pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-xs font-bold';
            statusBadge.textContent = 'VIGENTE (SIMULACIÓN)';
        }
    }

    const xmlPre = document.getElementById('res-xml-preview');
    if (xmlPre && window.XmlGenerator) {
        xmlPre.textContent = invoice.xmlContent || window.XmlGenerator.buildSimulatedXmlString(invoice);
    }

    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function showBillingFormForSale(sale) {
    const formCard = document.getElementById('billing-form-card');
    const resultCard = document.getElementById('invoice-result-card');
    const pill = document.getElementById('sale-status-pill');

    if (resultCard) resultCard.classList.add('hidden');
    if (formCard) formCard.classList.remove('hidden');

    if (pill) {
        pill.className = 'pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold';
        pill.textContent = 'DISPONIBLE PARA FACTURAR';
    }
}

async function lookupAndLoadSale(token, folio) {
    if (!token && !folio) {
        setLookupStatus('Ingresa el Token de Autofacturación o el Folio de la venta.', 'error');
        return;
    }

    setLookupStatus('Buscando operación de venta y verificando estado fiscal...', 'loading');

    try {
        const sale = await window.InvoiceService.findSaleByTokenOrFolio(token, folio);
        if (!sale) {
            setLookupStatus('No se encontró ningún ticket que coincida con el Token o Folio ingresado. Verifica los caracteres impresos en tu ticket.', 'error');
            document.getElementById('billing-workspace')?.classList.add('hidden');
            return;
        }

        if (sale.status === 'cancelled') {
            setLookupStatus(`El ticket #${sale.id} fue cancelado en el punto de venta y no puede ser facturado.`, 'error');
            document.getElementById('billing-workspace')?.classList.add('hidden');
            return;
        }

        currentPortalSale = sale;
        const tokInput = document.getElementById('lookup-token');
        const folInput = document.getElementById('lookup-folio');
        if (tokInput && sale.invoiceToken) tokInput.value = sale.invoiceToken;
        if (folInput && sale.id) folInput.value = sale.id;

        renderSaleSummary(sale);

        // Verificar si esta venta ya tiene una factura emitida
        const existingInvoice = await window.InvoiceService.getInvoiceForSale(sale.id);
        if (existingInvoice && existingInvoice.status !== 'cancelled') {
            setLookupStatus(`Este ticket (#${sale.id}) ya cuenta con el comprobante fiscal simulado ${existingInvoice.folioCompleto || existingInvoice.id}. Puedes descargar tu PDF y XML a continuación.`, 'success');
            renderInvoiceResult(existingInvoice);
        } else {
            setLookupStatus(`Ticket #${sale.id} verificado correctamente. Completa tus datos fiscales para generar tu factura simulada.`, 'success');
            showBillingFormForSale(sale);
        }
    } catch (e) {
        console.error('[Facturación Lookup Error]', e);
        setLookupStatus(e.message || 'Error al consultar la venta.', 'error');
    }
}

function handleTicketLookup(event) {
    if (event) event.preventDefault();
    const token = (document.getElementById('lookup-token')?.value || '').trim();
    const folio = (document.getElementById('lookup-folio')?.value || '').trim();
    lookupAndLoadSale(token, folio);
}

async function loadLatestSaleForDemo() {
    setLookupStatus('Recuperando la venta más reciente registrada en el sistema...', 'loading');
    try {
        let sales = [];
        if (window.FirebaseService && window.FirebaseService.sales) {
            sales = await window.FirebaseService.sales.getAll(25);
        }
        if (!sales || sales.length === 0) {
            sales = JSON.parse(localStorage.getItem('pos_sales') || '[]');
        }

        const activeSales = (sales || []).filter(s => s.status !== 'cancelled');
        // Preferir una venta que aún no esté facturada
        let candidate = activeSales.find(s => s.billingStatus !== 'invoiced') || activeSales[0];

        if (!candidate) {
            // Si no hay ventas previas en este navegador, crear una operación demostrativa realista
            const demoToken = window.QRService ? window.QRService.generateInvoiceToken() : 'TK-DEMO-2026-CFDI';
            candidate = {
                id: 's_demo_' + Date.now(),
                date: new Date().toISOString(),
                items: [
                    { id: 'ref_1', name: 'Juego de Balatas Cerámicas Delanteras', category: 'Frenos', price: 850, cost: 520, qty: 1 },
                    { id: 'ref_2', name: 'Filtro de Aceite Sintético Alta Eficiencia', category: 'Filtros y Afinación', price: 240, cost: 140, qty: 2 }
                ],
                total: 1330,
                subtotal: 1330 / 1.16,
                taxRate: 0.16,
                taxAmount: 1330 - (1330 / 1.16),
                totalCost: 800,
                payment: { method: 'card', label: 'Tarjeta', card: 1330 },
                status: 'completed',
                cashierUsername: 'caja_demo',
                invoiceToken: demoToken,
                billingStatus: 'pending'
            };
            const stored = JSON.parse(localStorage.getItem('pos_sales') || '[]');
            stored.unshift(candidate);
            localStorage.setItem('pos_sales', JSON.stringify(stored));
        }

        if (!candidate.invoiceToken && window.QRService) {
            candidate.invoiceToken = window.QRService.generateInvoiceToken();
        }

        await lookupAndLoadSale(candidate.invoiceToken, candidate.id);
    } catch (e) {
        setLookupStatus('No fue posible cargar la venta de demostración: ' + e.message, 'error');
    }
}

async function handleGenerateInvoice(event) {
    if (event) event.preventDefault();

    const alertBox = document.getElementById('billing-form-alert');
    const alertText = document.getElementById('billing-form-alert-text');
    if (alertBox) alertBox.classList.add('hidden');

    if (!currentPortalSale) {
        setLookupStatus('Primero localiza un ticket de venta válido.', 'error');
        return;
    }

    const formValues = getCurrentFormValues();
    ['rfc', 'nombre', 'codigoPostal', 'email', 'regimenFiscal', 'usoCfdi'].forEach(f => {
        touchedFields.add(f);
        clearFieldError(f);
    });

    const validation = window.ValidationService.validateBillingForm(formValues);
    if (!validation.valid) {
        const errorEntries = Object.entries(validation.errors);
        errorEntries.forEach(([field, msg]) => showFieldError(field, msg));

        if (alertBox && alertText) {
            alertText.textContent = 'Por favor corrige los campos marcados en rojo antes de emitir tu comprobante fiscal simulado.';
            alertBox.classList.remove('hidden');
        }

        // Enfocar el primer campo inválido (Modern Web Guidance: forms)
        if (errorEntries.length > 0) {
            const firstDom = getFieldDomMap(errorEntries[0][0]);
            if (firstDom) {
                document.getElementById(firstDom.inputId)?.focus();
            }
        }
        return;
    }

    const btnEmit = document.getElementById('btn-emit-invoice');
    if (btnEmit) {
        btnEmit.disabled = true;
        btnEmit.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Timbrando Simulación CFDI 4.0...</span>`;
        if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
    }

    try {
        const invoice = await window.InvoiceService.issueSimulatedInvoice(currentPortalSale, formValues);
        setLookupStatus(`¡Comprobante ${invoice.folioCompleto} generado con éxito! Descarga tus archivos PDF y XML a continuación.`, 'success');
        renderInvoiceResult(invoice);
    } catch (err) {
        console.error('[Emisión Factura Error]', err);
        if (err && err.code === 'ALREADY_INVOICED' && err.existingInvoice) {
            setLookupStatus('Esta venta ya había sido facturada previamente. Se muestra el comprobante existente.', 'info');
            renderInvoiceResult(err.existingInvoice);
        } else if (alertBox && alertText) {
            alertText.textContent = err.message || 'Ocurrió un error al generar el comprobante.';
            alertBox.classList.remove('hidden');
        }
    } finally {
        if (btnEmit) {
            btnEmit.disabled = false;
            btnEmit.innerHTML = `<i data-lucide="file-check-2" class="w-4 h-4"></i><span>Generar Comprobante Fiscal Simulado (PDF y XML)</span>`;
            if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
        }
    }
}

async function downloadCurrentInvoicePdf() {
    if (!currentPortalInvoice) return;
    try {
        await window.PdfGenerator.generateInvoicePdf(currentPortalInvoice, { download: true });
    } catch (e) {
        alert('Error al generar el PDF: ' + e.message);
    }
}

function downloadCurrentInvoiceXml() {
    if (!currentPortalInvoice) return;
    try {
        window.XmlGenerator.downloadInvoiceXml(currentPortalInvoice);
    } catch (e) {
        alert('Error al generar el XML: ' + e.message);
    }
}

function toggleXmlPreview() {
    const pre = document.getElementById('res-xml-preview');
    if (!pre) return;
    pre.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    populateRegimenSelect(null);
    populateUsoCfdiSelect(null, '');

    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || '';
    const folioParam = params.get('folio') || '';

    if (tokenParam) {
        const tokInput = document.getElementById('lookup-token');
        if (tokInput) tokInput.value = tokenParam;
    }
    if (folioParam) {
        const folInput = document.getElementById('lookup-folio');
        if (folInput) folInput.value = folioParam;
    }

    if (tokenParam || folioParam) {
        lookupAndLoadSale(tokenParam, folioParam);
    }
});
