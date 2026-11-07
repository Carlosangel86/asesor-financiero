// =====================================================================
// FIREBASE AI LOGIC (Gemini Developer API)
// Autenticado mediante App Check con Token de Depuración (100% gratuito)
// Expone window.AIService.generate(messages) para js/advisor.js
// =====================================================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-ai.js";
import { initializeAppCheck, CustomProvider } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyCXTHJXjAyj5DVyOQUVBih7uMNQzcvdZKc",
    authDomain: "asesor-financiero-83679.firebaseapp.com",
    projectId: "asesor-financiero-83679",
    storageBucket: "asesor-financiero-83679.firebasestorage.app",
    messagingSenderId: "810248667164",
    appId: "1:810248667164:web:cbdf354358607efa8a1fd9"
};

const DEBUG_TOKEN = "8d209c1f-1780-40aa-a9fb-3d3b442337c9";
self.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;

const aiApp = getApps().find(a => a.name === "ai-logic") || initializeApp(firebaseConfig, "ai-logic");

// Proveedor de App Check usando el token registrado en Firebase Console
try {
    initializeAppCheck(aiApp, {
        provider: new CustomProvider({
            getToken: async () => {
                const url = `https://firebaseappcheck.googleapis.com/v1/projects/${firebaseConfig.projectId}/apps/${firebaseConfig.appId}:exchangeDebugToken?key=${firebaseConfig.apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ debugToken: DEBUG_TOKEN })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    console.warn('[AppCheck exchange error]', err);
                    throw new Error(err?.error?.message || `HTTP ${res.status}`);
                }
                const data = await res.json();
                return {
                    token: data.token,
                    expireTimeMillis: Date.now() + (parseInt(data.ttl) || 3600) * 1000
                };
            }
        }),
        isTokenAutoRefreshEnabled: true
    });
} catch(e) {
    console.warn('[AppCheck init error]', e);
}

const ai = getAI(aiApp, { backend: new GoogleAIBackend() });

const MODEL_NAME = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = ["gemini-3.8-flash"];

const DEFAULT_TACTICAL_SYSTEM_PROMPT = `Eres el Director Financiero (CFO) y Estratega Operativo de Procaña Motors, una refaccionaria automotriz en México.
Tu rol principal es brindar un diagnóstico matemático exacto y recomendaciones operativas accionables basadas ESTRICTAMENTE en las cifras del "BLOQUE DE MÉTRICAS TÁCTICAS Y METAS FINANCIERAS".
INSTRUCCIONES CRÍTICAS DE NEGOCIO:
1. NUNCA inventes ni alteres las cifras del usuario. Reporta exactamente las Ventas Actuales, Costos Fijos, Inversión Inicial, la fórmula resuelta de Ventas Meta y el Diagnóstico de Brecha que aparecen en el BLOQUE DE MÉTRICAS TÁCTICAS.
2. Si existe una brecha entre las Ventas Actuales y las Ventas Meta, indica con precisión cuántos pesos mensuales faltan por cubrir y despliega estrategias accionables orientadas a mostrador y almacén de una refaccionaria:
   - <b>Aumento del Ticket Promedio (Cross-selling en Mostrador):</b> Implementación de "combos de mostrador", vendiendo kits completos de afinación (aceite, filtros, bujías) o kits de frenos (balatas + líquido DOT4) en lugar de piezas aisladas.
   - <b>Captación de Talleres Mecánicos (Volumen B2B):</b> Creación de un programa de lealtad, líneas de crédito a corto plazo o precios preferenciales de mayoreo para mecánicos de la zona que garanticen compras recurrentes.
   - <b>Optimización del Margen Bruto en Almacén:</b> Búsqueda de nuevos proveedores mayoristas, compra por volumen o importación directa de refacciones de alta rotación (balatas, filtros, bujías) para elevar el margen bruto (ej. del 40% al 45%), reduciendo la meta de ventas necesaria.
   - <b>Control de Costos Fijos:</b> Revisión estricta de los gastos operativos mensuales (nómina, renta y servicios), ya que cada peso ahorrado reduce directamente la presión sobre las ventas meta.
3. Si el margen deseado es matemáticamente inviable (mayor o igual al Margen de Contribución), explícalo con claridad y detalla cuánto debe reducir costos variables o incrementar precios.
4. Responde siempre de forma concisa, directa y en formato HTML simple (<b>, <br>, <ul>, <li>, <p>) sin usar bloques markdown \`\`\`.`;

window.AIService = {
    model: MODEL_NAME,
    defaultSystemPrompt: DEFAULT_TACTICAL_SYSTEM_PROMPT,
    async generate(messages, modelName) {
        const customSystem = messages.filter(m => m.role === 'system').map(m => m.content).join("\n");
        const system = customSystem || DEFAULT_TACTICAL_SYSTEM_PROMPT;
        const userText = messages.filter(m => m.role !== 'system').map(m => m.content).join("\n\n");
        const candidates = modelName ? [modelName] : [MODEL_NAME, ...FALLBACK_MODELS];
        let lastErr;
        for (const usedModel of candidates) {
            try {
                const model = getGenerativeModel(ai, {
                    model: usedModel,
                    ...(system ? { systemInstruction: system } : {}),
                    generationConfig: { temperature: 0.4 }
                });
                const result = await Promise.race([
                    model.generateContent(userText),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado (' + usedModel + ')')), 20000))
                ]);
                return { text: result.response.text() || "Sin respuesta del modelo.", model: usedModel };
            } catch (err) {
                lastErr = err;
                console.warn('[AI Logic] fallo con', usedModel, err && err.message);
            }
        }
        throw lastErr;
    }
};
