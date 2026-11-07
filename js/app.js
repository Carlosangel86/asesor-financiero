// ===== NAVEGACIÓN, ORQUESTACIÓN & ARRANQUE DE LA APLICACIÓN =====

// ===== CONTROL RESPONSIVO MÓVIL (< 1024px) =====
let mobilePosActiveCol = 'ops';   // 'ops' | 'stats'
let mobileAdvActiveCol = 'chat';  // 'chat' | 'dash'

function switchMobilePosView(col) {
    mobilePosActiveCol = col;
    const colLeft = document.getElementById('pos-col-left');
    const colRight = document.getElementById('pos-col-right');
    const btnOps = document.getElementById('mobile-pos-btn-ops');
    const btnStats = document.getElementById('mobile-pos-btn-stats');

    if (window.innerWidth < 1024) {
        if (col === 'ops') {
            if (colLeft) { colLeft.classList.remove('hidden'); colLeft.classList.add('flex'); }
            if (colRight) { colRight.classList.add('hidden'); colRight.classList.remove('flex'); }
            if (btnOps) {
                btnOps.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm';
            }
            if (btnStats) {
                btnStats.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200';
            }
        } else {
            if (colLeft) { colLeft.classList.add('hidden'); colLeft.classList.remove('flex'); }
            if (colRight) { colRight.classList.remove('hidden'); colRight.classList.add('flex'); }
            if (btnOps) {
                btnOps.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200';
            }
            if (btnStats) {
                btnStats.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm';
            }
            if (hourlyChart) { hourlyChart.resize(); hourlyChart.update(); }
        }
    } else {
        if (colLeft) { colLeft.classList.remove('hidden'); colLeft.classList.add('flex'); }
        if (colRight) { colRight.classList.remove('hidden'); colRight.classList.add('flex'); }
    }
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function switchMobileAdvView(col) {
    mobileAdvActiveCol = col;
    const colChat = document.getElementById('adv-col-chat');
    const colDash = document.getElementById('adv-col-dash');
    const btnChat = document.getElementById('mobile-adv-btn-chat');
    const btnDash = document.getElementById('mobile-adv-btn-dash');

    if (window.innerWidth < 1024) {
        if (col === 'chat') {
            if (colChat) { colChat.classList.remove('hidden'); colChat.classList.add('flex'); }
            if (colDash) { colDash.classList.add('hidden'); colDash.classList.remove('flex'); }
            if (btnChat) {
                btnChat.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm';
            }
            if (btnDash) {
                btnDash.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200';
            }
        } else {
            if (colChat) { colChat.classList.add('hidden'); colChat.classList.remove('flex'); }
            if (colDash) { colDash.classList.remove('hidden'); colDash.classList.add('flex'); }
            if (btnChat) {
                btnChat.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200';
            }
            if (btnDash) {
                btnDash.className = 'py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm';
            }
        }
    } else {
        if (colChat) { colChat.classList.remove('hidden'); colChat.classList.add('flex'); }
        if (colDash) { colDash.classList.remove('hidden'); colDash.classList.add('flex'); }
    }
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

window.addEventListener('resize', function() {
    if (window.innerWidth >= 1024) {
        const colLeft = document.getElementById('pos-col-left');
        const colRight = document.getElementById('pos-col-right');
        if (colLeft) { colLeft.classList.remove('hidden'); colLeft.classList.add('flex'); }
        if (colRight) { colRight.classList.remove('hidden'); colRight.classList.add('flex'); }

        const colChat = document.getElementById('adv-col-chat');
        const colDash = document.getElementById('adv-col-dash');
        if (colChat) { colChat.classList.remove('hidden'); colChat.classList.add('flex'); }
        if (colDash) { colDash.classList.remove('hidden'); colDash.classList.add('flex'); }
    } else {
        switchMobilePosView(mobilePosActiveCol);
        switchMobileAdvView(mobileAdvActiveCol);
    }
});

// ===== NAVIGATION =====
let posViewMode = 'today';
function goTo(v){
    // 0. Bloqueo estricto si no hay sesión activa
    if (!currentUser) {
        if (typeof showAuthModal === 'function') showAuthModal('login');
        return;
    }
    // 1. Verificación de Seguridad y Permisos por Pantalla
    if(v === 'advisor'){
        const canAccessAdvisor = hasPermission('finance.view_analysis') || hasPermission('ai.qwen_access') || hasPermission('ai.tax_access');
        if(!canAccessAdvisor){
            const rName = currentUser ? currentUser.role.toUpperCase() : 'SIN SESIÓN';
            showAccessDeniedModal(`Acceso Restringido: Tu perfil (${rName}) no tiene permisos para acceder a la Asesoría Financiera, proyecciones ni valuación del negocio.`);
            return;
        }
    }

    if(v === 'pos'){
        const canAccessPos = hasPermission('pos.sell') || hasPermission('catalog.view') || hasPermission('pos.stats_view') || hasPermission('pos.almacen_view') || hasPermission('inventory.view');
        if(!canAccessPos){
            showAccessDeniedModal(`Acceso Restringido: Tu perfil no cuenta con permisos para operar el Punto de Venta.`);
            return;
        }
    }

    ['menu','advisor','pos'].forEach(n => {
        const el = document.getElementById('view-' + n);
        if(el) el.classList.toggle('hidden', n !== v);
    });

    // Recordar la vista actual para restaurarla al recargar la página
    try { sessionStorage.setItem('procana_last_view', v); } catch(e){}

    if(v === 'pos'){
        updateShiftUI();
        const dateEl = document.getElementById('pos-date');
        if(dateEl) dateEl.textContent = formatAppDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        applyRoleUI();
        if(!hourlyChart) initHourlyChart();
        if(hourlyChart) { hourlyChart.resize(); hourlyChart.update(); }
        if (window.innerWidth < 1024) switchMobilePosView(mobilePosActiveCol);
    }
    if(v === 'advisor'){
        if(typeof restoreAdvisorState === 'function') restoreAdvisorState();
        checkPosData();
        updateInitialHints();
        if (window.innerWidth < 1024) switchMobileAdvView(mobileAdvActiveCol);
    }
    const btnBack = document.getElementById('btn-header-back-menu');
    if(btnBack) btnBack.classList.toggle('hidden', v === 'menu');

    const headerPosActions = document.getElementById('header-pos-actions');
    if(headerPosActions) headerPosActions.classList.toggle('hidden', v !== 'pos');

    if(v === 'menu'){
        updateMenuIndicators();
    }
    if(window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// ===== RESTAURAR VISTA TRAS RECARGA (F5) =====
// Verifica permisos sin mostrar modales; si el rol ya no tiene acceso, cae al menú.
function canAccessViewSilently(v){
    if(!currentUser) return false;
    if(v === 'advisor') return hasPermission('finance.view_analysis') || hasPermission('ai.qwen_access') || hasPermission('ai.tax_access');
    if(v === 'pos') return hasPermission('pos.sell') || hasPermission('catalog.view') || hasPermission('pos.stats_view') || hasPermission('pos.almacen_view') || hasPermission('inventory.view');
    return v === 'menu';
}

function canAccessPosTabSilently(mode){
    if(mode === 'today') return hasPermission('pos.today_view');
    if(mode === 'stats') return hasPermission('pos.stats_view');
    if(mode === 'almacen') return hasPermission('pos.almacen_view');
    return ['shifts', 'invoices'].includes(mode);
}

function restoreLastView(){
    let v = 'menu';
    try { v = sessionStorage.getItem('procana_last_view') || 'menu'; } catch(e){}
    if(!canAccessViewSilently(v)) v = 'menu';
    goTo(v);

    if(v === 'pos'){
        let tab = null;
        try { tab = sessionStorage.getItem('procana_last_pos_tab'); } catch(e){}
        if(tab && canAccessPosTabSilently(tab)) showPosViewMode(tab);
    }
}

function showPosViewMode(mode){
    if(mode === 'today' && !hasPermission('pos.today_view')){
        showAccessDeniedModal('Tu rol no tiene acceso al corte de caja ni al resumen de hoy.');
        return;
    }
    if(mode === 'stats' && !hasPermission('pos.stats_view')){
        showAccessDeniedModal('Tu rol no tiene autorización para consultar estadísticas ni correlaciones.');
        return;
    }
    if(mode === 'almacen' && !hasPermission('pos.almacen_view')){
        showAccessDeniedModal('Tu rol no tiene acceso al panel de control de almacén.');
        return;
    }

    posViewMode = mode;
    try { sessionStorage.setItem('procana_last_pos_tab', mode); } catch(e){}
    if (window.innerWidth < 1024) switchMobilePosView('stats');
    ['today', 'stats', 'almacen', 'shifts', 'invoices'].forEach(m => {
        const el = document.getElementById('pos-panel-' + m);
        const btn = document.getElementById('btn-pos-' + m);
        const isActive = m === mode;
        if(el) el.classList.toggle('hidden', !isActive);
        if(btn){
            if(isActive){
                btn.classList.add('tab-on');
                btn.classList.remove('text-slate-500');
                try { btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } catch(e){}
            } else {
                btn.classList.remove('tab-on');
                btn.classList.add('text-slate-500');
            }
        }
    });

    if(mode === 'today') upPosSummary();
    if(mode === 'stats') {
        upPosStats();
        if(hourlyChart) { hourlyChart.resize(); hourlyChart.update(); }
    }
    if(mode === 'almacen') renderAlmacenDashboard();
    if(mode === 'shifts' && typeof renderShiftsHistoryView === 'function') renderShiftsHistoryView();
    if(mode === 'invoices' && typeof renderAdminInvoicesView === 'function') renderAdminInvoicesView();
    lucide.createIcons();
}

function renderAlmacenDashboard(){
    const totalProds = catalog.length;
    const totalUnits = catalog.reduce((acc, p) => acc + (p.stock || 0), 0);
    const lowStockProds = catalog.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.rop || 5));
    const outStockProds = catalog.filter(p => (p.stock || 0) <= 0);

    const elTotP = document.getElementById('alm-total-prods');
    const elTotU = document.getElementById('alm-total-units');
    const elLow = document.getElementById('alm-low-stock');
    const elOut = document.getElementById('alm-out-stock');

    if(elTotP) elTotP.textContent = totalProds;
    if(elTotU) elTotU.textContent = totalUnits;
    if(elLow) elLow.textContent = lowStockProds.length;
    if(elOut) elOut.textContent = outStockProds.length;

    const criticalList = [...outStockProds, ...lowStockProds];
    const critContainer = document.getElementById('alm-critical-list');
    if(!critContainer) return;

    if(criticalList.length === 0){
        critContainer.innerHTML = '<div class="text-emerald-400 text-xs py-6 text-center font-medium">✓ Todos los productos cuentan con inventario saludable (> 5 unidades).</div>';
    } else {
        critContainer.innerHTML = criticalList.map(p => {
            const isZero = (p.stock || 0) <= 0;
            const ropThreshold = p.rop || 5;
            const imgSrc = typeof resolveProductImage === 'function' ? resolveProductImage(p) : (p.image || '');
            const imgTag = imgSrc
                ? `<div class="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center"><img src="${imgSrc}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover"></div>`
                : `<div class="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center text-slate-500"><i data-lucide="package" class="w-4 h-4"></i></div>`;
            const badge = isZero
                ? `<span class="pill bg-rose-500/20 text-rose-300 border border-rose-500/35 font-bold text-[9px] flex items-center gap-1"><i data-lucide="alert-octagon" class="w-2.5 h-2.5 text-rose-400"></i>AGOTADO (0 u.)</span>`
                : `<span class="pill bg-amber-500/20 text-amber-300 border border-amber-500/35 font-bold text-[9px] flex items-center gap-1"><i data-lucide="alert-triangle" class="w-2.5 h-2.5 text-amber-400"></i>ROP Crítico (${p.stock} <= ${ropThreshold} u.)</span>`;
            return `
            <div class="pos-row flex items-center justify-between gap-3 p-2.5 bg-slate-900/50 border border-slate-800 rounded-xl">
                ${imgTag}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span class="text-xs font-semibold text-white truncate">${p.name}</span>
                        ${badge}
                    </div>
                    <div class="text-[10px] text-slate-400 mono">P. Venta: ${fmt(p.price)} · Existencia: <b class="${isZero ? 'text-rose-400' : 'text-amber-400'}">${p.stock || 0} u.</b> · ROP: <span class="text-sky-300">${ropThreshold} u.</span> (Lead Time: ${p.leadTime || 7}d)</div>
                </div>
                <button onclick="quickAddStock('${p.id}', 10)" class="pos-btn bg-teal-600 hover:bg-teal-500 text-white text-[10.5px] py-1 px-2.5 shrink-0 flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i>+10 u.
                </button>
            </div>`;
        }).join('');
    }
    lucide.createIcons();
}

function syncAndGoToAdvisor(monthKey){
    goTo('advisor');
    syncFromPos(monthKey);
}

function updateMenuIndicators(){
    const posData = typeof getPosFinancials === 'function' ? getPosFinancials() : null;
    const ind = document.getElementById('menu-pos-indicator');
    const cnt = document.getElementById('menu-pos-count');
    if(posData && (posData.totalSales > 0 || posData.totalExpensesCount > 0)){
        if(ind) ind.classList.remove('hidden');
        if(cnt){
            cnt.classList.remove('hidden');
            cnt.innerHTML = `<i data-lucide="database" class="w-3 h-3"></i>${posData.totalSales} ventas · ${posData.totalExpensesCount || 0} gastos`;
        }
    } else {
        if(ind) ind.classList.add('hidden');
        if(cnt) cnt.classList.add('hidden');
    }

    // Adaptar Menú Principal según rol activo
    const canAdv = hasPermission('finance.view_analysis') || hasPermission('ai.qwen_access') || hasPermission('ai.tax_access');
    const cardAdv = document.getElementById('menu-card-advisor');
    const badgeAdv = document.getElementById('menu-adv-role-badge');
    const badgePos = document.getElementById('menu-pos-role-badge');
    const descPos = document.getElementById('menu-pos-desc');

    if(cardAdv){
        cardAdv.style.opacity = canAdv ? '1' : '0.45';
        cardAdv.style.cursor = canAdv ? 'pointer' : 'not-allowed';
    }
    if(badgeAdv){
        badgeAdv.innerHTML = canAdv
            ? `<span class="pill bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[9.5px]">✓ Módulo Habilitado</span>`
            : `<span class="pill bg-rose-500/20 text-rose-300 border border-rose-500/35 text-[9.5px] font-bold">🔒 No Disponible para ${currentUser ? currentUser.role.toUpperCase() : ''}</span>`;
    }

    if(badgePos && currentUser){
        const roleNotes = {
            cajero: 'Caja Registradora y Ventas del Turno',
            almacen: 'Catálogo de Refacciones e Inventario',
            analista: 'Estadísticas, Top Ventas y Correlaciones',
            supervisor: 'Operación de Ventas, Caja y Cancelaciones',
            admin: 'Control Total de Operaciones'
        };
        badgePos.innerHTML = `<span class="pill bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9.5px]">Acceso: ${roleNotes[currentUser.role] || 'Habilitado'}</span>`;
        if(descPos){
            const descNotes = {
                cajero: 'Módulo exclusivo para registro de ventas, selección de método de pago y tickets.',
                almacen: 'Módulo exclusivo para alta de productos y reabastecimiento de existencias (eliminación restringida a Administrador).',
                analista: 'Módulo de análisis: consulta de productos más vendidos y correlación cruzada.',
                supervisor: 'Supervisión operativa, cierres de caja y aprobación de cancelaciones.',
                admin: 'Registro de tickets, corte de caja, catálogo, gastos y administración de usuarios.'
            };
            descPos.textContent = descNotes[currentUser.role] || descPos.textContent;
        }
    }
    lucide.createIcons();
}

function checkPosData(){
    if(typeof updateAdvisorPosLiveBar === 'function') updateAdvisorPosLiveBar();
    const posData = typeof getPosFinancials === 'function' ? getPosFinancials() : null;
    const banner = document.getElementById('pos-sync-banner');
    if(!banner) return;
    if(!posData || (posData.totalSales === 0 && (posData.totalExpensesCount || 0) === 0)){
        banner.classList.add('hidden');
        return;
    }
    // Verificar si ya está sincronizado con los mismos valores
    const alreadySynced = (
        (posData.totalSales > 0 ? S.rev === posData.totalRevenue : true) &&
        (posData.fixedExpenses > 0 ? S.fixed_costs === posData.fixedExpenses : true) &&
        (S.pos_variable_expenses === (posData.variableExpenses || 0))
    );
    if(alreadySynced && (S.rev !== null || S.fixed_costs !== null)){
        banner.classList.add('hidden');
        return;
    }
    banner.classList.remove('hidden');
    banner.innerHTML=`
    <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/8 backdrop-blur-md">
        <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/20"><i data-lucide="link-2" class="text-white w-5 h-5"></i></div>
            <div class="flex-1">
                <div class="text-sm font-bold text-emerald-300 mb-1 flex items-center gap-2">Datos reales del Mostrador disponibles <span class="pill bg-emerald-900/60 text-emerald-400 border border-emerald-700/50">${posData.monthLabel || 'POS'}</span></div>
                <div class="text-[12px] text-emerald-200/80 leading-relaxed mb-2.5">
                    Registros del periodo: <b>${posData.totalSales} venta(s)</b> (<b class="text-emerald-400">${fmt(posData.totalRevenue)}</b>) ·
                    Gastos Fijos: <b class="text-rose-400">${fmt(posData.fixedExpenses)}</b> ·
                    Costos Variables (Mercancía + Var): <b class="text-amber-400">${fmt(posData.totalVariableCosts)}</b>.
                </div>
                <div class="flex gap-2">
                    <button onclick="syncFromPos('${posData.monthKey || ''}')" class="pos-btn bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"><i data-lucide="zap" class="w-3.5 h-3.5"></i>Sincronizar con Dashboard</button>
                    <button onclick="document.getElementById('pos-sync-banner').classList.add('hidden')" class="pos-btn bg-slate-700/60 hover:bg-slate-600 text-slate-300 text-[11px]"><i data-lucide="x" class="w-3.5 h-3.5"></i>Mantener Simulación Actual</button>
                </div>
            </div>
        </div>
    </div>`;
    lucide.createIcons();
}

async function syncFromPos(monthKey){
    const posData = typeof getPosFinancials === 'function' ? getPosFinancials(monthKey) : null;
    if(!posData || (posData.totalSales === 0 && (posData.totalExpensesCount || 0) === 0)){
        alert('Aún no hay ventas ni gastos registrados en el Punto de Venta para este periodo.');
        return;
    }
    if(busy) return;

    // 1. Conectar Costos Fijos, Variables y Otros clasificados en el POS al estado del Asesor (S)
    if(posData.fixedExpenses > 0){
        S.fixed_costs = posData.fixedExpenses;
    }
    S.pos_variable_expenses = posData.variableExpenses || 0;
    S.pos_other_expenses = posData.otherExpenses || 0;

    // 2. Conectar Ventas si existen ventas cobradas en el periodo; si solo hay gastos, preservar o calcular punto de equilibrio
    if(posData.totalSales > 0){
        S.rev = posData.totalRevenue;
        S.cost = posData.totalOperatingCosts;
        if(posData.grossMarginDecimal !== null && posData.grossMarginDecimal > 0){
            S.gross_margin = Number(posData.grossMarginDecimal.toFixed(4));
        }
    } else {
        if(S.rev === null || S.rev === 0){
            S.cost = posData.totalOperatingCosts;
        }
    }

    const bannerEl = document.getElementById('pos-sync-banner');
    if(bannerEl) bannerEl.classList.add('hidden');

    const periodTitle = posData.monthLabel || 'Mes Actual';
    const userMsg = `📊 Sincronizar corte real de Mostrador (${periodTitle}): Ventas ${fmt(posData.totalRevenue)}, Gastos Fijos ${fmt(posData.fixedExpenses)}, Costos Variables ${fmt(posData.totalVariableCosts)}${posData.otherExpenses > 0 ? ', Otros ' + fmt(posData.otherExpenses) : ''}.`;
    addMsg(userMsg, 'u');

    busy = true;
    const iwEl = document.getElementById('iw');
    if(iwEl) iwEl.classList.add('lock');
    const hintsEl = document.getElementById('hints');
    if(hintsEl) hintsEl.innerHTML = '';
    const typEl = document.getElementById('typ');
    if(typEl) typEl.classList.remove('hidden');

    try{
        alog('POS Sync — importing segregated monthly data');
        await phase('Orch','SYNCING POS','bg-emerald-500',500);
        const oJ = document.getElementById('oJ');
        if(oJ) oJ.textContent = JSON.stringify(S,null,2);
        upQ();
        st('Orch','POS SYNCED','bg-emerald-600');

        await phase('Eng','CALCULATING','bg-amber-500',400);
        const R = calc();
        if(oJ) oJ.textContent = JSON.stringify(S,null,2);
        const oM = document.getElementById('oM');
        if(oM) oM.textContent = JSON.stringify(R,null,2);
        st('Eng','DONE','bg-emerald-600');
        upDash(R);
        upRatios(R);
        if(typeof upPosSummary === 'function') upPosSummary();
        if(typeof updateAdvisorPosLiveBar === 'function') updateAdvisorPosLiveBar();

        alog('POS data integrated');
        await slp(400);
        if(typEl) typEl.classList.add('hidden');

        let msg = `<div class="flex items-center gap-2 mb-2"><span class="pill bg-emerald-900/60 text-emerald-400 border border-emerald-700/50"><i data-lucide="link-2" class="w-3 h-3 inline"></i> POS Sync · ${periodTitle}</span><span class="text-emerald-400 font-bold text-[11px]">Corte sincronizado con éxito</span></div>`;
        msg += `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
            <div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-emerald-500/25">
                <div class="text-[8px] text-emerald-400 uppercase font-bold">Ventas Periodo</div>
                <div class="text-sm font-bold mono text-emerald-400 mt-1">${fmt(posData.totalRevenue)}</div>
            </div>
            <div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-rose-500/25">
                <div class="text-[8px] text-rose-400 uppercase font-bold">Gastos Fijos</div>
                <div class="text-sm font-bold mono text-rose-400 mt-1">${fmt(posData.fixedExpenses)}</div>
            </div>
            <div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-amber-500/25">
                <div class="text-[8px] text-amber-400 uppercase font-bold">Costos Variables</div>
                <div class="text-sm font-bold mono text-amber-400 mt-1">${fmt(posData.totalVariableCosts)}</div>
            </div>
            <div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/40">
                <div class="text-[8px] text-slate-400 uppercase font-bold">Otros Gastos</div>
                <div class="text-sm font-bold mono text-slate-300 mt-1">${fmt(posData.otherExpenses)}</div>
            </div>
        </div>`;
        msg += exp("Integración Contable Mostrador ➔ Asesor", `Se integraron los registros reales de <b>${periodTitle}</b> clasificando los Gastos Fijos (${fmt(posData.fixedExpenses)}) en tu estructura mensual y sumando los Gastos Variables (${fmt(posData.variableExpenses)}) más el costo de refacciones vendidas (${fmt(posData.totalCogs)}) como Costos Variables.`);
        addMsg(msg,'b');
        advStep();
        saveAdv(R, userMsg);
        askOllama(userMsg, R, S);
    }catch(e){
        alog('[ERR] '+e.message);
        if(typEl) typEl.classList.add('hidden');
        addMsg('Error al sincronizar. Revisa logs.','b');
    }finally{
        busy = false;
        if(iwEl) iwEl.classList.remove('lock');
    }
}
if(typeof window !== 'undefined'){
    window.syncFromPos = syncFromPos;
    window.syncAndGoToAdvisor = syncAndGoToAdvisor;
}



// ===== MODAL DE UBICACIÓN Y MAPA DE SUCURSAL MATRIZ (LEAFLET + OSM) =====
let branchMapInstance = null;

function openBranchModal(){
    const modal = document.getElementById('branch-modal');
    if(!modal) return;
    modal.classList.remove('hidden');
    renderBranchMap();
    setTimeout(() => {
        if(branchMapInstance){
            branchMapInstance.invalidateSize();
            branchMapInstance.setView([19.497626595933546, -98.890946969816], 16);
        }
    }, 160);
    if(window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function closeBranchModal(){
    const modal = document.getElementById('branch-modal');
    if(modal) modal.classList.add('hidden');
}

function copyBranchCoordinates(){
    const text = "19.497626595933546, -98.890946969816";
    const updateBtn = () => {
        const btnTxt = document.getElementById('btn-copy-coords-txt');
        if(btnTxt){
            const old = btnTxt.textContent;
            btnTxt.textContent = "¡Copiado!";
            setTimeout(() => { btnTxt.textContent = old; }, 2000);
        }
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(updateBtn).catch(() => {
            fallbackCopy(text, updateBtn);
        });
    } else {
        fallbackCopy(text, updateBtn);
    }
}

function fallbackCopy(text, cb){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); if(cb) cb(); } catch(e){}
    document.body.removeChild(ta);
}

document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
        closeBranchModal();
    }
});

