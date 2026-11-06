// ===== SERVICIO DE VALIDACIÓN FISCAL SAT CFDI 4.0 (SIMULACIÓN) =====
// Valida RFC (Persona Física / Moral), Código Postal, Razón Social y compatibilidad Régimen-Uso CFDI

// Expresión regular oficial para RFC mexicano (3 letras para Moral, 4 letras para Física + 6 dígitos de fecha YYMMDD + 3 caracteres de homoclave)
const RFC_REGEX_MORAL = /^[A-ZÑ&]{3}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;
const RFC_REGEX_FISICA = /^[A-ZÑ&]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;
const CP_REGEX = /^\d{5}$/;

function sanitizeRfc(raw) {
    if (!raw) return '';
    return String(raw).toUpperCase().replace(/[\s-]/g, '').trim();
}

function sanitizePostalCode(raw) {
    if (!raw) return '';
    return String(raw).replace(/\D/g, '').slice(0, 5);
}

/**
 * Valida la estructura y fecha embebida de un RFC mexicano.
 * Retorna { valid: boolean, type: 'fisica'|'moral'|'generico'|null, rfc: string, message: string }
 */
function validateRfc(rawRfc) {
    const rfc = sanitizeRfc(rawRfc);

    if (!rfc) {
        return {
            valid: false,
            type: null,
            rfc: '',
            message: 'Ingresa tu RFC (12 caracteres para Persona Moral o 13 para Persona Física).'
        };
    }

    if (rfc.length !== 12 && rfc.length !== 13) {
        return {
            valid: false,
            type: null,
            rfc,
            message: `El RFC tiene ${rfc.length} caracteres. Debe tener exactamente 12 (Persona Moral) o 13 (Persona Física).`
        };
    }

    // RFC Genéricos nacionales o extranjeros
    if (rfc === 'XAXX010101000' || rfc === 'XEXX010101000') {
        return {
            valid: true,
            type: 'generico',
            rfc,
            message: 'RFC genérico válido.'
        };
    }

    if (rfc.length === 12) {
        if (!RFC_REGEX_MORAL.test(rfc)) {
            return {
                valid: false,
                type: 'moral',
                rfc,
                message: 'Formato de RFC de Persona Moral inválido. Debe ser: 3 letras + 6 dígitos de fecha (AAMMDD) + 3 caracteres de homoclave.'
            };
        }
        return {
            valid: true,
            type: 'moral',
            rfc,
            message: 'RFC de Persona Moral válido (12 caracteres).'
        };
    }

    if (!RFC_REGEX_FISICA.test(rfc)) {
        return {
            valid: false,
            type: 'fisica',
            rfc,
            message: 'Formato de RFC de Persona Física inválido. Debe ser: 4 letras + 6 dígitos de fecha (AAMMDD) + 3 caracteres de homoclave.'
        };
    }

    return {
        valid: true,
        type: 'fisica',
        rfc,
        message: 'RFC de Persona Física válido (13 caracteres).'
    };
}

function validateRazonSocial(rawName) {
    const name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (!name) {
        return {
            valid: false,
            value: '',
            message: 'Ingresa el Nombre Completo o Razón Social tal como aparece en la Constancia de Situación Fiscal.'
        };
    }
    if (name.length < 3) {
        return {
            valid: false,
            value: name,
            message: 'El Nombre o Razón Social debe tener al menos 3 caracteres.'
        };
    }
    return {
        valid: true,
        value: name.toUpperCase(),
        message: 'Nombre o Razón Social válido.'
    };
}

function validatePostalCode(rawCp) {
    const cp = String(rawCp || '').trim();
    if (!cp) {
        return {
            valid: false,
            value: '',
            message: 'Ingresa el Código Postal Fiscal de 5 dígitos.'
        };
    }
    if (!CP_REGEX.test(cp)) {
        return {
            valid: false,
            value: cp,
            message: 'El Código Postal debe estar compuesto exactamente por 5 dígitos numéricos (ej. 56100).'
        };
    }
    const num = parseInt(cp, 10);
    if (num < 1000 || num > 99999) {
        return {
            valid: false,
            value: cp,
            message: 'Ingresa un Código Postal mexicano válido (01000 a 99999).'
        };
    }
    return {
        valid: true,
        value: cp,
        message: 'Código Postal Fiscal válido.'
    };
}

/**
 * Filtra los regímenes fiscales compatibles con el tipo de persona (física o moral)
 */
function getCompatibleRegimenes(rfcType) {
    const catalog = (window.TaxEngine && window.TaxEngine.REGIMENES_FISCALES) || [];
    if (!rfcType || rfcType === 'generico') return catalog;
    if (rfcType === 'moral') return catalog.filter(r => r.moral);
    if (rfcType === 'fisica') return catalog.filter(r => r.fisica);
    return catalog;
}

/**
 * Filtra los usos de CFDI compatibles con el tipo de persona y el régimen fiscal seleccionado
 */
function getCompatibleUsosCfdi(rfcType, regimenCode) {
    const catalog = (window.TaxEngine && window.TaxEngine.USOS_CFDI) || [];
    return catalog.filter(u => {
        if (rfcType === 'moral' && !u.moral) return false;
        if (rfcType === 'fisica' && !u.fisica) return false;
        if (regimenCode && Array.isArray(u.regimenesPermitidos)) {
            return u.regimenesPermitidos.includes(String(regimenCode));
        }
        return true;
    });
}

