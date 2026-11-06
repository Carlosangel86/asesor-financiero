/**
 * custom-select.js
 * Transforma los elementos <select> nativos en selectores de diseño moderno y elegante,
 * con esquinas redondeadas, fondo satinado oscuro/cristal, suaves efectos de hover,
 * indicador de selección (check) y animación fluida.
 * 
 * Garantiza 100% de compatibilidad con:
 * - Eventos 'change' e 'input'
 * - Acceso y asignación de .value (ej: select.value = 'variable')
 * - Acceso a select.selectedIndex
 * - Atributo/propiedad .disabled
 * - Inserción dinámica de <option>
 * - Envío y reseteo de formularios
 */

(function () {
    'use strict';

    // Cerrar cualquier dropdown abierto al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-select-wrapper')) {
            closeAllCustomSelects();
        }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeAllCustomSelects();
        }
    });

    function closeAllCustomSelects() {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(function (wrapper) {
            wrapper.classList.remove('open');
            wrapper.classList.remove('drop-up');
            const trigger = wrapper.querySelector('.custom-select-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');

            const parentCard = wrapper.closest('.glass, .glass-frosted, .card, [class*="rounded-xl"]');
            if (parentCard) parentCard.classList.remove('select-parent-elevated');
        });
    }

    /**
     * Inicializa un <select> individual convirtiéndolo en un componente estilizado
     */
    function initCustomSelect(selectEl) {
        if (!selectEl || selectEl.dataset.customized === 'true') return;
        if (selectEl.classList.contains('hidden')) return;
        if (selectEl.getAttribute('data-custom-select') === 'false') return;

        // Evitar procesar selects especiales que ya tengan buscador propio
        if (selectEl.id === 'sell-product' || selectEl.id === 'restock-product') return;

        selectEl.dataset.customized = 'true';

        // Determinar si es compacto o ancho completo
        const isCompact = selectEl.id === 'pos-tax-zone' ||
                          selectEl.id === 'pos-tz-select' ||
                          (selectEl.classList.contains('text-xs') && !selectEl.classList.contains('pos-input') && !selectEl.classList.contains('w-full')) ||
                          (selectEl.closest('.flex') && !selectEl.classList.contains('pos-input') && !selectEl.classList.contains('w-full'));

        const isInline = isCompact || selectEl.style.display === 'inline-block';

        // Crear wrapper contenedor
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper' + (isInline ? ' inline' : '');
        if (selectEl.id) wrapper.setAttribute('data-select-id', selectEl.id);

        // Insertar wrapper en el DOM justo antes del select y mover el select adentro
        selectEl.parentNode.insertBefore(wrapper, selectEl);
        wrapper.appendChild(selectEl);
        selectEl.classList.add('custom-select-native');

        // Crear Trigger Button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger ' + (isCompact ? 'compact-style' : 'pos-style');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        if (selectEl.disabled) {
            trigger.disabled = true;
            wrapper.classList.add('disabled');
        }

        const labelSpan = document.createElement('span');
        labelSpan.className = 'custom-select-label truncate';
        trigger.appendChild(labelSpan);

        // Chevron SVG
        trigger.insertAdjacentHTML('beforeend', `
            <svg class="custom-select-chevron shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `);
        wrapper.appendChild(trigger);

        // Crear Dropdown List
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';
        dropdown.setAttribute('role', 'listbox');
        wrapper.appendChild(dropdown);

        // Reconstruir lista de opciones
        function buildOptions() {
            dropdown.innerHTML = '';
            const options = Array.from(selectEl.options);

            options.forEach(function (opt) {
                const optEl = document.createElement('div');
                optEl.className = 'custom-select-option' + (opt.selected ? ' selected' : '');
                optEl.setAttribute('role', 'option');
                optEl.setAttribute('data-value', opt.value);
                if (opt.disabled) {
                    optEl.classList.add('opacity-40', 'pointer-events-none');
                }

                const textSpan = document.createElement('span');
                textSpan.className = 'truncate';
                textSpan.textContent = opt.textContent;
                optEl.appendChild(textSpan);

                if (opt.selected) {
                    optEl.insertAdjacentHTML('beforeend', `
                        <svg class="custom-select-check shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `);
                }

                optEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (opt.disabled) return;

                    const prevVal = selectEl.value;
                    selectEl.value = opt.value;

                    updateTriggerAndSelection();
                    closeAllCustomSelects();

                    // Disparar eventos nativos (el navegador ejecuta selectEl.onchange automáticamente)
                    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
                });

                dropdown.appendChild(optEl);
            });

            updateTriggerAndSelection();
        }

        // Actualizar texto del trigger y estado de selección
        function updateTriggerAndSelection() {
            const selectedOpt = selectEl.selectedOptions[0] || selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
            labelSpan.textContent = selectedOpt ? selectedOpt.textContent : '— Seleccionar —';

            dropdown.querySelectorAll('.custom-select-option').forEach(function (el) {
                const isSelected = selectedOpt && el.getAttribute('data-value') === selectedOpt.value;
                el.classList.toggle('selected', isSelected);
                const existingCheck = el.querySelector('.custom-select-check');
                if (isSelected && !existingCheck) {
                    el.insertAdjacentHTML('beforeend', `
                        <svg class="custom-select-check shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `);
                } else if (!isSelected && existingCheck) {
                    existingCheck.remove();
                }
            });

            trigger.disabled = !!selectEl.disabled;
            wrapper.classList.toggle('disabled', !!selectEl.disabled);
        }

        // Click en el trigger para alternar apertura
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (selectEl.disabled) return;

            const isOpen = wrapper.classList.contains('open');
            closeAllCustomSelects();

            if (!isOpen) {
                // Cálculo de orientación: si queda poco espacio abajo (< 230px), desplegar hacia arriba
                const rect = trigger.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                if (spaceBelow < 230 && spaceAbove > 230) {
                    wrapper.classList.add('drop-up');
                } else {
                    wrapper.classList.remove('drop-up');
                }

                wrapper.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');

                const parentCard = wrapper.closest('.glass, .glass-frosted, .card, [class*="rounded-xl"]');
                if (parentCard) parentCard.classList.add('select-parent-elevated');

                // Auto-scroll al seleccionado
                const selectedOptEl = dropdown.querySelector('.custom-select-option.selected');
                if (selectedOptEl) {
                    selectedOptEl.scrollIntoView({ block: 'nearest' });
                }
            }
        });

        // Navegación con teclado
        trigger.addEventListener('keydown', function (e) {
            if (selectEl.disabled) return;

            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                trigger.click();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!wrapper.classList.contains('open')) {
                    trigger.click();
                } else {
                    const options = Array.from(dropdown.querySelectorAll('.custom-select-option:not(.pointer-events-none)'));
                    const currentIndex = options.findIndex(opt => opt.classList.contains('selected'));
                    let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
                    if (nextIndex < 0) nextIndex = 0;
                    if (nextIndex >= options.length) nextIndex = options.length - 1;
                    if (options[nextIndex]) {
                        options[nextIndex].click();
                    }
                }
            }
        });

        // Interceptar asignaciones programáticas a select.value
        const proto = HTMLSelectElement.prototype;
        const valDescriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (valDescriptor) {
            Object.defineProperty(selectEl, 'value', {
                get() {
                    return valDescriptor.get.call(this);
                },
                set(v) {
                    valDescriptor.set.call(this, v);
                    updateTriggerAndSelection();
                },
                configurable: true
            });
        }

        const idxDescriptor = Object.getOwnPropertyDescriptor(proto, 'selectedIndex');
        if (idxDescriptor) {
            Object.defineProperty(selectEl, 'selectedIndex', {
                get() {
                    return idxDescriptor.get.call(this);
                },
                set(i) {
                    idxDescriptor.set.call(this, i);
                    updateTriggerAndSelection();
                },
                configurable: true
            });
        }

        // Escuchar reseteo de formularios
        if (selectEl.form) {
            selectEl.form.addEventListener('reset', function () {
                setTimeout(updateTriggerAndSelection, 0);
            });
        }

        // Observar cambios dinámicos en los <option> y en attributes
        const mutObserver = new MutationObserver(function () {
            buildOptions();
        });
        mutObserver.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled'] });

        // Construir opciones iniciales
        buildOptions();

        // Exponer método de sincronización si se requiere
        selectEl.syncCustomSelect = updateTriggerAndSelection;
    }

    /**
     * Escanea e inicializa todos los selects en el documento o subárbol
     */
    function initAllCustomSelects(root) {
        const container = root || document;
        const selects = container.querySelectorAll('select:not(.hidden):not([data-customized="true"]):not([data-custom-select="false"])');
        selects.forEach(initCustomSelect);
    }

    // Observar inserciones dinámicas en el DOM (ej: tabla de usuarios en auth.js)
    const domObserver = new MutationObserver(function (mutations) {
        let hasNewNodes = false;
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length > 0) {
                hasNewNodes = true;
                break;
            }
        }
        if (hasNewNodes) {
            initAllCustomSelects();
        }
    });

    if (document.body) {
        domObserver.observe(document.body, { childList: true, subtree: true });
        initAllCustomSelects();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            domObserver.observe(document.body, { childList: true, subtree: true });
            initAllCustomSelects();
        });
    }

    window.initCustomSelects = initAllCustomSelects;
    window.initCustomSelect = initCustomSelect;
})();
