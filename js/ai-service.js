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

window.AIService = {
    model: MODEL_NAME,
    async generate(messages, modelName) {
        const system = messages.filter(m => m.role === 'system').map(m => m.content).join("\n");
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
