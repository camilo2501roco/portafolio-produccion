// Variables globales
let reservaEditando = null;
let mesaPreseleccionada = null;
let confirmacionCallback = null;
let estadoUpdateInterval = null;

// Duración de eventos en horas
const duracionesEvento = {
    'Cumpleaños': 2, 'Aniversario': 2, 'Reunión de Negocios': 1.5, 'Cena Romántica': 2,
    'Celebración Familiar': 2.5, 'Evento Corporativo': 3, 'Graduación': 2, 'Ninguna': 1.5
};

const ESTADOS_VALIDOS = ['Pendiente','Confirmada','Cancelada','Finalizada','No Show'];

// ========== LOCAL STORAGE HELPERS ==========
function safeParse(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
}
function getMesas() { return safeParse('mesas') || []; }
function saveMesas(mesas) {
    try { localStorage.setItem('mesas', JSON.stringify(mesas)); return true; } catch(e) { return false; }
}
function getReservas() { return safeParse('reservas') || []; }
function saveReservas(reservas) {
    try { localStorage.setItem('reservas', JSON.stringify(reservas)); return true; } catch(e) { return false; }
}
function getNextMesaId() {
    let next = parseInt(localStorage.getItem('nextMesaId'), 10);
    if (isNaN(next) || next < 1) next = 1;
    localStorage.setItem('nextMesaId', String(next + 1));
    return 'mesa' + next;
}
function getNextReservaId() {
    let next = parseInt(localStorage.getItem('nextReservaId'), 10);
    if (isNaN(next) || next < 1) next = 1;
    localStorage.setItem('nextReservaId', String(next + 1));
    return 'reserva' + next;
}

// ========== UTILITARIOS ==========
function timeToMinutes(hhmm) {
    if (!hhmm) return NaN;
    const [h, m] = hhmm.split(':').map(Number);
    return isNaN(h + m) ? NaN : h * 60 + m;
}
function minutesToTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60), m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return isNaN(d) ? fecha : d.toLocaleDateString('es-ES');
}
function obtenerNombreMesa(mesaId) {
    const mesa = getMesas().find(m => m.id === mesaId);
    return mesa ? (mesa.nombre || mesa.id) : 'Mesa no encontrada';
}
function calcularHoraFin(horaInicio, tipoEvento) {
    const minutosInicio = timeToMinutes(horaInicio);
    return isNaN(minutosInicio) ? '' : minutesToTime(minutosInicio + (duracionesEvento[tipoEvento] || 1.5) * 60);
}
function validarHoraEnRango(hora) {
    const minutos = timeToMinutes(hora);
    return !isNaN(minutos) && minutos >= 0 && minutos <= (24 * 60 - 1);
}
function getIconForOcasion(ocasion) {
    const map = {
        'Cumpleaños': 'icons/cum.jpg', 'Aniversario': 'icons/aniversario.jpg', 'Reunión de Negocios': 'icons/reunion.jpeg',
        'Cena Romántica': 'icons/cena_romantica.jpeg', 'Celebración Familiar': 'icons/celebracion-familiar.jpg',
        'Evento Corporativo': 'icons/evento_corporativo.jpeg', 'Graduación': 'icons/grado.jpg', 'Ninguna': 'icons/spi.jpg'
    };
    return map[ocasion] || 'icons/celebracion-familiar.jpg';
}
function getClaseEstadoReserva(estado) {
    const clases = {
        'Pendiente': 'bg-yellow-100 text-yellow-800', 'Confirmada': 'bg-blue-100 text-blue-800',
        'Cancelada': 'bg-red-100 text-red-800', 'Finalizada': 'bg-green-100 text-green-800',
        'No Show': 'bg-gray-100 text-gray-800'
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
}

// ========== GESTIÓN DE ESTADOS ==========
function normalizarReservas() {
    const reservas = getReservas();
    let modificado = false;
    const out = reservas.map(r => {
        if (r && (!r.estado || !ESTADOS_VALIDOS.includes(r.estado))) {
            r.estado = 'Pendiente';
            modificado = true;
        }
        return r;
    });
    if (modificado) saveReservas(out);
    return out;
}

function setReservaEstado(idReserva, nuevoEstado) {
    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) return false;
    const reservas = getReservas();
    const idx = reservas.findIndex(r => r.idReserva === idReserva);
    if (idx === -1) return false;
    reservas[idx].estado = nuevoEstado;

    if (nuevoEstado === 'Finalizada' || nuevoEstado === 'No Show') {
        const mesas = getMesas();
        const idMesa = reservas[idx].idMesaAsignada;
        const mIdx = mesas.findIndex(m => m.id === idMesa);
        if (mIdx !== -1 && mesas[mIdx].estado !== 'deshabilitada') {
            mesas[mIdx].estado = 'disponible';
            saveMesas(mesas);
        }
    }

    const ok = saveReservas(reservas);
    if (ok) {
        actualizarEstadosMesas();
        cargarReservas();
        cargarMesa();
    }
    return ok;
}

