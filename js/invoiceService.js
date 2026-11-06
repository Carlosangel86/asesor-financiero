// ===== SERVICIO CENTRAL DE AUTOFACTURACIÓN Y PERSISTENCIA (invoiceService.js) =====
// Orquesta la recuperación de ventas por token/folio, emisión atómica, idempotencia y cancelación simulada
// Sincroniza en tiempo real con Cloud Firestore y mantiene respaldo local en localStorage

const INVOICES_STORAGE_KEY = 'pos_invoices';
const INVOICE_REQ_STORAGE_KEY = 'pos_invoice_requests';
const BILLING_TICKETS_CACHE_KEY = 'pos_billing_tickets';

function registerLocalTicketForBilling(sale) {
    if (!sale || !sale.id) return;
    try {
        const list = JSON.parse(localStorage.getItem(BILLING_TICKETS_CACHE_KEY) || '[]');
        const filtered = list.filter(s => s && s.id !== sale.id);
        filtered.unshift(sale);
        localStorage.setItem(BILLING_TICKETS_CACHE_KEY, JSON.stringify(filtered.slice(0, 100)));
    } catch (e) {
        console.warn('[InvoiceService] Error guardando cache de ticket:', e);
    }
}

function getLocalInvoices() {
    try {
        return JSON.parse(localStorage.getItem(INVOICES_STORAGE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function saveLocalInvoices(list) {
    try {
        localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(list || []));
    } catch (e) {
        console.warn('[InvoiceService] Error guardando en localStorage:', e);
    }
}

function getLocalSales() {
    try {
        const map = new Map();
        const billingCache = JSON.parse(localStorage.getItem(BILLING_TICKETS_CACHE_KEY) || '[]');
        billingCache.forEach(s => { if (s && s.id) map.set(s.id, s); });
        const posSales = JSON.parse(localStorage.getItem('pos_sales') || '[]');
        posSales.forEach(s => { if (s && s.id && !map.has(s.id)) map.set(s.id, s); });
        if (typeof salesLog !== 'undefined' && Array.isArray(salesLog)) {
            salesLog.forEach(s => { if (s && s.id && !map.has(s.id)) map.set(s.id, s); });
        }
        return Array.from(map.values());
    } catch (e) {
        return [];
    }
}

function updateLocalSaleStatus(saleId, patch) {
    try {
        if (typeof salesLog !== 'undefined' && Array.isArray(salesLog)) {
            const idx = salesLog.findIndex(s => s.id === saleId);
            if (idx !== -1) {
                Object.assign(salesLog[idx], patch);
            }
        }
        for (const key of ['pos_sales', BILLING_TICKETS_CACHE_KEY]) {
            const stored = JSON.parse(localStorage.getItem(key) || '[]');
            const sIdx = stored.findIndex(s => s && s.id === saleId);
            if (sIdx !== -1) {
                Object.assign(stored[sIdx], patch);
                localStorage.setItem(key, JSON.stringify(stored));
            }
        }
    } catch (e) {
        console.warn('[InvoiceService] Error actualizando venta local:', e);
    }
}

function generateSimulatedUuid() {
    // Genera un UUID v4 demostrativo con prefijo reconocible o formato estándar
    const hex = '0123456789ABCDEF';
    const seg = (len) => {
        let out = '';
        for (let i = 0; i < len; i++) {
            out += hex[Math.floor(Math.random() * 16)];
        }
        return out;
    };
    return `${seg(8)}-${seg(4)}-4${seg(3)}-A${seg(3)}-${seg(12)}`;
}

function generateSimulatedSeal(seedText) {
    const baseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let hash = 2166136261;
    const str = String(seedText || Date.now());
    let out = 'SIMULACION+SIN+VALIDEZ+FISCAL+';
    for (let i = 0; i < 110; i++) {
        hash ^= str.charCodeAt(i % str.length) + i * 17;
        hash = Math.imul(hash, 16777619);
        out += baseChars[Math.abs(hash) % baseChars.length];
    }
    return out + '==';
}

/**
 * Espera brevemente a que FirebaseService esté inicializado si aún está cargando como módulo ES
 */
function waitForFirebase(timeoutMs = 2500) {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.FirebaseService && window.FirebaseService.isInitialized) {
            resolve(window.FirebaseService);
            return;
        }
        let settled = false;
        const onInit = () => {
            if (!settled) {
                settled = true;
                resolve(window.FirebaseService);
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('firebase-initialized', onInit, { once: true });
        }
        setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve((typeof window !== 'undefined' && window.FirebaseService) || null);
            }
        }, timeoutMs);
    });
}

