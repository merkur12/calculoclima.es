'use strict';

const calculatorFrame = document.querySelector('#calculadora-integrada iframe');
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

    if (Number.isFinite(result.height) && result.height > 0) {
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
        equipmentStatus.textContent = `${load} La selección de esta guía no cubre la configuración recomendada. Consulta el resultado del cálculo y pide una valoración de la instalación.`;
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