function actualizarEstadosMesas() {
    const mesas = getMesas(), reservas = getReservas(), now = new Date();
    const hoy = now.toISOString().split('T')[0], horaActual = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const mActual = timeToMinutes(horaActual);

    mesas.forEach(m => { if (m.estado !== 'deshabilitada') m.estado = 'disponible'; });

    reservas.forEach(r => {
        if (['Cancelada','Finalizada','No Show'].includes(r.estado)) return;
        if (r.fechaReserva !== hoy) return;
        const ri = timeToMinutes(r.horaInicioReserva), rf = timeToMinutes(r.horaFinReserva);
        if (isNaN(ri) || isNaN(rf)) return;
        const mesa = mesas.find(x => x.id === r.idMesaAsignada);
        if (mesa && mActual >= ri && mActual < rf) mesa.estado = 'ocupada';
    });

    saveMesas(mesas);
    const last = document.getElementById('last-update');
    if (last) last.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
    return mesas;
}

function iniciarActualizacionEstados() {
    normalizarReservas();
    actualizarEstadosMesas();
    cargarMesa();

    if (estadoUpdateInterval) clearInterval(estadoUpdateInterval);
    estadoUpdateInterval = setInterval(() => {
        actualizarEstadosMesas();
        cargarMesa();
    }, 5000);
}

