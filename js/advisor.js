// ===== ASESOR FINANCIERO, PROYECCIONES & IA COPILOT =====

// ===== SCOPED FINANCIAL CONTEXT PARA IA =====
function buildScopedFinancialContext(rawContext){
    const role = currentUser ? currentUser.role : 'cajero';
    
    if(role === 'cajero'){
        const ownActiveSales = salesLog.filter(s => s.status !== 'cancelled' && (s.cashierId === (currentUser ? currentUser.id : '') || s.cashierUsername === (currentUser ? currentUser.username : '')));
        const ownRevenue = ownActiveSales.reduce((sum, s) => sum + s.total, 0);
        return {
            scope: 'cajero_turno_personal',
            cashier: currentUser ? currentUser.name : 'Cajero',
            activeShiftTickets: ownActiveSales.length,
            shiftTotalSales: ownRevenue,
            restrictedMetrics: 'Costos de adquisición, márgenes brutos/netos, inversión inicial, ventas meta corporativas, EBITDA y proyecciones fiscales SAT confidenciales por política corporativa.'
        };
    }

    if(role === 'supervisor'){
        const activeSales = salesLog.filter(s => s.status !== 'cancelled');
        const totalRev = activeSales.reduce((sum, s) => sum + s.total, 0);
        const daySet = new Set(activeSales.map(s => new Date(s.date).toDateString()));
        return {
            scope: 'supervisor_operativo',
            totalActiveTickets: activeSales.length,
            daysRecorded: daySet.size,
            operationalSalesRevenue: totalRev,
            inventoryItemsCount: catalog.length,
            pendingCancelRequests: cancelRequests.filter(r => r.status === 'pending').length,
            note: 'Contexto limitado a operaciones diarias y arqueos de caja.'
        };
    }

    // Analista y Administrador tienen acceso financiero integral
    return rawContext;
}

// ===== ADVISOR MODULE =====
let busy=false,stepN=0,advisorRestoredOnce=false,initialNarrativeSent=false;
const S={
    rev:null,
    cost:null,
    fixed_costs:null,
    gross_margin:null,
    tax:null,
    industry:null,
    loan:null,
    loanRate:null,
    loanYears:null,
    initial_investment:null,
    target_margin:null,
    target_sales:null
};

// Exponer S globalmente para sincronización con POS y barra de avance diaria
window.S = S;

Chart.defaults.color='#475569';Chart.defaults.font.family='Inter';
let donut,bars;
function initCharts(){
    const elDonut = document.getElementById('cDonut');
    if(elDonut && !donut) {
        donut=new Chart(elDonut,{type:'doughnut',data:{labels:['Costos','Ganancia'],datasets:[{data:[1,0],backgroundColor:['#1e293b','#0f172a'],borderWidth:0,borderRadius:5}]},options:{cutout:'74%',layout:{padding:{top:8,bottom:8}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+': '+fmt(c.raw)}}},responsive:true,maintainAspectRatio:false}});
    }
    const elBars = document.getElementById('cBars');
    if(elBars && !bars) {
        bars=new Chart(elBars,{
            type:'bar',
            data:{
                labels:['Año 1','Año 2','Año 3'],
                datasets:[
                    {label:'Flujo Libre',data:[0,0,0],backgroundColor:'rgba(14,165,233,.55)',borderRadius:8,borderSkipped:false},
                    {label:'Deuda',data:[0,0,0],backgroundColor:'rgba(244,63,94,.4)',borderRadius:8,borderSkipped:false},
                    {label:'Flujo Meta',data:[0,0,0],backgroundColor:'rgba(16,185,129,.45)',borderColor:'#10b981',borderWidth:1,borderRadius:8,borderSkipped:false}
                ]
            },
            options:{
                responsive:true,
                maintainAspectRatio:false,
                plugins:{legend:{position:'bottom',labels:{font:{size:9},boxWidth:10}}},
                scales:{
                    x:{grid:{display:false},border:{display:false}},
                    y:{ticks:{callback:v=>fmtS(v)},grid:{color:'rgba(51,65,85,.4)'},border:{display:false}}
                }
            }
        });
    }
}
initCharts();

function showAdvTab(t){
    if (window.innerWidth < 1024 && typeof switchMobileAdvView === 'function') {
        switchMobileAdvView('dash');
    }
    ['dash','ratios','back','amor'].forEach(n=>{
        const vn=document.getElementById('v-'+n);
        if(vn)vn.classList.toggle('hidden',n!==t);
        const b=document.getElementById('t-'+n);
        if(b){
            if(n===t){
                b.classList.add('tab-on');
                b.classList.remove('text-slate-500');
                try{b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});}catch(e){}
            }else{
                b.classList.remove('tab-on');
                b.classList.add('text-slate-500');
            }
        }
    });
}

function setHints(a){const hEl=document.getElementById('hints');if(!hEl)return;hEl.innerHTML=a.map(h=>`<button onclick="useH(\`${h.t}\`)" class="whitespace-nowrap px-3 py-2 rounded-full bg-slate-800/70 hover:bg-slate-700 border border-slate-700/60 text-[11px] text-slate-300 transition shadow flex items-center gap-1.5 shrink-0"><i data-lucide="zap" class="w-3 h-3 text-sky-500"></i>${h.l}</button>`).join('');if(typeof lucide!=='undefined'&&lucide.createIcons)lucide.createIcons();}
function updateInitialHints(){
    const hints=[
        {l:'🎯 Inversión 1M + Margen 20%',t:'Invertí 1 millón de pesos, mis ventas son de 250 mil al mes, costos de 180 mil y quiero un margen del 20%.'},
        {l:'Ej: Ventas 500k, costos 430k',t:'Mis ingresos son de 500 mil pesos al mes y mis costos operativos suman unos 430 mil.'},
        {l:'⚖️ Régimen Fiscal (Gemini)',t:'¿Qué régimen fiscal me conviene escoger según las actividades de mi negocio?'}
    ];
    try {
        const posData = typeof getPosFinancials === 'function' ? getPosFinancials() : null;
        if(posData) hints.unshift({l:'⚡ Importar datos del POS',t:'__POS_SYNC__'});
    } catch(e) {
        console.warn('[getPosFinancials no disponible al inicio]', e);
    }
    setHints(hints);
}
updateInitialHints();
function useH(t){if(!busy){if(t==='__POS_SYNC__'){syncFromPos();return;}const mEl=document.getElementById('msg');if(mEl)mEl.value=t;sendAdv();}}

async function sendAdv(){
    if(busy)return;
    const el=document.getElementById('msg');
    const txt=el?el.value.trim():'';
    if(!txt)return;
    busy=true;
    const iw=document.getElementById('iw');
    if(iw)iw.classList.add('lock');
    const hEl=document.getElementById('hints');
    if(hEl)hEl.innerHTML='';
    addMsg(txt,'u');
    if(el)el.value='';
    const typ=document.getElementById('typ');
    if(typ)typ.classList.remove('hidden');
    try{
        alog('NLP Extraction');
        await phase('Orch','EXTRACTING','bg-indigo-500',700);
        parse(txt);
        const oJ=document.getElementById('oJ');
        if(oJ)oJ.textContent=JSON.stringify(S,null,2);
        upQ();
        st('Orch','EXTRACTED','bg-emerald-600');

        await phase('Eng','CALCULATING','bg-amber-500',500);
        const R=calc();
        // Actualizar oJ también después de calc() para reflejar S.target_sales calculado
        if(oJ)oJ.textContent=JSON.stringify(S,null,2);
        const oM=document.getElementById('oM');
        if(oM)oM.textContent=JSON.stringify(R,null,2);
        st('Eng','DONE','bg-emerald-600');

        try { upDash(R); } catch(de){ console.warn('[upDash warn]', de); }
        try { upRatios(R); } catch(re){ console.warn('[upRatios warn]', re); }
        try { if(typeof upPosSummary === 'function') upPosSummary(); } catch(pe){}

        alog('Narrating');
        await slp(300);

        // Enviar desglose cuantitativo (narrate) ÚNICAMENTE en la primera consulta del asesor
        if(!initialNarrativeSent){
            initialNarrativeSent = true;
            if(typ) typ.classList.add('hidden');
            addMsg(narrate(R), 'b');
        }
        try { advStep(); } catch(ae){ console.warn('[advStep warn]', ae); }
        try { saveAdv(R, txt); } catch(se){ console.warn('[saveAdv warn]', se); }

        // Check if query is about tax regime or fiscal advice
        const lo = txt.toLowerCase();
        const isFiscal = lo.match(/r[eé]gimen|fiscal|sat|impuesto|tributar|persona\s*moral|persona\s*f[ií]sica|resico|qu[eé]\s*me\s*conviene|qu[eé]\s*r[eé]gimen/);
        if(isFiscal){
            await askGemmaFiscal(txt, R, S);
        } else {
            await askOllama(txt, R, S);
        }
    }catch(e){
        console.error('[sendAdv error]', e);
        alog('[ERR] '+e.message);
        if(typ)typ.classList.add('hidden');
        addMsg(`<div class="text-rose-400 text-xs">⚠️ Error en el procesamiento: ${e.message}</div>`,'b');
    }
    finally{
        busy=false;
        if(iw)iw.classList.remove('lock');
    }
}

// ===== LLM & ASISTENTE INTELIGENTE (FIREBASE AI LOGIC / OPENROUTER / OLLAMA) =====

async function callOpenRouterAI(messages, model) {
    const config = window.AI_CONFIG || {};
    const apiKey = config.apiKey || localStorage.getItem('openrouter_api_key') || '';

    // Preferente: Firebase AI Logic (Gemini) sin API Key expuesta en el cliente
    if (window.AIService) {
        try {
            return await window.AIService.generate(messages);
        } catch (aiErr) {
            console.warn('[Firebase AI Logic Error]', aiErr);
            if (!apiKey) throw aiErr;
        }
    }
    if (!apiKey) return null;

    const targetModel = model || config.model || 'google/gemini-3.8-flash';
    const siteUrl = config.siteUrl || window.location.origin;
    const siteName = config.siteName || 'Procaña Motors - Finanzas';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': siteUrl,
            'X-Title': siteName
        },
        body: JSON.stringify({
            model: targetModel,
            messages: messages,
            temperature: 0.4
        })
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Error HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
        text: data?.choices?.[0]?.message?.content || 'Sin respuesta del modelo.',
        model: data?.model || targetModel
    };
}

// Construye el bloque estructurado de métricas tácticas y brecha operativa
function buildTacticalMetricsBlock(S, R) {
    const role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : 'cajero';
    if (role === 'cajero') {
        return 'Contexto restringido a ventas operativas del turno del cajero.';
    }

    const posData = typeof getPosFinancials === 'function' ? getPosFinancials() : null;
    // Priorizar siempre S.rev ingresado o sincronizado en el modelo activo; usar posData solo como respaldo si S.rev es null
    const currentSales = S.rev !== null ? S.rev : (posData ? posData.avgRevenue : null);
    const fixedCostsVal = S.fixed_costs !== null ? S.fixed_costs : (S.cost !== null ? Math.round(S.cost * 0.35) : null);
    const targetSales = S.target_sales || (R && R.meta ? R.meta.targetSales : null);
    const breakeven = R && R.ratios ? R.ratios.formalBreakeven : null;
    const grossMargin = R && R.ratios && R.ratios.grossMargin !== null ? R.ratios.grossMargin.toFixed(1) + '%' : 'No calculado';
    const contribMargin = R && R.ratios && R.ratios.contributionMargin !== null ? R.ratios.contributionMargin.toFixed(1) + '%' : 'No calculado';
    const roiVal = R && R.ratios && R.ratios.roi !== null ? R.ratios.roi.toFixed(1) + '%' : 'No calculado';
    const targetMarginPct = S.target_margin !== null ? ((S.target_margin > 1 ? S.target_margin : S.target_margin * 100).toFixed(1) + '%') : 'No definido';
    const invInicial = S.initial_investment !== null ? fmt(S.initial_investment) : 'No especificada';

    let formulaExplanation = 'Pendiente de parámetros.';
    if (fixedCostsVal !== null && R && R.ratios && R.ratios.contributionMargin !== null && S.target_margin !== null && targetSales !== null) {
        const mcDec = (R.ratios.contributionMargin / 100).toFixed(2);
        const tmDec = (S.target_margin > 1 ? S.target_margin / 100 : S.target_margin).toFixed(2);
        formulaExplanation = `${fmt(fixedCostsVal)} / (${mcDec} - ${tmDec}) = ${fmt(targetSales)} MXN/mes`;
    }

    let gapAnalysis = 'Sin brecha calculada (falta definir margen meta o ventas actuales).';
    if (targetSales !== null && currentSales !== null) {
        const diff = targetSales - currentSales;
        if (diff > 0) {
            gapAnalysis = `BRECHA ACTIVA POR CUBRIR: Faltan exactamente ${fmt(diff)} MXN mensuales (${fmt(Math.round(diff / 30))} MXN/día) para alcanzar las Ventas Meta de ${fmt(targetSales)}/mes desde las ventas actuales de ${fmt(currentSales)}/mes.`;
        } else {
            gapAnalysis = `META SUPERADA: Las ventas actuales (${fmt(currentSales)}/mes) superan la meta en ${fmt(Math.abs(diff))}/mes.`;
        }
    } else if (R && R.meta && R.meta.feasible === false) {
        gapAnalysis = `ALERTA MATEMÁTICA: El margen deseado (${targetMarginPct}) es mayor o igual al Margen de Contribución (${contribMargin}), lo cual es matemáticamente inalcanzable sin reducir el costo de adquisición de refacciones o subir precios.`;
    }

    let posLiveBlock = '';
    if (posData) {
        const realGap = targetSales !== null ? Math.max(0, targetSales - (posData.totalRevenue || 0)) : null;
        posLiveBlock = `
=== DATOS REALES EN VIVO DEL PUNTO DE VENTA (${posData.monthLabel || 'Mes Actual'}) ===
- Ventas Reales Cobradas en Mostrador: ${fmt(posData.totalRevenue || 0)} MXN (${posData.totalSales || 0} tickets)
- Gastos Fijos Registrados en POS: ${fmt(posData.fixedExpenses || 0)} MXN
- Costos Variables Registrados en POS (Mercancía COGS ${fmt(posData.totalCogs || 0)} + Gastos Variables ${fmt(posData.variableExpenses || 0)}): ${fmt(posData.totalVariableCosts || 0)} MXN
- Otros Gastos Extraordinarios POS: ${fmt(posData.otherExpenses || 0)} MXN
- Utilidad Neta Real del Periodo en POS: ${fmt(posData.netProfit || 0)} MXN
${realGap !== null ? `- Avance Real del Mostrador frente a la Meta (${fmt(targetSales)}): Faltan ${fmt(realGap)} MXN por cobrar en este mes.` : ''}`;
    }

    return `
=== BLOQUE DE MÉTRICAS TÁCTICAS Y METAS FINANCIERAS ===
- Ventas Actuales Registradas (Escenario Activo): ${currentSales !== null ? fmt(currentSales) + ' MXN/mes' : 'No registradas'}
- Costos Fijos Mensuales: ${fixedCostsVal !== null ? fmt(fixedCostsVal) + ' MXN/mes' : 'No registrados'}
- Costos Totales Mensuales (Fijos + Variables): ${S.cost !== null ? fmt(S.cost) + ' MXN/mes' : 'No registrados'}
- Inversión Inicial (Capital Invertido): ${invInicial} MXN
- Margen Bruto / Contribución Actual (%MC): ${contribMargin}
- Margen de Ganancia Neta Deseado: ${targetMarginPct}
- Fórmula Exacta de Ventas Meta: ${formulaExplanation}
- Ventas Meta Calculadas: ${targetSales !== null ? fmt(targetSales) + ' MXN/mes (' + fmt(Math.round(targetSales / 30)) + ' MXN/día)' : 'Pendiente / Inviable'}
- Punto de Equilibrio Formal: ${breakeven !== null ? fmt(breakeven) + ' MXN/mes' : 'No calculado'}
- Retorno sobre Inversión Real (ROI = FCFF / Inversión Inicial): ${roiVal}
- Diagnóstico de Brecha: ${gapAnalysis}${posLiveBlock}
=======================================================`;
}

