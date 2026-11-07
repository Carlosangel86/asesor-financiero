// =====================================================================
// FIREBASE AI LOGIC (Gemini Developer API) - sin API Key en el cliente
// Expone window.AIService.generate(messages) para js/advisor.js
// =====================================================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-ai.js";

const firebaseConfig = {
    apiKey: "AIzaSyCXTHJXjAyj5DVyOQUVBih7uMNQzcvdZKc",
    authDomain: "asesor-financiero-83679.firebaseapp.com",
    projectId: "asesor-financiero-83679",
    storageBucket: "asesor-financiero-83679.firebasestorage.app",
    messagingSenderId: "810248667164",
    appId: "1:810248667164:web:cbdf354358607efa8a1fd9"
};

const MODEL_NAME = "gemini-3.5-flash-lite";
// Si el modelo principal agota su cuota gratuita (429) o no está disponible, se prueba el siguiente
const FALLBACK_MODELS = ["gemini-3.8-flash"];

const aiApp = getApps().find(a => a.name === "ai-logic") || initializeApp(firebaseConfig, "ai-logic");
const ai = getAI(aiApp, { backend: new GoogleAIBackend() });

window.AIService = {
    model: MODEL_NAME,
    // messages: [{role:'system'|'user'|'assistant', content:string}]
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