// ========== UI Y MENSAJES ==========
function mostrarMensaje(mensaje, tipo = 'info') {
    const contenedor = document.getElementById('contenedorMensajes');
    if (!contenedor) return;
    const msg = document.createElement('div');
    const bgColor = tipo === 'error' ? 'bg-red-500' : tipo === 'success' ? 'bg-green-500' : 'bg-blue-500';
    msg.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300`;
    msg.textContent = mensaje;
    contenedor.appendChild(msg);

    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 300);
    }, 3000);
}

function mostrarConfirmacion(mensaje, callback) {
    const modal = document.getElementById('modalConfirmacion');
    const msgEl = document.getElementById('confirmacionMensaje');
    if (!modal || !msgEl) {
        if (confirm(mensaje)) callback();
        return;
    }
    msgEl.textContent = mensaje;
    modal.classList.remove('hidden');
    confirmacionCallback = callback;
}

function cerrarModalConfirmacion() {
    document.getElementById('modalConfirmacion')?.classList.add('hidden');
    confirmacionCallback = null;
}

// ========== GESTIÓN DE MESAS ==========
function cargarMesa() {
    const grid = document.getElementById('mesasGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const mesas = actualizarEstadosMesas();
    document.getElementById('total-mesas').textContent = mesas.length;
    document.getElementById('mesas-disponibles').textContent = mesas.filter(m => m.estado === 'disponible').length;

    mesas.forEach(mesa => {
        const card = document.createElement('div');
        card.className = `mesa-card card bg-white overflow-hidden fade-in cursor-pointer`;
        card.innerHTML = `
            <div class="p-5 flex flex-col items-center justify-center h-40">
                <span class="mesa-status ${mesa.estado}">${mesa.estado.charAt(0).toUpperCase() + mesa.estado.slice(1)}</span>
                <div class="text-2xl font-bold text-emerald-600 mb-2">${mesa.nombre || mesa.id}</div>
                <div class="text-gray-600 mb-1"><i class="fas fa-users mr-2"></i>Capacidad: ${mesa.capacidad}</div>
                <div class="text-gray-600"><i class="fas fa-map-marker-alt mr-2"></i>${mesa.ubicacion || ''}</div>
            </div>
        `;
        card.addEventListener('click', () => mostrarDetalleMesa(mesa));
        grid.appendChild(card);
    });

    const reservasHoy = getReservas().filter(r => r.fechaReserva === new Date().toISOString().split('T')[0] && r.estado !== 'Cancelada').length;
    document.getElementById('reservas-hoy').textContent = reservasHoy;
}

function mostrarDetalleMesa(mesa) {
    const modal = document.getElementById('detalleMesa');
    if (!modal) return;

    document.getElementById('dm-id').textContent = mesa.id;
    document.getElementById('dm-nombre').textContent = mesa.nombre || mesa.id;
    document.getElementById('dm-capacidad').textContent = mesa.capacidad;
    document.getElementById('dm-ubicacion').textContent = mesa.ubicacion || '';

    const estadoEl = document.getElementById('dm-estado');
    if (estadoEl) {
        estadoEl.className = 'inline-block rounded px-2 py-0.5 text-sm font-medium text-white ';
        estadoEl.textContent = mesa.estado.charAt(0).toUpperCase() + mesa.estado.slice(1);
        estadoEl.classList.add(mesa.estado === 'disponible' ? 'bg-green-500' : mesa.estado === 'ocupada' ? 'bg-blue-500' : 'bg-gray-500');
    }

    modal.classList.remove('hidden');

    document.getElementById('dm-editar').onclick = () => {
        cerrarModalDetalle();
        abrirModalEditarMesa(mesa.id);
    };
    document.getElementById('dm-eliminar').onclick = () => {
        mostrarConfirmacion('¿Está seguro de eliminar esta mesa?', () => eliminarMesa(mesa.id));
    };
    document.getElementById('dm-reservar').onclick = () => {
        if (mesa.estado === 'deshabilitada') {
            mostrarMensaje('Esta mesa está deshabilitada y no se puede reservar.', 'error');
            return;
        }
        cerrarModalDetalle();
        abrirModalReserva(mesa.id);
    };
}

function cerrarModalDetalle() {
    document.getElementById('detalleMesa')?.classList.add('hidden');
}

function abrirModalAgregarMesa() {
    document.getElementById('am-numero').value = '';
    document.getElementById('am-nombre-display').textContent = 'mesa-';
    document.getElementById('am-capacidad').value = '';
    document.getElementById('am-ubicacion').value = '';
    document.getElementById('am-estado').value = 'disponible';
    document.getElementById('am-estado-wrapper').classList.add('hidden');
    delete document.getElementById('am-guardar').dataset.editarId;
    document.getElementById('am-titulo').textContent = 'Agregar Mesa';
    
    document.getElementById('error-numero')?.classList.add('hidden');
    document.getElementById('error-capacidad')?.classList.add('hidden');
    document.getElementById('error-ubicacion')?.classList.add('hidden');
    
    document.getElementById('agregarMesa').classList.remove('hidden');

    document.getElementById('am-numero').addEventListener('input', function() {
        document.getElementById('am-nombre-display').textContent = this.value ? `mesa-${this.value.trim()}` : 'mesa-';
    });
}

function abrirModalEditarMesa(mesaId) {
    const mesa = getMesas().find(m => m.id === mesaId);
    if (!mesa) return mostrarMensaje('Mesa no encontrada', 'error');

    const nro = (mesa.nombre || '').match(/^mesa-(\d+)$/i)?.[1] || '';
    document.getElementById('am-numero').value = nro;
    document.getElementById('am-nombre-display').textContent = `mesa-${nro}`;
    document.getElementById('am-capacidad').value = mesa.capacidad;
    document.getElementById('am-ubicacion').value = mesa.ubicacion || '';
    document.getElementById('am-estado').value = mesa.estado;
    document.getElementById('am-estado-wrapper').classList.remove('hidden');
    document.getElementById('am-guardar').dataset.editarId = mesa.id;
    document.getElementById('am-titulo').textContent = 'Editar Mesa';
    
    document.getElementById('error-numero')?.classList.add('hidden');
    document.getElementById('error-capacidad')?.classList.add('hidden');
    
    document.getElementById('agregarMesa').classList.remove('hidden');

    document.getElementById('am-numero').addEventListener('input', function() {
        document.getElementById('am-nombre-display').textContent = this.value ? `mesa-${this.value.trim()}` : 'mesa-';
    });
}

function validarNumeroMesa(numero, idExcluir = null) {
    const elError = document.getElementById('error-numero');
    if (!numero) {
        if (elError) { elError.textContent = 'El número de la mesa es obligatorio.'; elError.classList.remove('hidden'); }
        return false;
    }
    const nro = parseInt(numero, 10);
    if (isNaN(nro) || nro <= 0) {
        if (elError) { elError.textContent = 'Número de mesa inválido.'; elError.classList.remove('hidden'); }
        return false;
    }

    const mesas = getMesas();
    const nombreCompleto = `mesa-${nro}`;
    const existe = mesas.some(m => {
        if (idExcluir && m.id === idExcluir) return false;
        return (m.nombre || '').toLowerCase() === nombreCompleto.toLowerCase();
    });
    if (existe) {
        if (elError) { elError.textContent = 'Ya existe una mesa con ese número.'; elError.classList.remove('hidden'); }
        return false;
    }

    if (elError) elError.classList.add('hidden');
    return true;
}

function guardarMesa() {
    const numEl = document.getElementById('am-numero'), capEl = document.getElementById('am-capacidad');
    const ubEl = document.getElementById('am-ubicacion'), estadoSelect = document.getElementById('am-estado');
    const botonGuardar = document.getElementById('am-guardar');
    
    if (!numEl || !capEl) return mostrarMensaje('Formulario de mesa incompleto', 'error');

    const numero = numEl.value.trim(), capacidad = parseInt(capEl.value, 10);
    const ubicacion = ubEl.value.trim(), editarId = botonGuardar.dataset.editarId;

    if (!validarNumeroMesa(numero, editarId)) return;
    if (isNaN(capacidad) || capacidad <= 0) {
        const el = document.getElementById('error-capacidad');
        if (el) { el.textContent = 'Capacidad inválida.'; el.classList.remove('hidden'); }
        return;
    }

    const mesas = getMesas();
    const nombreCompleto = `mesa-${parseInt(numero, 10)}`;

    if (editarId) {
        const idx = mesas.findIndex(m => m.id === editarId);
        if (idx === -1) return mostrarMensaje('Mesa no encontrada', 'error');
        mesas[idx] = {...mesas[idx], nombre: nombreCompleto, capacidad, ubicacion, estado: estadoSelect.value};
    } else {
        mesas.push({ id: getNextMesaId(), nombre: nombreCompleto, capacidad, ubicacion, estado: 'disponible' });
    }

    if (saveMesas(mesas)) {
        mostrarMensaje('Mesa guardada correctamente', 'success');
        document.getElementById('agregarMesa').classList.add('hidden');
        cargarMesa();
    } else {
        mostrarMensaje('Error al guardar mesa', 'error');
    }
}

function eliminarMesa(mesaId) {
    const mesas = getMesas().filter(m => m.id !== mesaId);
    if (saveMesas(mesas)) {
        mostrarMensaje('Mesa eliminada correctamente', 'success');
        cerrarModalDetalle();
        cargarMesa();
    } else {
        mostrarMensaje('Error al eliminar la mesa', 'error');
    }
}

function cerrarModalAgregarMesa() {
    document.getElementById('agregarMesa')?.classList.add('hidden');
}

// ========== GESTIÓN DE RESERVAS ==========
function verificarDisponibilidadMesa(mesaId, fecha, horaInicio, horaFin, excluirReservaId = null) {
    if (!fecha || !horaInicio || !horaFin) return true;
    const mesa = getMesas().find(m => m.id === mesaId);
    if (!mesa || mesa.estado === 'deshabilitada') return false;

    const nuevoInicio = timeToMinutes(horaInicio), nuevoFin = timeToMinutes(horaFin);
    if (isNaN(nuevoInicio) || isNaN(nuevoFin) || nuevoFin <= nuevoInicio) return false;

    return !getReservas().some(reserva => {
        if (excluirReservaId && reserva.idReserva === excluirReservaId) return false;
        if (reserva.idMesaAsignada !== mesaId || reserva.fechaReserva !== fecha) return false;
        if (['Cancelada','Finalizada','No Show'].includes(reserva.estado)) return false;

        const rInicio = timeToMinutes(reserva.horaInicioReserva), rFin = timeToMinutes(reserva.horaFinReserva);
        return (nuevoInicio < rFin && nuevoFin > rInicio);
    });
}

function abrirModalReserva(mesaId = null, reserva = null) {
    reservaEditando = reserva;
    mesaPreseleccionada = mesaId;

    document.getElementById('tituloModalReserva').textContent = reserva ? 'Editar Reserva' : 'Nueva Reserva';

    const inNombre = document.getElementById('inputNombreReserva'), inPersonas = document.getElementById('inputPersonasReserva');
    const inFecha = document.getElementById('inputFechaReserva'), inHoraInicio = document.getElementById('inputHoraInicioReserva');
    const inHoraFin = document.getElementById('inputHoraFinReserva'), selectOcasion = document.getElementById('selectOcasionReserva');
    const textareaNotas = document.getElementById('textareaNotasReserva'), estadoWrap = document.getElementById('rs-estado-wrapper');
    const estadoSelect = document.getElementById('selectEstadoReserva'), duracionInfo = document.getElementById('duracionEvento');
    const tiempoDuracion = document.getElementById('tiempoDuracion');

    if (reserva) {
        inNombre.value = reserva.nombreCliente || '';
        inPersonas.value = reserva.numeroPersonas || '';
        inFecha.value = reserva.fechaReserva || '';
        inHoraInicio.value = reserva.horaInicioReserva || '';
        inHoraFin.value = reserva.horaFinReserva || '';
        selectOcasion.value = reserva.ocasionEspecial || 'Ninguna';
        textareaNotas.value = reserva.notasAdicionales || '';
        estadoWrap.classList.remove('hidden');
        estadoSelect.value = ESTADOS_VALIDOS.includes(reserva.estado) ? reserva.estado : 'Pendiente';
        
        if (duracionInfo && tiempoDuracion && reserva.ocasionEspecial) {
            tiempoDuracion.textContent = duracionesEvento[reserva.ocasionEspecial] || 1.5;
            duracionInfo.classList.remove('hidden');
        }
    } else {
        inNombre.value = '';
        inPersonas.value = '';
        const hoy = new Date().toISOString().split('T')[0];
        inFecha.value = hoy;
        inFecha.min = hoy;
        inHoraInicio.value = '08:00';
        selectOcasion.value = 'Ninguna';
        inHoraFin.value = calcularHoraFin('08:00', 'Ninguna');
        textareaNotas.value = '';
        estadoWrap.classList.add('hidden');
        estadoSelect.value = 'Pendiente';
        
        if (duracionInfo && tiempoDuracion) {
            tiempoDuracion.textContent = duracionesEvento['Ninguna'] || 1.5;
            duracionInfo.classList.remove('hidden');
        }
    }

    document.querySelectorAll('[id^="error"]').forEach(el => el.classList.add('hidden'));
    cargarMesasDisponiblesEnReserva();
    document.getElementById('modalReserva').classList.remove('hidden');
}

function cargarMesasDisponiblesEnReserva() {
    const selectMesa = document.getElementById('selectMesaReserva');
    if (!selectMesa) return;

    while (selectMesa.options.length > 1) selectMesa.remove(1);

    const mesas = getMesas();
    const fecha = document.getElementById('inputFechaReserva')?.value;
    const horaInicio = document.getElementById('inputHoraInicioReserva')?.value;
    let horaFin = document.getElementById('inputHoraFinReserva')?.value;
    const ocasion = document.getElementById('selectOcasionReserva')?.value || 'Ninguna';

    if (horaInicio && !horaFin) {
        horaFin = calcularHoraFin(horaInicio, ocasion);
        if (document.getElementById('inputHoraFinReserva')) document.getElementById('inputHoraFinReserva').value = horaFin;
        const duracionInfo = document.getElementById('duracionEvento'), tiempoDuracion = document.getElementById('tiempoDuracion');
        if (duracionInfo && tiempoDuracion) {
            tiempoDuracion.textContent = duracionesEvento[ocasion] || 1.5;
            duracionInfo.classList.remove('hidden');
        }
    }

    if (mesaPreseleccionada && !reservaEditando) {
        const mesa = mesas.find(m => m.id === mesaPreseleccionada);
        if (mesa) {
            const option = document.createElement('option');
            option.value = mesa.id;
            option.textContent = `${mesa.nombre || mesa.id} (Capacidad: ${mesa.capacidad})`;
            selectMesa.appendChild(option);
            selectMesa.value = mesa.id;
            selectMesa.disabled = true;
            return;
        }
    }

    selectMesa.disabled = false;

    mesas.forEach(mesa => {
        if (mesa.estado === 'deshabilitada') return;
        const disponible = verificarDisponibilidadMesa(mesa.id, fecha, horaInicio, horaFin, reservaEditando?.idReserva);
        if (disponible || (reservaEditando && mesa.id === reservaEditando.idMesaAsignada)) {
            const option = document.createElement('option');
            option.value = mesa.id;
            option.textContent = `${mesa.nombre || mesa.id} (Capacidad: ${mesa.capacidad})`;
            selectMesa.appendChild(option);
        }
    });

    if (reservaEditando?.idMesaAsignada) {
        selectMesa.value = reservaEditando.idMesaAsignada;
    }
}

function validarFormularioReserva() {
    const nombre = document.getElementById('inputNombreReserva')?.value?.trim() || '';
    const numeroPersonas = parseInt(document.getElementById('inputPersonasReserva')?.value, 10);
    const fecha = document.getElementById('inputFechaReserva')?.value;
    const horaInicio = document.getElementById('inputHoraInicioReserva')?.value;
    const horaFin = document.getElementById('inputHoraFinReserva')?.value;
    const mesa = document.getElementById('selectMesaReserva')?.value;
    const ocasion = document.getElementById('selectOcasionReserva')?.value;

    let valido = true;
    document.querySelectorAll('[id^="error"]').forEach(el => el.classList.add('hidden'));

    if (!nombre) {
        document.getElementById('errorNombreReserva').textContent = 'El nombre del cliente es obligatorio';
        document.getElementById('errorNombreReserva').classList.remove('hidden');
        valido = false;
    }
    if (isNaN(numeroPersonas) || numeroPersonas <= 0) {
        document.getElementById('errorPersonasReserva').textContent = 'El número de personas debe ser mayor a 0';
        document.getElementById('errorPersonasReserva').classList.remove('hidden');
        valido = false;
    }
    if (!fecha) {
        document.getElementById('errorFechaReserva').textContent = 'La fecha es obligatoria';
        document.getElementById('errorFechaReserva').classList.remove('hidden');
        valido = false;
    } else if (fecha < new Date().toISOString().split('T')[0]) {
        document.getElementById('errorFechaReserva').textContent = 'La fecha debe ser hoy o en el futuro';
        document.getElementById('errorFechaReserva').classList.remove('hidden');
        valido = false;
    }
    if (!horaInicio || !validarHoraEnRango(horaInicio)) {
        document.getElementById('errorHoraInicioReserva').textContent = 'La hora de inicio no es válida';
        document.getElementById('errorHoraInicioReserva').classList.remove('hidden');
        valido = false;
    }
    if (!horaFin || !validarHoraEnRango(horaFin)) {
        document.getElementById('errorHoraFinReserva').textContent = 'La hora de fin no es válida';
        document.getElementById('errorHoraFinReserva').classList.remove('hidden');
        valido = false;
    } else if (horaInicio && horaFin && timeToMinutes(horaFin) <= timeToMinutes(horaInicio)) {
        document.getElementById('errorHoraFinReserva').textContent = 'La hora de fin debe ser posterior a la hora de inicio';
        document.getElementById('errorHoraFinReserva').classList.remove('hidden');
        valido = false;
    }
    if (!ocasion) {
        document.getElementById('errorOcasionReserva').textContent = 'Debe seleccionar una ocasión';
        document.getElementById('errorOcasionReserva').classList.remove('hidden');
        valido = false;
    }
    if (!mesa) {
        document.getElementById('errorMesaReserva').textContent = 'Debe seleccionar una mesa';
        document.getElementById('errorMesaReserva').classList.remove('hidden');
        valido = false;
    }

    if (valido) {
        const disponible = verificarDisponibilidadMesa(mesa, fecha, horaInicio, horaFin, reservaEditando?.idReserva);
        if (!disponible) {
            mostrarMensaje('La mesa seleccionada no está disponible en el horario indicado', 'error');
            valido = false;
        }
    }

    return valido;
}

function guardarReserva() {
    if (!validarFormularioReserva()) return;

    const nombreCliente = document.getElementById('inputNombreReserva').value.trim();
    const numeroPersonas = parseInt(document.getElementById('inputPersonasReserva').value, 10);
    const fechaReserva = document.getElementById('inputFechaReserva').value;
    const horaInicioReserva = document.getElementById('inputHoraInicioReserva').value;
    const horaFinReserva = document.getElementById('inputHoraFinReserva').value;
    const ocasionEspecial = document.getElementById('selectOcasionReserva').value || 'Ninguna';
    const notasAdicionales = document.getElementById('textareaNotasReserva').value.trim();
    const idMesaAsignada = document.getElementById('selectMesaReserva').value;
    const estadoSelect = document.getElementById('selectEstadoReserva');
    const estadoSeleccionado = (estadoSelect && !estadoSelect.disabled) ? estadoSelect.value : null;

    const reservas = getReservas();

    if (reservaEditando) {
        const index = reservas.findIndex(r => r.idReserva === reservaEditando.idReserva);
        if (index === -1) return mostrarMensaje('Reserva no encontrada', 'error');
        reservas[index] = {
            ...reservas[index],
            nombreCliente, numeroPersonas, fechaReserva, horaInicioReserva, horaFinReserva,
            ocasionEspecial, notasAdicionales, idMesaAsignada,
            estado: estadoSeleccionado || reservas[index].estado
        };
    } else {
        reservas.push({
            idReserva: getNextReservaId(),
            nombreCliente, numeroPersonas, fechaReserva, horaInicioReserva, horaFinReserva,
            ocasionEspecial, notasAdicionales, idMesaAsignada, estado: 'Pendiente'
        });
    }

    if (saveReservas(reservas)) {
        mostrarMensaje(`Reserva ${reservaEditando ? 'actualizada' : 'creada'} correctamente`, 'success');
        cerrarModalReserva();
        actualizarEstadosMesas();
        cargarMesa();
        if (!document.getElementById('seccionReservas').classList.contains('hidden')) cargarReservas();
    } else {
        mostrarMensaje('Error al guardar la reserva', 'error');
    }
}

function cerrarModalReserva() {
    document.getElementById('modalReserva')?.classList.add('hidden');
    reservaEditando = null;
    mesaPreseleccionada = null;
}

// ========== TABLA DE RESERVAS ==========
function cargarReservas(filtroFecha = null, filtroEstado = null) {
    const tbody = document.getElementById('tbodyReservas');
    if (!tbody) return;
    tbody.innerHTML = '';

    let lista = getReservas();
    if (filtroFecha) lista = lista.filter(r => r.fechaReserva === filtroFecha);
    if (filtroEstado) lista = lista.filter(r => r.estado === filtroEstado);

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-4 py-4 text-center text-gray-500">No hay reservas</td></tr>';
        return;
    }

    lista.forEach(reserva => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 fade-in';
        const isBlocked = ['No Show', 'Cancelada', 'Finalizada'].includes(reserva.estado);
        const iconUrl = getIconForOcasion(reserva.ocasionEspecial);

        tr.innerHTML = `
            <td class="px-4 py-3 font-medium">${reserva.idReserva}</td>
            <td class="px-4 py-3">${reserva.nombreCliente}</td>
            <td class="px-4 py-3">${reserva.numeroPersonas}</td>
            <td class="px-4 py-3">${formatearFecha(reserva.fechaReserva)}</td>
            <td class="px-4 py-3">${reserva.horaInicioReserva} - ${reserva.horaFinReserva}</td>
            <td class="px-4 py-3 text-center">
                <img src="${iconUrl}" alt="${reserva.ocasionEspecial}" class="ocasion-img cursor-pointer" data-src="${iconUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb" />
            </td>
            <td class="px-4 py-3">${obtenerNombreMesa(reserva.idMesaAsignada)}</td>
            <td class="px-4 py-3">
                <span class="reserva-estado ${getClaseEstadoReserva(reserva.estado)}">${reserva.estado}</span>
            </td>
            <td class="px-4 py-3">
                <button ${isBlocked ? 'disabled' : ''} class="editar-reserva ${isBlocked ? 'opacity-50 cursor-not-allowed text-blue-300' : 'text-blue-600 hover:text-blue-800'} mr-2" data-id="${reserva.idReserva}" title="${isBlocked ? 'Reserva bloqueada' : 'Editar'}"><i class="fas fa-edit"></i></button>
                <button ${isBlocked ? 'disabled' : ''} class="pagar-reserva ${isBlocked ? 'opacity-50 cursor-not-allowed text-green-300' : 'text-green-600 hover:text-green-800'} mr-2" data-id="${reserva.idReserva}" title="${isBlocked ? 'Reserva bloqueada' : 'Pagar'}"><i class="fas fa-money-bill"></i></button>
                <button ${isBlocked ? 'disabled' : ''} class="eliminar-reserva ${isBlocked ? 'opacity-50 cursor-not-allowed text-red-300' : 'text-red-600 hover:text-red-800'}" data-id="${reserva.idReserva}" title="${isBlocked ? 'Reserva bloqueada' : 'Eliminar'}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.editar-reserva:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const reserva = getReservas().find(r => r.idReserva === btn.dataset.id);
            if (reserva) abrirModalReserva(null, reserva);
        });
    });

    tbody.querySelectorAll('.pagar-reserva:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            mostrarConfirmacion('¿Está seguro de marcar esta reserva como pagada?', () => setReservaEstado(btn.dataset.id, 'Finalizada'));
        });
    });

    tbody.querySelectorAll('.eliminar-reserva:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            mostrarConfirmacion('¿Está seguro de eliminar esta reserva? Esta acción no se puede deshacer.', () => eliminarReserva(btn.dataset.id));
        });
    });

    tbody.addEventListener('click', (e) => {
        const img = e.target.closest('.ocasion-img');
        if (img) abrirImagenModal(img.dataset.src || img.src);
    });
}

