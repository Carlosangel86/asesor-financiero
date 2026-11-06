// ===== GENERADOR DE XML ESTRUCTURADO DE SIMULACIÓN (CFDI 4.0 DEMOSTRATIVO) =====
// Utiliza DOMImplementation + XMLSerializer con estructura propia de simulación
// DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL

function formatXmlIndent(xmlString) {
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    const xml = xmlString.replace(reg, '$1\r\n$2$3');
    let pad = 0;
    const lines = xml.split('\r\n');
    for (let i = 0; i < lines.length; i++) {
        let indent = 0;
        const line = lines[i];
        if (line.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (line.match(/^<\/\w/)) {
            if (pad !== 0) pad -= 1;
        } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }
        const padding = '  '.repeat(pad);
        formatted += padding + line + '\r\n';
        pad += indent;
    }
    return formatted.trim();
}

/**
 * Construye el documento XML de simulación a partir del objeto invoiceData usando XMLSerializer.
 */
function buildSimulatedXmlString(invoiceData) {
    if (!invoiceData) {
        throw new Error('Datos de factura requeridos para generar XML.');
    }

    const disclaimer = 'DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL';
    const doc = document.implementation.createDocument(null, 'SimulacionCFDI', null);
    const root = doc.documentElement;

    root.setAttribute('VersionEsquema', '4.0-SIMULADO');
    root.setAttribute('ValidezFiscal', 'NINGUNA');
    root.setAttribute('LeyendaObligatoria', disclaimer);
    root.setAttribute('Serie', invoiceData.serie || 'FA');
    root.setAttribute('Folio', String(invoiceData.folio || '1'));
    root.setAttribute('FechaEmision', invoiceData.issuedAt || new Date().toISOString());
    root.setAttribute('FolioVentaOrigen', invoiceData.saleId || '');
    root.setAttribute('SubTotal', Number(invoiceData.subtotal || 0).toFixed(2));
    root.setAttribute('Descuento', '0.00');
    root.setAttribute('Moneda', invoiceData.moneda || 'MXN');
    root.setAttribute('TipoCambio', '1');
    root.setAttribute('Total', Number(invoiceData.total || 0).toFixed(2));
    root.setAttribute('TipoDeComprobante', invoiceData.tipoDeComprobante || 'I');
    root.setAttribute('Exportacion', invoiceData.exportacion || '01');
    root.setAttribute('MetodoPago', invoiceData.metodoPago || 'PUE');
    root.setAttribute('FormaPago', invoiceData.formaPago || '01');
    root.setAttribute('LugarExpedicion', invoiceData.lugarExpedicion || '56100');
    root.setAttribute('EstadoComprobante', invoiceData.status === 'cancelled' ? 'CANCELADO' : 'ACTIVO');

    // Nodo de Aviso Legal de Simulación
    const avisoNode = doc.createElement('AvisoLegalSimulacion');
    avisoNode.setAttribute('Tipo', 'DEMOSTRATIVO_ACADEMICO_COMERCIAL');
    avisoNode.textContent = `${disclaimer}. Este archivo XML utiliza una estructura propia de simulación y NO constituye un Comprobante Fiscal Digital por Internet (CFDI) timbrado ante el SAT.`;
    root.appendChild(avisoNode);

    // Nodo Emisor
    const emisor = invoiceData.emisor || (window.TaxEngine && window.TaxEngine.EMISOR_DEFAULT) || {};
    const emisorNode = doc.createElement('Emisor');
    emisorNode.setAttribute('Rfc', emisor.rfc || 'PMO240115AA1');
    emisorNode.setAttribute('Nombre', emisor.nombre || 'PROCAÑA MOTORS S.A. DE C.V.');
    emisorNode.setAttribute('RegimenFiscal', emisor.regimenFiscal || '601');
    emisorNode.setAttribute('CodigoPostalExpedicion', emisor.codigoPostal || '56100');
    root.appendChild(emisorNode);

    // Nodo Receptor
    const receptor = invoiceData.receptor || {};
    const receptorNode = doc.createElement('Receptor');
    receptorNode.setAttribute('Rfc', receptor.rfc || 'XAXX010101000');
    receptorNode.setAttribute('Nombre', receptor.nombre || 'PÚBLICO EN GENERAL');
    receptorNode.setAttribute('DomicilioFiscalReceptor', receptor.codigoPostal || '56100');
    receptorNode.setAttribute('RegimenFiscalReceptor', receptor.regimenFiscal || '616');
    receptorNode.setAttribute('UsoCFDI', receptor.usoCfdi || 'S01');
    if (receptor.email) {
        receptorNode.setAttribute('CorreoContacto', receptor.email);
    }
    root.appendChild(receptorNode);

    // Nodo Conceptos
    const conceptosNode = doc.createElement('Conceptos');
    const conceptosList = Array.isArray(invoiceData.conceptos) ? invoiceData.conceptos : [];

    conceptosList.forEach((c) => {
        const conceptoNode = doc.createElement('Concepto');
        conceptoNode.setAttribute('ClaveProdServ', c.claveProdServ || '25170000');
        conceptoNode.setAttribute('NoIdentificacion', c.noIdentificacion || 'ITEM');
        conceptoNode.setAttribute('Cantidad', String(c.cantidad || 1));
        conceptoNode.setAttribute('ClaveUnidad', c.claveUnidad || 'H87');
        conceptoNode.setAttribute('Unidad', c.unidad || 'Pieza');
        conceptoNode.setAttribute('Descripcion', c.descripcion || 'Producto');
        conceptoNode.setAttribute('ValorUnitario', Number(c.valorUnitario || 0).toFixed(2));
        conceptoNode.setAttribute('Importe', Number(c.importeBase || 0).toFixed(2));
        conceptoNode.setAttribute('Descuento', '0.00');
        conceptoNode.setAttribute('ObjetoImp', c.objetoImp || '02');

        if (c.impuesto) {
            const impConceptoNode = doc.createElement('ImpuestosConcepto');
            const trasladosConceptoNode = doc.createElement('Traslados');
            const trasladoNode = doc.createElement('Traslado');
            trasladoNode.setAttribute('Base', Number(c.impuesto.base || 0).toFixed(2));
            trasladoNode.setAttribute('Impuesto', c.impuesto.impuestoCodigo || '002');
            trasladoNode.setAttribute('ImpuestoNombre', c.impuesto.impuestoNombre || 'IVA');
            trasladoNode.setAttribute('TipoFactor', c.impuesto.tipoFactor || 'Tasa');
            if (c.impuesto.tipoFactor !== 'Exento') {
                trasladoNode.setAttribute('TasaOCuota', c.impuesto.tasaOCuota || '0.160000');
                trasladoNode.setAttribute('Importe', Number(c.impuesto.importe || 0).toFixed(2));
            }
            trasladosConceptoNode.appendChild(trasladoNode);
            impConceptoNode.appendChild(trasladosConceptoNode);
            conceptoNode.appendChild(impConceptoNode);
        }

        conceptosNode.appendChild(conceptoNode);
    });
    root.appendChild(conceptosNode);

    // Nodo Impuestos Globales
    const impuestosGlobalNode = doc.createElement('Impuestos');
    impuestosGlobalNode.setAttribute('TotalImpuestosTrasladados', Number(invoiceData.totalImpuestosTrasladados || 0).toFixed(2));
    const trasladosGlobalNode = doc.createElement('Traslados');

    const desglose = invoiceData.desgloseTasas || {};
    if (desglose.iva16 && desglose.iva16.base > 0) {
        const t16 = doc.createElement('Traslado');
        t16.setAttribute('Base', Number(desglose.iva16.base).toFixed(2));
        t16.setAttribute('Impuesto', '002');
        t16.setAttribute('TipoFactor', 'Tasa');
        t16.setAttribute('TasaOCuota', '0.160000');
        t16.setAttribute('Importe', Number(desglose.iva16.impuesto).toFixed(2));
        trasladosGlobalNode.appendChild(t16);
    }
    if (desglose.iva8 && desglose.iva8.base > 0) {
        const t8 = doc.createElement('Traslado');
        t8.setAttribute('Base', Number(desglose.iva8.base).toFixed(2));
        t8.setAttribute('Impuesto', '002');
        t8.setAttribute('TipoFactor', 'Tasa');
        t8.setAttribute('TasaOCuota', '0.080000');
        t8.setAttribute('Importe', Number(desglose.iva8.impuesto).toFixed(2));
        trasladosGlobalNode.appendChild(t8);
    }
    if (desglose.iva0 && desglose.iva0.base > 0) {
        const t0 = doc.createElement('Traslado');
        t0.setAttribute('Base', Number(desglose.iva0.base).toFixed(2));
        t0.setAttribute('Impuesto', '002');
        t0.setAttribute('TipoFactor', 'Tasa');
        t0.setAttribute('TasaOCuota', '0.000000');
        t0.setAttribute('Importe', '0.00');
        trasladosGlobalNode.appendChild(t0);
    }
    if (desglose.exento && desglose.exento.base > 0) {
        const tex = doc.createElement('Traslado');
        tex.setAttribute('Base', Number(desglose.exento.base).toFixed(2));
        tex.setAttribute('Impuesto', '002');
        tex.setAttribute('TipoFactor', 'Exento');
        trasladosGlobalNode.appendChild(tex);
    }
    // Fallback si no vino desgloseTasas poblado
    if (trasladosGlobalNode.childNodes.length === 0) {
        const tDef = doc.createElement('Traslado');
        tDef.setAttribute('Base', Number(invoiceData.subtotal || 0).toFixed(2));
        tDef.setAttribute('Impuesto', '002');
        tDef.setAttribute('TipoFactor', 'Tasa');
        tDef.setAttribute('TasaOCuota', Number(invoiceData.tasaGlobal || 0.16).toFixed(6));
        tDef.setAttribute('Importe', Number(invoiceData.totalImpuestosTrasladados || 0).toFixed(2));
        trasladosGlobalNode.appendChild(tDef);
    }

    impuestosGlobalNode.appendChild(trasladosGlobalNode);
    root.appendChild(impuestosGlobalNode);

    // Nodo TimbreSimulado (Control Interno de Simulación)
    const timbreNode = doc.createElement('TimbreFiscalSimulado');
    timbreNode.setAttribute('Version', '1.1-SIM');
    timbreNode.setAttribute('UUIDSimulado', invoiceData.uuidSimulado || '00000000-0000-4000-8000-000000000000');
    timbreNode.setAttribute('FechaSimulacion', invoiceData.issuedAt || new Date().toISOString());
    timbreNode.setAttribute('TokenAutofacturacion', invoiceData.invoiceToken || '');
    timbreNode.setAttribute('SelloSimuladoEmisor', invoiceData.selloSimulado || '');
    timbreNode.setAttribute('CadenaOriginalSimulada', invoiceData.cadenaOriginal || '');
    timbreNode.setAttribute('Advertencia', disclaimer);
    root.appendChild(timbreNode);

    const serializer = new XMLSerializer();
    const rawXml = serializer.serializeToString(doc);
    const header = `<?xml version="1.0" encoding="UTF-8"?>\r\n<!-- ${disclaimer} -->\r\n`;
    return header + formatXmlIndent(rawXml);
}

function downloadInvoiceXml(invoiceData) {
    const xmlContent = buildSimulatedXmlString(invoiceData);
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const folioStr = `${invoiceData.serie || 'FA'}-${invoiceData.folio || '0001'}`;
    const rfcStr = (invoiceData.receptor && invoiceData.receptor.rfc) || 'PUBLICO';
    a.href = url;
    a.download = `SIMULACION_CFDI_${folioStr}_${rfcStr}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return xmlContent;
}

const XmlGenerator = {
    buildSimulatedXmlString,
    downloadInvoiceXml
};

if (typeof window !== 'undefined') {
    window.XmlGenerator = XmlGenerator;
}