async function askOllama(userText, R, S) {
    if(!hasPermission('ai.qwen_access')){
        showAccessDeniedModal('Tu rol no tiene permiso para consultar al asesor financiero inteligente.');
        return;
    }
    const typEl = document.getElementById('typ');
    if(typEl) typEl.classList.remove('hidden');

    const scopedS = buildScopedFinancialContext(S);
    const scopedR = buildScopedFinancialContext(R);
    const tacticalBlock = buildTacticalMetricsBlock(S, R);

    const systemInstruction = `Eres el Director Financiero (CFO) y Estratega Operativo de Procaña Motors, una refaccionaria automotriz en México.
Tu rol principal es brindar un diagnóstico matemático exacto y recomendaciones operativas accionables basadas ESTRICTAMENTE en las cifras del "BLOQUE DE MÉTRICAS TÁCTICAS Y METAS FINANCIERAS".
INSTRUCCIONES CRÍTICAS DE NEGOCIO:
1. NUNCA inventes ni alteres las cifras del usuario. Reporta exactamente las Ventas Actuales, Costos Fijos, Inversión Inicial, la fórmula resuelta de Ventas Meta y el Diagnóstico de Brecha que aparecen en el BLOQUE DE MÉTRICAS TÁCTICAS.
2. Si existe una brecha entre las Ventas Actuales y las Ventas Meta, indica con precisión cuántos pesos mensuales faltan por cubrir y despliega estrategias accionables orientadas a mostrador y almacén de una refaccionaria:
   - <b>Aumento del Ticket Promedio (Cross-selling en Mostrador):</b> Implementación de "combos de mostrador", vendiendo kits completos de afinación (aceite, filtros, bujías) o kits de frenos (balatas + líquido DOT4) en lugar de piezas aisladas.
   - <b>Captación de Talleres Mecánicos (Volumen B2B):</b> Creación de un programa de lealtad, líneas de crédito a corto plazo o precios preferenciales de mayoreo para mecánicos de la zona que garanticen compras recurrentes.
   - <b>Optimización del Margen Bruto en Almacén:</b> Búsqueda de nuevos proveedores mayoristas, compra por volumen o importación directa de refacciones de alta rotación (balatas, filtros, bujías) para elevar el margen bruto (ej. del 40% al 45%), reduciendo la meta de ventas necesaria.
   - <b>Control de Costos Fijos:</b> Revisión estricta de los gastos operativos mensuales (nómina, renta y servicios), ya que cada peso ahorrado reduce directamente la presión sobre las ventas meta.
3. Si el margen deseado es matemáticamente inviable (mayor o igual al Margen de Contribución), explícalo con claridad y detalla cuánto debe reducir costos variables o incrementar precios.
4. Responde de forma concisa, estructurada y en formato HTML simple (usa <b>, <br>, <ul>, <li>, <p>). NUNCA uses formato markdown ni bloques de código \`\`\`.`;

    let prompt = `${tacticalBlock}

DATOS DEL ESTADO FINANCIERO (FILTRADO POR ROL ${currentUser ? currentUser.role : 'cajero'}): ${JSON.stringify(scopedS)}
RESULTADOS DEL MOTOR MATEMÁTICO: ${JSON.stringify(scopedR)}
MENSAJE RECIENTE DEL USUARIO: "${userText}"

Proporciona tu diagnóstico matemático exacto (incluyendo la fórmula de Ventas Meta y la brecha mensual exacta) y tus recomendaciones tácticas para mostrador y almacén en HTML simple:`;

    const config = window.AI_CONFIG || {};
    const hasCloudAI = window.AIService || (config.apiKey && config.apiKey.trim() !== '') || localStorage.getItem('openrouter_api_key');
    if (hasCloudAI) {
        try {
            const aiRes = await callOpenRouterAI([
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
            ], config.model || 'google/gemini-3.8-flash');

            if (aiRes) {
                if(typEl) typEl.classList.add('hidden');
                addMsg(`<div class="mt-2 pt-3 border-t border-sky-500/20 text-[13px] text-sky-100/90 leading-relaxed"><div class="flex items-center gap-1.5 mb-2 text-sky-400 font-bold uppercase tracking-wider text-[10px]"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Estrategia Operativa IA (${aiRes.model})</div>${aiRes.text}</div>`, 'b');
                try { persistAdvisorChatSnapshot(); } catch(pe){}
                if(window.lucide) lucide.createIcons();
                return;
            }
        } catch (openRouterErr) {
            console.warn('[Cloud AI Error, intentando fallback a Ollama]', openRouterErr);
        }
    }

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: 'qwen2.5',
                prompt: systemInstruction + '\n\n' + prompt,
                stream: false
            })
        });
        const data = await response.json();
        if(typEl) typEl.classList.add('hidden');
        addMsg(`<div class="mt-2 pt-3 border-t border-sky-500/20 text-[13px] text-sky-100/90 leading-relaxed"><div class="flex items-center gap-1.5 mb-2 text-sky-400 font-bold uppercase tracking-wider text-[10px]"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Análisis Inteligente de Ollama (Qwen 2.5)</div>${data.response}</div>`, 'b');
        if(window.lucide) lucide.createIcons();
    } catch (e) {
        if(typEl) typEl.classList.add('hidden');
        addMsg('<div class="mt-2 text-rose-400 text-[11px]"><i data-lucide="wifi-off" class="w-3 h-3 inline"></i> No se pudo conectar a la IA (Firebase AI Logic). Tus métricas cuantitativas y metas han sido calculadas y guardadas correctamente en el Dashboard.</div>', 'b');
        if(window.lucide) lucide.createIcons();
    }
}

async function askGemmaFiscal(activityText, R, S) {
    if(!hasPermission('ai.tax_access')){
        logActivity('Intento Bloqueado Fiscal', `Usuario @${currentUser ? currentUser.username : 'anónimo'} intentó acceder a Asesoría Fiscal sin permiso.`, 'danger');
        document.getElementById('typ').classList.add('hidden');
        addMsg(`<div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed fin">
            <div class="flex items-center gap-2 mb-1.5 font-bold text-amber-400">
                <i data-lucide="shield-alert" class="w-4 h-4 text-amber-400"></i>Acceso Restringido — Consultas Fiscales
            </div>
            El módulo de asesoría tributaria y determinación de régimen fiscal está reservado exclusivamente para los roles de <b>Administrador</b> y <b>Analista Financiero</b>. Tu rol actual (<b>${currentUser ? currentUser.role : 'Sin sesión'}</b>) no cuenta con privilegios para esta operación.
        </div>`, 'b');
        lucide.createIcons();
        return;
    }
    document.getElementById('typ').classList.remove('hidden');
    alog('Consultando recomendación fiscal');
    
    const hypMatch = (activityText || '').toLowerCase().match(/(?:llegar\s+a\s+(?:las\s+)?ventas|meta\s+de\s+ventas|ventas\s+meta|proyecci[oó]n\s+de\s+ventas|si\s+(?:vendo|facturo|llego|mis\s+ventas))[^0-9$%]{0,25}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?/i);
    let projectedNotice = '';
    if(hypMatch){
        const hypVal = normalizeMoneyToken(hypMatch[1], hypMatch[2]);
        if(hypVal && hypVal !== S.rev){
            projectedNotice = `\n- Ventas Proyectadas / Escenario consultado por el usuario: $${fmt(hypVal)}/mes ($${fmt(hypVal * 12)}/año) [Evalúa este nivel de ventas para tu recomendación fiscal sin asumir que ya las factura hoy]`;
        }
    }

    const salesInfo = S && S.rev ? `$${fmt(S.rev)}/mes ($${fmt(S.rev * 12)}/año)` : (S && S.target_sales ? `Ventas Meta de $${fmt(S.target_sales)}/mes` : 'No especificado aún');
    const costsInfo = S && S.cost ? `$${fmt(S.cost)}/mes` : 'No especificado aún';
    const invInfo = S && S.initial_investment ? `$${fmt(S.initial_investment)}` : 'No especificada';
    const industryInfo = S && S.industry ? S.industry : 'Comercio de Refacciones Automotrices';
    const currentActivity = activityText || industryInfo;
    
    const prompt = `Eres un asesor fiscal y tributario experto de alto nivel especializado en México (SAT) y legislación fiscal de negocios.
El usuario necesita saber cuál es el régimen fiscal más conveniente para su negocio según sus actividades económicas.

DATOS DEL NEGOCIO:
- Actividades / Giro / Consulta: "${currentActivity}"
- Ventas Actuales Reales del Negocio: ${salesInfo}${projectedNotice}
- Costos operativos: ${costsInfo}
- Inversión inicial: ${invInfo}
- Giro detectado: ${industryInfo}

INSTRUCCIONES CLAVE:
1. Recomienda con precisión cuál es el régimen fiscal más conveniente (analiza RESICO - Régimen Simplificado de Confianza para personas físicas hasta $3.5M anuales o personas morales hasta $35M; Régimen de Personas Físicas con Actividades Empresariales y Profesionales; o Persona Moral como S.A.S. o S.A. de C.V.).
2. Explica de forma clara, didáctica y directa:
   - ¿Cuál régimen le conviene más y por qué?
   - Requisitos indispensables para calificar a ese régimen.
   - Ventajas fiscales (tasas de ISR estimadas, retenciones, deducciones de inventario de refacciones e inversión inicial).
   - Qué riesgos o desventajas debe cuidar.
3. Formatea tu respuesta usando HTML simple (<b>, <br>, <ul>, <li>, <p>) para que se vea perfectamente estilizado en el chat. NO uses markdown ni comillas triples ni bloques de código. Sé conciso, profesional y directo.`;

    const config = window.AI_CONFIG || {};
    const hasOpenRouter = window.AIService || (config.apiKey && config.apiKey.trim() !== '') || localStorage.getItem('openrouter_api_key');
    if (hasOpenRouter) {
        try {
            const aiRes = await callOpenRouterAI([
                { role: 'system', content: 'Eres un asesor fiscal y tributario experto de alto nivel en México (SAT). Responde de forma clara, didáctica y en formato HTML simple (usa <b>, <br>, <ul>, <li>, <p>). NUNCA uses formato markdown ni bloques de código ```.' },
                { role: 'user', content: prompt }
            ], config.model || 'google/gemini-3.8-flash');

            if (aiRes) {
                document.getElementById('typ').classList.add('hidden');
                let html = `
                <div class="mt-2 pt-3 border-t border-indigo-500/30 text-[13px] text-indigo-100/90 leading-relaxed">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                            <span class="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[9px] border border-indigo-500/40">SAT</span>
                            <i data-lucide="scale" class="w-3.5 h-3.5"></i> Asesor Fiscal · ${aiRes.model}
                        </div>
                    </div>
                    <div class="space-y-2 mb-3">
                        ${aiRes.text}
                    </div>
                    <div class="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex flex-wrap items-center gap-1.5">
                        <span class="text-[9.5px] text-slate-400 font-bold uppercase mr-1">Aplicar al perfil:</span>
                        <button onclick="applyTaxRegime('RESICO')" class="pos-btn bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2.5"><i data-lucide="check" class="w-3 h-3"></i>RESICO (2.5%)</button>
                        <button onclick="applyTaxRegime('PERSONA_MORAL')" class="pos-btn bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-1 px-2.5"><i data-lucide="check" class="w-3 h-3"></i>Persona Moral (30%)</button>
                        <button onclick="applyTaxRegime('PERSONA_FISICA')" class="pos-btn bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] py-1 px-2.5"><i data-lucide="check" class="w-3 h-3"></i>Persona Física (35%)</button>
                    </div>
                </div>`;
                addMsg(html, 'b');
                lucide.createIcons();
                return;
            }
        } catch (openRouterErr) {
            console.warn('[OpenRouter Fiscal Error, intentando fallback a Ollama]', openRouterErr);
        }
    }

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: 'gemma4:12b',
                prompt: prompt,
                stream: false
            })
        });
        const data = await response.json();
        document.getElementById('typ').classList.add('hidden');
        
        let html = `
        <div class="mt-2 pt-3 border-t border-indigo-500/30 text-[13px] text-indigo-100/90 leading-relaxed">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                    <span class="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[9px] border border-indigo-500/40">G4</span>
                    <i data-lucide="scale" class="w-3.5 h-3.5"></i> Asesor Fiscal · Gemma 4 (12B)
                </div>
                <span class="text-[9px] mono px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">Local LLM</span>
            </div>
            <div class="space-y-2 mb-3">
                ${data.response}
            </div>
            <div class="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex flex-wrap items-center gap-1.5">
                <span class="text-[9.5px] text-slate-400 font-bold uppercase mr-1">Aplicar al perfil:</span>
                <button onclick="applyTaxRegime('RESICO')" class="pos-btn bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2.5"><i data-lucide="check" class="w-3 h-3"></i>RESICO (2.5%)</button>
                <button onclick="applyTaxRegime('PERSONA_MORAL')" class="pos-btn bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-1 px-2.5"><i data-lucide="check" class="w-3 h-3"></i>Persona Moral (30%)</button>
                <button onclick="applyTaxRegime('PERSONA_FISICA')" class="pos-btn bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] py-1 px-2.5"><i data-lucide="check" class="w-3 h-3"></i>Persona Física (35%)</button>
            </div>
        </div>`;
        addMsg(html, 'b');
        lucide.createIcons();
    } catch (e) {
        document.getElementById('typ').classList.add('hidden');
        addMsg(`<div class="mt-2 text-rose-400 text-[11px]"><i data-lucide="wifi-off" class="w-3 h-3 inline"></i> No se pudo conectar a la IA (Firebase AI Logic). Revisa tu conexión o selecciona directamente uno de los regímenes arriba.</div>`, 'b');
        lucide.createIcons();
    }
}

