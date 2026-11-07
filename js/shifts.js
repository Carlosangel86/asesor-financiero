// ===== CONTROL DE TURNOS Y ARQUEOS DE CAJA =====
let currentShift = null;
let shiftsHistory = [];

try {
    const _lsShift = JSON.parse(localStorage.getItem('pos_current_shift'));
    if(_lsShift && _lsShift.status === 'open' && !_lsShift.closedAt) {
        currentShift = _lsShift;
    } else {
        localStorage.removeItem('pos_current_shift');
    }
    const _lsHist = JSON.parse(localStorage.getItem('pos_shifts_history'));
    if(Array.isArray(_lsHist)) shiftsHistory = _lsHist;
} catch(e) {
    currentShift = null;
    shiftsHistory = [];
}

// Sincronización bidireccional estricta con Firebase Firestore
async function loadShiftsFromFirebase(){
    if(!window.FirebaseService || !window.FirebaseService.stats) return;
    try {
        const fsShift = await window.FirebaseService.stats.getCurrentShift();
        if(fsShift && fsShift.status === 'open' && !fsShift.closedAt){
            currentShift = fsShift;
            localStorage.setItem('pos_current_shift', JSON.stringify(currentShift));
        } else {
            currentShift = null;
            localStorage.removeItem('pos_current_shift');
            if(fsShift && fsShift.status === 'closed'){
                window.FirebaseService.stats.saveCurrentShift(null).catch(console.warn);
            }
        }

        const fsHistory = await window.FirebaseService.stats.getShiftsHistory();
        if(Array.isArray(fsHistory) && fsHistory.length > 0){
            shiftsHistory = fsHistory;
            localStorage.setItem('pos_shifts_history', JSON.stringify(shiftsHistory));
        }
    } catch(err){
        console.warn('[Sync Shifts Error]', err);
    }
    updateShiftUI();
    if(typeof renderShiftsHistoryView === 'function') renderShiftsHistoryView();
}

// Verificación estricta: ¿La venta pertenece a un turno que ya fue cerrado?
function isSaleFromClosedShift(sale){
    if(!sale) return false;
    // Si no hay turno abierto actualmente, todas las ventas previas están cerradas
    if(!currentShift || currentShift.status !== 'open') return true;

    // Si la venta tiene shiftId explícito:
    if(sale.shiftId){
        // Pertenece al turno actual activo
        if(sale.shiftId === currentShift.id) return false;
        // Pertenece a un turno diferente (cerrado)
        return true;
    }

    // Fallback para ventas sin shiftId por compatibilidad previa:
    if(currentShift.openedAt && new Date(sale.date) < new Date(currentShift.openedAt)){
        return true;
    }

    return false;
}

function updateShiftUI(){
    const pill = document.getElementById('shift-status-pill');
    const info = document.getElementById('shift-info-text');
    const btnOpen = document.getElementById('btn-shift-open');
    const btnCutX = document.getElementById('btn-shift-cutx');
    const btnCutZ = document.getElementById('btn-shift-cutz');

    const btnVOpen = document.getElementById('btn-shifts-view-open');
    const btnVCutX = document.getElementById('btn-shifts-view-cutx');
    const btnVCutZ = document.getElementById('btn-shifts-view-cutz');

    const isOpen = currentShift && currentShift.status === 'open';

    if(pill){
        if(isOpen){
            pill.className = 'pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-xs font-semibold flex items-center gap-1.5';
            pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>Turno Abierto';
            if(info) info.textContent = `Cajero: @${currentShift.cashierUsername} · Fondo: ${fmt(currentShift.initialCashFloat)} · Inicio: ${formatAppDate(currentShift.openedAt, {hour:'2-digit', minute:'2-digit'})}`;
            if(btnOpen) btnOpen.classList.add('hidden');
            if(btnCutX) btnCutX.classList.remove('hidden');
            if(btnCutZ) btnCutZ.classList.remove('hidden');
        } else {
            pill.className = 'pill bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5';
            pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-500"></span>Sin Turno Activo';
            if(info) info.textContent = 'Abre turno con fondo de caja para registrar ventas';
            if(btnOpen) btnOpen.classList.remove('hidden');
            if(btnCutX) btnCutX.classList.add('hidden');
            if(btnCutZ) btnCutZ.classList.add('hidden');
        }
    }

    if(btnVOpen) btnVOpen.classList.toggle('hidden', isOpen);
    if(btnVCutX) btnVCutX.classList.toggle('hidden', !isOpen);
    if(btnVCutZ) btnVCutZ.classList.toggle('hidden', !isOpen);

    if(typeof renderShiftsHistoryView === 'function') renderShiftsHistoryView();
}

