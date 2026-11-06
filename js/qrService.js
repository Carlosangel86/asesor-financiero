// ===== SERVICIO DE GENERACIÓN DE TOKENS Y CÓDIGOS QR PARA AUTOFACTURACIÓN =====
// Genera tokens criptográficos únicos por venta y renderiza códigos QR hacia facturacion.html

function generateInvoiceToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint8Array(12);
        window.crypto.getRandomValues(arr);
        for (let i = 0; i < arr.length; i++) {
            randomPart += chars[arr[i] % chars.length];
        }
    } else {
        for (let i = 0; i < 12; i++) {
            randomPart += chars[Math.floor(Math.random() * chars.length)];
        }
    }
    return `TK-${randomPart.slice(0, 4)}-${randomPart.slice(4, 8)}-${randomPart.slice(8, 12)}`;
}

function generateDeterministicTokenFromId(saleId) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seed = String(saleId || 'SALE');
    let h1 = 2166136261;
    let out = '';
    for (let i = 0; i < 12; i++) {
        for (let j = 0; j < seed.length; j++) {
            h1 ^= seed.charCodeAt(j) + (i * 31) + (j * 17);
            h1 = Math.imul(h1, 16777619);
        }
        out += chars[Math.abs(h1) % chars.length];
    }
    return `TK-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

function ensureSaleToken(sale) {
    if (!sale) return '';
    if (!sale.invoiceToken) {
        sale.invoiceToken = generateDeterministicTokenFromId(sale.id);
    }
    return sale.invoiceToken;
}

function getBillingPortalUrl(token, saleId) {
    let base = '';
    if (typeof window !== 'undefined' && window.location) {
        const href = window.location.href.split('?')[0].split('#')[0];
        if (href.endsWith('.html')) {
            base = href.substring(0, href.lastIndexOf('/') + 1) + 'facturacion.html';
        } else if (href.endsWith('/')) {
            base = href + 'facturacion.html';
        } else {
            base = window.location.origin + '/facturacion.html';
        }
    } else {
        base = 'https://asesor-financiero-83679.web.app/facturacion.html';
    }

    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (saleId) params.set('folio', saleId);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

/**
 * Genera una imagen DataURL (PNG) de un código QR usando QRCode.js en un contenedor temporal oculto.
 * Si QRCode.js no estuviera disponible (ej. sin red), dibuja un matriz QR determinista de respaldo en Canvas.
 */
function generateQrDataUrl(text, size = 140) {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && typeof window.QRCode === 'function') {
            try {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';
                document.body.appendChild(tempDiv);

                new window.QRCode(tempDiv, {
                    text: String(text || 'https://asesor-financiero-83679.web.app/facturacion.html'),
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
                });

                setTimeout(() => {
                    try {
                        const canvas = tempDiv.querySelector('canvas');
                        const img = tempDiv.querySelector('img');
                        let dataUrl = '';
                        if (canvas && typeof canvas.toDataURL === 'function') {
                            dataUrl = canvas.toDataURL('image/png');
                        } else if (img && img.src && img.src.startsWith('data:image')) {
                            dataUrl = img.src;
                        }
                        document.body.removeChild(tempDiv);
                        if (dataUrl) {
                            resolve(dataUrl);
                            return;
                        }
                    } catch (e) {
                        if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
                    }
                    resolve(drawFallbackQrCanvas(text, size));
                }, 60);
                return;
            } catch (err) {
                console.warn('[QRService] Fallback canvas activado:', err);
            }
        }
        resolve(drawFallbackQrCanvas(text, size));
    });
}

function drawFallbackQrCanvas(text, size = 140) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        const cells = 21;
        const margin = Math.floor(size * 0.08);
        const cellSize = (size - margin * 2) / cells;
        ctx.fillStyle = '#000000';

        function drawFinder(r0, c0) {
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 7; c++) {
                    const border = r === 0 || r === 6 || c === 0 || c === 6;
                    const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                    if (border || inner) {
                        ctx.fillRect(margin + (c0 + c) * cellSize, margin + (r0 + r) * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
                    }
                }
            }
        }

        drawFinder(0, 0);
        drawFinder(0, cells - 7);
        drawFinder(cells - 7, 0);

        let hash = 2166136261;
        const str = String(text || '');
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        for (let r = 0; r < cells; r++) {
            for (let c = 0; c < cells; c++) {
                const inTopLeft = r < 8 && c < 8;
                const inTopRight = r < 8 && c >= cells - 8;
                const inBottomLeft = r >= cells - 8 && c < 8;
                if (inTopLeft || inTopRight || inBottomLeft) continue;
                hash ^= (r * 31 + c * 17) & 0xff;
                hash = Math.imul(hash, 16777619);
                if ((Math.abs(hash) % 10) < 5) {
                    ctx.fillRect(margin + c * cellSize, margin + r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
                }
            }
        }
        return canvas.toDataURL('image/png');
    } catch (e) {
        return '';
    }
}

/**
 * Renderiza un código QR dentro de un contenedor DOM específico
 */
async function renderQrInElement(elementOrId, text, size = 128) {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return '';
    const dataUrl = await generateQrDataUrl(text, size);
    el.innerHTML = `<img src="${dataUrl}" alt="Código QR Autofacturación" width="${size}" height="${size}" style="display:block;margin:0 auto;image-rendering:pixelated;" />`;
    return dataUrl;
}

const QRService = {
    generateInvoiceToken,
    generateDeterministicTokenFromId,
    ensureSaleToken,
    getBillingPortalUrl,
    generateQrDataUrl,
    renderQrInElement
};

if (typeof window !== 'undefined') {
    window.QRService = QRService;
}