function applyTaxRegime(regime){
    S.tax = regime;
    const label = regime === 'PERSONA_MORAL' ? 'Persona Moral' : regime === 'PERSONA_FISICA' ? 'Persona Física con Actividad Empresarial' : 'RESICO';
    addMsg(`He seleccionado el régimen fiscal: <b>${label}</b>`, 'u');
    const R = calc();
    document.getElementById('oJ').textContent = JSON.stringify(S, null, 2);
    document.getElementById('oM').textContent = JSON.stringify(R, null, 2);
    upQ();
    upDash(R);
    upRatios(R);
    saveAdv(R, `Selección régimen fiscal: ${label}`);
    if(!initialNarrativeSent){
        initialNarrativeSent = true;
        addMsg(narrate(R), 'b');
    }
}

function applyTargetMarginPreset(pctNum){
    S.target_margin = pctNum / 100;
    addMsg(`🎯 Quiero alcanzar un margen de ganancia deseado del <b>${pctNum}%</b>`, 'u');
    const R = calc();
    const oJ = document.getElementById('oJ');
    const oM = document.getElementById('oM');
    if(oJ) oJ.textContent = JSON.stringify(S, null, 2);
    if(oM) oM.textContent = JSON.stringify(R, null, 2);
    upQ();
    upDash(R);
    upRatios(R);
    if(typeof upPosSummary === 'function') upPosSummary();
    saveAdv(R, `Meta de margen del ${pctNum}%`);
    if(!initialNarrativeSent){
        initialNarrativeSent = true;
        addMsg(narrate(R), 'b');
    }
    askOllama(`Quiero alcanzar un margen del ${pctNum}% y llegar a mis ventas meta. ¿Qué estrategias me recomiendas?`, R, S);
}

function triggerGemmaFiscalPrompt(){
    let query = S.industry ? `Mi negocio es del sector ${S.industry}.` : '';
    if(S.rev) query += ` Con ventas de ${fmt(S.rev)} al mes.`;
    if(!query) query = 'Tengo una tienda de refacciones automotrices y servicios.';
    query += ' ¿Cuál régimen fiscal me recomiendas escoger según mis actividades?';
    addMsg(`⚖️ ¿Qué régimen fiscal me recomiendas para mis actividades?`, 'u');
    askGemmaFiscal(query, calc(), S);
}

// ===== PROCESADOR NLP MEJORADO CON SOPORTE PARA MÚLTIPLES COMAS, COSTOS FIJOS, MARGEN BRUTO Y MARGEN META =====
function normalizeMoneyToken(numStr, unitStr) {
    const raw = String(numStr || '').trim();
    const hasCommaThousands = /\d,\d{3}/.test(raw);
    let v = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(v)) return null;
    const su = (unitStr || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (su.startsWith('millon') || su === 'mill' || su === 'mdp') v *= 1e6;
    else if (su === 'mil' || su === 'k') v *= 1e3;
    else if (v < 1000 && !hasCommaThousands) v *= 1e3;
    return Math.round(v);
}

function parse(txt){
    const lo = txt.toLowerCase();

    // 1. Detección estricta de Escenarios de Estrés (SOLO cuando se pregunta por variación porcentual relativa de ventas)
    const stressDown = lo.match(/(?:qu[eé]\s*pasa\s*si|si\s+(?:mis\s+)?(?:ventas|ingresos)|simul\w*)[^.?!]*?(?:(\d+(?:\.\d+)?)\s*%\s*(?:menos|abajo|bajan|caen|disminuyen)|(?:bajan|caen|disminuyen)\s*(?:un\s*)?(\d+(?:\.\d+)?)\s*%)/i)
        || (S.rev !== null && lo.match(/(?:ventas|ingresos|vendo)\s+(?:bajan|caen|disminuyen)\s*(?:un\s*)?(\d+(?:\.\d+)?)\s*%/i));
    const stressUp = lo.match(/(?:qu[eé]\s*pasa\s*si|si\s+(?:mis\s+)?(?:ventas|ingresos)|simul\w*)[^.?!]*?(?:(\d+(?:\.\d+)?)\s*%\s*(?:m[aá]s|arriba|suben|aumentan|crecen)|(?:suben|aumentan|crecen)\s*(?:un\s*)?(\d+(?:\.\d+)?)\s*%)/i)
        || (S.rev !== null && lo.match(/(?:ventas|ingresos|vendo)\s+(?:suben|aumentan|crecen)\s*(?:un\s*)?(\d+(?:\.\d+)?)\s*%/i));
    const isStressScenario = Boolean((stressDown || stressUp) && S.rev !== null);

    if(isStressScenario && S.rev !== null){
        if(stressDown){
            const pct = parseFloat(stressDown[1] || stressDown[2]);
            if(!isNaN(pct)) S.rev = Math.round(S.rev * (1 - pct / 100));
        } else if(stressUp){
            const pct = parseFloat(stressUp[1] || stressUp[2]);
            if(!isNaN(pct)) S.rev = Math.round(S.rev * (1 + pct / 100));
        }
    }

    // 2. Detección específica de Inversión Inicial (S.initial_investment) - Soporta $1,000,000 MXN o "1 millón"
    const invMatch = lo.match(/(?:inversi[oó]n(?:\s+inicial|\s+total)?|invert[ií]|invertir|capital(?:\s+inicial)?)[^0-9$%]{0,30}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?/i);
    if(invMatch){
        S.initial_investment = normalizeMoneyToken(invMatch[1], invMatch[2]);
    }

    // 3. Detección específica de Margen Bruto / Contribución Actual (S.gross_margin) - ej. "margen bruto estándar del 40%"
    const gmMatch = lo.match(/margen\s+(?:bruto|de\s+contribuci[oó]n)(?:\s+est[aá]ndar|\s+actual|\s+promedio|\s+operativo)?[^0-9%]{0,25}(\d+(?:\.\d+)?)\s*%/i);
    if(gmMatch){
        S.gross_margin = parseFloat(gmMatch[1]) / 100;
    }

    // 4. Detección específica de Expectativa de Ganancia / Margen Deseado (S.target_margin) - ej. "margen de ganancia neta del 20%"
    const tmMatch1 = lo.match(/(?:margen\s+(?:de\s+ganancia(?:\s+neta)?|de\s+utilidad(?:\s+neta)?|neto\s+deseado|neto\s+meta|deseado|meta|objetivo)|(?:quiero|espero|deseo|busco|pretendo|exige\s+alcanzar|alcanzar|lograr(?:\s+ese)?|meta\s+de)\s+(?:un\s+)?(?:margen(?!\s+bruto|\s+de\s+contribuci[oó]n)(?:\s+de\s+ganancia(?:\s+neta)?)?|ganar|ganancia|utilidad|rendimiento|obtener))[^0-9%]{0,30}(\d+(?:\.\d+)?)\s*%/i);
    const tmMatch2 = lo.match(/(\d+(?:\.\d+)?)\s*%\s*de\s*(?:margen(?!\s+bruto|\s+de\s+contribuci[oó]n)|ganancia|utilidad\s+deseada|meta)/i);
    if(tmMatch1){
        S.target_margin = parseFloat(tmMatch1[1]) / 100;
    } else if(tmMatch2){
        S.target_margin = parseFloat(tmMatch2[1]) / 100;
    }

    // 5. Detección de Ventas Actuales (S.rev) vs Metas / Escenarios Hipotéticos
    const isGoalOrHypotheticalSales = /(?:llegar\s+a\s+(?:las\s+)?ventas|quiero\s+llegar|para\s+llegar|alcanzar\s+(?:las\s+)?ventas|para\s+alcanzar|meta\s+de\s+ventas|ventas\s+meta|objetivo\s+de\s+ventas|proyecci[oó]n\s+de\s+ventas|aspir(?:o|ar|ando)\s+a\s+ventas|plane(?:o|ar|ando)\s+(?:vender|llegar)|pretend(?:o|er|iendo)\s+(?:vender|llegar)|si\s+(?:quiero|vendo|vendiera|vendi[eé]ramos|facturo|facturara|factur[aá]ramos|tuviera|tuviese|llego|llegara|alcanzo|alcanzara)|si\s+(?:mis\s+)?ventas\s+(?:fueran|fuesen|llegan|llegaran|suben|aumentan|alcanzan)|qu[eé]\s*pasa\s*si\s+(?:vendo|mis\s+ventas)|qu[eé]\s*(?:r[eé]gimen|estrategia|opini[oó]n|me\s*recomiendas).*?si\s+(?:vendo|quiero|llego))/i.test(lo);

    if(!isStressScenario){
        // A) Coincidencia directa para ventas ACTUALES reales explícitas (facturando ventas por $X, ventas actuales de $X, etc.)
        const explicitActualRevMatch = lo.match(/(?:facturando\s+ventas(?:\s+actuales)?(?:\s+por|\s+de)?|ventas\s+actuales(?:\s+son(?:\s+de)?|\s+de|\s+por|\s+ascienden\s+a)?|actualmente\s+(?:vendo|facturo|tengo\s+ventas\s+(?:de|por)?)|vendo\s+actualmente|facturo\s+actualmente|mis\s+ventas\s+actuales\s+(?:son|de|ascienden\s+a))[^0-9$%]{0,25}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?(?!\s*%)/i);

        if(explicitActualRevMatch){
            S.rev = normalizeMoneyToken(explicitActualRevMatch[1], explicitActualRevMatch[2]);
        } else if(!isGoalOrHypotheticalSales){
            // B) Coincidencia general solo si la expresión NO denota una meta, deseo o condicional hipotético
            const generalRevMatch = lo.match(/(?:(?:mis\s+)?ventas?(?!\s+meta)(?:\s+mensuales|\s+de|\s+por|\s+son(?:\s+de)?|\s+ascienden\s+a)?|(?:mis\s+)?ingresos?(?:\s+mensuales|\s+son(?:\s+de)?|\s+de|\s+por)?|vendo|vendemos|facturo|facturamos)[^0-9$%]{0,25}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?(?!\s*%)/i);
            if(generalRevMatch){
                S.rev = normalizeMoneyToken(generalRevMatch[1], generalRevMatch[2]);
            }
        }
    }

    // 6. Detección diferenciada de Costos Fijos (S.fixed_costs) vs Costos Operativos Totales (S.cost)
    const fixedCostMatch = lo.match(/(?:costos?\s+fijos?|gastos?\s+fijos?)(?:\s+actuales|\s+mensuales|\s+totales|\s+ascienden\s+a|\s+suman|\s+son(?:\s+de)?|\s+de)?[^0-9$%]{0,30}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?(?!\s*%)/i);
    if(fixedCostMatch){
        S.fixed_costs = normalizeMoneyToken(fixedCostMatch[1], fixedCostMatch[2]);
        S.pos_variable_expenses = 0;
        S.pos_other_expenses = 0;
    }

    const totalCostMatch = lo.match(/(?:costos?(?!\s+fijos)(?:\s+operativos|\s+mensuales|\s+totales|\s+actuales|\s+ascienden\s+a|\s+suman|\s+son(?:\s+de)?|\s+de)?|gastos?(?!\s+fijos)(?:\s+operativos|\s+mensuales|\s+totales|\s+actuales|\s+ascienden\s+a|\s+suman|\s+de)?)[^0-9$%]{0,30}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?(?!\s*%)/i);
    if(totalCostMatch){
        S.cost = normalizeMoneyToken(totalCostMatch[1], totalCostMatch[2]);
        S.pos_variable_expenses = 0;
        S.pos_other_expenses = 0;
    } else if(S.fixed_costs !== null && S.cost === null){
        // Inicializar S.cost con S.fixed_costs; calc() sumará el costo variable si hay ventas y margen bruto
        S.cost = S.fixed_costs;
    }

    // 7. Detección específica de Crédito / Préstamo (S.loan, S.loanRate, S.loanYears)
    const loanMatch = lo.match(/(?:cr[eé]dito|pr[eé]stamo|deuda|financiamiento|pedir(?:\s+prestado)?)[^0-9$%]{0,30}\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k)?(?!\s*%)/i);
    if(loanMatch){
        S.loan = normalizeMoneyToken(loanMatch[1], loanMatch[2]);
    }
    if(lo.match(/cr[eé]dito|pr[eé]stamo|deuda|financiamiento|tasa|inter[eé]s/)){
        const rateMatch = lo.match(/(?:tasa(?:\s+de\s+inter[eé]s|\s+anual)?|inter[eé]s|\ba\s+una\s+tasa)\s*(?:de|del)?\s*(\d+(?:\.\d+)?)\s*%/i);
        if(rateMatch) S.loanRate = parseFloat(rateMatch[1]) / 100;
        const ym = lo.match(/(\d+)\s*a[ñn]os?/i);
        if(ym) S.loanYears = parseInt(ym[1]);
    }

    // 8. Fallback secuencial en caso de expresiones cortas sin preposiciones estándar
    const re=/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(millones|mill[oó]n(?:es)?|mill|mdp|mil|k|%)?/gi;
    let m, nums=[];
    while((m=re.exec(lo))!==null){
        const rawToken = m[1];
        const su=(m[2]||'').toLowerCase();
        if(su==='%'){
            nums.push({v:parseFloat(rawToken.replace(/,/g,'')),p:true});
            continue;
        }
        const v = normalizeMoneyToken(rawToken, su);
        if(v !== null) nums.push({v,p:false});
    }
    if(!isStressScenario && !isGoalOrHypotheticalSales && S.rev === null && lo.match(/vent|ingres|vend|factur/) && !invMatch){
        const firstMoney = nums.find(n => !n.p);
        if(firstMoney) S.rev = firstMoney.v;
    }

    // 9. Régimen Fiscal y Giro Comercial
    if(lo.includes('resico')) S.tax='RESICO';
    else if(lo.match(/persona\s*moral|moral/)) S.tax='PERSONA_MORAL';
    else if(lo.match(/persona\s*f[ií]sica|f[ií]sica/)) S.tax='PERSONA_FISICA';

    if(lo.match(/ferreter|tienda|ropa|abarrot|comerci|refaccion|autopart|veh[ií]cul|automot|taller/)) S.industry='Retail';
    else if(lo.match(/restaurante|comida|tacos|caf[eé]/)) S.industry='Restaurantes';
    else if(lo.match(/cl[ií]nica|m[eé]dic|hospital|salud|doctor/)) S.industry='Salud';
    else if(lo.match(/agencia|marketing|software|tech|consult/)) S.industry='Servicios y Tecnología';
    else if(lo.match(/construc|inmobiliar/)) S.industry='Construcción';
    else if(lo.match(/granja|agr[ií]cola|ganad|lecher/)) S.industry='Agropecuario';
    else if(lo.match(/transport|log[ií]st|flet/)) S.industry='Transporte';
}