/**
 * Busca una venta por token de autofacturación y/o por folio de venta (saleId).
 * Consulta tanto en Cloud Firestore como en la memoria local del POS.
 */
async function findSaleByTokenOrFolio(token, folio) {
    const cleanToken = String(token || '').trim().toUpperCase();
    const cleanFolio = String(folio || '').trim();

    await waitForFirebase();

    // 1. Buscar primero en Firestore para tener el estado de facturación más reciente
    if (window.FirebaseService && window.FirebaseService.sales) {
        try {
            if (cleanFolio) {
                const byId = await window.FirebaseService.sales.getById(cleanFolio);
                if (byId) {
                    if (!byId.invoiceToken && window.QRService && window.QRService.ensureSaleToken) {
                        window.QRService.ensureSaleToken(byId);
                    }
                    if (!cleanToken || !byId.invoiceToken || String(byId.invoiceToken).toUpperCase() === cleanToken) {
                        return byId;
                    }
                }
            }
            if (cleanToken) {
                const byToken = await window.FirebaseService.sales.getByToken(cleanToken);
                if (byToken) return byToken;
            }
        } catch (e) {
            console.warn('[InvoiceService] Consulta Firestore falló, usando respaldo local:', e);
        }
    }

    // 2. Respaldo en ventas locales
    const localList = getLocalSales();
    let found = null;
    if (cleanToken && cleanFolio) {
        found = localList.find(s =>
            String(s.id) === cleanFolio &&
            (!s.invoiceToken || String(s.invoiceToken).toUpperCase() === cleanToken)
        );
    }
    if (!found && cleanToken) {
        found = localList.find(s => String(s.invoiceToken || '').toUpperCase() === cleanToken);
    }
    if (!found && cleanFolio) {
        found = localList.find(s => String(s.id) === cleanFolio);
    }

    return found || null;
}

/**
 * Obtiene todas las facturas registradas (combinando Firestore y respaldo local sin duplicados)
 */
async function getAllInvoices() {
    await waitForFirebase();
    const local = getLocalInvoices();
    let cloud = [];
    if (window.FirebaseService && window.FirebaseService.invoices) {
        try {
            cloud = await window.FirebaseService.invoices.getAll(300);
        } catch (e) {
            console.warn('[InvoiceService] Error cargando facturas de Firestore:', e);
        }
    }

    const map = new Map();
    local.forEach(inv => map.set(inv.id, inv));
    cloud.forEach(inv => map.set(inv.id, inv)); // Firestore tiene prioridad sobre local

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0));
    saveLocalInvoices(merged);
    return merged;
}

/**
 * Busca si una venta ya cuenta con una factura activa emitida
 */
async function getInvoiceForSale(saleId) {
    if (!saleId) return null;
    await waitForFirebase();

    if (window.FirebaseService && window.FirebaseService.invoices) {
        try {
            const cloudInv = await window.FirebaseService.invoices.getBySaleId(saleId);
            if (cloudInv) {
                const local = getLocalInvoices();
                const idx = local.findIndex(x => x.id === cloudInv.id);
                if (idx >= 0) local[idx] = cloudInv;
                else local.unshift(cloudInv);
                saveLocalInvoices(local);
                return cloudInv;
            }
        } catch (e) {
            console.warn('[InvoiceService] Error buscando factura por saleId en Firestore:', e);
        }
    }

    const local = getLocalInvoices();
    const active = local.find(inv => inv.saleId === saleId && inv.status !== 'cancelled');
    return active || local.find(inv => inv.saleId === saleId) || null;
}

/**
 * Emite una nueva factura simulada para una venta dada, verificando que no esté cancelada ni facturada previamente.
 */