function promptOpenShift(){
    if(currentShift && currentShift.status === 'open'){
        alert(`Ya hay un turno abierto actualmente por @${currentShift.cashierUsername}.\nPara iniciar un nuevo turno, primero realiza el Corte Z (Cierre).`);
        return;
    }
    const m = document.getElementById('shift-open-modal');
    if(m) {
        const inp = document.getElementById('shift-initial-cash');
        if(inp) inp.value = '500';
        m.classList.remove('hidden');
    }
}

function closeShiftOpenModal(){
    const m = document.getElementById('shift-open-modal');
    if(m) m.classList.add('hidden');
}

function confirmOpenShift(){
    if(currentShift && currentShift.status === 'open'){
        alert(`Ya existe un turno abierto. Debes realizar el Corte Z antes de abrir otro.`);
        closeShiftOpenModal();
        return;
    }

    const input = document.getElementById('shift-initial-cash');
    const amount = parseFloat(input ? input.value : 0) || 0;
    currentShift = {
        id: 'sh_' + Date.now(),
        openedAt: new Date().toISOString(),
        closedAt: null,
        cashierId: currentUser ? currentUser.id : 'usr_caja',
        cashierUsername: currentUser ? currentUser.username : 'caja_demo',
        cashierName: currentUser ? currentUser.name : 'Cajero',
        initialCashFloat: amount,
        status: 'open'
    };
    localStorage.setItem('pos_current_shift', JSON.stringify(currentShift));
    if (window.FirebaseService && window.FirebaseService.stats) {
        window.FirebaseService.stats.saveCurrentShift(currentShift).catch(console.warn);
    }
    logActivity('Turno Abierto', `Fondo inicial: ${fmt(amount)} por @${currentShift.cashierUsername}`, 'success');
    closeShiftOpenModal();
    updateShiftUI();
    lucide.createIcons();
}

function computeShiftCutX(){
    if(!currentShift) return null;
    const shiftSales = salesLog.filter(s => 
        s.status === 'completed' && 
        (s.shiftId === currentShift.id || (!s.shiftId && new Date(s.date) >= new Date(currentShift.openedAt))) &&
        (currentUser.role === 'admin' || currentUser.role === 'supervisor' || s.cashierId === currentShift.cashierId)
    );

    let cashSales = 0, cardSales = 0, transferSales = 0, totalSales = 0;
    shiftSales.forEach(s => {
        totalSales += (s.total || 0);
        if(s.payment){
            cashSales += (s.payment.cash || 0);
            cardSales += (s.payment.card || 0);
            transferSales += (s.payment.transfer || 0);
        } else {
            cashSales += (s.total || 0);
        }
    });

    const expectedCashInDrawer = currentShift.initialCashFloat + cashSales;
    return {
        shift: currentShift,
        salesCount: shiftSales.length,
        totalSales,
        cashSales,
        cardSales,
        transferSales,
        initialCashFloat: currentShift.initialCashFloat,
        expectedCashInDrawer
    };
}