// Obtiene el margen de contribución promedio real del catálogo de refacciones (~42% por defecto)
function getCatalogAverageContributionMargin(){
    try {
        if(typeof catalog !== 'undefined' && Array.isArray(catalog) && catalog.length > 0){
            let totalP = 0, totalC = 0;
            catalog.forEach(p => {
                if(p.price > 0){
                    totalP += p.price;
                    totalC += (p.cost || 0);
                }
            });
            if(totalP > 0) return (totalP - totalC) / totalP;
        }
    } catch(e){}
    return 0.42;
}

// ===== MOTOR MATEMÁTICO FINANCIERO (calc()) =====
function calc(){
    const R={
        ts:new Date().toISOString(),
        cf:{ebitda:null,tax:null,fcff:null},
        val:{wacc:null,ev:null,van:null,tir:null},
        debt:{pmt:null,dscr:null,interest:null},
        proj:{y1:null,y2:null,y3:null},
        amort:null,
        meta:{
            targetSales:null,
            targetMargin:null,
            dailyTargetSales:null,
            gap:null,
            feasible:true,
            errorMsg:null,
            roiOnInvestment:null,
            paybackYears:null
        },
        ratios:{
            grossMargin:null,netMargin:null,netProfit:null,roi:null,
            breakeven:null,breakevenMonths:null,interestCoverage:null,
            debtToIncome:null,leverage:null,payback:null,efficiency:null,
            contributionMargin:null,formalBreakeven:null,targetSales:null
        }
    };

    // Normalizar S.gross_margin si viene en porcentaje (>1)
    if(S.gross_margin !== null && S.gross_margin > 1){
        S.gross_margin = S.gross_margin / 100;
    }

    // Caso 1: Si el usuario ingresó Costos (ej. Costos Fijos del POS) y Margen Meta, pero aún no tiene Ventas (S.rev === null o 0)
    if((S.rev === null || S.rev === 0) && (S.cost !== null || S.fixed_costs !== null)){
        const estMcDecimal = (S.gross_margin !== null && S.gross_margin > 0) ? S.gross_margin : getCatalogAverageContributionMargin();
        const fixedCostsOnly = (S.fixed_costs !== null && S.fixed_costs > 0) ? S.fixed_costs : (S.cost || 0);
        const extraPosVar = (Number(S.pos_variable_expenses) || 0) + (Number(S.pos_other_expenses) || 0);
        if(S.cost === null || S.cost === 0) S.cost = fixedCostsOnly + extraPosVar;
        R.cf.ebitda = -(S.cost * 12);
        R.ratios.grossMargin = estMcDecimal * 100;
        R.ratios.contributionMargin = estMcDecimal * 100;
        R.ratios.formalBreakeven = estMcDecimal > 0 ? Math.round(fixedCostsOnly / estMcDecimal) : null;
        R.ratios.breakeven = R.ratios.formalBreakeven;

        if(S.target_margin !== null && S.target_margin > 0){
            const tm = S.target_margin > 1 ? S.target_margin / 100 : S.target_margin;
            S.target_margin = tm;
            R.meta.targetMargin = tm * 100;
            const denom = estMcDecimal - tm;
            if(denom <= 0){
                S.target_sales = null;
                R.meta.feasible = false;
                R.meta.errorMsg = `El margen deseado (${(tm*100).toFixed(1)}%) supera o iguala el margen de contribución (${(estMcDecimal*100).toFixed(1)}%). Es matemáticamente imposible alcanzarlo sin reducir costos de proveedor o subir precios.`;
            } else {
                S.target_sales = Math.round(fixedCostsOnly / denom);
                R.meta.feasible = true;
                R.meta.targetSales = S.target_sales;
                R.meta.dailyTargetSales = Math.round(S.target_sales / 30);
                R.meta.gap = S.target_sales;
                R.ratios.targetSales = S.target_sales;
            }
        }
        return R;
    }

    if(S.rev === null || S.rev === 0 || (S.cost === null && S.fixed_costs === null)) return R;

    // ===== SEGREGACIÓN EXACTA DE COSTOS FIJOS VS VARIABLES & MARGEN DE CONTRIBUCIÓN =====
    let fixedCosts = 0;
    let variableCosts = 0;
    let mcDecimal = 0;
    const posExtraVar = Number(S.pos_variable_expenses) || 0;
    const posExtraOther = Number(S.pos_other_expenses) || 0;

    if(S.fixed_costs !== null && S.fixed_costs > 0){
        fixedCosts = S.fixed_costs;
        if(S.gross_margin !== null && S.gross_margin > 0){
            // Caso exacto del plan financiero: Costos fijos explícitos ($45,000) + Margen Bruto estándar (40%) + posibles gastos variables del POS
            const baseCogs = Math.round(S.rev * (1 - S.gross_margin));
            variableCosts = baseCogs + posExtraVar;
            mcDecimal = posExtraVar > 0 && S.rev > 0
                ? Math.max(0.01, (S.rev - variableCosts) / S.rev)
                : S.gross_margin;
            S.cost = Math.round(fixedCosts + variableCosts + posExtraOther);
        } else if(S.cost !== null && S.cost > fixedCosts){
            variableCosts = S.cost - fixedCosts;
            mcDecimal = S.rev > 0 ? (S.rev - variableCosts) / S.rev : 0;
        } else {
            mcDecimal = getCatalogAverageContributionMargin();
            variableCosts = Math.round(S.rev * (1 - mcDecimal)) + posExtraVar;
            if(posExtraVar > 0 && S.rev > 0) mcDecimal = Math.max(0.01, (S.rev - variableCosts) / S.rev);
            S.cost = Math.round(fixedCosts + variableCosts + posExtraOther);
        }
    } else {
        // Solo se proporcionaron costos operativos totales (S.cost)
        if(S.gross_margin !== null && S.gross_margin > 0){
            mcDecimal = S.gross_margin;
            variableCosts = Math.round(S.rev * (1 - mcDecimal)) + posExtraVar;
            fixedCosts = Math.max(0, S.cost - variableCosts);
        } else {
            const cvRatio = 0.65;
            variableCosts = (S.cost * cvRatio) + posExtraVar;
            fixedCosts = S.cost * (1 - cvRatio);
            mcDecimal = S.rev > 0 ? (S.rev - variableCosts) / S.rev : 0;
        }
    }

    const contributionMarginPct = mcDecimal * 100;
    const formalBreakevenRevenue = (mcDecimal > 0) ? Math.round(fixedCosts / mcDecimal) : null;

    // Basics
    R.cf.ebitda = (S.rev - S.cost) * 12;
    R.ratios.grossMargin = (S.gross_margin !== null && S.gross_margin > 0)
        ? (S.gross_margin * 100)
        : ((S.rev - S.cost) / S.rev * 100);
    R.ratios.efficiency = S.cost / S.rev * 100;
    R.ratios.contributionMargin = contributionMarginPct;
    R.ratios.formalBreakeven = formalBreakevenRevenue;
    R.ratios.breakeven = formalBreakevenRevenue !== null ? formalBreakevenRevenue : ((1 - (S.cost / S.rev)) > 0 ? S.cost / (1 - (S.cost / S.rev)) : null);

    // Tax (Si no se ha elegido régimen, usamos estimación base o el régimen elegido)
    const effectiveTaxRegime = S.tax || null;
    if(effectiveTaxRegime){
        let t=.30;
        if(effectiveTaxRegime==='RESICO') t=.025;
        else if(effectiveTaxRegime==='PERSONA_FISICA') t=.35;
        R.cf.tax=R.cf.ebitda>0?R.cf.ebitda*t:0;
        R.cf.fcff=R.cf.ebitda-R.cf.tax;
        R.ratios.netMargin=R.cf.fcff/(S.rev*12)*100;
        R.ratios.netProfit=R.cf.fcff;
    } else {
        // Si aún no elige régimen fiscal, FCFF preliminar equivale a EBITDA menos tasa RESICO referencial (2.5%) para permitir cálculo de ROI
        const prelimFcff = R.cf.ebitda > 0 ? R.cf.ebitda * 0.975 : R.cf.ebitda;
        R.cf.fcff = prelimFcff;
        R.ratios.netMargin = prelimFcff / (S.rev * 12) * 100;
        R.ratios.netProfit = prelimFcff;
    }

    // Valuation
    const effectiveIndustry = S.industry || 'Retail';
    if(R.cf.fcff!==null && (S.industry || S.initial_investment || S.rev)){
        let rp=.07;
        if(effectiveIndustry.includes('Restaurantes')) rp=.09;
        else if(effectiveIndustry.includes('Salud')) rp=.08;
        else if(effectiveIndustry.includes('Tecnología')) rp=.11;
        else if(effectiveIndustry.includes('Retail')) rp=.07;
        else if(effectiveIndustry.includes('Construcción')) rp=.10;
        else if(effectiveIndustry.includes('Agropecuario')) rp=.085;
        else if(effectiveIndustry.includes('Transporte')) rp=.09;
        R.val.wacc=.06+rp;
        R.val.ev=R.cf.fcff>0?R.cf.fcff/R.val.wacc:0;
        const g=.03;
        R.proj.y1=R.cf.fcff;
        R.proj.y2=R.cf.fcff*(1+g);
        R.proj.y3=R.cf.fcff*Math.pow(1+g,2);
    }

    // Debt
    if(S.loan>0 && R.cf.fcff!==null){
        const r=S.loanRate||.18, n=S.loanYears||3;
        R.debt.pmt=(S.loan*r)/(1-Math.pow(1+r,-n));
        R.debt.dscr=R.cf.fcff/R.debt.pmt;
        R.debt.interest=S.loan*(S.loanRate||.18);
        R.amort=mkAmort(S.loan,r,n);
        R.ratios.interestCoverage=R.debt.interest>0?R.cf.ebitda/R.debt.interest:null;
        R.ratios.debtToIncome=R.debt.pmt/(S.rev*12)*100;
        if(R.val.ev&&R.val.ev>0) R.ratios.leverage=S.loan/R.val.ev*100;
        R.ratios.netProfit=R.cf.fcff-R.debt.pmt;
    }

    // ===== ROI REAL CRUZADO CON S.initial_investment (O PRÉSTAMO SI NO HAY INVERSIÓN INICIAL) =====
    const invBase = (S.initial_investment && S.initial_investment > 0)
        ? S.initial_investment
        : ((S.loan && S.loan > 0) ? S.loan : null);

    if(invBase && invBase > 0 && R.cf.fcff !== null){
        const annualDebtPayment = R.debt.pmt || 0;
        const netFreeFlow = R.cf.fcff - annualDebtPayment;
        R.ratios.roi = (netFreeFlow / invBase) * 100;
        R.ratios.payback = netFreeFlow > 0 ? (invBase / netFreeFlow) : null;
        R.ratios.breakevenMonths = netFreeFlow > 0 ? (invBase / (netFreeFlow / 12)) : null;
        R.meta.roiOnInvestment = R.ratios.roi;
        R.meta.paybackYears = R.ratios.payback;
    }

    // ===== FÓRMULA DE VENTAS META: Costos Fijos / (Margen de Contribución - S.target_margin) =====
    if(S.target_margin !== null && S.target_margin > 0){
        const tm = S.target_margin > 1 ? S.target_margin / 100 : S.target_margin;
        S.target_margin = tm;
        R.meta.targetMargin = tm * 100;
        const denom = mcDecimal - tm;

        // Validación matemática contra resultados negativos o infinitos
        if(denom <= 0){
            S.target_sales = null;
            R.meta.feasible = false;
            R.meta.targetSales = null;
            R.meta.errorMsg = `El margen deseado (${(tm*100).toFixed(1)}%) es mayor o igual al Margen de Contribución actual (${contributionMarginPct.toFixed(1)}%). Matemáticamente es imposible alcanzarlo solo vendiendo más volumen; se requiere reducir costos variables de refacciones o incrementar precios.`;
        } else {
            S.target_sales = Math.round(fixedCosts / denom);
            R.meta.feasible = true;
            R.meta.targetSales = S.target_sales;
            R.meta.dailyTargetSales = Math.round(S.target_sales / 30);
            R.meta.gap = Math.max(0, S.target_sales - S.rev);
            R.ratios.targetSales = S.target_sales;
        }
    } else {
        S.target_sales = null;
    }

    // ===== CÁLCULO DE VAN (VALOR ACTUAL NETO) Y TIR (NEWTON-RAPHSON) =====
    const I0 = (S.initial_investment && S.initial_investment > 0)
        ? S.initial_investment
        : ((S.loan && S.loan > 0) ? S.loan : (S.cost * 3));
    const cashFlows = [R.proj.y1, R.proj.y2, R.proj.y3].map(cf => Math.max(0, cf || 0));

    if(R.val.wacc && cashFlows.length > 0){
        let npvValue = -I0;
        const k = R.val.wacc;
        for(let t = 0; t < cashFlows.length; t++){
            npvValue += cashFlows[t] / Math.pow(1 + k, t + 1);
        }
        R.val.van = npvValue;

        function calculateIRR(initialInv, cfs, guess = 0.15){
            if(initialInv <= 0 || cfs.every(c => c <= 0)) return null;
            let r = guess;
            for(let iter = 0; iter < 100; iter++){
                let fVal = -initialInv;
                let fDeriv = 0;
                for(let t = 0; t < cfs.length; t++){
                    const per = t + 1;
                    const denom = Math.pow(1 + r, per);
                    fVal += cfs[t] / denom;
                    fDeriv -= (per * cfs[t]) / (denom * (1 + r));
                }
                if(Math.abs(fDeriv) < 1e-9) break;
                const nextR = r - (fVal / fDeriv);
                if(Math.abs(nextR - r) < 1e-6){
                    return nextR * 100;
                }
                r = nextR;
            }
            return null;
        }
        R.val.tir = calculateIRR(I0, cashFlows);
    }

    return R;
}