function eliminarReserva(idReserva) {
    const reservas = getReservas().filter(r => r.idReserva !== idReserva);
    if (saveReservas(reservas)) {
        mostrarMensaje('Reserva eliminada', 'success');
        actualizarEstadosMesas();
        cargarReservas();
        cargarMesa();
    } else {
        mostrarMensaje('Error al eliminar la reserva', 'error');
    }
}

// ========== MODAL IMAGEN ==========
function abrirImagenModal(src) {
    const modal = document.getElementById('modalImagen'), imgEl = document.getElementById('modalImagenImg');
    if (!modal || !imgEl) return;
    imgEl.src = src;
    modal.classList.remove('hidden');
    modal.onclick = (e) => { if (e.target === modal) cerrarImagenModal(); };
}

function cerrarImagenModal() {
    const modal = document.getElementById('modalImagen');
    if (!modal) return;
    modal.classList.add('hidden');
    document.getElementById('modalImagenImg').src = '';
}

// ========== INICIALIZACIÓN ==========
function initSampleData() {
    if (getMesas().length === 0) {
        const sample = [
            { id: 'mesa1', nombre: 'Mesa 1', capacidad: 2, ubicacion: 'Ventana', estado: 'disponible' },
            { id: 'mesa2', nombre: 'Mesa 2', capacidad: 4, ubicacion: 'Jardín', estado: 'disponible' },
            { id: 'mesa3', nombre: 'Mesa 3', capacidad: 6, ubicacion: 'Interior', estado: 'disponible' }
        ];
        saveMesas(sample);
        if (!localStorage.getItem('nextMesaId')) localStorage.setItem('nextMesaId', '4');
        if (!localStorage.getItem('nextReservaId')) localStorage.setItem('nextReservaId', '1');
    }
}