function renderBranchMap(){
    const mapEl = document.getElementById('branch-map');
    if(!mapEl || typeof L === 'undefined') return;

    const coords = [19.497626595933546, -98.890946969816];

    if(!branchMapInstance){
        branchMapInstance = L.map('branch-map', {
            zoomControl: false,
            attributionControl: true
        }).setView(coords, 16);

        // Capa OpenStreetMap limpia y 100% gratuita sin marcas de agua ni API key
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        }).addTo(branchMapInstance);

        // Control de zoom en la esquina superior derecha
        L.control.zoom({ position: 'topright' }).addTo(branchMapInstance);

        // Pin de radar verde esmeralda neón
        const pulsePin = L.divIcon({
            className: 'custom-map-pin',
            html: `
                <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
                    <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(16,185,129,0.35);animation:pulse-map 2s infinite ease-in-out;"></div>
                    <div style="position:absolute;width:16px;height:16px;border-radius:50%;background:#10b981;border:2.5px solid #ffffff;box-shadow:0 0 14px #10b981;"></div>
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -18]
        });

        const marker = L.marker(coords, { icon: pulsePin }).addTo(branchMapInstance);
        marker.bindPopup(`
            <div style="font-family:'Inter',sans-serif;padding:3px 2px;min-width:190px;">
                <div style="font-weight:700;font-size:12px;color:#38bdf8;margin-bottom:2px;display:flex;align-items:center;gap:4px;">
                    <span>📍 Procaña Motors — Matriz & Almacén</span>
                </div>
                <div style="font-size:11px;color:#cbd5e1;line-height:1.4;">Texcoco / Chapingo, Edo. de México</div>
                <div style="font-size:10px;color:#10b981;font-weight:600;margin-top:3px;">● 100 Refacciones en Inventario Activo</div>
                <div style="font-size:9.5px;color:#94a3b8;font-family:monospace;margin-top:3px;">19.4976° N, 98.8909° W</div>
            </div>
        `).openPopup();
    }
}

// ===== INICIALIZACIÓN GLOBAL DEL SISTEMA CON FIREBASE =====
// Si se restauró el Punto de Venta tras recargar, repintar la pestaña activa ya con los datos cargados
function refreshRestoredPosTab(){
    const posView = document.getElementById('view-pos');
    if (!currentUser || !posView || posView.classList.contains('hidden')) return;
    if (canAccessPosTabSilently(posViewMode)) showPosViewMode(posViewMode);
}

async function startApp() {
    if (window.FirebaseService) {
        await initAuthAndUsers();
        if (typeof initPosData === 'function') await initPosData();
        refreshRestoredPosTab();
    } else {
        window.addEventListener('firebase-initialized', async () => {
            await initAuthAndUsers();
            if (typeof initPosData === 'function') await initPosData();
            refreshRestoredPosTab();
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons();
            }
        }, { once: true });
        // Fallback por si el evento ya se ejecutó
        setTimeout(async () => {
            if (!currentUser) {
                await initAuthAndUsers();
                if (typeof initPosData === 'function') await initPosData();
            }
        }, 1800);
    }
    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