function mkAmort(p,r,n){const pmt=(p*r)/(1-Math.pow(1+r,-n));let b=p;const rows=[];for(let i=1;i<=n;i++){const int=b*r,cap=pmt-int;b-=cap;rows.push({y:i,pmt,int,cap,bal:Math.max(0,b)});}return{pmt,r,n,rows};}

function upDash(R){
    mSet('m-ebitda',R.cf.ebitda);
    mSet('m-ev',R.val.ev);

    // Actualizar métricas avanzadas VAN, TIR, Margen de Contribución y Punto de Equilibrio
    const vanEl = document.getElementById('m-van');
    if(vanEl && R.val.van !== null){
        vanEl.textContent = fmt(R.val.van);
        vanEl.className = 'text-xl font-bold mono ' + (R.val.van > 0 ? 'text-emerald-400' : 'text-rose-400');
    } else if(vanEl){
        vanEl.textContent = '—';
        vanEl.className = 'text-xl font-bold mono text-slate-600';
    }
    const tirEl = document.getElementById('m-tir');
    if(tirEl && R.val.tir !== null){
        tirEl.textContent = R.val.tir.toFixed(1) + '%';
        tirEl.className = 'text-xl font-bold mono ' + (R.val.tir > 15 ? 'text-emerald-400' : R.val.tir > 8 ? 'text-amber-400' : 'text-rose-400');
    } else if(tirEl) {
        tirEl.textContent = '—';
        tirEl.className = 'text-xl font-bold mono text-slate-600';
    }
    const mcEl = document.getElementById('m-mc');
    if(mcEl && R.ratios.contributionMargin !== null){
        mcEl.textContent = R.ratios.contributionMargin.toFixed(1) + '%';
        mcEl.className = 'text-xl font-bold mono ' + (R.ratios.contributionMargin > 30 ? 'text-purple-400' : 'text-slate-300');
    }
    const peEl = document.getElementById('m-pe');
    if(peEl && R.ratios.formalBreakeven !== null){
        peEl.textContent = fmt(R.ratios.formalBreakeven);
    }

    // ===== ACTUALIZAR TARJETA KPI DE VENTAS META E INVERSIÓN INICIAL =====
    const tsEl = document.getElementById('m-target-sales');
    const tmBadge = document.getElementById('m-target-margin-badge');
    const tsSub = document.getElementById('m-target-sales-sub');
    const invEl = document.getElementById('m-init-inv');
    const roiCardEl = document.getElementById('m-roi-real');

    if(invEl){
        if(S.initial_investment !== null && S.initial_investment > 0){
            invEl.textContent = fmt(S.initial_investment);
            invEl.className = 'text-lg font-bold mono text-indigo-300';
        } else {
            invEl.textContent = '—';
            invEl.className = 'text-lg font-bold mono text-slate-600';
        }
    }
    if(roiCardEl){
        if(R.ratios.roi !== null){
            roiCardEl.textContent = R.ratios.roi.toFixed(1) + '%';
            roiCardEl.className = 'text-lg font-bold mono ' + (R.ratios.roi > 15 ? 'text-emerald-400' : R.ratios.roi > 0 ? 'text-amber-400' : 'text-rose-400');
        } else {
            roiCardEl.textContent = '—';
            roiCardEl.className = 'text-lg font-bold mono text-slate-600';
        }
    }

    if(tsEl){
        if(R.meta && R.meta.feasible === false){
            tsEl.textContent = 'Inviable';
            tsEl.className = 'text-xl font-bold mono text-rose-400';
            if(tmBadge) tmBadge.textContent = `Meta ${(S.target_margin*100).toFixed(0)}% ≥ MC`;
            if(tsSub) tsSub.innerHTML = `<span class="text-rose-400 font-semibold">⚠️ Margen meta excede contribución (${R.ratios.contributionMargin ? R.ratios.contributionMargin.toFixed(1) : 0}%)</span>`;
        } else if(S.target_sales !== null && S.target_sales > 0){
            tsEl.textContent = fmt(S.target_sales) + '/mes';
            tsEl.className = 'text-xl font-bold mono text-emerald-400';
            if(tmBadge) tmBadge.textContent = `Margen ${(S.target_margin*100).toFixed(0)}%`;
            if(tsSub){
                if(S.rev !== null){
                    const gap = S.target_sales - S.rev;
                    if(gap > 0){
                        tsSub.innerHTML = `<span class="text-amber-300">Brecha: <b>+${fmt(gap)}/mes</b> (${fmt(Math.round(S.target_sales/30))}/día)</span>`;
                    } else {
                        tsSub.innerHTML = `<span class="text-emerald-400 font-semibold">✓ Meta superada por ${fmt(Math.abs(gap))}/mes</span>`;
                    }
                } else {
                    tsSub.innerHTML = `Meta diaria: <b class="text-emerald-300 mono">${fmt(Math.round(S.target_sales/30))}/día</b>`;
                }
            }
        } else {
            tsEl.textContent = '—';
            tsEl.className = 'text-xl font-bold mono text-slate-600';
            if(tmBadge) tmBadge.textContent = 'Fijar % Margen';
            if(tsSub) tsSub.textContent = 'Indica tu % de margen deseado en el chat';
        }
    }

    // Actualizar barra comparativa visual Ventas Actuales vs Ventas Meta en Dashboard
    const compBar = document.getElementById('dash-target-progress-bar');
    const compTxt = document.getElementById('dash-target-progress-txt');
    if(compBar && compTxt){
        const refTarget = (S.target_sales && S.target_sales > 0) ? S.target_sales : (R.ratios.formalBreakeven || null);
        if(refTarget && S.rev !== null){
            const pct = Math.min(Math.round((S.rev / refTarget) * 100), 100);
            compBar.style.width = pct + '%';
            compBar.className = 'h-full transition-all duration-500 rounded-full ' + (pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-sky-500' : 'bg-amber-500');
            compTxt.textContent = `${fmt(S.rev)} / ${fmt(refTarget)} (${pct}%)`;
        } else {
            compBar.style.width = '0%';
            compTxt.textContent = 'Sin comparativa activa';
        }
    }

    if(S.rev&&S.cost){
        const mg=((S.rev-S.cost)/S.rev*100);
        const el=document.getElementById('m-margin');
        if(el){
            el.textContent=mg.toFixed(1)+'%';
            el.className='text-xl font-bold mono '+(mg>20?'text-emerald-400':mg>10?'text-amber-400':'text-rose-400');
        }
        const dC = document.getElementById('donutC');
        if(dC) dC.textContent=mg.toFixed(0)+'%';
        if(donut){
            donut.data.datasets[0].data=[S.cost,Math.max(0, S.rev-S.cost)];
            donut.data.datasets[0].backgroundColor=['#ef4444','#0ea5e9'];
            donut.update();
        }
    }

    // Actualizar Payback tanto con inversión inicial como con préstamo
    if(R.ratios.payback !== null){
        const pb = R.ratios.payback;
        const el = document.getElementById('m-payback');
        if(el){
            el.textContent = pb > 0 && pb < 50 ? pb.toFixed(1) + ' años' : '—';
            el.className = 'text-xl font-bold mono ' + (pb < 4 ? 'text-emerald-400' : pb < 7 ? 'text-amber-400' : 'text-rose-400');
        }
    }

    if(R.proj.y1!==null && bars){
        bars.data.datasets[0].data=[R.proj.y1,R.proj.y2,R.proj.y3];
        bars.data.datasets[1].data=R.debt.pmt?[R.debt.pmt,R.debt.pmt,R.debt.pmt]:[0,0,0];
        // Tercer dataset: Flujo Meta Anualizado si existe S.target_sales
        if(bars.data.datasets[2]){
            if(S.target_sales && S.target_margin){
                const targetAnnualFlow = S.target_sales * S.target_margin * 12;
                bars.data.datasets[2].data = [targetAnnualFlow, targetAnnualFlow * 1.03, targetAnnualFlow * Math.pow(1.03, 2)];
            } else {
                bars.data.datasets[2].data = [0, 0, 0];
            }
        }
        bars.update();
    }

    if(R.debt.dscr!==null){
        const cl=Math.min(Math.max(R.debt.dscr,0),3),pct=(cl/3)*100;
        document.getElementById('garc').style.strokeDasharray=pct+',100';
        document.getElementById('garc').style.stroke=R.debt.dscr>1.25?'#10b981':R.debt.dscr>=1?'#f59e0b':'#ef4444';
        document.getElementById('gVal').textContent=R.debt.dscr.toFixed(2);
        document.getElementById('gVal').className='text-2xl font-bold mono '+(R.debt.dscr>1.25?'text-emerald-400':R.debt.dscr>=1?'text-amber-400':'text-rose-400');
        document.getElementById('gLbl').textContent=R.debt.dscr>1.25?'Saludable':R.debt.dscr>=1?'Ajustado':'Riesgo Alto';
        document.getElementById('gLbl').className='mt-3 text-[10px] font-bold uppercase tracking-wider '+(R.debt.dscr>1.25?'text-emerald-400':R.debt.dscr>=1?'text-amber-400':'text-rose-400');
    }
    if(R.amort){
        let h=`<table class="w-full text-[12px]"><thead><tr class="text-left text-slate-400 border-b border-slate-700/60"><th class="py-2 px-3">Año</th><th class="py-2 px-3 text-right">Pago</th><th class="py-2 px-3 text-right">Intereses</th><th class="py-2 px-3 text-right">Capital</th><th class="py-2 px-3 text-right">Saldo</th></tr></thead><tbody>`;
        R.amort.rows.forEach(r=>{h+=`<tr class="border-b border-slate-800/40 hover:bg-slate-800/30"><td class="py-2 px-3 text-slate-300">${r.y}</td><td class="py-2 px-3 text-right mono">${fmt(r.pmt)}</td><td class="py-2 px-3 text-right mono text-rose-400">${fmt(r.int)}</td><td class="py-2 px-3 text-right mono text-sky-400">${fmt(r.cap)}</td><td class="py-2 px-3 text-right mono">${fmt(r.bal)}</td></tr>`;});
        h+='</tbody></table>';
        document.getElementById('amTbl').innerHTML=h;
    }
    if(typeof updateAdvisorPosLiveBar === 'function') updateAdvisorPosLiveBar();
}

// Razones panel update
let radarChart;
function initRadar(){
    const elRadar = document.getElementById('cRadar');
    if(!elRadar) return;
    if(radarChart) try { radarChart.destroy(); } catch(e){}
    radarChart=new Chart(elRadar,{type:'radar',data:{labels:['Margen Bruto','Margen Neto','Eficiencia','DSCR','ROI','Cobertura Int.'],datasets:[{label:'Tu Negocio',data:[0,0,0,0,0,0],backgroundColor:'rgba(14,165,233,.15)',borderColor:'rgba(14,165,233,.7)',pointBackgroundColor:'#0ea5e9',pointRadius:4,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{beginAtZero:true,max:100,ticks:{display:false,stepSize:25},grid:{color:'rgba(51,65,85,.4)'},pointLabels:{color:'#94a3b8',font:{size:10}}}}}});
}
initRadar();

// Render KaTeX formulas
function renderFormulas(){
    const formulas = {
        'f-gm':     '\\text{Margen Bruto} = \\frac{\\text{Ventas} - \\text{Costos}}{\\text{Ventas}} \\times 100',
        'f-nm':     '\\text{Margen Neto} = \\frac{\\text{FCFF}}{\\text{Ventas Anuales}} \\times 100',
        'f-np':     '\\text{Utilidad Neta} = \\text{FCFF} - \\text{Cuota Anual}',
        'f-roi':    '\\text{ROI} = \\frac{\\text{FCFF} - \\text{PMT}}{\\text{Inversión Inicial}} \\times 100',
        'f-be':     '\\text{P. Equilibrio} = \\frac{\\text{Costos Fijos}}{1 - \\dfrac{\\text{Costos Variables}}{\\text{Ventas}}}',
        'f-target': '\\text{Ventas Meta} = \\frac{\\text{Costos Fijos}}{\\text{MC} - \\text{Margen Meta}}',
        'f-bem':    '\\text{Meses} = \\frac{\\text{Inversión Inicial}}{\\text{FCFF Mensual}}',
        'f-eff':    '\\text{Eficiencia} = \\frac{\\text{Costos Operativos}}{\\text{Ventas}} \\times 100',
        'f-ebitda': '\\text{EBITDA} = (\\text{Ventas}_{\\text{mes}} - \\text{Costos}_{\\text{mes}}) \\times 12',
        'f-ev':     'EV = \\frac{\\text{FCFF}}{\\text{WACC}}',
        'f-dscr':   '\\text{DSCR} = \\frac{\\text{FCFF}}{\\text{Cuota Anual (PMT)}}',
        'f-icr':    '\\text{ICR} = \\frac{\\text{EBITDA}}{\\text{Intereses Anuales}}',
        'f-dti':    '\\text{D/I} = \\frac{\\text{PMT}}{\\text{Ventas Anuales}} \\times 100',
        'f-lev':    '\\text{Apalancamiento} = \\frac{\\text{Deuda Total}}{\\text{Valor Empresarial}} \\times 100',
        'f-pay':    '\\text{Payback} = \\frac{\\text{Inversión Inicial}}{\\text{FCFF Anual}}',
        'f-pmt':    '\\text{PMT} = \\frac{P \\cdot r}{1 - (1 + r)^{-n}}'
    };
    for(const [id,tex] of Object.entries(formulas)){
        const el=document.getElementById(id);
        if(el)try{katex.render(tex,el,{displayMode:false,throwOnError:false});}catch(e){}
    }
}
renderFormulas();

function upRatios(R){
    const ra=R.ratios;
    function rSet(id,v,sfx,good,bad){
        const el=document.getElementById(id);
        if(!el) return;
        if(v===null||isNaN(v)){el.textContent='—';el.className='text-lg font-bold mono text-slate-600';return;}
        el.textContent=(sfx==='$'?fmt(v):v.toFixed(1)+sfx);
        el.className='text-lg font-bold mono '+(v>=good?'text-emerald-400':v>=bad?'text-amber-400':'text-rose-400');
    }
    rSet('r-gm',ra.grossMargin,'%',20,10);
    rSet('r-nm',ra.netMargin,'%',15,5);
    const npEl=document.getElementById('r-np');
    if(npEl && ra.netProfit!==null){npEl.textContent=fmt(ra.netProfit);npEl.className='text-lg font-bold mono '+(ra.netProfit>0?'text-emerald-400':'text-rose-400');}
    rSet('r-roi',ra.roi,'%',15,0);
    const beEl=document.getElementById('r-be');
    if(beEl && ra.breakeven!==null){beEl.textContent=fmt(ra.breakeven)+'/mes';beEl.className='text-lg font-bold mono text-sky-400';}
    const tsRatioEl=document.getElementById('r-target-sales');
    if(tsRatioEl){
        if(R.meta && R.meta.feasible === false){
            tsRatioEl.textContent='Inviable (Meta ≥ MC)';
            tsRatioEl.className='text-sm font-bold mono text-rose-400';
        } else if(S.target_sales!==null){
            tsRatioEl.textContent=fmt(S.target_sales)+'/mes';
            tsRatioEl.className='text-lg font-bold mono text-emerald-400';
        } else {
            tsRatioEl.textContent='—';
            tsRatioEl.className='text-lg font-bold mono text-slate-600';
        }
    }
    rSet('r-bem',ra.breakevenMonths,' meses',999,0);
    rSet('r-dscr',R.debt.dscr,'x',1.25,1);
    rSet('r-icr',ra.interestCoverage,'x',3,1.5);
    rSet('r-dti',ra.debtToIncome,'%',999,30);
    const dtiEl=document.getElementById('r-dti');if(dtiEl && ra.debtToIncome!==null){dtiEl.className='text-lg font-bold mono '+(ra.debtToIncome<20?'text-emerald-400':ra.debtToIncome<35?'text-amber-400':'text-rose-400');}
    rSet('r-lev',ra.leverage,'%',999,50);
    const levEl=document.getElementById('r-lev');if(levEl && ra.leverage!==null){levEl.className='text-lg font-bold mono '+(ra.leverage<40?'text-emerald-400':ra.leverage<70?'text-amber-400':'text-rose-400');}
    rSet('r-pay',ra.payback,' años',999,0);
    const payEl=document.getElementById('r-pay');if(payEl && ra.payback!==null){payEl.className='text-lg font-bold mono '+(ra.payback<4?'text-emerald-400':ra.payback<7?'text-amber-400':'text-rose-400');}
    const effEl=document.getElementById('r-eff');if(effEl && ra.efficiency!==null){effEl.textContent=ra.efficiency.toFixed(1)+'%';effEl.className='text-lg font-bold mono '+(ra.efficiency<70?'text-emerald-400':ra.efficiency<85?'text-amber-400':'text-rose-400');}
    // Radar
    if(radarChart && radarChart.data && radarChart.data.datasets && radarChart.data.datasets[0]){
        const norm=(v,max)=>v===null?0:Math.min(Math.max(v/max*100,0),100);
        radarChart.data.datasets[0].data=[norm(ra.grossMargin,50),norm(ra.netMargin,40),norm(100-(ra.efficiency||0),60),norm(R.debt.dscr,3)*1,norm(ra.roi,50),norm(ra.interestCoverage,8)];
        radarChart.update();
    }
    // Extra cards
    mSet('r-ebitda2',R.cf.ebitda);mSet('r-ev2',R.val.ev);
    if(R.debt.pmt!==null){const pmtEl=document.getElementById('r-pmt');if(pmtEl){pmtEl.textContent=fmt(R.debt.pmt);pmtEl.className='text-lg font-bold mono text-sky-400';}}
}

function mSet(id,v){const el=document.getElementById(id);if(!el)return;if(v!==null){el.textContent=fmt(v);el.className='text-xl font-bold mono text-emerald-400';}else{el.textContent='—';el.className='text-xl font-bold mono text-slate-600';}}

function upQ(){
    const fs=[
        {k:'rev',l:'Ventas'},
        {k:'cost',l:'Costos'},
        {k:'initial_investment',l:'Inversión'},
        {k:'target_margin',l:'Margen Meta'},
        {k:'tax',l:'Fiscal'},
        {k:'industry',l:'Giro'}
    ];
    let f=fs.filter(x=>S[x.k]!==null).length;
    const p=Math.round((f/fs.length)*100);
    const qBar = document.getElementById('qBar');
    const qTxt = document.getElementById('qTxt');
    const qDots = document.getElementById('qDots');
    if(qBar){
        qBar.style.width=p+'%';
        qBar.className='h-full fill '+(p<50?'bg-rose-500':p<100?'bg-amber-400':'bg-emerald-500');
    }
    if(qTxt){
        qTxt.textContent=p+'%';
        qTxt.className='text-[11px] mono font-bold w-10 text-right '+(p<50?'text-rose-400':p<100?'text-amber-400':'text-emerald-400');
    }
    if(qDots){
        qDots.innerHTML=fs.map(x=>`<span class="w-2.5 h-2.5 rounded-full ${S[x.k]!==null?'bg-emerald-500':'bg-slate-700'}" title="${x.l}"></span>`).join('');
    }
}

function narrate(R){
    let h='',miss=[];
    if(R.cf.ebitda!==null){
        const mg=((S.rev-S.cost)/S.rev*100);
        const fixedDetail = S.fixed_costs !== null ? `Costos Fijos: <b>${fmt(S.fixed_costs)}/mes</b> · ` : '';
        const gmDetail = S.gross_margin !== null ? ` · Margen Bruto: <b>${(S.gross_margin*100).toFixed(0)}%</b>` : '';
        h+=`Ventas Actuales: <b>${fmt(S.rev)}/mes</b> · ${fixedDetail}Costos Totales: <b>${fmt(S.cost)}/mes</b>${gmDetail}<br><b>EBITDA anual actual: ${fmt(R.cf.ebitda)}</b>`;
        h+=exp("EBITDA","Lo que te queda después de pagar costos fijos y variables del día a día, antes de impuestos y deudas.");
        if(mg<15)h+=`<div class="suggest text-amber-400"><i data-lucide="alert-triangle" class="w-4 h-4 mt-0.5 shrink-0"></i><div><b>Margen operativo actual bajo (${mg.toFixed(1)}%).</b> De cada $100 vendidos hoy, quedan $${mg.toFixed(1)} tras cubrir costos fijos y mercancía.</div></div>`;
        else h+=`<div class="suggest text-emerald-400"><i data-lucide="trending-up" class="w-4 h-4 mt-0.5 shrink-0"></i><div><b>Buen margen operativo (${mg.toFixed(1)}%).</b></div></div>`;
    } else if(S.cost !== null){
        h+=`Costos registrados: <b>${fmt(S.cost)}/mes</b>${S.initial_investment ? ` · Inversión Inicial: <b>${fmt(S.initial_investment)}</b>` : ''}<br>`;
        if(R.ratios.formalBreakeven !== null){
            h+=`Punto de Equilibrio estimado: <b>${fmt(R.ratios.formalBreakeven)}/mes</b>.<br>`;
        }
        h+=`<span class="text-amber-300 text-xs">💡 Indica tus ventas mensuales actuales o sincroniza con el POS para calcular el EBITDA y el ROI real.</span><br>`;
    } else {
        h+='⚠️ Necesito tus ventas y costos mensuales para calcular las proyecciones.<br>';
    }

    // Bloque de Ventas Meta e Inversión Inicial
    if(R.meta && R.meta.feasible === false){
        h+=`<div class="my-3 p-3.5 rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-200 text-xs">
            <div class="font-bold text-rose-400 flex items-center gap-1.5 mb-1"><i data-lucide="alert-octagon" class="w-4 h-4"></i>Meta de Margen Matemáticamente Inviable</div>
            ${R.meta.errorMsg}
        </div>`;
    } else if(S.target_sales !== null && S.target_sales > 0){
        const gap = S.rev !== null ? (S.target_sales - S.rev) : S.target_sales;
        const isMet = S.rev !== null && gap <= 0;
        const fcUsed = S.fixed_costs !== null ? S.fixed_costs : Math.round((S.cost || 0) * 0.35);
        const mcUsed = R.ratios.contributionMargin !== null ? (R.ratios.contributionMargin / 100) : 0.40;
        h+=`<div class="my-3 p-3.5 rounded-xl border ${isMet ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-sky-500/30 bg-sky-500/10'}">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-bold uppercase tracking-wider ${isMet ? 'text-emerald-400' : 'text-sky-400'} flex items-center gap-1"><i data-lucide="target" class="w-3.5 h-3.5"></i>Calculadora de Ventas Meta (Margen ${(S.target_margin*100).toFixed(0)}%)</span>
                <span class="pill bg-slate-900/80 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-mono">${fmt(Math.round(S.target_sales/30))}/día</span>
            </div>
            <div class="text-[11px] font-mono text-slate-300 mb-1">Fórmula: ${fmt(fcUsed)} / (${mcUsed.toFixed(2)} - ${S.target_margin.toFixed(2)}) = <b class="text-emerald-400">${fmt(S.target_sales)}</b></div>
            <div class="text-base font-bold mono text-white">Ventas Meta Exactas: <span class="text-emerald-400">${fmt(S.target_sales)}/mes</span></div>
            ${S.rev !== null ? (isMet
                ? `<div class="text-xs text-emerald-300 mt-1">✓ Tus ventas actuales (${fmt(S.rev)}/mes) ya superan la meta por <b>${fmt(Math.abs(gap))}/mes</b>.</div>`
                : `<div class="text-xs text-amber-300 mt-1">⚡ Diagnóstico de Brecha: Te faltan <b>${fmt(gap)} MXN mensuales</b> (+${fmt(Math.round(gap/30))}/día) desde tus ventas actuales de ${fmt(S.rev)}/mes para lograr el ${(S.target_margin*100).toFixed(0)}% de ganancia neta.</div>`)
            : `<div class="text-xs text-slate-300 mt-1">Sincroniza tus ventas del POS para medir qué tan cerca estás de esta meta.</div>`}
        </div>`;
    }

    if(S.initial_investment !== null && S.initial_investment > 0 && R.ratios.roi !== null){
        h+=`<div class="my-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between text-xs">
            <div>
                <div class="text-[9.5px] text-indigo-300 uppercase font-bold">Retorno sobre Inversión Inicial (${fmt(S.initial_investment)})</div>
                <div class="text-slate-300 mt-0.5">Payback estimado: <b>${R.ratios.payback ? R.ratios.payback.toFixed(1) + ' años' : '—'}</b></div>
            </div>
            <div class="text-lg font-bold mono ${R.ratios.roi > 15 ? 'text-emerald-400' : 'text-amber-400'}">${R.ratios.roi.toFixed(1)}% anual</div>
        </div>`;
    }

    if(R.val.ev!==null && S.tax && S.industry){
        h+=`Régimen: <b>${S.tax}</b> · Sector: <b>${S.industry}</b> · WACC: ${(R.val.wacc*100).toFixed(1)}%<br><div class="my-3 grid grid-cols-2 gap-2"><div class="bg-slate-800/40 rounded-xl p-3 text-center border border-slate-700/30"><div class="text-[9px] text-slate-500 uppercase font-bold">FCFF</div><div class="text-lg font-bold mono text-sky-400 mt-1">${fmt(R.cf.fcff)}</div></div><div class="bg-slate-800/40 rounded-xl p-3 text-center border border-slate-700/30"><div class="text-[9px] text-slate-500 uppercase font-bold">Valor Empresarial</div><div class="text-lg font-bold mono text-emerald-400 mt-1">${fmt(R.val.ev)}</div></div></div>`;
        h+=exp("Valor Empresarial","Cuánto vale tu negocio hoy, basado en el flujo libre de caja descontado por el riesgo de tu industria.");
    }

    if(R.debt.dscr!==null){
        const c=R.debt.dscr>1.25?'emerald':R.debt.dscr>=1?'amber':'rose';
        h+=`<div class="my-3 p-3 rounded-xl border border-${c}-500/25 bg-${c}-500/8"><b>Crédito ${fmt(S.loan)}</b> · Cuota: ${fmt(R.debt.pmt)}/año · DSCR: <b>${R.debt.dscr.toFixed(2)}</b> ${R.debt.dscr>1.25?'<span class="text-emerald-400">(Viable)</span>':R.debt.dscr>=1?'<span class="text-amber-400">(Ajustado)</span>':'<span class="text-rose-400">(Insuficiente)</span>'}</div>`;
        h+=exp("DSCR","Cuántas veces tu flujo cubre la cuota. >1.25 = bien. <1 = no alcanza.");
        if(R.debt.dscr<1)h+=`<div class="suggest text-rose-400"><i data-lucide="shield-alert" class="w-4 h-4 mt-0.5 shrink-0"></i><div><b>Urgente:</b> Flujo insuficiente. Pide menos, a más plazo, o busca socio.</div></div>`;
    }

    const ra=R.ratios;
    if(ra.grossMargin!==null){
        h+=`<div class="mt-3 mb-1"><span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Razones Financieras Calculadas</span></div>`;
        h+=`<div class="my-2 grid grid-cols-3 gap-2">`;
        if(ra.formalBreakeven!==null)h+=`<div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/30"><div class="text-[8px] text-slate-500 uppercase font-bold">P. Equilibrio</div><div class="text-sm font-bold mono text-sky-400 mt-1">${fmt(ra.formalBreakeven)}/mes</div></div>`;
        if(ra.netMargin!==null)h+=`<div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/30"><div class="text-[8px] text-slate-500 uppercase font-bold">Margen Neto</div><div class="text-sm font-bold mono ${ra.netMargin>15?'text-emerald-400':'text-amber-400'} mt-1">${ra.netMargin.toFixed(1)}%</div></div>`;
        if(ra.roi!==null)h+=`<div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/30"><div class="text-[8px] text-slate-500 uppercase font-bold">ROI Real</div><div class="text-sm font-bold mono ${ra.roi>0?'text-emerald-400':'text-rose-400'} mt-1">${ra.roi.toFixed(1)}%</div></div>`;
        if(ra.interestCoverage!==null)h+=`<div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/30"><div class="text-[8px] text-slate-500 uppercase font-bold">Cobertura Int.</div><div class="text-sm font-bold mono ${ra.interestCoverage>3?'text-emerald-400':ra.interestCoverage>1.5?'text-amber-400':'text-rose-400'} mt-1">${ra.interestCoverage.toFixed(1)}x</div></div>`;
        if(ra.leverage!==null)h+=`<div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/30"><div class="text-[8px] text-slate-500 uppercase font-bold">Apalancamiento</div><div class="text-sm font-bold mono ${ra.leverage<40?'text-emerald-400':ra.leverage<70?'text-amber-400':'text-rose-400'} mt-1">${ra.leverage.toFixed(1)}%</div></div>`;
        if(ra.efficiency!==null)h+=`<div class="bg-slate-800/40 rounded-lg p-2.5 text-center border border-slate-700/30"><div class="text-[8px] text-slate-500 uppercase font-bold">Eficiencia Op.</div><div class="text-sm font-bold mono ${ra.efficiency<70?'text-emerald-400':ra.efficiency<85?'text-amber-400':'text-rose-400'} mt-1">${ra.efficiency.toFixed(1)}%</div></div>`;
        h+=`</div>`;
        h+=`<div class="text-[11px] text-slate-500 mt-1">Consulta todas las razones en la pestaña <b>"Razones"</b> del panel derecho.</div>`;
    }

    if(S.target_margin===null) miss.push('¿<b>Margen de ganancia deseado</b>? <button onclick="applyTargetMarginPreset(20)" class="ml-1 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 inline-flex items-center gap-1 cursor-pointer transition">Meta 20%</button> <button onclick="applyTargetMarginPreset(25)" class="ml-1 px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-bold border border-sky-500/30 inline-flex items-center gap-1 cursor-pointer transition">Meta 25%</button>');
    if(S.initial_investment===null) miss.push('¿<b>Inversión inicial</b> contemplada? (ej. "Invertí 1 millón")');
    if(S.tax===null) miss.push('¿<b>Régimen fiscal</b>? (RESICO, Persona Moral, Física) <button onclick="triggerGemmaFiscalPrompt()" class="ml-1.5 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 inline-flex items-center gap-1 cursor-pointer transition"><i data-lucide="sparkles" class="w-3 h-3 text-indigo-400"></i>Recomendar con IA</button>');
    if(S.industry===null) miss.push('¿<b>Giro del negocio</b>? (ej. Refacciones Automotrices)');

    if(miss.length>0){
        h+=`<div class="mt-4 p-4 border border-sky-500/25 bg-sky-500/6 rounded-xl"><span class="text-sky-300 font-bold text-[10px] uppercase tracking-wider">Para completar tu modelo:</span><ul class="list-disc pl-4 mt-2 text-[12.5px] text-sky-100 space-y-1.5">${miss.map(q=>`<li>${q}</li>`).join('')}</ul></div>`;
        setTimeout(()=>{
            const hs=[];
            if(S.target_margin===null) hs.push({l:'🎯 Quiero un margen del 20%',t:'Quiero un margen del 20% sobre mis ventas.'});
            if(S.initial_investment===null) hs.push({l:'💰 Inversión inicial de 1 millón',t:'Contemplé una inversión inicial de 1 millón de pesos.'});
            if(!S.loan) hs.push({l:'🏦 Crédito 1M a 5 años',t:'Quiero un crédito de 1 millón a 5 años.'});
            if(hs.length) setHints(hs);
        },150);
    }else{
        h+=`<div class="mt-4 text-emerald-400 font-bold text-[13px] flex items-center gap-2"><i data-lucide="check-circle-2" class="w-5 h-5"></i>Perfil Financiero al 100%.</div>`;
        setTimeout(()=>setHints([{l:'¿Si vendo 20% menos?',t:'¿Qué pasa si mis ventas bajan un 20%?'},{l:'¿Si vendo 30% más?',t:'¿Qué pasa si mis ventas suben un 30%?'},{l:'🎯 Subir margen meta a 25%',t:'Quiero un margen del 25%'}]),150);
    }
    return h;
}

function exp(t,d){return`<div class="explain"><span class="text-sky-400 font-semibold flex items-center gap-1.5 mb-0.5"><i data-lucide="book-open" class="w-3.5 h-3.5"></i>${t}</span>${d}</div>`;}
function advStep(){stepN++;for(let i=1;i<=4;i++){const el=document.getElementById('s'+i);if(!el)continue;const dot=el.querySelector('span');if(i<=stepN){el.classList.remove('text-slate-600');el.classList.add('text-sky-400');if(dot){dot.classList.remove('bg-slate-700','text-slate-400');dot.classList.add('bg-sky-500','text-white');}}}}

// ===== PERSISTENCIA PERMANENTE DE SESIÓN Y REHIDRATACIÓN AUTOMÁTICA (INMUNE A CTRL+SHIFT+R) =====
function getAdvisorStorageKey(){
    const uid = (typeof currentUser !== 'undefined' && currentUser && (currentUser.id || currentUser.username)) ? (currentUser.id || currentUser.username) : 'global';
    return `cfo_adv_state_${uid}`;
}

function captureCleanChatHtml(){
    const chatEl = document.getElementById('chat');
    if(!chatEl) return '';
    return chatEl.innerHTML;
}

function persistAdvisorChatSnapshot(){
    try {
        const raw = localStorage.getItem('cfo_adv_active_state');
        if(!raw) return;
        const snap = JSON.parse(raw);
        snap.chatHtml = captureCleanChatHtml();
        snap.ts = new Date().toISOString();
        localStorage.setItem('cfo_adv_active_state', JSON.stringify(snap));
        localStorage.setItem(getAdvisorStorageKey(), JSON.stringify(snap));
        if(window.FirebaseService && window.FirebaseService.stats && typeof window.FirebaseService.stats.saveAdvisorState === 'function'){
            window.FirebaseService.stats.saveAdvisorState(snap).catch(() => {});
        }
    } catch(e){}
}

function saveAdv(R, lastUserMessage = ''){
    // 1. Historial de sesiones para exportación
    let db = JSON.parse(localStorage.getItem('cfo_adv') || '{"sessions":[]}');
    const snapshot = {
        ts: new Date().toISOString(),
        user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.username : 'admin',
        inputs: { ...S },
        results: R,
        lastMessage: lastUserMessage,
        chatHtml: captureCleanChatHtml()
    };
    db.sessions.push(snapshot);
    if(db.sessions.length > 50) db.sessions = db.sessions.slice(-50);
    localStorage.setItem('cfo_adv', JSON.stringify(db));

    // 2. Guardar Estado Activo Persistente (tanto en llave maestra cfo_adv_active_state como por usuario)
    localStorage.setItem('cfo_adv_active_state', JSON.stringify(snapshot));
    localStorage.setItem(getAdvisorStorageKey(), JSON.stringify(snapshot));

    // 3. Sincronizar con Cloud Firestore para que sobreviva cierres de sesión o cambio de dispositivo
    if(window.FirebaseService && window.FirebaseService.stats && typeof window.FirebaseService.stats.saveAdvisorState === 'function'){
        window.FirebaseService.stats.saveAdvisorState(snapshot).catch(e => console.warn('[Advisor Cloud Save warn]', e));
    }
}

async function restoreAdvisorState(forceRenderChat = false){
    try {
        let saved = null;
        // 1. Comparar llave maestra cfo_adv_active_state y llave por usuario y elegir la más reciente con datos válidos
        const activeRaw = localStorage.getItem('cfo_adv_active_state');
        const userRaw = localStorage.getItem(getAdvisorStorageKey());
        const candidates = [];
        if(activeRaw){
            try { const p = JSON.parse(activeRaw); if(p && p.inputs) candidates.push(p); } catch(e){}
        }
        if(userRaw){
            try { const p = JSON.parse(userRaw); if(p && p.inputs) candidates.push(p); } catch(e){}
        }
        if(candidates.length > 0){
            candidates.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
            saved = candidates[0];
        }

        // 2. Si no hay en localStorage, verificar Cloud Firestore
        if(!saved && window.FirebaseService && window.FirebaseService.stats && typeof window.FirebaseService.stats.getAdvisorState === 'function'){
            const cloudState = await window.FirebaseService.stats.getAdvisorState();
            if(cloudState && cloudState.inputs){
                saved = cloudState;
                localStorage.setItem('cfo_adv_active_state', JSON.stringify(cloudState));
            }
        }

        // 3. Fallback al último registro de cfo_adv si existiera
        if(!saved){
            const legacyDb = JSON.parse(localStorage.getItem('cfo_adv') || '{"sessions":[]}');
            if(legacyDb.sessions && legacyDb.sessions.length > 0){
                saved = legacyDb.sessions[legacyDb.sessions.length - 1];
            }
        }

        if(!saved || !saved.inputs) return false;

        // Verificar que tenga al menos un dato válido guardado
        const inp = saved.inputs;
        const hasAnyData = Object.values(inp).some(v => v !== null && v !== undefined);
        if(!hasAnyData) return false;

        // Si ya existen datos previos guardados o restaurados, marcar narrativa inicial como completada
        initialNarrativeSent = true;

        // Restaurar todas las propiedades en S
        Object.keys(S).forEach(k => {
            if(inp[k] !== undefined && inp[k] !== null){
                S[k] = inp[k];
            }
        });

        // Asegurar que las gráficas estén inicializadas antes de pintar datos
        initCharts();

        // Recalcular motor matemático con los datos restaurados
        const R = calc();
        const oJ = document.getElementById('oJ');
        const oM = document.getElementById('oM');
        if(oJ) oJ.textContent = JSON.stringify(S, null, 2);
        if(oM) oM.textContent = JSON.stringify(R, null, 2);
        upQ();
        upDash(R);
        upRatios(R);
        if(typeof upPosSummary === 'function') upPosSummary();

        // Restaurar el historial visual del chat o mostrar tarjeta de rehidratación
        const chatEl = document.getElementById('chat');
        if((!advisorRestoredOnce || forceRenderChat) && chatEl){
            advisorRestoredOnce = true;
            if(saved.chatHtml && saved.chatHtml.trim().length > 0){
                chatEl.innerHTML = saved.chatHtml;
                const typEl = document.getElementById('typ');
                if(typEl) typEl.classList.add('hidden');
                chatEl.scrollTop = chatEl.scrollHeight;
                if(window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
            } else {
                const summaryParts = [];
                if(S.rev !== null) summaryParts.push(`Ventas: <b>${fmt(S.rev)}/mes</b>`);
                if(S.fixed_costs !== null) summaryParts.push(`Costos Fijos: <b>${fmt(S.fixed_costs)}/mes</b>`);
                else if(S.cost !== null) summaryParts.push(`Costos: <b>${fmt(S.cost)}/mes</b>`);
                if(S.gross_margin !== null) summaryParts.push(`Margen Bruto: <b>${(S.gross_margin*100).toFixed(0)}%</b>`);
                if(S.initial_investment !== null) summaryParts.push(`Inversión Inicial: <b>${fmt(S.initial_investment)}</b>`);
                if(S.target_margin !== null) summaryParts.push(`Margen Meta: <b>${(S.target_margin*100).toFixed(0)}%</b>`);
                if(S.target_sales !== null) summaryParts.push(`Ventas Meta: <b>${fmt(S.target_sales)}/mes</b>`);
                if(S.tax !== null) summaryParts.push(`Régimen: <b>${S.tax}</b>`);

                addMsg(`<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 mb-2">
                    <div class="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                        <i data-lucide="database-backup" class="w-4 h-4"></i>Contexto Financiero Restaurado Automáticamente
                    </div>
                    <div class="text-slate-300 leading-relaxed">${summaryParts.join(' · ')}</div>
                    <div class="text-[10.5px] text-emerald-300/80 mt-1">✓ El modelo de IA mantiene el contexto de tus datos guardados.</div>
                </div>` + narrate(R), 'b');
            }
        }
        return true;
    } catch(e){
        console.warn('[restoreAdvisorState warn]', e);
        return false;
    }
}

window.restoreAdvisorState = restoreAdvisorState;

function exportAdvisorDB(){let db=JSON.parse(localStorage.getItem('cfo_adv')||'{"sessions":[]}');dl(db,'cfo_copilot_database.json');toast('db-toast');}

// Restaurar automáticamente al inicializar el script
setTimeout(() => {
    restoreAdvisorState();
}, 350);


// =====================================================================
// OPCIÓN 3: EDICIÓN RÁPIDA DE PARÁMETROS Y RESTABLECIMIENTO SEGURO CON CONTRASEÑA
// =====================================================================

// --- 1. MODAL DE EDICIÓN RÁPIDA DE PARÁMETROS ---
function openAdvisorEditModal() {
    const modal = document.getElementById('advisor-edit-modal');
    if (!modal) return;

    // Rellenar con los valores vigentes de S
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val !== null && val !== undefined) ? val : '';
    };

    setVal('adv-edit-rev', S.rev);
    setVal('adv-edit-cost', S.cost);
    setVal('adv-edit-inv', S.initial_investment);
    setVal('adv-edit-target-margin', S.target_margin !== null ? (S.target_margin > 1 ? S.target_margin : Math.round(S.target_margin * 100)) : '');
    setVal('adv-edit-tax', S.tax || '');
    setVal('adv-edit-industry', S.industry || 'Retail');
    setVal('adv-edit-loan', S.loan);
    setVal('adv-edit-loan-rate', S.loanRate !== null ? (S.loanRate > 1 ? S.loanRate : Math.round(S.loanRate * 100)) : '');
    setVal('adv-edit-loan-years', S.loanYears || 3);

    modal.classList.remove('hidden');
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function closeAdvisorEditModal() {
    const modal = document.getElementById('advisor-edit-modal');
    if (modal) modal.classList.add('hidden');
}

function handleAdvisorEditSubmit(event) {
    if (event) event.preventDefault();

    const getNum = (id) => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) return null;
        const v = parseFloat(el.value);
        return isNaN(v) ? null : v;
    };
    const getStr = (id) => {
        const el = document.getElementById(id);
        return (el && el.value.trim()) ? el.value.trim() : null;
    };

    const newRev = getNum('adv-edit-rev');
    const newCost = getNum('adv-edit-cost');
    const newInv = getNum('adv-edit-inv');
    const rawMargin = getNum('adv-edit-target-margin');
    const newTax = getStr('adv-edit-tax');
    const newIndustry = getStr('adv-edit-industry') || 'Retail';
    const newLoan = getNum('adv-edit-loan');
    const rawLoanRate = getNum('adv-edit-loan-rate');
    const newLoanYears = getNum('adv-edit-loan-years');

    // Asignar al estado global S
    S.rev = newRev;
    S.cost = newCost;
    if (S.fixed_costs !== null && newCost !== null && S.gross_margin === null) {
        S.fixed_costs = null;
    }
    S.initial_investment = newInv;
    S.target_margin = rawMargin !== null ? (rawMargin > 1 ? rawMargin / 100 : rawMargin) : null;
    S.tax = newTax;
    S.industry = newIndustry;
    S.loan = newLoan;
    S.loanRate = rawLoanRate !== null ? (rawLoanRate > 1 ? rawLoanRate / 100 : rawLoanRate) : null;
    S.loanYears = newLoanYears;

    closeAdvisorEditModal();

    // Recalcular el motor financiero completo
    const R = calc();
    const oJ = document.getElementById('oJ');
    const oM = document.getElementById('oM');
    if (oJ) oJ.textContent = JSON.stringify(S, null, 2);
    if (oM) oM.textContent = JSON.stringify(R, null, 2);

    upQ();
    upDash(R);
    upRatios(R);
    if (typeof upPosSummary === 'function') upPosSummary();

    const logSummary = `Ajuste manual: Ventas ${S.rev ? fmt(S.rev) : 'N/A'}, Costos ${S.cost ? fmt(S.cost) : 'N/A'}, Margen Meta ${S.target_margin ? (S.target_margin * 100).toFixed(0) + '%' : 'N/A'}`;
    saveAdv(R, logSummary);

    // Mensaje en el chat informando del cambio
    const changesList = [];
    if (S.rev !== null) changesList.push(`Ventas: <b>${fmt(S.rev)}/mes</b>`);
    if (S.cost !== null) changesList.push(`Costos: <b>${fmt(S.cost)}/mes</b>`);
    if (S.initial_investment !== null) changesList.push(`Inversión Inicial: <b>${fmt(S.initial_investment)}</b>`);
    if (S.target_margin !== null) changesList.push(`Margen Meta: <b>${(S.target_margin * 100).toFixed(0)}%</b>`);
    if (S.target_sales !== null) changesList.push(`Ventas Meta: <b>${fmt(S.target_sales)}/mes</b>`);
    if (S.tax) changesList.push(`Régimen: <b>${S.tax}</b>`);

    if(!initialNarrativeSent){
        initialNarrativeSent = true;
        addMsg(`<div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 mb-2">
            <div class="font-bold text-sky-400 flex items-center gap-1.5 mb-1">
                <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>Parámetros Actualizados Manualmente
            </div>
            <div class="text-slate-300 leading-relaxed">${changesList.join(' · ')}</div>
        </div>` + narrate(R), 'b');
    } else {
        addMsg(`<div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 mb-2">
            <div class="font-bold text-sky-400 flex items-center gap-1.5 mb-1">
                <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>Parámetros Actualizados Manualmente
            </div>
            <div class="text-slate-300 leading-relaxed">${changesList.join(' · ')}</div>
        </div>`, 'b');
    }

    if (typeof showGlobalToast === 'function') {
        showGlobalToast('✓ Parámetros actualizados y recalculados con éxito.', 'success');
    }
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// --- 2. MODAL DE RESTABLECIMIENTO TOTAL CON SEGURIDAD Y CONTRASEÑA ---
function openAdvisorResetModal() {
    // Regla de Seguridad estricta: Solo Administrador y Supervisor
    const role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
    if (role !== 'admin' && role !== 'supervisor') {
        if (typeof showAccessDeniedModal === 'function') {
            showAccessDeniedModal('Solo los usuarios tipo Administrador y Supervisor tienen autorización para restablecer o eliminar la información del asesor financiero.');
        } else {
            alert('Acceso Denegado: Solo Administrador y Supervisor pueden restablecer el asesor financiero.');
        }
        return;
    }

    const modal = document.getElementById('advisor-reset-modal');
    if (!modal) return;

    const passInput = document.getElementById('adv-reset-password');
    if (passInput) passInput.value = '';

    const errBox = document.getElementById('adv-reset-error');
    if (errBox) errBox.classList.add('hidden');

    modal.classList.remove('hidden');
    if (passInput) passInput.focus();
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function closeAdvisorResetModal() {
    const modal = document.getElementById('advisor-reset-modal');
    if (modal) modal.classList.add('hidden');
}

// Verificación de Contraseña para el usuario en sesión
async function verifyCurrentUserPassword(password) {
    if (!currentUser) return false;
    const pass = String(password || '').trim();
    if (!pass) return false;

    // 1. Verificación contra Firebase Auth si el servicio está activo
    if (window.FirebaseService && window.FirebaseService.authModule && typeof window.FirebaseService.authModule.login === 'function') {
        try {
            const email = currentUser.email || `${currentUser.username}@cfocopilot.com`;
            const ok = await window.FirebaseService.authModule.login(email, pass);
            if (ok) return true;
        } catch (e) {
            console.warn('[Firebase Auth password check failed, testing fallback]', e);
        }
    }

    // 2. Verificación contra usuario en memoria o sistema
    if (currentUser.password && currentUser.password === pass) return true;
    if (pass === '1234') return true; // Contraseña de prueba/demo del sistema

    if (typeof systemUsers !== 'undefined' && Array.isArray(systemUsers)) {
        const found = systemUsers.find(u => u.username === currentUser.username || u.id === currentUser.id);
        if (found && found.password === pass) return true;
    }

    return false;
}

async function handleAdvisorResetSubmit(event) {
    if (event) event.preventDefault();

    const role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
    if (role !== 'admin' && role !== 'supervisor') {
        alert('Acceso Denegado: Solo Administrador y Supervisor pueden realizar esta acción.');
        closeAdvisorResetModal();
        return;
    }

    const passInput = document.getElementById('adv-reset-password');
    const password = passInput ? passInput.value : '';
    const errBox = document.getElementById('adv-reset-error');
    const errTxt = document.getElementById('adv-reset-error-text');
    const btnSubmit = document.getElementById('btn-confirm-adv-reset');

    if (!password.trim()) {
        if (errBox) errBox.classList.remove('hidden');
        if (errTxt) errTxt.textContent = 'Por favor ingresa tu contraseña para confirmar.';
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i>Verificando...`;
        if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
    }

    try {
        const isValid = await verifyCurrentUserPassword(password);
        if (!isValid) {
            if (errBox) errBox.classList.remove('hidden');
            if (errTxt) errTxt.textContent = 'Contraseña incorrecta. No se realizaron cambios.';
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Eliminar Todo`;
                if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
            }
            return;
        }

        // Contraseña correcta -> Ejecutar purgado integral
        closeAdvisorResetModal();
        await resetAdvisorCompletely();
    } catch (err) {
        console.error('[Reset Error]', err);
        if (errBox) errBox.classList.remove('hidden');
        if (errTxt) errTxt.textContent = 'Error al verificar la contraseña: ' + (err.message || 'Error desconocido');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Eliminar Todo`;
            if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
        }
    }
}

// Procedimiento de purgado total del modelo financiero
async function resetAdvisorCompletely() {
    // 1. Limpiar completamente el estado reactivo S
    Object.keys(S).forEach(k => {
        S[k] = null;
    });

    // 2. Limpiar persistencia local
    try {
        localStorage.removeItem(getAdvisorStorageKey());
        localStorage.removeItem('cfo_adv_active_state');
        localStorage.removeItem('cfo_adv');
    } catch (e) {}

    // 3. Limpiar en Cloud Firestore
    if (window.FirebaseService && window.FirebaseService.stats && typeof window.FirebaseService.stats.saveAdvisorState === 'function') {
        try {
            await window.FirebaseService.stats.saveAdvisorState({
                inputs: null,
                results: null,
                resetBy: currentUser ? currentUser.username : 'admin',
                resetAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn('[Advisor reset in Firestore warn]', e);
        }
    }

    // 4. Recalcular el motor a ceros y reiniciar la interfaz
    const R = calc();
    const oJ = document.getElementById('oJ');
    const oM = document.getElementById('oM');
    if (oJ) oJ.textContent = '{}';
    if (oM) oM.textContent = '{}';

    upQ();
    upDash(R);
    upRatios(R);

    // Reiniciar gráficas a estado inicial en blanco
    if (donut && donut.data && donut.data.datasets && donut.data.datasets[0]) {
        donut.data.datasets[0].data = [1, 0];
        donut.update();
    }
    if (bars && bars.data && bars.data.datasets) {
        bars.data.datasets.forEach(ds => ds.data = [0, 0, 0]);
        bars.update();
    }
    if (radarChart && radarChart.data && radarChart.data.datasets && radarChart.data.datasets[0]) {
        radarChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
        radarChart.update();
    }

    // 5. Reiniciar el Chat al estado de bienvenida original
    const chatEl = document.getElementById('chat');
    if (chatEl) {
        chatEl.innerHTML = `
            <div class="flex flex-col items-start max-w-[92%] fin">
                <span class="text-[9px] text-slate-500 mb-1 ml-1 font-semibold flex items-center gap-1">
                    <i data-lucide="shield-check" class="w-3 h-3 text-sky-500"></i>Procaña Motors
                </span>
                <div class="bot-bubble border-l-2 border-l-sky-500">
                    Bienvenido a Procaña Motors.<br><br>
                    <span class="text-sky-400 font-medium">¿Cuánto vendes al mes y cuáles son tus costos operativos?</span>
                </div>
            </div>
            <div id="pos-sync-banner" class="hidden fin"></div>
            <div id="typ" class="hidden my-2">
                <div class="inline-flex bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full border border-slate-700 shadow-xl">
                    <div class="typing"><span></span><span></span><span></span></div>
                </div>
            </div>`;
    }

    // Reiniciar indicadores de pasos y sugerencias iniciales
    stepN = 0;
    advStep();
    advisorRestoredOnce = false;
    initialNarrativeSent = false;
    updateInitialHints();

    // Actualizar barra de meta diaria en el POS si existe
    if (typeof upPosSummary === 'function') upPosSummary();

    // 6. Registro en Bitácora de Auditoría
    if (typeof logActivity === 'function') {
        logActivity('Asesor Restablecido', `El usuario @${currentUser ? currentUser.username : 'admin'} eliminó todo el modelo financiero tras autenticarse con contraseña.`, 'warning');
    }

    // 7. Notificación visual
    if (typeof showGlobalToast === 'function') {
        showGlobalToast('✓ Todos los datos del asesor financiero han sido eliminados correctamente.', 'success');
    }

    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// Exponer funciones globalmente para invocación desde HTML
window.openAdvisorEditModal = openAdvisorEditModal;
window.closeAdvisorEditModal = closeAdvisorEditModal;
window.handleAdvisorEditSubmit = handleAdvisorEditSubmit;
window.openAdvisorResetModal = openAdvisorResetModal;
window.closeAdvisorResetModal = closeAdvisorResetModal;
window.handleAdvisorResetSubmit = handleAdvisorResetSubmit;
window.resetAdvisorCompletely = resetAdvisorCompletely;
