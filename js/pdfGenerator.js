// ===== GENERADOR DE REPRESENTACIÓN IMPRESA PDF (SIMULACIÓN CFDI 4.0) =====
// Utiliza jsPDF para construir un comprobante comercial demostrativo con diseño profesional
// DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL

function loadLogoBase64(src = 'img/logo.png') {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || 200;
                    canvas.height = img.naturalHeight || 80;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve({
                        dataUrl: canvas.toDataURL('image/png'),
                        width: canvas.width,
                        height: canvas.height
                    });
                } catch (e) {
                    resolve(null);
                }
            };
            img.onerror = function () {
                resolve(null);
            };
            img.src = src;
        } catch (e) {
            resolve(null);
        }
    });
}

function fmtMoneyPdf(num) {
    const n = Number(num || 0);
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Genera el documento PDF de la factura simulada y opcionalmente lo descarga.
 * Retorna { blob, dataUrl, fileName }
 */
async function generateInvoicePdf(invoiceData, options = { download: true }) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('La librería jsPDF no está cargada en esta página.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageW = doc.internal.pageSize.getWidth(); // 215.9 mm
    const pageH = doc.internal.pageSize.getHeight(); // 279.4 mm
    const margin = 12;
    const contentW = pageW - margin * 2;
    const disclaimer = 'DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL';

    // 1. Franja Superior de Advertencia (Simulación)
    doc.setFillColor(185, 28, 28); // Rojo institucional de aviso
    doc.rect(0, 0, pageW, 8.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(disclaimer, pageW / 2, 5.6, { align: 'center' });

    // Marca de agua diagonal suave en el fondo
    doc.setTextColor(235, 238, 243);
    doc.setFontSize(27);
    doc.setFont('helvetica', 'bold');
    doc.text('SIMULACIÓN SIN VALIDEZ FISCAL', pageW / 2, pageH / 2 + 15, {
        align: 'center',
        angle: 35
    });

    if (invoiceData.status === 'cancelled') {
        doc.setTextColor(245, 200, 200);
        doc.setFontSize(34);
        doc.text('CANCELADO', pageW / 2, pageH / 2 - 20, {
            align: 'center',
            angle: 35
        });
    }

    let y = 14;

    // 2. Encabezado: Emisor a la izquierda + Cuadro de Folio/UUID a la derecha
    const emisor = invoiceData.emisor || (window.TaxEngine && window.TaxEngine.EMISOR_DEFAULT) || {};
    const logoInfo = await loadLogoBase64('img/logo.png');

    let leftTextX = margin;
    if (logoInfo && logoInfo.dataUrl) {
        const maxLogoW = 28;
        const maxLogoH = 16;
        const ratio = Math.min(maxLogoW / logoInfo.width, maxLogoH / logoInfo.height);
        const w = logoInfo.width * ratio;
        const h = logoInfo.height * ratio;
        try {
            doc.addImage(logoInfo.dataUrl, 'PNG', margin, y, w, h);
            leftTextX = margin + w + 4;
        } catch (e) {
            leftTextX = margin;
        }
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(emisor.nombre || 'PROCAÑA MOTORS S.A. DE C.V.', leftTextX, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`RFC Emisor: ${emisor.rfc || 'PMO240115AA1'}`, leftTextX, y + 9.2);
    doc.text(`Régimen Fiscal: ${emisor.regimenFiscalDesc || '601 - General de Ley Personas Morales'}`, leftTextX, y + 13.5);
    doc.text(`Lugar de Expedición (C.P.): ${invoiceData.lugarExpedicion || emisor.codigoPostal || '56100'} — Texcoco, Méx.`, leftTextX, y + 17.8);

    // Cuadro Derecho: Serie/Folio, UUID Simulado, Fecha
    const boxW = 78;
    const boxX = pageW - margin - boxW;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(boxX, y - 1, boxW, 24, 2, 2, 'FD');

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(boxX, y - 1, boxW, 6.2, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const folioHeader = `COMPROBANTE SIMULADO ${invoiceData.serie || 'FA'}-${invoiceData.folio || '0001'}`;
    doc.text(folioHeader, boxX + boxW / 2, y + 3.2, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FOLIO FISCAL (UUID SIMULADO):', boxX + 3, y + 9.2);
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(3, 105, 161);
    doc.text(invoiceData.uuidSimulado || '00000000-0000-4000-8000-000000000000', boxX + 3, y + 12.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const fechaStr = invoiceData.issuedAt ? new Date(invoiceData.issuedAt).toLocaleString('es-MX') : new Date().toLocaleString('es-MX');
    doc.text(`Fecha Emisión: ${fechaStr}`, boxX + 3, y + 17);
    doc.text(`Ticket Venta Origen: #${invoiceData.saleId || 'N/A'}`, boxX + 3, y + 20.8);

    y += 27;

    // 3. Bloque de Datos del Receptor (Cliente)
    const receptor = invoiceData.receptor || {};
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentW, 22, 2, 2, 'FD');

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentW, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text('DATOS FISCALES DEL RECEPTOR (CLIENTE)', margin + 3, y + 3.9);
    doc.text(`ESTADO: ${invoiceData.status === 'cancelled' ? 'CANCELADA' : 'VIGENTE (SIMULACIÓN)'}`, pageW - margin - 3, y + 3.9, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.8);
    const ry = y + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('RFC Receptor:', margin + 3, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(receptor.rfc || 'XAXX010101000', margin + 25, ry);

    doc.setFont('helvetica', 'bold');
    doc.text('Domicilio Fiscal (C.P.):', margin + 72, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(receptor.codigoPostal || '56100', margin + 105, ry);

    doc.setFont('helvetica', 'bold');
    doc.text('Tipo Comprobante:', margin + 130, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.tipoDeComprobanteDesc || 'I - Ingreso', margin + 158, ry);

    doc.setFont('helvetica', 'bold');
    doc.text('Nombre / Razón Social:', margin + 3, ry + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(receptor.nombre || 'PÚBLICO EN GENERAL').slice(0, 75), margin + 37, ry + 4.8);

    const regLabel = (window.TaxEngine && window.TaxEngine.getRegimenLabel)
        ? window.TaxEngine.getRegimenLabel(receptor.regimenFiscal)
        : (receptor.regimenFiscal || '616');
    const usoLabel = (window.TaxEngine && window.TaxEngine.getUsoCfdiLabel)
        ? window.TaxEngine.getUsoCfdiLabel(receptor.usoCfdi)
        : (receptor.usoCfdi || 'S01');

    doc.setFont('helvetica', 'bold');
    doc.text('Régimen Fiscal:', margin + 3, ry + 9.6);
    doc.setFont('helvetica', 'normal');
    doc.text(String(regLabel).slice(0, 52), margin + 26, ry + 9.6);

    doc.setFont('helvetica', 'bold');
    doc.text('Uso CFDI:', margin + 115, ry + 9.6);
    doc.setFont('helvetica', 'normal');
    doc.text(String(usoLabel).slice(0, 42), margin + 131, ry + 9.6);

    y += 26;

    // 4. Tabla de Conceptos
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentW, 6.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);

    const colX = {
        clave: margin + 2,
        cant: margin + 22,
        unidad: margin + 35,
        desc: margin + 52,
        vUnit: margin + 128,
        iva: margin + 155,
        importe: margin + contentW - 2
    };

    doc.text('ClaveSAT', colX.clave, y + 4.2);
    doc.text('Cant.', colX.cant, y + 4.2);
    doc.text('Unidad', colX.unidad, y + 4.2);
    doc.text('Descripción / Concepto', colX.desc, y + 4.2);
    doc.text('V. Unitario', colX.vUnit, y + 4.2);
    doc.text('IVA Traslado', colX.iva, y + 4.2);
    doc.text('Importe Base', colX.importe, y + 4.2, { align: 'right' });

    y += 6.2;

    const conceptos = Array.isArray(invoiceData.conceptos) ? invoiceData.conceptos : [];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);

    conceptos.forEach((c, idx) => {
        if (y > pageH - 72) {
            doc.addPage();
            // Repetir franja superior de simulación en páginas adicionales
            doc.setFillColor(185, 28, 28);
            doc.rect(0, 0, pageW, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(disclaimer, pageW / 2, 5.2, { align: 'center' });
            y = 15;
        }

        const rowH = 6.5;
        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, contentW, rowH, 'F');
        }

        doc.setTextColor(30, 41, 59);
        doc.setFont('courier', 'normal');
        doc.text(String(c.claveProdServ || '25170000'), colX.clave, y + 4.4);
        doc.setFont('helvetica', 'normal');
        doc.text(String(c.cantidad || 1), colX.cant, y + 4.4);
        doc.text(`${c.claveUnidad || 'H87'}`, colX.unidad, y + 4.4);

        const descClean = String(c.descripcion || 'Producto').slice(0, 44);
        doc.text(descClean, colX.desc, y + 4.4);

        doc.setFont('courier', 'normal');
        doc.text(fmtMoneyPdf(c.valorUnitario), colX.vUnit, y + 4.4);

        const ivaText = c.impuesto && c.impuesto.tipoFactor === 'Exento'
            ? 'Exento'
            : `${fmtMoneyPdf(c.impuesto ? c.impuesto.importe : 0)} (${c.impuesto ? c.impuesto.tasaPct : 16}%)`;
        doc.text(ivaText, colX.iva, y + 4.4);

        doc.setFont('courier', 'bold');
        doc.text(fmtMoneyPdf(c.importeBase), colX.importe, y + 4.4, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + rowH, margin + contentW, y + rowH);
        y += rowH;
    });

    y += 4;

    // 5. Resumen de Impuestos, Importe con Letra y Totales
    const leftBlockW = contentW - 72;
    const totalsBoxW = 68;
    const totalsBoxX = pageW - margin - totalsBoxW;

    // Cuadro izquierdo: Importe con letra + Datos de pago
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, leftBlockW, 28, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('IMPORTE CON LETRA:', margin + 3, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const letras = (window.TaxEngine && window.TaxEngine.numeroALetrasMXN)
        ? window.TaxEngine.numeroALetrasMXN(invoiceData.total)
        : `${fmtMoneyPdf(invoiceData.total)} MXN`;
    doc.text(letras, margin + 3, y + 9, { maxWidth: leftBlockW - 6 });

    doc.setFont('helvetica', 'bold');
    doc.text('Forma de Pago:', margin + 3, y + 16.5);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.formaPagoDesc || '01 - Efectivo', margin + 25, y + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Método de Pago:', margin + 3, y + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.metodoPagoDesc || 'PUE - Pago en una sola exhibición', margin + 26, y + 21);

    doc.setFont('helvetica', 'bold');
    doc.text('Moneda:', margin + 3, y + 25.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoiceData.moneda || 'MXN'} (Peso Mexicano)   |   Exportación: 01 - No aplica`, margin + 16, y + 25.5);

    // Cuadro derecho: Subtotal, IVA, Total
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(totalsBoxX, y, totalsBoxW, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Subtotal:', totalsBoxX + 3, y + 6);
    doc.setFont('courier', 'bold');
    doc.text(fmtMoneyPdf(invoiceData.subtotal), totalsBoxX + totalsBoxW - 3, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('Descuento:', totalsBoxX + 3, y + 11);
    doc.setFont('courier', 'normal');
    doc.text('$0.00', totalsBoxX + totalsBoxW - 3, y + 11, { align: 'right' });

    const tasaPct = invoiceData.tasaGlobalPct !== undefined ? invoiceData.tasaGlobalPct : 16;
    doc.setFont('helvetica', 'normal');
    doc.text(`IVA Trasladado (${tasaPct}%):`, totalsBoxX + 3, y + 16);
    doc.setFont('courier', 'bold');
    doc.text(fmtMoneyPdf(invoiceData.totalImpuestosTrasladados), totalsBoxX + totalsBoxW - 3, y + 16, { align: 'right' });

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(totalsBoxX, y + 19.5, totalsBoxW, 8.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL MXN:', totalsBoxX + 3, y + 25.2);
    doc.setFont('courier', 'bold');
    doc.text(fmtMoneyPdf(invoiceData.total), totalsBoxX + totalsBoxW - 3, y + 25.2, { align: 'right' });

    y += 33;

    // 6. Bloque de Sellos Digitales Simulados y Código QR de Verificación Interna
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentW, 38, 2, 2, 'FD');

    const qrVerifyUrl = (window.QRService && window.QRService.getBillingPortalUrl)
        ? window.QRService.getBillingPortalUrl(invoiceData.invoiceToken, invoiceData.saleId)
        : `https://asesor-financiero-83679.web.app/facturacion.html?token=${invoiceData.invoiceToken || ''}`;

    if (window.QRService && window.QRService.generateQrDataUrl) {
        const qrDataUrl = await window.QRService.generateQrDataUrl(qrVerifyUrl, 140);
        if (qrDataUrl) {
            try {
                doc.addImage(qrDataUrl, 'PNG', margin + 3, y + 3, 31, 31);
            } catch (e) {
                console.warn('[PDF] No se pudo insertar imagen QR:', e);
            }
        }
    }

    const sealX = margin + 37;
    const sealW = contentW - 40;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('CADENA ORIGINAL DEL COMPLEMENTO DE SIMULACIÓN:', sealX, y + 5);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(String(invoiceData.cadenaOriginal || '||4.0|SIMULACION|SIN_VALIDEZ_FISCAL||'), sealX, y + 8.5, { maxWidth: sealW });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('SELLO DIGITAL SIMULADO DEL EMISOR (SIN VALOR ANTE EL SAT):', sealX, y + 17.5);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(String(invoiceData.selloSimulado || ''), sealX, y + 21, { maxWidth: sealW });

    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(disclaimer, sealX, y + 33.5);

    // 7. Pie de página obligatorio
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageH - 10, pageW, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(
        `${disclaimer} — Representación académica y demostrativa de un CFDI 4.0 generada en Procaña Motors POS.`,
        pageW / 2,
        pageH - 4,
        { align: 'center' }
    );

    const folioStr = `${invoiceData.serie || 'FA'}-${invoiceData.folio || '0001'}`;
    const rfcStr = (invoiceData.receptor && invoiceData.receptor.rfc) || 'PUBLICO';
    const fileName = `SIMULACION_CFDI_${folioStr}_${rfcStr}.pdf`;

    if (options && options.download) {
        doc.save(fileName);
    }

    const blob = doc.output('blob');
    const dataUrl = doc.output('datauristring');
    return { blob, dataUrl, fileName };
}

const PdfGenerator = {
    generateInvoicePdf
};

if (typeof window !== 'undefined') {
    window.PdfGenerator = PdfGenerator;
}