function validateRegimenAndUso(rawRfc, regimenCode, usoCode) {
    const rfcCheck = validateRfc(rawRfc);
    const regimenes = (window.TaxEngine && window.TaxEngine.REGIMENES_FISCALES) || [];
    const usos = (window.TaxEngine && window.TaxEngine.USOS_CFDI) || [];

    if (!regimenCode) {
        return { valid: false, field: 'regimenFiscal', message: 'Selecciona tu Régimen Fiscal.' };
    }
    const regObj = regimenes.find(r => r.code === String(regimenCode));
    if (!regObj) {
        return { valid: false, field: 'regimenFiscal', message: 'El Régimen Fiscal seleccionado no existe en el catálogo SAT.' };
    }

    if (rfcCheck.valid && rfcCheck.type === 'moral' && !regObj.moral) {
        return {
            valid: false,
            field: 'regimenFiscal',
            message: `El régimen ${regObj.code} (${regObj.name}) es exclusivo para Personas Físicas y no corresponde a un RFC de Persona Moral (12 caracteres).`
        };
    }
    if (rfcCheck.valid && rfcCheck.type === 'fisica' && !regObj.fisica) {
        return {
            valid: false,
            field: 'regimenFiscal',
            message: `El régimen ${regObj.code} (${regObj.name}) es exclusivo para Personas Morales y no corresponde a un RFC de Persona Física (13 caracteres).`
        };
    }

    if (rfcCheck.valid && rfcCheck.type === 'generico' && String(regimenCode) !== '616') {
        return {
            valid: false,
            field: 'regimenFiscal',
            message: 'Para RFC genérico (XAXX010101000 / XEXX010101000) debes seleccionar el régimen 616 - Sin obligaciones fiscales.'
        };
    }

    if (!usoCode) {
        return { valid: false, field: 'usoCfdi', message: 'Selecciona el Uso del CFDI.' };
    }
    const usoObj = usos.find(u => u.code === String(usoCode));
    if (!usoObj) {
        return { valid: false, field: 'usoCfdi', message: 'El Uso del CFDI seleccionado no existe en el catálogo SAT.' };
    }

    if (rfcCheck.valid && rfcCheck.type === 'moral' && !usoObj.moral) {
        return {
            valid: false,
            field: 'usoCfdi',
            message: `El uso ${usoObj.code} (${usoObj.name}) no es aplicable para Personas Morales.`
        };
    }

    if (Array.isArray(usoObj.regimenesPermitidos) && !usoObj.regimenesPermitidos.includes(String(regimenCode))) {
        return {
            valid: false,
            field: 'usoCfdi',
            message: `El uso de CFDI "${usoObj.code} - ${usoObj.name}" no es compatible con el Régimen Fiscal ${regObj.code}.`
        };
    }

    if (rfcCheck.valid && rfcCheck.type === 'generico' && String(usoCode) !== 'S01') {
        return {
            valid: false,
            field: 'usoCfdi',
            message: 'Para RFC genérico debes seleccionar el Uso del CFDI "S01 - Sin efectos fiscales".'
        };
    }

    return { valid: true, field: null, message: 'Régimen Fiscal y Uso del CFDI compatibles.' };
}

function validateEmailOptional(rawEmail) {
    const email = String(rawEmail || '').trim();
    if (!email) return { valid: true, value: '', message: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            valid: false,
            value: email,
            message: 'Ingresa un correo electrónico válido (ej. cliente@correo.com) o déjalo vacío.'
        };
    }
    return { valid: true, value: email.toLowerCase(), message: '' };
}

/**
 * Valida todo el formulario de autofacturación de una sola vez
 */
function validateBillingForm(formData) {
    const errors = {};
    const rfcRes = validateRfc(formData.rfc);
    if (!rfcRes.valid) errors.rfc = rfcRes.message;

    const nameRes = validateRazonSocial(formData.nombre);
    if (!nameRes.valid) errors.nombre = nameRes.message;

    const cpRes = validatePostalCode(formData.codigoPostal);
    if (!cpRes.valid) errors.codigoPostal = cpRes.message;

    const regUsoRes = validateRegimenAndUso(formData.rfc, formData.regimenFiscal, formData.usoCfdi);
    if (!regUsoRes.valid) {
        errors[regUsoRes.field || 'regimenFiscal'] = regUsoRes.message;
    }

    const emailRes = validateEmailOptional(formData.email);
    if (!emailRes.valid) errors.email = emailRes.message;

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        sanitized: {
            rfc: rfcRes.rfc,
            rfcType: rfcRes.type,
            nombre: nameRes.value,
            codigoPostal: cpRes.value,
            regimenFiscal: String(formData.regimenFiscal || '').trim(),
            usoCfdi: String(formData.usoCfdi || '').trim(),
            email: emailRes.value
        }
    };
}

const ValidationService = {
    sanitizeRfc,
    sanitizePostalCode,
    validateRfc,
    validateRazonSocial,
    validatePostalCode,
    getCompatibleRegimenes,
    getCompatibleUsosCfdi,
    validateRegimenAndUso,
    validateEmailOptional,
    validateBillingForm
};

if (typeof window !== 'undefined') {
    window.ValidationService = ValidationService;
}