// ...existing code...
function mostrarDetalleMesa(mesa) {
    const modal = document.getElementById('detalleMesa');
    if (!modal) {
        console.error('[mostrarDetalleMesa] modal #detalleMesa no encontrado');
        return;
    }

    const dmId = document.getElementById('dm-id');
    const dmNombre = document.getElementById('dm-nombre');
    const dmCapacidad = document.getElementById('dm-capacidad');
    const dmUbicacion = document.getElementById('dm-ubicacion');
    const estadoEl = document.getElementById('dm-estado');

    // Rellenar solo si existen los elementos (evita TypeError)
    if (dmId) dmId.textContent = mesa?.id ?? '';
    else console.warn('[mostrarDetalleMesa] elemento #dm-id no encontrado en el DOM');

    if (dmNombre) dmNombre.textContent = mesa?.nombre || mesa?.id || '';
    else console.warn('[mostrarDetalleMesa] elemento #dm-nombre no encontrado en el DOM');

    if (dmCapacidad) dmCapacidad.textContent = mesa?.capacidad ?? '';
    else console.warn('[mostrarDetalleMesa] elemento #dm-capacidad no encontrado en el DOM');

    if (dmUbicacion) dmUbicacion.textContent = mesa?.ubicacion || '';
    else console.warn('[mostrarDetalleMesa] elemento #dm-ubicacion no encontrado en el DOM');

    if (estadoEl) {
        estadoEl.className = 'inline-block rounded px-2 py-0.5 text-sm font-medium text-white ';
        const estadoText = mesa?.estado ? (mesa.estado.charAt(0).toUpperCase() + mesa.estado.slice(1)) : '';
        estadoEl.textContent = estadoText;
        estadoEl.classList.remove('bg-green-500','bg-blue-500','bg-gray-500');
        if (mesa?.estado === 'disponible') estadoEl.classList.add('bg-green-500');
        else if (mesa?.estado === 'ocupada') estadoEl.classList.add('bg-blue-500');
        else estadoEl.classList.add('bg-gray-500');
    } else {
        console.warn('[mostrarDetalleMesa] elemento #dm-estado no encontrado en el DOM');
    }

    modal.classList.remove('hidden');

    const btnEditar = document.getElementById('dm-editar');
    const btnEliminar = document.getElementById('dm-eliminar');
    const btnReservar = document.getElementById('dm-reservar');

    if (btnEditar) {
        btnEditar.onclick = () => { cerrarModalDetalle(); abrirModalEditarMesa(mesa.id); };
    }
    if (btnEliminar) {
        btnEliminar.onclick = () => { mostrarConfirmacion('¿Está seguro de eliminar esta mesa?', () => eliminarMesa(mesa.id)); };
    }
    if (btnReservar) {
        btnReservar.onclick = () => {
            if (mesa.estado === 'deshabilitada') {
                mostrarMensaje('Esta mesa está deshabilitada y no se puede reservar.', 'error');
                return;
            }
            cerrarModalDetalle();
            abrirModalReserva(mesa.id);
        };
    }
}
// ...existing code...

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    initSampleData();
    iniciarActualizacionEstados();

    // Navegación entre secciones
    document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const section = this.dataset.section;
            document.getElementById('seccionReservas').classList.toggle('hidden', section !== 'reservas');
            document.getElementById('seccionMesas').classList.toggle('hidden', section !== 'mesas');

            if (section === 'reservas') cargarReservas();
        });
    });

    // Botones principales
    document.getElementById('btnVerReservas').addEventListener('click', () => {
        document.getElementById('seccionMesas').classList.add('hidden');
        document.getElementById('seccionReservas').classList.remove('hidden');
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        document.querySelector('.sidebar-item[data-section="reservas"]').classList.add('active');
        cargarReservas();
    });

    document.getElementById('btnVolverMesas').addEventListener('click', () => {
        document.getElementById('seccionReservas').classList.add('hidden');
        document.getElementById('seccionMesas').classList.remove('hidden');
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        document.querySelector('.sidebar-item[data-section="mesas"]').classList.add('active');
    });

    // Modales de mesas
    document.getElementById('am-guardar').addEventListener('click', guardarMesa);
    document.getElementById('am-cancelar').addEventListener('click', cerrarModalAgregarMesa);
    document.getElementById('dm-cerrar').addEventListener('click', cerrarModalDetalle);

    // Modales de reservas
    document.getElementById('btnGuardarReserva').addEventListener('click', guardarReserva);
    document.getElementById('btnCancelarReserva').addEventListener('click', cerrarModalReserva);
    document.getElementById('btnAgregarReserva').addEventListener('click', () => abrirModalReserva());

    // Filtros de reservas
    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        const filtroFecha = document.getElementById('filtroFecha').value;
        const filtroEstado = document.getElementById('filtroEstado').value;
        cargarReservas(filtroFecha || null, filtroEstado || null);
    });

    // Modal de confirmación
    document.getElementById('btnConfirmarCancelar').addEventListener('click', cerrarModalConfirmacion);
    document.getElementById('btnConfirmarAceptar').addEventListener('click', () => {
        if (confirmacionCallback) confirmacionCallback();
        cerrarModalConfirmacion();
    });

    // Cálculo automático de hora fin
    const selectOcasion = document.getElementById('selectOcasionReserva');
    const inputHoraInicio = document.getElementById('inputHoraInicioReserva');
    
    function actualizarHoraFin() {
        const ocasion = selectOcasion.value, horaInicio = inputHoraInicio.value;
        if (ocasion && horaInicio) {
            const horaFin = calcularHoraFin(horaInicio, ocasion);
            document.getElementById('inputHoraFinReserva').value = horaFin;
            document.getElementById('tiempoDuracion').textContent = duracionesEvento[ocasion] || 1.5;
            document.getElementById('duracionEvento').classList.remove('hidden');
            cargarMesasDisponiblesEnReserva();
        }
    }

    selectOcasion.addEventListener('change', actualizarHoraFin);
    inputHoraInicio.addEventListener('change', actualizarHoraFin);

    // Actualización de mesas disponibles
    document.getElementById('inputFechaReserva').addEventListener('change', cargarMesasDisponiblesEnReserva);
    document.getElementById('inputHoraInicioReserva').addEventListener('change', cargarMesasDisponiblesEnReserva);
    document.getElementById('inputHoraFinReserva').addEventListener('change', cargarMesasDisponiblesEnReserva);

    // Cerrar modal de imagen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarImagenModal();
    });
    document.getElementById('modalImagenClose').addEventListener('click', cerrarImagenModal);
});