async function issueSimulatedInvoice(sale, receptorInput) {
    if (!sale || !sale.id) {
        throw new Error('No se encontró la operación de venta asociada.');
    }
    if (sale.status === 'cancelled') {
        throw new Error('Esta venta fue cancelada en el punto de venta y no puede facturarse.');
    }

    // Validar expiración de token si existe
    if (sale.invoiceExpiresAt && new Date(sale.invoiceExpiresAt) < new Date()) {
        throw new Error('El token de autofacturación de este ticket ha expirado (vigencia de 30 días).');
    }

    // 1. Verificar idempotencia: ¿ya existe factura activa para esta venta?
    const existingInv = await getInvoiceForSale(sale.id);
    if (existingInv && existingInv.status !== 'cancelled') {
        const err = new Error('Esta venta ya fue facturada previamente. No se permiten comprobantes duplicados.');
        err.code = 'ALREADY_INVOICED';
        err.existingInvoice = existingInv;
        throw err;
    }

    // 2. Validar datos fiscales del receptor
    if (!window.ValidationService) {
        throw new Error('Servicio de validación fiscal no disponible.');
    }
    const validation = window.ValidationService.validateBillingForm(receptorInput);
    if (!validation.valid) {
        const firstMsg = Object.values(validation.errors)[0] || 'Datos fiscales inválidos.';
        const err = new Error(firstMsg);
        err.code = 'VALIDATION_ERROR';
        err.validationErrors = validation.errors;
        throw err;
    }

    const receptor = validation.sanitized;

    // 3. Calcular desglose de impuestos respetando importes históricos
    if (!window.TaxEngine) {
        throw new Error('Motor fiscal no disponible.');
    }
    const taxCalc = window.TaxEngine.calculateInvoiceTaxes(sale);
    const emisor = { ...window.TaxEngine.EMISOR_DEFAULT };

    // 4. Determinar consecutivo de Folio
    const allInvoices = await getAllInvoices();
    const nextNumber = allInvoices.length + 1;
    const folioFormatted = String(nextNumber).padStart(4, '0');
    const serie = emisor.serieDefault || 'FA';
    const issuedAt = new Date().toISOString();
    const uuidSimulado = generateSimulatedUuid();
    const invoiceId = `inv_${Date.now()}`;
    const invoiceToken = sale.invoiceToken || (window.QRService ? window.QRService.generateInvoiceToken() : `TK-${Date.now()}`);

    const cadenaOriginal = `||4.0-SIMULADO|${serie}|${folioFormatted}|${issuedAt}|${emisor.rfc}|${receptor.rfc}|${taxCalc.total.toFixed(2)}|MXN|${uuidSimulado}|SIN_VALIDEZ_FISCAL||`;
    const selloSimulado = generateSimulatedSeal(cadenaOriginal);

    const invoiceData = {
        id: invoiceId,
        serie: serie,
        folio: folioFormatted,
        folioCompleto: `${serie}-${folioFormatted}`,
        uuidSimulado: uuidSimulado,
        saleId: sale.id,
        saleDate: sale.date || issuedAt,
        invoiceToken: invoiceToken,
        issuedAt: issuedAt,
        status: 'active',
        leyendaFiscal: window.TaxEngine.FISCAL_DISCLAIMER,
        emisor: emisor,
        receptor: {
            rfc: receptor.rfc,
            rfcType: receptor.rfcType,
            nombre: receptor.nombre,
            codigoPostal: receptor.codigoPostal,
            regimenFiscal: receptor.regimenFiscal,
            regimenFiscalDesc: window.TaxEngine.getRegimenLabel(receptor.regimenFiscal),
            usoCfdi: receptor.usoCfdi,
            usoCfdiDesc: window.TaxEngine.getUsoCfdiLabel(receptor.usoCfdi),
            email: receptor.email || ''
        },
        moneda: taxCalc.moneda,
        tipoCambio: taxCalc.tipoCambio,
        tipoDeComprobante: taxCalc.tipoDeComprobante,
        tipoDeComprobanteDesc: taxCalc.tipoDeComprobanteDesc,
        exportacion: taxCalc.exportacion,
        metodoPago: taxCalc.metodoPago,
        metodoPagoDesc: taxCalc.metodoPagoDesc,
        formaPago: taxCalc.formaPago,
        formaPagoDesc: taxCalc.formaPagoDesc,
        lugarExpedicion: taxCalc.lugarExpedicion,
        tasaGlobal: taxCalc.tasaGlobal,
        tasaGlobalPct: taxCalc.tasaGlobalPct,
        subtotal: taxCalc.subtotal,
        descuento: taxCalc.descuento,
        totalImpuestosTrasladados: taxCalc.totalImpuestosTrasladados,
        total: taxCalc.total,
        desgloseTasas: taxCalc.desgloseTasas,
        conceptos: taxCalc.conceptos,
        cadenaOriginal: cadenaOriginal,
        selloSimulado: selloSimulado
    };

    // Generar el XML estructurado y guardarlo como propiedad en el documento para descarga inmediata
    if (window.XmlGenerator && window.XmlGenerator.buildSimulatedXmlString) {
        invoiceData.xmlContent = window.XmlGenerator.buildSimulatedXmlString(invoiceData);
    }

    const requestLogData = {
        id: `ireq_${Date.now()}`,
        saleId: sale.id,
        invoiceToken: invoiceToken,
        receptorRfc: receptor.rfc,
        receptorNombre: receptor.nombre,
        requestedAt: issuedAt,
        status: 'completed'
    };

    // 5. Persistir atómicamente en Firestore (si está disponible)
    if (window.FirebaseService && window.FirebaseService.invoices) {
        try {
            await window.FirebaseService.invoices.createInvoiceAtomic(sale.id, invoiceData, requestLogData);
        } catch (fireErr) {
            const msg = String(fireErr && fireErr.message || '');
            if (msg.startsWith('ALREADY_INVOICED:')) {
                const existingId = msg.split(':')[1];
                const existingDoc = await window.FirebaseService.invoices.getById(existingId);
                const dupErr = new Error('Esta venta ya fue facturada previamente.');
                dupErr.code = 'ALREADY_INVOICED';
                dupErr.existingInvoice = existingDoc;
                throw dupErr;
            }
            if (msg.startsWith('SALE_CANCELLED:')) {
                throw new Error('Esta venta fue cancelada y no puede ser facturada.');
            }
            console.warn('[InvoiceService] Firestore write warning (guardando en respaldo local):', fireErr);
        }
    }

    // 6. Actualizar respaldo local
    const localList = getLocalInvoices();
    localList.unshift(invoiceData);
    saveLocalInvoices(localList);

    const localReqs = JSON.parse(localStorage.getItem(INVOICE_REQ_STORAGE_KEY) || '[]');
    localReqs.unshift({ ...requestLogData, invoiceId: invoiceData.id });
    localStorage.setItem(INVOICE_REQ_STORAGE_KEY, JSON.stringify(localReqs));

    updateLocalSaleStatus(sale.id, {
        billingStatus: 'invoiced',
        invoiceId: invoiceData.id,
        invoicedAt: issuedAt,
        receptorRfc: receptor.rfc,
        invoiceToken: invoiceToken
    });

    return invoiceData;
}

