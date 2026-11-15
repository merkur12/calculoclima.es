'use strict';

const calculatorPanel = document.getElementById('calculadora-integrada');
const calculatorFrame = calculatorPanel.querySelector('iframe');
const calculatorButtons = document.querySelectorAll('[data-open-calculator]');
let lastTrigger;
for (const button of calculatorButtons) {
    button.addEventListener('click', event => {
        event.preventDefault();
        lastTrigger = button;
        calculatorPanel.hidden = false;
        const url = button.getAttribute('href');
        if (calculatorFrame.getAttribute('src') !== url) calculatorFrame.setAttribute('src', url);
        for (const trigger of calculatorButtons) trigger.setAttribute('aria-expanded', 'true');
        calculatorPanel.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start',
        });
    });
}
document.getElementById('cerrar-calculadora').addEventListener('click', () => {
    calculatorPanel.hidden = true;
    for (const trigger of calculatorButtons) trigger.setAttribute('aria-expanded', 'false');
    lastTrigger?.focus();
});

const equipmentStatus = document.getElementById('equipos-estado');
const showAllButton = document.getElementById('equipos-todos');
const modelRows = Array.from(document.querySelectorAll('#equipos tbody tr'));
const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const capacityFormat = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
const initialStatus = equipmentStatus.textContent;

function showAllModels() {
    for (const row of modelRows) row.hidden = false;
    showAllButton.hidden = true;
}

showAllButton.addEventListener('click', () => {
    showAllModels();
    equipmentStatus.textContent = 'Se muestran equipos de todas las potencias.';
});

window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== calculatorFrame.contentWindow) return;
    const result = event.data;
    if (result?.type !== 'calculoclima:guide-cooling') return;

    if (Number.isFinite(result.height) && result.height >= 200 && result.height <= 25000) {
        calculatorFrame.style.height = Math.ceil(result.height) + 'px';
    }

    if (!Object.hasOwn(result, 'watts')) return;
    showAllModels();
    const { watts, capacity } = result;
    if (!Number.isFinite(watts) || watts <= 0) {
        equipmentStatus.textContent = initialStatus;
        return;
    }

    const load = `Carga calculada de ${numberFormat.format(watts / 1000)} kW.`;
    const matchingRows = modelRows.filter(row => Number(row.dataset.capacity) === capacity);
    if (!matchingRows.length) {
        for (const row of modelRows) row.hidden = true;
        showAllButton.hidden = false;
        equipmentStatus.textContent = `${load} La tabla cubre splits murales individuales de 9.000 a 24.000 BTU/h. Consulta la configuración recomendada por la calculadora.`;
        return;
    }

    const suitableRows = matchingRows.filter(row => Number(row.dataset.nominal) * 1000 >= watts);
    for (const row of modelRows) row.hidden = !matchingRows.includes(row);
    showAllButton.hidden = false;
    const note = suitableRows.length === matchingRows.length
        ? 'Comprueba la potencia disponible a la temperatura exterior de diseño.'
        : suitableRows.length
            ? 'Revisa la potencia nominal. Algunos modelos de esta clase quedan por debajo de la carga.'
            : 'Todos los modelos de esta clase quedan por debajo de la carga a potencia nominal. Revisa la clase siguiente.';
    equipmentStatus.textContent = `${load} Clase recomendada de ${capacityFormat.format(capacity)} BTU/h. ${note}`;
});

function requestCoolingResult() {
    calculatorFrame.contentWindow?.postMessage({ type: 'calculoclima:request-cooling' }, location.origin);
}
calculatorFrame.addEventListener('load', requestCoolingResult);
requestCoolingResult();
