// ===== MOTOR FISCAL Y CATÁLOGOS SAT CFDI 4.0 (SIMULACIÓN EDUCATIVA) =====
// Reproducción de catálogos y reglas de desglose fiscal de México (CFDI 4.0)
// DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL

const FISCAL_DISCLAIMER = 'DOCUMENTO DE SIMULACIÓN - SIN VALIDEZ FISCAL';

const EMISOR_DEFAULT = {
    rfc: 'PMO240115AA1',
    nombre: 'PROCAÑA MOTORS S.A. DE C.V.',
    nombreComercial: 'Procaña Motors — Refacciones y Autopartes',
    regimenFiscal: '601',
    regimenFiscalDesc: '601 - General de Ley Personas Morales',
    codigoPostal: '56100',
    direccion: 'Texcoco de Mora, Estado de México, C.P. 56100',
    serieDefault: 'FA'
};

// Catálogo c_RegimenFiscal SAT CFDI 4.0
const REGIMENES_FISCALES = [
    { code: '601', name: 'General de Ley Personas Morales', fisica: false, moral: true },
    { code: '603', name: 'Personas Morales con Fines no Lucrativos', fisica: false, moral: true },
    { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', fisica: true, moral: false },
    { code: '606', name: 'Arrendamiento', fisica: true, moral: false },
    { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes', fisica: true, moral: false },
    { code: '608', name: 'Demás ingresos', fisica: true, moral: false },
    { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México', fisica: true, moral: true },
    { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)', fisica: true, moral: false },
    { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales', fisica: true, moral: false },
    { code: '614', name: 'Ingresos por intereses', fisica: true, moral: false },
    { code: '615', name: 'Régimen de los ingresos por obtención de premios', fisica: true, moral: false },
    { code: '616', name: 'Sin obligaciones fiscales', fisica: true, moral: false },
    { code: '620', name: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', fisica: false, moral: true },
    { code: '621', name: 'Incorporación Fiscal', fisica: true, moral: false },
    { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', fisica: true, moral: true },
    { code: '623', name: 'Opcional para Grupos de Sociedades', fisica: false, moral: true },
    { code: '624', name: 'Coordinados', fisica: false, moral: true },
    { code: '625', name: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', fisica: true, moral: false },
    { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)', fisica: true, moral: true }
];

// Catálogo c_UsoCFDI SAT CFDI 4.0
const USOS_CFDI = [
    {
        code: 'G01',
        name: 'Adquisición de mercancías',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'G02',
        name: 'Devoluciones, descuentos o bonificaciones',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'G03',
        name: 'Gastos en general',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'I01',
        name: 'Construcciones',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'I02',
        name: 'Mobiliario y equipo de oficina por inversiones',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'I03',
        name: 'Equipo de transporte',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'I04',
        name: 'Equipo de cómputo y accesorios',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'I08',
        name: 'Otra maquinaria y equipo',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'D01',
        name: 'Honorarios médicos, dentales y gastos hospitalarios',
        fisica: true,
        moral: false,
        regimenesPermitidos: ['605', '606', '607', '608', '611', '612', '614', '615', '625']
    },
    {
        code: 'D04',
        name: 'Donativos',
        fisica: true,
        moral: false,
        regimenesPermitidos: ['605', '606', '607', '608', '611', '612', '614', '615', '625']
    },
    {
        code: 'S01',
        name: 'Sin efectos fiscales',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '605', '606', '607', '608', '610', '611', '612', '614', '615', '616', '620', '621', '622', '623', '624', '625', '626']
    },
    {
        code: 'CP01',
        name: 'Pagos',
        fisica: true,
        moral: true,
        regimenesPermitidos: ['601', '603', '605', '606', '607', '608', '610', '611', '612', '614', '615', '616', '620', '621', '622', '623', '624', '625', '626']
    }
];

// Catálogo c_FormaPago SAT
const FORMAS_PAGO_SAT = {
    cash: { code: '01', name: '01 - Efectivo' },
    transfer: { code: '03', name: '03 - Transferencia electrónica de fondos' },
    card: { code: '04', name: '04 - Tarjeta de crédito / 28 - Tarjeta de débito' },
    split: { code: '99', name: '99 - Por definir (Pago múltiple / combinado)' }
};

// Catálogo c_MetodoPago SAT
const METODOS_PAGO_SAT = {
    PUE: { code: 'PUE', name: 'PUE - Pago en una sola exhibición' },
    PPD: { code: 'PPD', name: 'PPD - Pago en parcialidades o diferido' }
};

// Claves de producto/servicio SAT para refacciones automotrices
const CLAVES_PROD_SERV_CATEGORIA = {
    'Motor': { claveProdServ: '25173800', descProdServ: 'Componentes de motor y transmisión' },
    'Transmisión': { claveProdServ: '25173800', descProdServ: 'Sistemas de transmisión automotriz' },
    'Frenos': { claveProdServ: '25171700', descProdServ: 'Sistemas y componentes de frenos' },
    'Suspensión y Dirección': { claveProdServ: '25172000', descProdServ: 'Sistemas de suspensión y dirección' },
    'Eléctrico': { claveProdServ: '25172900', descProdServ: 'Sistema eléctrico y encendido automotriz' },
    'Enfriamiento': { claveProdServ: '25174000', descProdServ: 'Sistemas de enfriamiento de motor' },
    'Filtros y Afinación': { claveProdServ: '40161504', descProdServ: 'Filtros de aceite, aire y combustible' },
    'Carrocería y Otros': { claveProdServ: '25171500', descProdServ: 'Partes de carrocería y accesorios' },
    'General': { claveProdServ: '25170000', descProdServ: 'Componentes y sistemas de transporte' }
};

function round2(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function round6(num) {
    return Math.round((Number(num) + Number.EPSILON) * 1000000) / 1000000;
}

function resolveFormaPagoSAT(payment) {
    if (!payment || !payment.method) {
        return FORMAS_PAGO_SAT.cash;
    }
    if (payment.method === 'split') {
        // En CFDI 4.0 cuando hay pago mixto se asigna la forma de pago de mayor monto
        const c = Number(payment.cash || 0);
        const k = Number(payment.card || 0);
        const t = Number(payment.transfer || 0);
        if (k >= c && k >= t && k > 0) return FORMAS_PAGO_SAT.card;
        if (t >= c && t >= k && t > 0) return FORMAS_PAGO_SAT.transfer;
        return FORMAS_PAGO_SAT.cash;
    }
    return FORMAS_PAGO_SAT[payment.method] || FORMAS_PAGO_SAT.cash;
}

function getRegimenLabel(code) {
    const found = REGIMENES_FISCALES.find(r => r.code === String(code));
    return found ? `${found.code} - ${found.name}` : String(code || '');
}

function getUsoCfdiLabel(code) {
    const found = USOS_CFDI.find(u => u.code === String(code));
    return found ? `${found.code} - ${found.name}` : String(code || '');
}

/**
 * Calcula y desglosa los impuestos de una venta respetando estrictamente los importes históricos.
 * Soporta tasas de IVA 16% (0.16), 8% fronterizo (0.08), 0% (0) y Exento.
 * En el POS actual, los precios de lista ya incluyen el IVA vigente al momento del cobro:
 *   total = subtotal * (1 + taxRate)
 */
function calculateInvoiceTaxes(sale) {
    if (!sale) {
        throw new Error('No se proporcionó información de la venta para el cálculo fiscal.');
    }

    const globalTaxRate = (sale.taxRate !== undefined && sale.taxRate !== null)
        ? Number(sale.taxRate)
        : 0.16;

    const rawItems = Array.isArray(sale.items) ? sale.items : [];
    let sumSubtotalConceptos = 0;
    let sumIvaConceptos = 0;
    let sumBase16 = 0, sumIva16 = 0;
    let sumBase8 = 0, sumIva8 = 0;
    let sumBase0 = 0;
    let sumExento = 0;

    const conceptos = rawItems.map((item, idx) => {
        const qty = Number(item.qty || 1);
        const grossUnit = Number(item.price || 0);
        const grossImporte = round2(grossUnit * qty);

        // Si el producto tiene tratamiento específico (ej. exento o tasa propia), se respeta;
        // de lo contrario hereda la tasa histórica registrada en la venta (sale.taxRate).
        const itemTaxType = item.taxType || (globalTaxRate === 0 ? 'tasa_0' : 'gravado');
        const itemRate = (item.taxRate !== undefined && item.taxRate !== null)
            ? Number(item.taxRate)
            : (itemTaxType === 'exento' ? 0 : globalTaxRate);

        let valorUnitarioSinIva = grossUnit;
        let importeBase = grossImporte;
        let importeIva = 0;
        let tipoFactor = 'Tasa';
        let objetoImp = '02'; // Sí objeto de impuesto

        if (itemTaxType === 'exento') {
            tipoFactor = 'Exento';
            valorUnitarioSinIva = round6(grossUnit);
            importeBase = round2(grossImporte);
            importeIva = 0;
            sumExento = round2(sumExento + importeBase);
        } else if (itemRate > 0) {
            valorUnitarioSinIva = round6(grossUnit / (1 + itemRate));
            importeBase = round2(grossImporte / (1 + itemRate));
            importeIva = round2(grossImporte - importeBase);

            if (Math.abs(itemRate - 0.08) < 0.001) {
                sumBase8 = round2(sumBase8 + importeBase);
                sumIva8 = round2(sumIva8 + importeIva);
            } else {
                sumBase16 = round2(sumBase16 + importeBase);
                sumIva16 = round2(sumIva16 + importeIva);
            }
        } else {
            // Tasa 0%
            valorUnitarioSinIva = round6(grossUnit);
            importeBase = round2(grossImporte);
            importeIva = 0;
            sumBase0 = round2(sumBase0 + importeBase);
        }

        sumSubtotalConceptos = round2(sumSubtotalConceptos + importeBase);
        sumIvaConceptos = round2(sumIvaConceptos + importeIva);

        const catInfo = CLAVES_PROD_SERV_CATEGORIA[item.category] || CLAVES_PROD_SERV_CATEGORIA['General'];

        return {
            index: idx + 1,
            noIdentificacion: item.id || `ITEM-${idx + 1}`,
            claveProdServ: item.claveProdServ || catInfo.claveProdServ,
            claveUnidad: item.claveUnidad || 'H87',
            unidad: item.unidad || 'Pieza',
            descripcion: item.name || 'Producto / Refacción Automotriz',
            cantidad: qty,
            valorUnitario: round2(valorUnitarioSinIva),
            valorUnitarioPreciso: valorUnitarioSinIva,
            precioUnitarioConIva: round2(grossUnit),
            importeBase: importeBase,
            descuento: 0,
            objetoImp: objetoImp,
            impuesto: {
                impuestoCodigo: '002', // 002 = IVA
                impuestoNombre: 'IVA',
                tipoFactor: tipoFactor,
                tasaOCuota: tipoFactor === 'Exento' ? null : itemRate.toFixed(6),
                tasaPct: Math.round(itemRate * 100),
                base: importeBase,
                importe: importeIva
            },
            totalConcepto: grossImporte
        };
    });

    // Ajuste de centavos para cuadrar exactamente con el total histórico de la venta original
    const historicalTotal = round2(sale.total !== undefined ? sale.total : (sumSubtotalConceptos + sumIvaConceptos));
    const historicalSubtotal = sale.subtotal !== undefined
        ? round2(sale.subtotal)
        : round2(historicalTotal / (1 + globalTaxRate));
    const historicalTax = sale.taxAmount !== undefined
        ? round2(sale.taxAmount)
        : round2(historicalTotal - historicalSubtotal);

    // Si hay una diferencia de redondeo de 1 centavo en la suma de conceptos, ajustamos el último concepto
    if (conceptos.length > 0) {
        const diffSub = round2(historicalSubtotal - sumSubtotalConceptos);
        const diffTax = round2(historicalTax - sumIvaConceptos);
        if (Math.abs(diffSub) > 0 && Math.abs(diffSub) <= 0.05) {
            const last = conceptos[conceptos.length - 1];
            last.importeBase = round2(last.importeBase + diffSub);
            last.impuesto.base = last.importeBase;
            last.impuesto.importe = round2(last.impuesto.importe + diffTax);
            sumSubtotalConceptos = historicalSubtotal;
            sumIvaConceptos = historicalTax;
        }
    }

    const formaPago = resolveFormaPagoSAT(sale.payment);

    return {
        moneda: 'MXN',
        tipoCambio: '1',
        tipoDeComprobante: 'I', // Ingreso
        tipoDeComprobanteDesc: 'I - Ingreso',
        exportacion: '01', // 01 - No aplica
        metodoPago: METODOS_PAGO_SAT.PUE.code,
        metodoPagoDesc: METODOS_PAGO_SAT.PUE.name,
        formaPago: formaPago.code,
        formaPagoDesc: formaPago.name,
        lugarExpedicion: EMISOR_DEFAULT.codigoPostal,
        tasaGlobal: globalTaxRate,
        tasaGlobalPct: Math.round(globalTaxRate * 100),
        subtotal: historicalSubtotal,
        descuento: 0,
        totalImpuestosTrasladados: historicalTax,
        total: historicalTotal,
        desgloseTasas: {
            iva16: { base: sumBase16, impuesto: sumIva16, tasaOCuota: '0.160000' },
            iva8: { base: sumBase8, impuesto: sumIva8, tasaOCuota: '0.080000' },
            iva0: { base: sumBase0, impuesto: 0, tasaOCuota: '0.000000' },
            exento: { base: sumExento, impuesto: 0 }
        },
        conceptos: conceptos,
        leyendaFiscal: FISCAL_DISCLAIMER
    };
}

/**
 * Convierte un importe numérico en pesos mexicanos a su expresión en letra (ej. "MIL DOSCIENTOS PESOS 00/100 M.N.")
 */
function numeroALetrasMXN(amount) {
    const num = Math.max(0, Number(amount || 0));
    const enteros = Math.floor(num);
    const centavos = Math.round((num - enteros) * 100);
    const centavosStr = String(centavos).padStart(2, '0');

    if (enteros === 0) return `CERO PESOS ${centavosStr}/100 M.N.`;

    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    function convertirGrupo(n) {
        if (n === 0) return '';
        if (n === 100) return 'CIEN';
        const c = Math.floor(n / 100);
        const resto = n % 100;
        let texto = c > 0 ? centenas[c] + (resto > 0 ? ' ' : '') : '';
        if (resto >= 10 && resto <= 19) {
            texto += especiales[resto - 10];
        } else if (resto >= 21 && resto <= 29) {
            texto += 'VEINTI' + unidades[resto - 20];
        } else {
            const d = Math.floor(resto / 10);
            const u = resto % 10;
            if (d > 0) {
                texto += decenas[d];
                if (u > 0) texto += ' Y ' + unidades[u];
            } else if (u > 0) {
                texto += unidades[u];
            }
        }
        return texto.trim();
    }

    let resultado = '';
    const millones = Math.floor(enteros / 1000000);
    const miles = Math.floor((enteros % 1000000) / 1000);
    const resto = enteros % 1000;

    if (millones === 1) {
        resultado += 'UN MILLÓN ';
    } else if (millones > 1) {
        resultado += convertirGrupo(millones) + ' MILLONES ';
    }

    if (miles === 1) {
        resultado += 'MIL ';
    } else if (miles > 1) {
        resultado += convertirGrupo(miles) + ' MIL ';
    }

    if (resto > 0) {
        resultado += convertirGrupo(resto);
    }

    return `${resultado.trim()} PESOS ${centavosStr}/100 M.N.`;
}

const TaxEngine = {
    FISCAL_DISCLAIMER,
    EMISOR_DEFAULT,
    REGIMENES_FISCALES,
    USOS_CFDI,
    FORMAS_PAGO_SAT,
    METODOS_PAGO_SAT,
    CLAVES_PROD_SERV_CATEGORIA,
    calculateInvoiceTaxes,
    resolveFormaPagoSAT,
    getRegimenLabel,
    getUsoCfdiLabel,
    numeroALetrasMXN,
    round2
};

if (typeof window !== 'undefined') {
    window.TaxEngine = TaxEngine;
}