function showCutXModal(){
    const data = computeShiftCutX();
    if(!data) { alert("No hay turno abierto actualmente."); return; }
    
    document.getElementById('cutx-folio').textContent = data.shift.id;
    document.getElementById('cutx-cashier').textContent = data.shift.cashierName;
    document.getElementById('cutx-start').textContent = formatAppDate(data.shift.openedAt);
    document.getElementById('cutx-float').textContent = fmt(data.initialCashFloat);
    document.getElementById('cutx-cash-sales').textContent = fmt(data.cashSales);
    document.getElementById('cutx-card-sales').textContent = fmt(data.cardSales);
    document.getElementById('cutx-transf-sales').textContent = fmt(data.transferSales);
    document.getElementById('cutx-total-sales').textContent = fmt(data.totalSales);
    document.getElementById('cutx-expected-cash').textContent = fmt(data.expectedCashInDrawer);

    document.getElementById('shift-cutx-modal').classList.remove('hidden');
    logActivity('Lectura Corte X', `Consulta de corte parcial por @${currentUser.username}`, 'info');
    lucide.createIcons();
}

function closeCutXModal(){
    document.getElementById('shift-cutx-modal').classList.add('hidden');
}

function showCutZModal(){
    const data = computeShiftCutX();
    if(!data) { alert("No hay turno abierto."); return; }

    document.getElementById('cutz-expected-cash').textContent = fmt(data.expectedCashInDrawer);
    document.getElementById('cutz-total-sales').textContent = fmt(data.totalSales);
    const physInput = document.getElementById('cutz-physical-cash');
    if(physInput) physInput.value = '';
    const discEl = document.getElementById('cutz-discrepancy');
    if(discEl) discEl.textContent = '$0.00';

    document.getElementById('shift-cutz-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeCutZModal(){
    document.getElementById('shift-cutz-modal').classList.add('hidden');
}

function onCutzPhysicalCashChange(){
    const data = computeShiftCutX();
    if(!data) return;
    const physical = parseFloat(document.getElementById('cutz-physical-cash').value) || 0;
    const diff = physical - data.expectedCashInDrawer;
    const diffEl = document.getElementById('cutz-discrepancy');
    if(diffEl){
        diffEl.textContent = (diff >= 0 ? '+' : '') + fmt(diff);
        diffEl.className = 'font-bold mono text-sm ' + (Math.abs(diff) < 0.5 ? 'text-emerald-400' : diff > 0 ? 'text-sky-400' : 'text-rose-400');
    }
}

function confirmCloseShiftZ(){
    const data = computeShiftCutX();
    if(!data) return;

    const physical = parseFloat(document.getElementById('cutz-physical-cash').value);
    if(isNaN(physical)){
        alert("Por favor ingresa el monto total de efectivo contado físicamente en caja.");
        return;
    }

    const discrepancy = physical - data.expectedCashInDrawer;
    currentShift.closedAt = new Date().toISOString();
    currentShift.actualCashCount = physical;
    currentShift.expectedCash = data.expectedCashInDrawer;
    currentShift.discrepancy = discrepancy;
    currentShift.totalSales = data.totalSales;
    currentShift.salesCount = data.salesCount;
    currentShift.cashSales = data.cashSales;
    currentShift.cardSales = data.cardSales;
    currentShift.transferSales = data.transferSales;
    currentShift.status = 'closed';

    // Guardar en histórico ordenado (más reciente primero)
    shiftsHistory.unshift({ ...currentShift });
    localStorage.setItem('pos_shifts_history', JSON.stringify(shiftsHistory));
    localStorage.removeItem('pos_current_shift');

    if (window.FirebaseService && window.FirebaseService.stats) {
        window.FirebaseService.stats.saveShiftsHistory(shiftsHistory).catch(console.warn);
        window.FirebaseService.stats.saveCurrentShift(null).catch(console.warn);
    }

    logActivity('Cierre de Turno (Corte Z)', `Turno cerrado con ${fmt(physical)} en caja. Discrepancia: ${fmt(discrepancy)}`, Math.abs(discrepancy) < 1 ? 'success' : 'warn');

    alert(`✓ Turno cerrado exitosamente (Corte Z).

Efectivo Esperado: ${fmt(data.expectedCashInDrawer)}
Efectivo Físico: ${fmt(physical)}
Diferencia: ${(discrepancy >= 0 ? '+' : '') + fmt(discrepancy)}`);
    
    currentShift = null;
    closeCutZModal();
    updateShiftUI();
    upPosSummary();
    if(typeof renderShiftsHistoryView === 'function') renderShiftsHistoryView();
}

// ===== RENDERIZADO DEL HISTORIAL DE TURNOS & CORTES DE CAJA =====
function renderShiftsHistoryView(){
    const activeCont = document.getElementById('shifts-active-container');
    const histList = document.getElementById('shifts-history-list');
    const countBadge = document.getElementById('shifts-count-badge');

    if(!activeCont || !histList) return;

    // 1. Estado del turno activo actual
    if(currentShift && currentShift.status === 'open'){
        const data = computeShiftCutX();
        activeCont.innerHTML = `
            <div class="glass rounded-xl p-4 border border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-950">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3 border-b border-slate-800">
                    <div class="flex items-center gap-2">
                        <span class="pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-xs font-bold flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>TURNO ACTUAL EN CURSO
                        </span>
                        <span class="font-mono text-xs text-slate-400">#${currentShift.id}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="showCutXModal()" class="pos-btn bg-sky-600 hover:bg-sky-500 text-white text-xs py-1.5 px-3">
                            <i data-lucide="file-text" class="w-3.5 h-3.5"></i>Corte X
                        </button>
                        <button onclick="showCutZModal()" class="pos-btn bg-amber-600 hover:bg-amber-500 text-white text-xs py-1.5 px-3">
                            <i data-lucide="check-square" class="w-3.5 h-3.5"></i>Corte Z (Cierre)
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                    <div class="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Cajero</span>
                        <b class="text-white text-sm">@${currentShift.cashierUsername}</b>
                        <span class="text-[10px] text-slate-400 block truncate">${currentShift.cashierName}</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Apertura</span>
                        <b class="text-white text-sm mono">${formatAppDate(currentShift.openedAt, {hour:'2-digit', minute:'2-digit'})}</b>
                        <span class="text-[10px] text-slate-400 block">${formatAppDate(currentShift.openedAt, {day:'numeric', month:'short'})}</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Fondo Inicial</span>
                        <b class="text-emerald-400 text-sm mono">${fmt(currentShift.initialCashFloat)}</b>
                        <span class="text-[10px] text-slate-500 block">En caja registradora</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Total Vendido</span>
                        <b class="text-sky-400 text-sm mono">${fmt(data ? data.totalSales : 0)}</b>
                        <span class="text-[10px] text-slate-400 block">${data ? data.salesCount : 0} ticket(s)</span>
                    </div>
                </div>
                <div class="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div class="flex items-center gap-4 flex-wrap">
                        <span class="text-slate-400">Efec: <b class="text-emerald-400 mono">${fmt(data ? data.cashSales : 0)}</b></span>
                        <span class="text-slate-400">Tarj: <b class="text-sky-400 mono">${fmt(data ? data.cardSales : 0)}</b></span>
                        <span class="text-slate-400">Transf: <b class="text-purple-400 mono">${fmt(data ? data.transferSales : 0)}</b></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-400 font-medium">Efectivo esperado en gaveta:</span>
                        <span class="text-base font-bold mono text-emerald-400">${fmt(data ? data.expectedCashInDrawer : currentShift.initialCashFloat)}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        activeCont.innerHTML = `
            <div class="glass rounded-xl p-5 border border-slate-800 text-center flex flex-col items-center justify-center gap-2.5">
                <div class="w-12 h-12 rounded-xl bg-slate-800/90 text-slate-400 flex items-center justify-center">
                    <i data-lucide="lock" class="w-6 h-6"></i>
                </div>
                <h4 class="text-sm font-bold text-white">Sin Turno Activo en Caja</h4>
                <p class="text-xs text-slate-400 max-w-md">Para poder registrar cobros y tickets en el punto de venta, debes abrir un turno de caja indicando el fondo inicial con el que comienzas.</p>
                <button onclick="promptOpenShift()" class="pos-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-4 shadow-lg shadow-emerald-600/25 mt-1 flex items-center gap-2">
                    <i data-lucide="play" class="w-4 h-4"></i>Abrir Turno con Fondo Inicial
                </button>
            </div>
        `;
    }

    // 2. Historial de turnos cerrados
    if(countBadge) countBadge.textContent = `${shiftsHistory.length} turno(s)`;

    if(!shiftsHistory || shiftsHistory.length === 0){
        histList.innerHTML = `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/60">
                <i data-lucide="inbox" class="w-6 h-6 mx-auto mb-1.5 opacity-50"></i>
                No hay turnos cerrados en el historial aún.<br>Cada vez que realices un Corte Z, quedará registrado aquí.
            </div>
        `;
        lucide.createIcons();
        return;
    }

    histList.innerHTML = shiftsHistory.map(sh => {
        const diff = sh.discrepancy || 0;
        let diffBadge = '';
        if(Math.abs(diff) < 0.5){
            diffBadge = `<span class="pill bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">Cuadrado (0.00)</span>`;
        } else if(diff > 0){
            diffBadge = `<span class="pill bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold">Sobrante +${fmt(diff)}</span>`;
        } else {
            diffBadge = `<span class="pill bg-rose-500/20 text-rose-300 border border-rose-500/35 text-[10px] font-mono font-bold">Faltante ${fmt(diff)}</span>`;
        }

        return `
            <div class="pos-row flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5">
                <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-white text-xs">${sh.cashierName || 'Cajero'}</span>
                        <span class="text-[11px] text-slate-400 font-mono">@${sh.cashierUsername || 'caja'}</span>
                        <span class="pill bg-slate-800 text-slate-300 border border-slate-700 text-[9.5px] font-mono">Folio: ${sh.id}</span>
                        ${diffBadge}
                    </div>
                    <div class="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span>Apertura: <b class="text-slate-300">${formatAppDate(sh.openedAt)}</b></span>
                        <span>Cierre: <b class="text-slate-300">${formatAppDate(sh.closedAt)}</b></span>
                        <span>Fondo: <b class="text-emerald-400 mono">${fmt(sh.initialCashFloat || 0)}</b></span>
                    </div>
                    <div class="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-0.5">
                        <span>Ventas Turno: <b class="text-sky-300 mono">${fmt(sh.totalSales || 0)}</b> (${sh.salesCount || 0} tickets)</span>
                        <span>Esperado: <b class="text-slate-200 mono">${fmt(sh.expectedCash || 0)}</b></span>
                        <span>Físico contado: <b class="text-white mono">${fmt(sh.actualCashCount || 0)}</b></span>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button onclick="printShiftCutZTicket('${sh.id}')" class="pos-btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-1.5 px-3 flex items-center gap-1.5" title="Reimprimir Ticket de Corte Z">
                        <i data-lucide="printer" class="w-3.5 h-3.5 text-sky-400"></i><span>Ticket Corte Z</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// ===== IMPRESIÓN DE TICKET TÉRMICO DE CORTE Z =====
function printShiftCutZTicket(shiftId){
    const sh = shiftsHistory.find(s => s.id === shiftId);
    if(!sh){
        alert("Turno no encontrado en el historial.");
        return;
    }

    const diff = sh.discrepancy || 0;
    const diffText = (diff >= 0 ? '+' : '') + fmt(diff);

    const ticketHtml = `
        <div class="tkt-center tkt-bold" style="font-size:14px;letter-spacing:1px">PROCAÑA MOTORS</div>
        <div class="tkt-center">RFC: XAXX010101000</div>
        <div class="tkt-center" style="font-size:10px">Sucursal Matriz & Almacén Central · Texcoco, Edo. de México</div>
        <div class="tkt-divider"></div>
        <div class="tkt-center tkt-bold" style="font-size:12px;margin:2px 0;">CORTE DE CAJA (CORTE Z)</div>
        <div class="tkt-divider"></div>
        <div class="tkt-flex"><span>Folio Turno:</span><span class="tkt-bold">${sh.id}</span></div>
        <div class="tkt-flex"><span>Cajero:</span><span>${sh.cashierName} (@${sh.cashierUsername})</span></div>
        <div class="tkt-flex"><span>Apertura:</span><span>${formatAppDate(sh.openedAt)}</span></div>
        <div class="tkt-flex"><span>Cierre:</span><span>${formatAppDate(sh.closedAt)}</span></div>
        <div class="tkt-divider"></div>
        <div class="tkt-flex"><span>Fondo Inicial de Caja:</span><span class="tkt-bold">${fmt(sh.initialCashFloat || 0)}</span></div>
        <div class="tkt-flex"><span>Ventas en Efectivo:</span><span>${fmt(sh.cashSales || 0)}</span></div>
        <div class="tkt-flex"><span>Ventas con Tarjeta:</span><span>${fmt(sh.cardSales || 0)}</span></div>
        <div class="tkt-flex"><span>Ventas por Transferencia:</span><span>${fmt(sh.transferSales || 0)}</span></div>
        <div class="tkt-flex tkt-bold" style="font-size:12px;margin-top:2px">
            <span>TOTAL VENTAS:</span><span>${fmt(sh.totalSales || 0)}</span>
        </div>
        <div class="tkt-flex"><span>Tickets Emitidos:</span><span>${sh.salesCount || 0}</span></div>
        <div class="tkt-double-divider"></div>
        <div class="tkt-flex"><span>Efectivo Esperado en Gaveta:</span><span class="tkt-bold">${fmt(sh.expectedCash || 0)}</span></div>
        <div class="tkt-flex"><span>Efectivo Físico Contado:</span><span class="tkt-bold">${fmt(sh.actualCashCount || 0)}</span></div>
        <div class="tkt-divider"></div>
        <div class="tkt-flex tkt-bold" style="font-size:13px;margin:3px 0;">
            <span>DIFERENCIA / DESCUADRE:</span><span>${diffText}</span>
        </div>
        <div class="tkt-double-divider"></div>
        <div class="tkt-center" style="font-size:9.5px">COMPROBANTE OFICIAL DE CORTE DE CAJA</div>
        <div class="tkt-center" style="font-size:9px">Firma Cajero: _________________________</div>
        <div class="tkt-center" style="font-size:9px">Firma Supervisor: _____________________</div>
    `;

    const printArea = document.getElementById('thermal-print-area');
    if(printArea){
        printArea.innerHTML = ticketHtml;
        window.print();
    }
}

// ===== APERTURA RÁPIDA DEL PORTAL DE AUTOFACTURACIÓN =====
function openSelfBillingPortalForSale(saleId){
    const sale = salesLog.find(s => s.id === saleId);
    if(!sale){
        alert("Venta no encontrada.");
        return;
    }
    if(sale.status === 'cancelled'){
        alert("Esta venta fue cancelada y no puede ser facturada.");
        return;
    }
    if(!sale.invoiceToken && window.QRService){
        sale.invoiceToken = window.QRService.ensureSaleToken ? window.QRService.ensureSaleToken(sale) : window.QRService.generateInvoiceToken();
        sale.billingStatus = sale.billingStatus || 'pending';
        localStorage.setItem('pos_sales', JSON.stringify(salesLog.slice(0, 100)));
        if(window.InvoiceService && typeof window.InvoiceService.registerLocalTicketForBilling === 'function'){
            window.InvoiceService.registerLocalTicketForBilling(sale);
        }
        if(window.FirebaseService && window.FirebaseService.sales){
            window.FirebaseService.sales.create(sale).catch(console.warn);
        }
    }
    const url = (window.QRService && window.QRService.getBillingPortalUrl)
        ? window.QRService.getBillingPortalUrl(sale.invoiceToken, sale.id)
        : `facturacion.html?token=${encodeURIComponent(sale.invoiceToken || '')}&folio=${encodeURIComponent(sale.id)}`;
    window.open(url, '_blank');
}

// ===== IMPRESIÓN DE TICKET TÉRMICO (ESC/POS 58mm/80mm) CON QR DE AUTOFACTURACIÓN =====
async function printSaleTicket(saleId){
    const sale = salesLog.find(s => s.id === saleId);
    if(!sale) { alert("Ticket no encontrado"); return; }

    // Asegurar que la venta tenga su token de autofacturación
    if(!sale.invoiceToken){
        sale.invoiceToken = (window.QRService && window.QRService.ensureSaleToken)
            ? window.QRService.ensureSaleToken(sale)
            : ('TK-' + sale.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-8));
        sale.billingStatus = sale.billingStatus || 'pending';
        localStorage.setItem('pos_sales', JSON.stringify(salesLog.slice(0, 100)));
        if(window.FirebaseService && window.FirebaseService.sales){
            window.FirebaseService.sales.create(sale).catch(console.warn);
        }
    }

    if(window.InvoiceService && typeof window.InvoiceService.registerLocalTicketForBilling === 'function'){
        window.InvoiceService.registerLocalTicketForBilling(sale);
    }

    const portalUrl = (window.QRService && window.QRService.getBillingPortalUrl)
        ? window.QRService.getBillingPortalUrl(sale.invoiceToken, sale.id)
        : `facturacion.html?token=${encodeURIComponent(sale.invoiceToken)}&folio=${encodeURIComponent(sale.id)}`;

    let qrDataUrl = '';
    if(window.QRService && window.QRService.generateQrDataUrl){
        try {
            qrDataUrl = await window.QRService.generateQrDataUrl(portalUrl, 130);
        } catch(e){
            console.warn('[Ticket QR Error]', e);
        }
    }

    const taxRate = sale.taxRate !== undefined ? sale.taxRate : currentTaxZoneRate;
    const subtotal = sale.subtotal !== undefined ? sale.subtotal : (sale.total / (1 + taxRate));
    const taxAmount = sale.taxAmount !== undefined ? sale.taxAmount : (sale.total - subtotal);
    const taxLabel = taxRate === 0.08 ? 'IVA Fronterizo (8%)' : taxRate === 0.16 ? 'IVA General (16%)' : 'IVA Tasa Cero (0%)';

    const p = sale.payment || { method: 'cash', label: 'Efectivo' };
    let payDetail = '';
    if(p.method === 'cash'){
        payDetail = `<div>Método: Efectivo</div>
                     <div class="tkt-flex"><span>Recibido:</span><span>${fmt(p.cashReceived || sale.total)}</span></div>
                     <div class="tkt-flex"><span>Cambio:</span><span>${fmt(p.change || 0)}</span></div>`;
    } else if(p.method === 'split'){
        payDetail = `<div>Método: Pago Dividido</div>
                     <div class="tkt-flex"><span>Efec: ${fmt(p.cash || 0)} | Tarj: ${fmt(p.card || 0)} | Transf: ${fmt(p.transfer || 0)}</span></div>`;
    } else {
        payDetail = `<div class="tkt-flex"><span>Método: ${p.label}</span><span>${p.reference ? 'Ref: ' + p.reference : ''}</span></div>`;
    }

    const itemsHtml = sale.items.map(it => `
        <tr>
            <td style="width:10%;text-align:left;vertical-align:top;">${it.qty}</td>
            <td style="width:46%;text-align:left;vertical-align:top;word-break:break-word;">${(it.name || '').substring(0, 20)}</td>
            <td style="width:22%;text-align:right;padding-right:8px;vertical-align:top;white-space:nowrap;" class="tkt-right">${it.price.toFixed(2)}</td>
            <td style="width:22%;text-align:right;padding-left:6px;vertical-align:top;white-space:nowrap;" class="tkt-right">${(it.qty * it.price).toFixed(2)}</td>
        </tr>
    `).join('');

    const qrBlockHtml = qrDataUrl ? `
        <div class="tkt-center" style="margin:6px 0 4px 0;">
            <img src="${qrDataUrl}" alt="QR Autofacturación" style="width:115px;height:115px;margin:0 auto;display:block;image-rendering:pixelated;" />
        </div>
    ` : '';

    const ticketHtml = `
        <div class="tkt-center tkt-bold" style="font-size:14px;letter-spacing:1px">PROCAÑA MOTORS</div>
        <div class="tkt-center">RFC: PMO240115AA1</div>
        <div class="tkt-center" style="font-size:10px">Sucursal Matriz & Almacén Central · Texcoco, Edo. de México</div>
        <div class="tkt-divider"></div>
        <div class="tkt-flex"><span>Folio:</span><span class="tkt-bold">${sale.id}</span></div>
        <div class="tkt-flex"><span>Fecha:</span><span>${formatAppDate(sale.date)}</span></div>
        <div class="tkt-flex"><span>Cajero:</span><span>@${sale.cashierUsername || 'caja'}</span></div>
        <div class="tkt-double-divider"></div>
        <table class="tkt-table" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:4px 0;">
            <thead>
                <tr>
                    <th style="width:10%;text-align:left;">Cant</th>
                    <th style="width:46%;text-align:left;">Descripción</th>
                    <th style="width:22%;text-align:right;padding-right:8px;" class="tkt-right">P.U.</th>
                    <th style="width:22%;text-align:right;padding-left:6px;" class="tkt-right">Imp</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="tkt-divider"></div>
        <div class="tkt-flex"><span>Subtotal:</span><span>${fmt(subtotal)}</span></div>
        <div class="tkt-flex"><span>${taxLabel}:</span><span>${fmt(taxAmount)}</span></div>
        <div class="tkt-flex tkt-bold" style="font-size:13px;margin-top:2px">
            <span>TOTAL:</span><span>${fmt(sale.total)}</span>
        </div>
        <div class="tkt-divider"></div>
        ${payDetail}
        <div class="tkt-double-divider"></div>
        <div class="tkt-center tkt-bold" style="font-size:10px;margin-top:2px">AUTOFACTURACIÓN ELECTRÓNICA (SIMULACIÓN)</div>
        <div class="tkt-center" style="font-size:8.5px">Escanea el código QR o ingresa tu Token en el portal:</div>
        ${qrBlockHtml}
        <div class="tkt-center tkt-bold" style="font-size:10px;letter-spacing:0.5px;">TOKEN: ${sale.invoiceToken}</div>
        <div class="tkt-center" style="font-size:8.5px;">FOLIO VENTA: ${sale.id}</div>
        <div class="tkt-center" style="font-size:8px;margin-top:2px;">DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL</div>
        <div class="tkt-divider"></div>
        <div class="tkt-center tkt-bold" style="margin-top:4px">¡GRACIAS POR SU PREFERENCIA!</div>
    `;

    const printArea = document.getElementById('thermal-print-area');
    if(printArea){
        printArea.innerHTML = ticketHtml;
        setTimeout(() => {
            window.print();
        }, 80);
    }
}