/**
 * Simula la cancelación administrativa de una factura emitida
 */
async function cancelSimulatedInvoice(invoiceId, reason = '02 - Comprobante emitido con errores sin relación', cancelledBy = 'admin') {
    if (!invoiceId) throw new Error('ID de factura requerido.');
    await waitForFirebase();

    const all = await getAllInvoices();
    const target = all.find(inv => inv.id === invoiceId);
    if (!target) {
        throw new Error('Factura no encontrada.');
    }
    if (target.status === 'cancelled') {
        throw new Error('Esta factura ya se encuentra cancelada.');
    }

    const cancelledAt = new Date().toISOString();

    if (window.FirebaseService && window.FirebaseService.invoices) {
        try {
            await window.FirebaseService.invoices.cancelInvoiceAtomic(invoiceId, target.saleId, reason, cancelledBy);
        } catch (e) {
            console.warn('[InvoiceService] Error al cancelar en Firestore, aplicando localmente:', e);
        }
    }

    target.status = 'cancelled';
    target.cancelReason = reason;
    target.cancelledBy = cancelledBy;
    target.cancelledAt = cancelledAt;
    if (window.XmlGenerator && window.XmlGenerator.buildSimulatedXmlString) {
        target.xmlContent = window.XmlGenerator.buildSimulatedXmlString(target);
    }

    const updatedList = all.map(inv => inv.id === invoiceId ? target : inv);
    saveLocalInvoices(updatedList);

    if (target.saleId) {
        updateLocalSaleStatus(target.saleId, {
            billingStatus: 'invoice_cancelled',
            invoiceId: null
        });
    }

    return target;
}

/**
 * Inicializa la configuración fiscal del emisor y catálogos SAT en Firestore (sin bloquear)
 */
async function ensureFiscalCollectionsSeeded() {
    await waitForFirebase();
    if (!window.FirebaseService || !window.FirebaseService.invoices || !window.TaxEngine) return;
    try {
        const existingBiz = await window.FirebaseService.invoices.getBusinessConfig();
        if (!existingBiz) {
            await window.FirebaseService.invoices.saveBusinessConfig(window.TaxEngine.EMISOR_DEFAULT);
        }
        await window.FirebaseService.invoices.seedTaxCatalogsIfEmpty({
            version: 'CFDI_4.0_SIMULADO',
            disclaimer: window.TaxEngine.FISCAL_DISCLAIMER,
            regimenesFiscales: window.TaxEngine.REGIMENES_FISCALES,
            usosCfdi: window.TaxEngine.USOS_CFDI
        });
    } catch (e) {
        // Silencioso si el usuario actual no tiene permisos de escritura sobre catálogos
    }
}

const InvoiceService = {
    registerLocalTicketForBilling,
    findSaleByTokenOrFolio,
    getAllInvoices,
    getInvoiceForSale,
    issueSimulatedInvoice,
    cancelSimulatedInvoice,
    ensureFiscalCollectionsSeeded,
    generateSimulatedUuid
};

if (typeof window !== 'undefined') {
    window.InvoiceService = InvoiceService;
}
