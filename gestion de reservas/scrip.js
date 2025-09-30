// Variables globales
        let reservaEditando = null;
        let mesaPreseleccionada = null;
        let confirmacionCallback = null;
        let estadoUpdateInterval = null;

        // Duración de eventos en horas
      // ...existing code...
// ...existing code...
// ...existing code...
// ...existing code...
const duracionesEvento = {
    'Cumpleaños': 2,
    'Aniversario': 2,
    'Reunión de Negocios': 1.5,
    'Cena Romántica': 2,
    'Celebración Familiar': 2.5,
    'Evento Corporativo': 3,
    'Graduación': 2,
    'Ninguna': 1.5
};


// ...existing code...
function getIconForOcasion(ocasion) {
    const map = {
        'Cumpleaños': 'icons/cum.jpg',
        'Aniversario': 'icons/aniversario.jpg',
        'Reunión de Negocios': 'icons/reunion.jpeg',
        'Cena Romántica': 'icons/cena_romantica.jpeg',
        'Celebración Familiar': 'icons/celebracion-familiar.jpg',
        'Evento Corporativo': 'icons/evento_corporativo.jpeg',
        'Graduación': 'icons/grado.jpg',
        'Ninguna': 'icons/spi.jpg'
    };
    return map[ocasion] || 'icons/celebracion-familiar.jpg';
}

        // ---------------------------
        // Helpers localStorage (seguros)
        // ---------------------------
        function safeParse(key) {
            try {
                const v = localStorage.getItem(key);
                return v ? JSON.parse(v) : null;
            } catch (e) {
                console.warn(`Error parseando ${key}:`, e);
                return null;
            }
        }

        function getMesas() {
            return safeParse('mesas') || [];
        }
// ...existing code...
// Estados válidos (incluye "No Show")
const ESTADOS_VALIDOS = ['Pendiente','Confirmada','Cancelada','Finalizada','No Show'];

// Normaliza reservas antiguas para asegurar la propiedad estado
function normalizarReservas() {
    const reservas = getReservas() || [];
    let modificado = false;
    const out = reservas.map(r => {
        if (!r || typeof r !== 'object') return r;
        if (!r.hasOwnProperty('estado') || !ESTADOS_VALIDOS.includes(r.estado)) {
            r.estado = 'Pendiente';
            modificado = true;
        }
        return r;
    });
    if (modificado) saveReservas(out);
    return out;
}

// Función central para cambiar estado y aplicar efectos colaterales
function setReservaEstado(idReserva, nuevoEstado) {
    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) return false;
    const reservas = getReservas();
    const idx = reservas.findIndex(r => r.idReserva === idReserva);
    if (idx === -1) return false;
    reservas[idx].estado = nuevoEstado;

    // Efectos: si finaliza o es No Show, liberar la mesa asignada
    if (nuevoEstado === 'Finalizada' || nuevoEstado === 'No Show') {
        const mesas = getMesas();
        const idMesa = reservas[idx].idMesaAsignada;
        const mIdx = mesas.findIndex(m => m.id === idMesa);
        if (mIdx !== -1) {
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

// Procesa No Shows automáticos (umbral en minutos opcional)
function procesarNoShows(thresholdMinutos = 0) {
    const reservas = getReservas();
    const ahora = new Date();
    const hoy = ahora.toISOString().split('T')[0];
    const minutosAhora = timeToMinutes(`${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`);
    let mod = false;

    reservas.forEach(r => {
        if (!r || !r.fechaReserva || !r.horaFinReserva) return;
        if (r.fechaReserva !== hoy) return;
        if (['Finalizada','Cancelada','No Show'].includes(r.estado)) return;
        const fin = timeToMinutes(r.horaFinReserva);
        if (isNaN(fin)) return;
        if (minutosAhora > (fin + thresholdMinutos)) {
            r.estado = 'No Show';
            mod = true;
        }
    });

    if (mod) {
        saveReservas(reservas);
        actualizarEstadosMesas();
        cargarReservas();
        cargarMesa();
    }
    return mod;
}
// ...existing code...
        function saveMesas(mesas) {
            try {
                localStorage.setItem('mesas', JSON.stringify(mesas));
                return true;
            } catch (e) {
                console.error('Error guardando mesas', e);
                return false;
            }
        }

        function getNextMesaId() {
            const key = 'nextMesaId';
            let next = parseInt(localStorage.getItem(key), 10);
            if (isNaN(next) || next < 1) next = 1;
            localStorage.setItem(key, String(next + 1));
            return 'mesa' + next;
        }

        function getReservas() {
            return safeParse('reservas') || [];
        }

        function saveReservas(reservas) {
            try {
                localStorage.setItem('reservas', JSON.stringify(reservas));
                return true;
            } catch (e) {
                console.error('Error guardando reservas', e);
                return false;
            }
        }

        function getNextReservaId() {
            const key = 'nextReservaId';
            let next = parseInt(localStorage.getItem(key), 10);
            if (isNaN(next) || next < 1) next = 1;
            localStorage.setItem(key, String(next + 1));
            return 'reserva' + next;
        }

        // ---------------------------
        // Utilitarios de tiempo y formato
        // ---------------------------
        function timeToMinutes(hhmm) {
            if (!hhmm || typeof hhmm !== 'string') return NaN;
            const parts = hhmm.split(':');
            if (parts.length < 2) return NaN;
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (isNaN(h) || isNaN(m)) return NaN;
            return h * 60 + m;
        }

        function minutesToTime(totalMinutes) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        function formatearFecha(fecha) {
            if (!fecha) return '';
            const d = new Date(fecha + 'T00:00:00');
            if (isNaN(d)) return fecha;
            return d.toLocaleDateString('es-ES');
        }

        function obtenerNombreMesa(mesaId) {
            const mesas = getMesas();
            const mesa = mesas.find(m => m.id === mesaId);
            return mesa ? (mesa.nombre || mesa.id) : 'Mesa no encontrada';
        }

        // Calcular hora fin basada en hora inicio y tipo de evento
        function calcularHoraFin(horaInicio, tipoEvento) {
            const duracion = duracionesEvento[tipoEvento] || 1.5;
            const minutosInicio = timeToMinutes(horaInicio);
            if (isNaN(minutosInicio)) return '';
            
            const minutosFin = minutosInicio + (duracion * 60);
            return minutesToTime(minutosFin);
        }

        // Validar si una hora está dentro del rango permitido (8:00 - 20:00)
       function validarHoraEnRango(hora) {
    const minutos = timeToMinutes(hora);
    return !isNaN(minutos) && minutos >= 0 && minutos <= (24 * 60 - 1);
}

        // ---------------------------
        // Función para actualizar estados de mesas según reservas
        // ---------------------------
       // ...existing code...
function actualizarEstadosMesas() {
    const mesas = getMesas();
    const reservas = getReservas();
    const now = new Date();
    const hoy = now.toISOString().split('T')[0];
    const horaActual = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const mActual = timeToMinutes(horaActual);

    // por defecto dejar disponibles (si no están deshabilitadas)
    mesas.forEach(m => { if (m.estado !== 'deshabilitada') m.estado = 'disponible'; });

    reservas.forEach(r => {
        if (['Cancelada','Finalizada','No Show'].includes(r.estado)) return;
        if (r.fechaReserva !== hoy) return;
        const ri = timeToMinutes(r.horaInicioReserva), rf = timeToMinutes(r.horaFinReserva);
        if (isNaN(ri) || isNaN(rf)) return;
        const idx = mesas.findIndex(x => x.id === r.idMesaAsignada);
        if (idx === -1) return;
        // marcar ocupada solo mientras la reserva esté en curso
        if (mActual >= ri && mActual < rf) mesas[idx].estado = 'ocupada';
        // no establecer "reservada": dejamos disponible hasta que se marque ocupada
    });

    saveMesas(mesas);
    const last = document.getElementById('last-update');
    if (last) last.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
    return mesas;
}
// ...existing code...
        // ---------------------------
        // Iniciar intervalo para actualizar estados
      // ...existing code...
// Reemplaza/actualiza iniciarActualizacionEstados() por esta versión
function iniciarActualizacionEstados() {
    // Normalizar datos al inicio
    normalizarReservas();
    // Procesar No Shows al cargar (umbral 0 = marcar inmediatamente si pasó la horaFin)
    procesarNoShows(0);

    // Actualizar inmediatamente la UI
    actualizarEstadosMesas();
    cargarMesa();

    // Limpiar intervalo previo si existe
    if (estadoUpdateInterval) clearInterval(estadoUpdateInterval);

    // Ejecutar periódicamente: actualizar estados y procesar No Shows (cada 60s)
    estadoUpdateInterval = setInterval(() => {
        actualizarEstadosMesas();
        procesarNoShows(0);
        cargarMesa();
    }, 60000);
}
// ...existing code...
        // ---------------------------
        // Mensajes y confirmación
        // ---------------------------
        function mostrarMensaje(mensaje, tipo = 'info') {
            const contenedorMensajes = document.getElementById('contenedorMensajes');
            if (!contenedorMensajes) return;
            const mensajeElemento = document.createElement('div');
            const bgColor = tipo === 'error' ? 'bg-red-500' : tipo === 'success' ? 'bg-green-500' : 'bg-blue-500';
            mensajeElemento.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300`;
            mensajeElemento.textContent = mensaje;
            contenedorMensajes.appendChild(mensajeElemento);

            setTimeout(() => {
                mensajeElemento.style.opacity = '0';
                setTimeout(() => mensajeElemento.remove(), 300);
            }, 3000);
        }

        function mostrarConfirmacion(mensaje, callback) {
            const modal = document.getElementById('modalConfirmacion');
            const msgEl = document.getElementById('confirmacionMensaje');
            if (!modal || !msgEl) {
                // fallback: ejecutar callback directamente con confirm del navegador
                if (confirm(mensaje)) callback();
                return;
            }
            msgEl.textContent = mensaje;
            modal.classList.remove('hidden');
            confirmacionCallback = callback;
        }

        function cerrarModalConfirmacion() {
            const modal = document.getElementById('modalConfirmacion');
            if (modal) modal.classList.add('hidden');
            confirmacionCallback = null;
        }
function cerrarModalAgregarMesa() {
    const modal = document.getElementById('agregarMesa');
    if (modal) modal.classList.add('hidden');
    const botonGuardar = document.getElementById('am-guardar');
    if (botonGuardar && botonGuardar.dataset && botonGuardar.dataset.editarId) delete botonGuardar.dataset.editarId;
}
        // ---------------------------
        // Visualización de mesas
        // ---------------------------
      // ...existing code...
function cargarMesa() {
    const grid = document.getElementById('mesasGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Asegurarse de que los estados están actualizados
    const mesas = actualizarEstadosMesas();

    const totalEl = document.getElementById('total-mesas');
    const disponiblesEl = document.getElementById('mesas-disponibles');
    if (totalEl) totalEl.textContent = mesas.length;
    if (disponiblesEl) disponiblesEl.textContent = mesas.filter(m => m.estado === 'disponible').length;

    mesas.forEach(mesa => {
        const card = document.createElement('div');
        let statusClass = '';
        let statusText = '';

        if (mesa.estado === 'disponible') {
            statusClass = 'disponible';
            statusText = 'Disponible';
        } else if (mesa.estado === 'ocupada') {
            statusClass = 'ocupada';
            statusText = 'Ocupada';
        } else {
            statusClass = 'deshabilitada';
            statusText = 'Deshabilitada';
        }

        card.className = `mesa-card card bg-white overflow-hidden fade-in cursor-pointer`;
        card.innerHTML = `
            <div class="p-5 flex flex-col items-center justify-center h-40">
                <span class="mesa-status ${statusClass}">${statusText}</span>
                <div class="text-2xl font-bold text-emerald-600 mb-2">${mesa.nombre ? mesa.nombre : mesa.id}</div>
                <div class="text-gray-600 mb-1"><i class="fas fa-users mr-2"></i>Capacidad: ${mesa.capacidad}</div>
                <div class="text-gray-600"><i class="fas fa-map-marker-alt mr-2"></i>${mesa.ubicacion || ''}</div>
            </div>
        `;
        card.addEventListener('click', () => mostrarDetalleMesa(mesa));
        grid.appendChild(card);
    });

    // reservas de hoy
    const reservas = getReservas();
    const hoy = new Date().toISOString().split('T')[0];
    const reservasHoy = reservas.filter(r => r.fechaReserva === hoy && r.estado !== 'Cancelada').length;
    const reservasHoyEl = document.getElementById('reservas-hoy');
    if (reservasHoyEl) reservasHoyEl.textContent = reservasHoy;
}
// ...existing code...

// ...existing code...
function mostrarDetalleMesa(mesa) {
    const modal = document.getElementById('detalleMesa');
    if (!modal) return;

    const dmId = document.getElementById('dm-id');
    const dmNombre = document.getElementById('dm-nombre');
    const dmCapacidad = document.getElementById('dm-capacidad');
    const dmUbicacion = document.getElementById('dm-ubicacion');
    const dmEstado = document.getElementById('dm-estado');

    if (dmId) dmId.textContent = mesa.id;
    if (dmNombre) dmNombre.textContent = mesa.nombre || mesa.id;
    if (dmCapacidad) dmCapacidad.textContent = mesa.capacidad;
    if (dmUbicacion) dmUbicacion.textContent = mesa.ubicacion || '';

    if (dmEstado) {
        dmEstado.className = 'inline-block rounded px-2 py-0.5 text-sm font-medium';
        dmEstado.classList.remove('bg-green-500', 'bg-blue-500', 'bg-gray-500', 'text-white');
        if (mesa.estado === 'disponible') {
            dmEstado.textContent = 'Disponible';
            dmEstado.classList.add('bg-green-500', 'text-white');
        } else if (mesa.estado === 'ocupada') {
            dmEstado.textContent = 'Ocupada';
            dmEstado.classList.add('bg-blue-500', 'text-white');
        } else {
            dmEstado.textContent = 'Deshabilitada';
            dmEstado.classList.add('bg-gray-500', 'text-white');
        }
    }

    modal.classList.remove('hidden');

    const btnEditar = document.getElementById('dm-editar');
    const btnEliminar = document.getElementById('dm-eliminar');
    const btnReservar = document.getElementById('dm-reservar');

    if (btnEditar) {
        btnEditar.onclick = () => {
            cerrarModalDetalle();
            abrirModalEditarMesa(mesa.id);
        };
    }
    if (btnEliminar) {
        btnEliminar.onclick = () => {
            mostrarConfirmacion('¿Está seguro de eliminar esta mesa?', () => eliminarMesa(mesa.id));
        };
    }
    if (btnReservar) {
        btnReservar.onclick = () => {
            cerrarModalDetalle();
            abrirModalReserva(mesa.id);
        };
    }
}
// ...existing code...

        function cerrarModalDetalle() {
            const modal = document.getElementById('detalleMesa');
            if (modal) modal.classList.add('hidden');
        }

        // ---------------------------
        // CRUD Mesas (modales)
        // ---------------------------
        function validarCampoMesa(nombre, capacidad, ubicacion) {
            let valido = true;
            const errNombre = document.getElementById('error-nombre');
            const errCap = document.getElementById('error-capacidad');
            const errUbic = document.getElementById('error-ubicacion');
            if (errNombre) errNombre.classList.add('hidden');
            if (errCap) errCap.classList.add('hidden');
            if (errUbic) errUbic.classList.add('hidden');

            if (!nombre) {
                if (errNombre) { errNombre.textContent = 'El Nombre Es Obligatorio'; errNombre.classList.remove('hidden'); }
                valido = false;
            }
            if (isNaN(capacidad) || capacidad <= 0) {
                if (errCap) { errCap.textContent = 'Capacidad debe ser mayor a 0'; errCap.classList.remove('hidden'); }
                valido = false;
            }
            if (!ubicacion) {
                if (errUbic) { errUbic.textContent = 'Debe escribir ubicación'; errUbic.classList.remove('hidden'); }
                valido = false;
            }
            return valido;
        }
function abrirModalEditarMesa(mesaId) {
    const mesas = getMesas() || [];
    const mesa = mesas.find(m => String(m.id) === String(mesaId));
    if (!mesa) return mostrarMensaje('Mesa no encontrada', 'error');

    const inNombre = document.getElementById('am-nombre');
    const inCap = document.getElementById('am-capacidad');
    const inUb = document.getElementById('am-ubicacion');
    const estadoWrap = document.getElementById('am-estado-wrapper');
    const estadoSelect = document.getElementById('am-estado');
    const botonGuardar = document.getElementById('am-guardar');
    const titulo = document.getElementById('am-titulo');
    const modal = document.getElementById('agregarMesa');

    if (inNombre) inNombre.value = mesa.nombre || '';
    if (inCap) inCap.value = mesa.capacidad ?? '';
    if (inUb) inUb.value = mesa.ubicacion || '';

    // mostrar select estado y setear valor seguro:
    if (estadoWrap) estadoWrap.classList.remove('hidden');
    // permitir seleccionar solo 'disponible' o 'deshabilitada'
    if (estadoSelect) {
        if (mesa.estado === 'deshabilitada') estadoSelect.value = 'deshabilitada';
        else estadoSelect.value = 'disponible'; // si estaba 'ocupada' o cualquier otro valor, mostrar 'disponible'
    }

    if (botonGuardar) botonGuardar.dataset.editarId = mesa.id;
    if (titulo) titulo.textContent = 'Editar Mesa';

    document.getElementById('error-nombre')?.classList.add('hidden');
    document.getElementById('error-capacidad')?.classList.add('hidden');

    if (modal) modal.classList.remove('hidden');
}

function validarNombreMesa(nombre, idExcluir = null) {
    const elError = document.getElementById('error-nombre');
    if (!nombre || !nombre.trim()) {
        if (elError) { elError.textContent = 'El nombre de la mesa es obligatorio.'; elError.classList.remove('hidden'); }
        return false;
    }
    const mesas = getMesas() || [];
    const existe = mesas.some(m => {
        if (idExcluir && String(m.id) === String(idExcluir)) return false;
        return String(m.nombre || '').trim().toLowerCase() === String(nombre).trim().toLowerCase();
    });
    if (existe) {
        if (elError) { elError.textContent = 'Ya existe una mesa con ese nombre.'; elError.classList.remove('hidden'); }
        return false;
    }
    if (elError) { elError.classList.add('hidden'); }
    return true;
}







function abrirModalAgregarMesa() {
    const inNombre = document.getElementById('am-nombre');
    const inCap = document.getElementById('am-capacidad');
    const inUb = document.getElementById('am-ubicacion');
    const estadoWrap = document.getElementById('am-estado-wrapper');
    const estadoSelect = document.getElementById('am-estado');
    const botonGuardar = document.getElementById('am-guardar');
    const titulo = document.getElementById('am-titulo');
    const modal = document.getElementById('agregarMesa');

    if (inNombre) inNombre.value = '';
    if (inCap) inCap.value = '';
    if (inUb) inUb.value = '';
    if (estadoSelect) estadoSelect.value = 'disponible';
    if (estadoWrap) estadoWrap.classList.add('hidden');
    if (botonGuardar && botonGuardar.dataset) delete botonGuardar.dataset.editarId;
    if (titulo) titulo.textContent = 'Agregar Mesa';
    // ocultar errores previos
    document.getElementById('error-nombre')?.classList.add('hidden');
    document.getElementById('error-capacidad')?.classList.add('hidden');
    document.getElementById('error-ubicacion')?.classList.add('hidden');

    if (modal) modal.classList.remove('hidden');
}
        function cerrarModalAgregarMesa() {
            const modal = document.getElementById('agregarMesa');
            if (modal) modal.classList.add('hidden');
        }
function guardarMesa() {
    const nombreEl = document.getElementById('am-nombre');
    const capEl = document.getElementById('am-capacidad');
    const ubEl = document.getElementById('am-ubicacion');
    const estadoSelect = document.getElementById('am-estado');
    const botonGuardar = document.getElementById('am-guardar');

    if (!nombreEl || !capEl) return mostrarMensaje('Formulario de mesa incompleto', 'error');

    const nombre = (nombreEl.value || '').trim();
    const capacidad = parseInt(capEl.value, 10);
    const ubicacion = (ubEl?.value || '').trim();
    const editarId = botonGuardar?.dataset?.editarId || null;

    // validar nombre no vacío y único
    if (!validarNombreMesa(nombre, editarId)) return;

    if (isNaN(capacidad) || capacidad <= 0) {
        const el = document.getElementById('error-capacidad');
        if (el) { el.textContent = 'Capacidad inválida.'; el.classList.remove('hidden'); }
        return;
    } else {
        document.getElementById('error-capacidad')?.classList.add('hidden');
    }

    const mesas = getMesas() || [];

    if (editarId) {
        const idx = mesas.findIndex(m => String(m.id) === String(editarId));
        if (idx === -1) return mostrarMensaje('Mesa a editar no encontrada', 'error');

        // obtener nuevo estado desde el select solo si existe y es válido
        const nuevoEstadoRaw = estadoSelect ? String(estadoSelect.value).toLowerCase() : null;
        const permitido = ['disponible', 'deshabilitada'];
        const estadoFinal = (nuevoEstadoRaw && permitido.includes(nuevoEstadoRaw)) ? nuevoEstadoRaw : (mesas[idx].estado || 'disponible');

        mesas[idx] = { ...mesas[idx], nombre, capacidad, ubicacion, estado: estadoFinal };
    } else {
        // crear nueva mesa siempre con estado 'disponible' por defecto
        const nuevoId = getNextMesaId();
        mesas.push({ id: nuevoId, nombre, capacidad, ubicacion, estado: 'disponible' });
    }

    if (saveMesas(mesas)) {
        mostrarMensaje('Mesa guardada correctamente', 'success');
        cerrarModalAgregarMesa();
        cargarMesa();
    } else {
        mostrarMensaje('Error al guardar mesa', 'error');
    }
}
        function eliminarMesa(mesaId) {
            const mesas = getMesas();
            const mesasActualizadas = mesas.filter(m => m.id !== mesaId);
            if (saveMesas(mesasActualizadas)) {
                mostrarMensaje('Mesa eliminada correctamente', 'success');
                cerrarModalDetalle();
                cargarMesa();
            } else {
                mostrarMensaje('Error al eliminar la mesa', 'error');
            }
        }

        // ---------------------------
        // Verificar disponibilidad (rango de horas)
        // ---------------------------
       // ...existing code...
function verificarDisponibilidadMesa(mesaId, fecha, horaInicio, horaFin, excluirReservaId = null) {
    // Si no hay fecha/hora, consideramos que no podemos verificar => no bloquear
    if (!fecha || !horaInicio || !horaFin) return true;

    const mesas = getMesas();
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return false; // si no existe la mesa, no está disponible

    // Si la mesa está deshabilitada, no puede reservarse
    if (mesa.estado === 'deshabilitada') return false;

    const reservas = getReservas();

    // Convertir horas a minutos
    const nuevoInicio = timeToMinutes(horaInicio);
    const nuevoFin = timeToMinutes(horaFin);
    if (isNaN(nuevoInicio) || isNaN(nuevoFin) || nuevoFin <= nuevoInicio) return false;

    // Revisar solapamientos en la misma mesa y misma fecha
    return !reservas.some(reserva => {
        // excluir la reserva que estamos editando (comparar como strings para evitar problemas de tipo)
        if (excluirReservaId && String(reserva.idReserva) === String(excluirReservaId)) return false;
        if (reserva.idMesaAsignada !== mesaId) return false;
        if (reserva.fechaReserva !== fecha) return false;
        if (reserva.estado === 'Cancelada' || reserva.estado === 'Finalizada' || reserva.estado === 'No Show') return false;

        const rInicio = timeToMinutes(reserva.horaInicioReserva);
        const rFin = timeToMinutes(reserva.horaFinReserva);
        if (isNaN(rInicio) || isNaN(rFin)) return false;

        // overlap check: start < existingEnd && end > existingStart
        return (nuevoInicio < rFin && nuevoFin > rInicio);
    });
}
// ...existing code...

        // ---------------------------
        // Modal Reserva (abrir/guardar/cargar mesas disponibles)
        // ---------------------------
       // ...existing code...
function abrirModalReserva(mesaId = null, reserva = null) {
    reservaEditando = reserva;
    mesaPreseleccionada = mesaId;

    const titulo = document.getElementById('tituloModalReserva');
    if (titulo) titulo.textContent = reserva ? 'Editar Reserva' : 'Nueva Reserva';

    const inNombre = document.getElementById('inputNombreReserva');
    const inPersonas = document.getElementById('inputPersonasReserva');
    const inFecha = document.getElementById('inputFechaReserva');
    const inHoraInicio = document.getElementById('inputHoraInicioReserva');
    const inHoraFin = document.getElementById('inputHoraFinReserva');
    const selectOcasion = document.getElementById('selectOcasionReserva');
    const textareaNotas = document.getElementById('textareaNotasReserva');
    const duracionInfo = document.getElementById('duracionEvento');
    const tiempoDuracion = document.getElementById('tiempoDuracion');

    const estadoWrap = document.getElementById('rs-estado-wrapper');
    const estadoSelect = document.getElementById('selectEstadoReserva');

    if (reserva) {
        if (inNombre) inNombre.value = reserva.nombreCliente || '';
        if (inPersonas) inPersonas.value = reserva.numeroPersonas || '';
        if (inFecha) inFecha.value = reserva.fechaReserva || '';
        if (inHoraInicio) inHoraInicio.value = reserva.horaInicioReserva || '';
        if (inHoraFin) inHoraFin.value = reserva.horaFinReserva || '';
        if (selectOcasion) selectOcasion.value = reserva.ocasionEspecial || 'Ninguna';
        if (textareaNotas) textareaNotas.value = reserva.notasAdicionales || '';

        // mostrar select de estado en edición y setear valor (Pendiente/Confirmada/Cancelada/No Show)
        if (estadoWrap) estadoWrap.classList.remove('hidden');
        if (estadoSelect) {
            const permitido = ['Pendiente','Confirmada','Cancelada','No Show'];
            estadoSelect.value = permitido.includes(reserva.estado) ? reserva.estado : 'Pendiente';
            estadoSelect.disabled = false;
        }

        // duración visual
        if (duracionInfo && tiempoDuracion && reserva.ocasionEspecial) {
            const duracion = duracionesEvento[reserva.ocasionEspecial] || 1.5;
            tiempoDuracion.textContent = duracion;
            duracionInfo.classList.remove('hidden');
        }
    } else {
        if (inNombre) inNombre.value = '';
        if (inPersonas) inPersonas.value = '';
        const hoy = new Date().toISOString().split('T')[0];
        if (inFecha) { inFecha.min = hoy; inFecha.value = hoy; }
        if (inHoraInicio) inHoraInicio.value = '08:00';
        if (selectOcasion) selectOcasion.value = 'Ninguna';
        if (inHoraFin) inHoraFin.value = calcularHoraFin(inHoraInicio ? inHoraInicio.value : '08:00', 'Ninguna');
        if (textareaNotas) textareaNotas.value = '';

        // ocultar select de estado en creación (estado será Pendiente por defecto)
        if (estadoWrap) estadoWrap.classList.add('hidden');
        if (estadoSelect) { estadoSelect.value = 'Pendiente'; estadoSelect.disabled = false; }

        if (duracionInfo && tiempoDuracion) {
            const duracion = duracionesEvento['Ninguna'] || 1.5;
            tiempoDuracion.textContent = duracion;
            duracionInfo.classList.remove('hidden');
        }
    }

    // esconder errores previos
    document.querySelectorAll('[id^="error"]').forEach(el => { if (el && el.classList) el.classList.add('hidden'); });

    cargarMesasDisponiblesEnReserva();

    const modal = document.getElementById('modalReserva');
    if (modal) modal.classList.remove('hidden');
}
// ...existing code...

        function cerrarModalReserva() {
            const modal = document.getElementById('modalReserva');
            if (modal) modal.classList.add('hidden');
            reservaEditando = null;
            mesaPreseleccionada = null;
        }

     // ...existing code...
// ...existing code...
function cargarMesasDisponiblesEnReserva() {
    const selectMesa = document.getElementById('selectMesaReserva');
    if (!selectMesa) return;

    // conservar la primera opción (placeholder)
    while (selectMesa.options.length > 1) selectMesa.remove(1);

    const mesas = getMesas();
    const fechaEl = document.getElementById('inputFechaReserva');
    const inicioEl = document.getElementById('inputHoraInicioReserva');
    const finEl = document.getElementById('inputHoraFinReserva');
    const ocasionEl = document.getElementById('selectOcasionReserva');

    const fecha = fechaEl ? fechaEl.value : '';
    const horaInicio = inicioEl ? inicioEl.value : '';
    let horaFin = finEl ? finEl.value : '';
    const ocasion = ocasionEl ? (ocasionEl.value || 'Ninguna') : 'Ninguna';

    // si falta horaFin pero hay horaInicio, calcular según la ocasión
    if (horaInicio && !horaFin) {
        horaFin = calcularHoraFin(horaInicio, ocasion);
        // reflejar en el input para que el usuario vea el horario calculado
        if (finEl) finEl.value = horaFin;
        // mostrar duración si corresponde
        const duracionInfo = document.getElementById('duracionEvento');
        const tiempoDuracion = document.getElementById('tiempoDuracion');
        if (duracionInfo && tiempoDuracion) {
            tiempoDuracion.textContent = duracionesEvento[ocasion] || duracionesEvento['Ninguna'] || 1.5;
            duracionInfo.classList.remove('hidden');
        }
    }

    // Si se abrió el modal desde una mesa específica y NO estamos editando, bloquear selección a esa mesa
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
        // solo mesas no deshabilitadas para asignación
        if (mesa.estado === 'deshabilitada') return;

        // si no hay fecha u horas, dejamos que la verificación use la hora calculada (si existe)
        const disponible = verificarDisponibilidadMesa(
            mesa.id,
            fecha,
            horaInicio,
            horaFin,
            reservaEditando ? reservaEditando.idReserva : null
        );

        // Añadir la mesa si está disponible OR si es la mesa asignada en la reserva que estamos editando
        if (disponible || (reservaEditando && mesa.id === reservaEditando.idMesaAsignada)) {
            const option = document.createElement('option');
            option.value = mesa.id;
            option.textContent = `${mesa.nombre || mesa.id} (Capacidad: ${mesa.capacidad})`;
            selectMesa.appendChild(option);
        }
    });

    // Si estamos editando, preseleccionar la mesa asignada
    if (reservaEditando && reservaEditando.idMesaAsignada) {
        selectMesa.value = reservaEditando.idMesaAsignada;
    }
}
// ...existing code...
// ...existing code...
function editarReserva(idReserva) {
    const reservas = getReservas();
    // comparar como strings para evitar fallos por tipos
    const reserva = reservas.find(r => String(r.idReserva) === String(idReserva));
    if (reserva) {
        abrirModalReserva(null, reserva);

        // asegurar que el select tenga la opción de la mesa asignada (por si no se añadió aún)
        setTimeout(() => {
            const select = document.getElementById('selectMesaReserva');
            if (select) {
                if (![...select.options].some(o => o.value === reserva.idMesaAsignada)) {
                    cargarMesasDisponiblesEnReserva();
                }
                select.value = reserva.idMesaAsignada || '';
            }
        }, 10);
    }
}
// ...existing code...

     function validarFormularioReserva() {
    const nombre = (document.getElementById('inputNombreReserva') || {}).value || '';
    const numeroPersonas = (document.getElementById('inputPersonasReserva') || {}).value || '';
    const fecha = (document.getElementById('inputFechaReserva') || {}).value || '';
    const horaInicio = (document.getElementById('inputHoraInicioReserva') || {}).value || '';
    const horaFin = (document.getElementById('inputHoraFinReserva') || {}).value || '';
    const mesa = (document.getElementById('selectMesaReserva') || {}).value || '';
    const ocasion = (document.getElementById('selectOcasionReserva') || {}).value || '';

    let valido = true;
    const hideError = id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };
    ['errorNombreReserva','errorPersonasReserva','errorFechaReserva','errorHoraInicioReserva','errorHoraFinReserva','errorMesaReserva','errorOcasionReserva'].forEach(hideError);

    if (!nombre.trim()) {
        const el = document.getElementById('errorNombreReserva'); if (el) { el.textContent = 'El nombre del cliente es obligatorio'; el.classList.remove('hidden'); }
        valido = false;
    }

    if (!numeroPersonas || isNaN(numeroPersonas) || parseInt(numeroPersonas, 10) <= 0) {
        const el = document.getElementById('errorPersonasReserva'); if (el) { el.textContent = 'El número de personas debe ser mayor a 0'; el.classList.remove('hidden'); }
        valido = false;
    }

    if (!fecha) {
        const el = document.getElementById('errorFechaReserva'); if (el) { el.textContent = 'La fecha es obligatoria'; el.classList.remove('hidden'); }
        valido = false;
    } else {
        const hoy = new Date().toISOString().split('T')[0];
        if (fecha < hoy) {
            const el = document.getElementById('errorFechaReserva'); if (el) { el.textContent = 'La fecha debe ser hoy o en el futuro'; el.classList.remove('hidden'); }
            valido = false;
        }
    }

    if (!horaInicio) {
        const el = document.getElementById('errorHoraInicioReserva'); if (el) { el.textContent = 'La hora de inicio es obligatoria'; el.classList.remove('hidden'); }
        valido = false;
    } else if (!validarHoraEnRango(horaInicio)) {
        const el = document.getElementById('errorHoraInicioReserva'); if (el) { el.textContent = 'La hora de inicio no es válida'; el.classList.remove('hidden'); }
        valido = false;
    }

    if (!horaFin) {
        const el = document.getElementById('errorHoraFinReserva'); if (el) { el.textContent = 'La hora de fin es obligatoria'; el.classList.remove('hidden'); }
        valido = false;
    } else if (!validarHoraEnRango(horaFin)) {
        const el = document.getElementById('errorHoraFinReserva'); if (el) { el.textContent = 'La hora de fin no es válida'; el.classList.remove('hidden'); }
        valido = false;
    } else if (horaInicio && horaFin && timeToMinutes(horaFin) <= timeToMinutes(horaInicio)) {
        const el = document.getElementById('errorHoraFinReserva'); if (el) { el.textContent = 'La hora de fin debe ser posterior a la hora de inicio'; el.classList.remove('hidden'); }
        valido = false;
    }

    if (!ocasion) {
        const el = document.getElementById('errorOcasionReserva'); if (el) { el.textContent = 'Debe seleccionar una ocasión'; el.classList.remove('hidden'); }
        valido = false;
    }

    if (!mesa) {
        const el = document.getElementById('errorMesaReserva'); if (el) { el.textContent = 'Debe seleccionar una mesa'; el.classList.remove('hidden'); }
        valido = false;
    }

    // verificar disponibilidad real antes de aceptar (solapamientos y estado deshabilitado)
    if (valido) {
        const disponible = verificarDisponibilidadMesa(
            document.getElementById('selectMesaReserva').value,
            document.getElementById('inputFechaReserva').value,
            document.getElementById('inputHoraInicioReserva').value,
            document.getElementById('inputHoraFinReserva').value,
            reservaEditando ? reservaEditando.idReserva : null
        );
        if (!disponible) {
            mostrarMensaje('La mesa seleccionada no está disponible en el horario indicado', 'error');
            valido = false;
        }
    }

    return valido;
}

   function guardarReserva() {
    if (!validarFormularioReserva()) return;

    const nombreCliente = (document.getElementById('inputNombreReserva') || {}).value.trim();
    const numeroPersonas = parseInt((document.getElementById('inputPersonasReserva') || {}).value, 10);
    const fechaReserva = (document.getElementById('inputFechaReserva') || {}).value;
    const horaInicioReserva = (document.getElementById('inputHoraInicioReserva') || {}).value;
    const horaFinReserva = (document.getElementById('inputHoraFinReserva') || {}).value;
    const ocasionEspecial = (document.getElementById('selectOcasionReserva') || {}).value || 'Ninguna';
    const notasAdicionales = (document.getElementById('textareaNotasReserva') || {}).value.trim();
    const idMesaAsignada = (document.getElementById('selectMesaReserva') || {}).value;
    const estadoSelect = document.getElementById('selectEstadoReserva');
    const estadoSeleccionado = (estadoSelect && !estadoSelect.disabled) ? estadoSelect.value : null;

    const reservas = getReservas();

    if (reservaEditando) {
        const index = reservas.findIndex(r => String(r.idReserva) === String(reservaEditando.idReserva));
        if (index === -1) return mostrarMensaje('Reserva no encontrada', 'error');

        const prevMesaId = reservas[index].idMesaAsignada;
        const estadoPrev = reservas[index].estado || 'Pendiente';

        reservas[index] = {
            ...reservas[index],
            nombreCliente,
            numeroPersonas,
            fechaReserva,
            horaInicioReserva,
            horaFinReserva,
            ocasionEspecial,
            notasAdicionales,
            idMesaAsignada,
            estado: estadoSeleccionado || estadoPrev
        };

        // Si cambió la mesa, ajustar estados de mesas afectadas (misma lógica que ya tienes)
        if (String(prevMesaId) !== String(idMesaAsignada)) {
            const mesas = getMesas();

            const otras = getReservas().some(r => {
                if (String(r.idReserva) === String(reservas[index].idReserva)) return false;
                if (r.idMesaAsignada !== prevMesaId) return false;
                if (r.fechaReserva !== fechaReserva) return false;
                if (['Cancelada','Finalizada','No Show'].includes(r.estado)) return false;
                const ri = timeToMinutes(r.horaInicioReserva), rf = timeToMinutes(r.horaFinReserva);
                if (isNaN(ri) || isNaN(rf)) return false;
                return !(timeToMinutes(horaFinReserva) <= ri || timeToMinutes(horaInicioReserva) >= rf);
            });

            if (!otras && prevMesaId) {
                const prevIdx = mesas.findIndex(m => m.id === prevMesaId);
                if (prevIdx !== -1 && mesas[prevIdx].estado !== 'deshabilitada') mesas[prevIdx].estado = 'disponible';
            }

            if (idMesaAsignada) {
                const nuevoIdx = mesas.findIndex(m => m.id === idMesaAsignada);
                if (nuevoIdx !== -1 && mesas[nuevoIdx].estado !== 'deshabilitada') {
                    const hoyLocal = new Date().toISOString().split('T')[0];
                    if (fechaReserva === hoyLocal) {
                        const ahoraMin = timeToMinutes(`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`);
                        const ri = timeToMinutes(horaInicioReserva), rf = timeToMinutes(horaFinReserva);
                        if (!isNaN(ri) && !isNaN(rf) && ahoraMin >= ri && ahoraMin < rf) {
                            mesas[nuevoIdx].estado = 'ocupada';
                        } else {
                            mesas[nuevoIdx].estado = 'disponible';
                        }
                    } else {
                        mesas[nuevoIdx].estado = 'disponible';
                    }
                }
            }

            saveMesas(mesas);
        }
    } else {
        // nueva reserva: siempre Pendiente
        const idReserva = getNextReservaId();
        const nuevaReserva = {
            idReserva,
            nombreCliente,
            numeroPersonas,
            fechaReserva,
            horaInicioReserva,
            horaFinReserva,
            ocasionEspecial,
            notasAdicionales,
            idMesaAsignada,
            estado: 'Pendiente'
        };
        reservas.push(nuevaReserva);
    }

    if (saveReservas(reservas)) {
        mostrarMensaje(`Reserva ${reservaEditando ? 'actualizada' : 'creada'} correctamente`, 'success');
        cerrarModalReserva();
        actualizarEstadosMesas();
        cargarMesa();
        const seccionReservas = document.getElementById('seccionReservas');
        if (seccionReservas && !seccionReservas.classList.contains('hidden')) cargarReservas();
    } else {
        mostrarMensaje('Error al guardar la reserva', 'error');
    }
}


        // ---------------------------
        // Cargar y gestionar tabla de reservas
        // ---------------------------
      // ...existing code...
// Mapeo de iconos por ocasión (poner archivos en /icons/)
// ...existing code...
// Normalizar ocasiones antiguas (ej. 'Cumpleańos' -> 'Cumpleaños')
function normalizarOcasiones() {
    const reservas = getReservas() || [];
    let mod = false;
    reservas.forEach(r => {
        if (!r || !r.ocasionEspecial) return;
        if (r.ocasionEspecial === 'Cumpleańos') { r.ocasionEspecial = 'Cumpleaños'; mod = true; }
    });
    if (mod) saveReservas(reservas);
    return mod;
}
// ...existing code...
// ...existing code...
// ...existing code...
// ...existing code...
function cargarReservas(filtroFecha = null, filtroEstado = null) {
    const tbody = document.getElementById('tbodyReservas');
    if (!tbody) return;
    tbody.innerHTML = '';

    let reservas = getReservas();
    if (filtroFecha) reservas = reservas.filter(r => r.fechaReserva === filtroFecha);
    if (filtroEstado) reservas = reservas.filter(r => r.estado === filtroEstado);

    if (!reservas || reservas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-4 text-center text-gray-500">No hay reservas</td></tr>`;
        return;
    }

    reservas.forEach(reserva => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 fade-in';
        const fechaFormateada = formatearFecha(reserva.fechaReserva);
        const nombreMesa = obtenerNombreMesa(reserva.idMesaAsignada);
        const horario = `${reserva.horaInicioReserva} - ${reserva.horaFinReserva}`;
        const iconUrl = getIconForOcasion(reserva.ocasionEspecial);

        tr.innerHTML = `
            <td class="px-4 py-3 font-medium">${reserva.idReserva}</td>
            <td class="px-4 py-3">${reserva.nombreCliente}</td>
            <td class="px-4 py-3">${reserva.numeroPersonas}</td>
            <td class="px-4 py-3">${fechaFormateada}</td>
            <td class="px-4 py-3">${horario}</td>
            <td class="px-4 py-3 text-center">
                <img src="${iconUrl}" alt="${reserva.ocasionEspecial || 'Ocasion'}" class="ocasion-img cursor-pointer" data-src="${iconUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb" />
            </td>
            <td class="px-4 py-3">${nombreMesa}</td>
            <td class="px-4 py-3">
                <span class="reserva-estado ${getClaseEstadoReserva(reserva.estado)}">${reserva.estado}</span>
            </td>
            <td class="px-4 py-3">
                <button class="editar-reserva text-blue-600 hover:text-blue-800 mr-2" data-id="${reserva.idReserva}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="pagar-reserva text-green-600 hover:text-green-800 mr-2" data-id="${reserva.idReserva}" title="Pagar"><i class="fas fa-money-bill"></i></button>
                <button class="eliminar-reserva text-red-600 hover:text-red-800" data-id="${reserva.idReserva}" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Delegación de eventos - editar, pagar, eliminar
    tbody.querySelectorAll('.editar-reserva').forEach(btn => btn.addEventListener('click', () => editarReserva(btn.dataset.id)));
    tbody.querySelectorAll('.pagar-reserva').forEach(btn => btn.addEventListener('click', () => mostrarConfirmacion('¿Está seguro de marcar esta reserva como pagada?', () => setReservaEstado(btn.dataset.id, 'Finalizada'))));
    tbody.querySelectorAll('.eliminar-reserva').forEach(btn => btn.addEventListener('click', () => mostrarConfirmacion('¿Está seguro de eliminar esta reserva? Esta acción no se puede deshacer.', () => eliminarReserva(btn.dataset.id))));
    // Abrir imagen ampliada al hacer click (delegación)
    tbody.addEventListener('click', (e) => {
        const img = e.target.closest && e.target.closest('.ocasion-img');
        if (img) {
            abrirImagenModal(img.dataset.src || img.src);
        }
    });
}
// ...existing code...

// Funciones para modal de imagen
function abrirImagenModal(src) {
    const modal = document.getElementById('modalImagen');
    const imgEl = document.getElementById('modalImagenImg');
    if (!modal || !imgEl) return;
    imgEl.src = src || '';
    modal.classList.remove('hidden');
    // cerrar al hacer click fuera del content
    modal.onclick = (e) => { if (e.target === modal) cerrarImagenModal(); };
}

function cerrarImagenModal() {
    const modal = document.getElementById('modalImagen');
    const imgEl = document.getElementById('modalImagenImg');
    if (!modal) return;
    modal.classList.add('hidden');
    if (imgEl) imgEl.src = '';
}

// cerrar con botón y con Escape
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'modalImagenClose') cerrarImagenModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarImagenModal();
});
        function getClaseEstadoReserva(estado) {
            switch (estado) {
                case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
                case 'Confirmada': return 'bg-blue-100 text-blue-800';
                case 'Cancelada': return 'bg-red-100 text-red-800';
                case 'Finalizada': return 'bg-green-100 text-green-800';
                case 'No Show': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        function editarReserva(idReserva) {
            const reservas = getReservas();
            const reserva = reservas.find(r => r.idReserva === idReserva);
            if (reserva) abrirModalReserva(null, reserva);
        }
// ...existing code...
function confirmarReserva(idReserva) {
    if (setReservaEstado(idReserva, 'Confirmada')) mostrarMensaje('Reserva confirmada', 'success');
    else mostrarMensaje('Error al confirmar la reserva', 'error');
}

function cancelarReserva(idReserva) {
    if (setReservaEstado(idReserva, 'Cancelada')) mostrarMensaje('Reserva cancelada', 'success');
    else mostrarMensaje('Error al cancelar la reserva', 'error');
}

function pagarReserva(idReserva) {
    if (setReservaEstado(idReserva, 'Finalizada')) mostrarMensaje('Reserva finalizada', 'success');
    else mostrarMensaje('Error al finalizar la reserva', 'error');
}
        function eliminarReserva(idReserva) {
            const reservas = getReservas();
            const reserva = reservas.find(r => r.idReserva === idReserva);
            const nuevas = reservas.filter(r => r.idReserva !== idReserva);

            if (saveReservas(nuevas)) {
                mostrarMensaje('Reserva eliminada', 'success');
                // Forzar actualización de estados
                actualizarEstadosMesas();
                cargarReservas();
                cargarMesa();
            } else mostrarMensaje('Error al eliminar la reserva', 'error');
        }

// ...existing code...
function normalizarOcasiones() {
    const reservas = getReservas() || [];
    let mod = false;
    reservas.forEach(r => {
        if (!r || !r.ocasionEspecial) return;
        // convierte variantes comunes a la forma correcta
        if (r.ocasionEspecial === 'Cumpleańos' || r.ocasionEspecial === 'Cumpleanos') {
            r.ocasionEspecial = 'Cumpleaños';
            mod = true;
        }
    });
    if (mod) saveReservas(reservas);
    return mod;
}
// ...existing code...
// Llamar normalizarOcasiones() junto a otras inicializaciones:
document.addEventListener('DOMContentLoaded', () => {
    initSampleData && initSampleData();
    normalizarReservas && normalizarReservas();
    normalizarOcasiones && normalizarOcasiones(); // <-- agregado
    iniciarActualizacionEstados && iniciarActualizacionEstados();
    // ...resto del init...
});












        // ---------------------------
        // Eventos globales seguros (comprobar existencia antes)
        // ---------------------------
        document.addEventListener('DOMContentLoaded', () => {
            // Iniciar la actualización automática de estados
            iniciarActualizacionEstados();

            document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
                item.addEventListener('click', function () {
                    const section = this.dataset.section;
                    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                    this.classList.add('active');

                    const seccionReservas = document.getElementById('seccionReservas');
                    const seccionMesas = document.getElementById('seccionMesas');

                    if (section === 'mesas') {
                        if (seccionReservas) seccionReservas.classList.add('hidden');
                        if (seccionMesas) seccionMesas.classList.remove('hidden');
                    } else if (section === 'reservas') {
                        if (seccionMesas) seccionMesas.classList.add('hidden');
                        if (seccionReservas) { seccionReservas.classList.remove('hidden'); cargarReservas(); }
                    }
                });
            });



// ...existing code...
function initSampleData() {
    if (!getMesas() || getMesas().length === 0) {
        const sample = [
            { id: 'mesa1', nombre: 'Mesa 1', capacidad: 2, ubicacion: 'Ventana', estado: 'disponible' },
            { id: 'mesa2', nombre: 'Mesa 2', capacidad: 4, ubicacion: 'Jardín', estado: 'disponible' },
            { id: 'mesa3', nombre: 'Mesa 3', capacidad: 6, ubicacion: 'Interior', estado: 'disponible' }
        ];
        saveMesas(sample);
        // inicializar next ids si no existen
        if (!localStorage.getItem('nextMesaId')) localStorage.setItem('nextMesaId', '4');
        if (!localStorage.getItem('nextReservaId')) localStorage.setItem('nextReservaId', '1');
    }
}
// Llamar en DOMContentLoaded antes de iniciarActualizacionEstados
document.addEventListener('DOMContentLoaded', () => {
    initSampleData();
    // ... el resto ya existente ...
});










            addListenerIfExists('am-guardar', 'click', guardarMesa);
            addListenerIfExists('am-cancelar', 'click', cerrarModalAgregarMesa);
            addListenerIfExists('dm-cerrar', 'click', cerrarModalDetalle);
            addListenerIfExists('btnGuardarReserva', 'click', guardarReserva);
            addListenerIfExists('btnCancelarReserva', 'click', cerrarModalReserva);
            addListenerIfExists('inputFechaReserva', 'change', cargarMesasDisponiblesEnReserva);
            addListenerIfExists('inputHoraInicioReserva', 'change', cargarMesasDisponiblesEnReserva);
            addListenerIfExists('inputHoraFinReserva', 'change', cargarMesasDisponiblesEnReserva);
            addListenerIfExists('btnVerReservas', 'click', () => {
                const seccionMesas = document.getElementById('seccionMesas');
                const seccionReservas = document.getElementById('seccionReservas');
                if (seccionMesas) seccionMesas.classList.add('hidden');
                if (seccionReservas) { seccionReservas.classList.remove('hidden'); cargarReservas(); }
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                const item = document.querySelector('.sidebar-item[data-section="reservas"]');
                if (item) item.classList.add('active');
            });
            addListenerIfExists('btnVolverMesas', 'click', () => {
                const seccionMesas = document.getElementById('seccionMesas');
                const seccionReservas = document.getElementById('seccionReservas');
                if (seccionReservas) seccionReservas.classList.add('hidden');
                if (seccionMesas) seccionMesas.classList.remove('hidden');
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                const item = document.querySelector('.sidebar-item[data-section="mesas"]');
                if (item) item.classList.add('active');
            });
            addListenerIfExists('btnAplicarFiltros', 'click', () => {
                const filtroFecha = (document.getElementById('filtroFecha') || {}).value || '';
                const filtroEstado = (document.getElementById('filtroEstado') || {}).value || '';
                cargarReservas(filtroFecha || null, filtroEstado || null);
            });
            addListenerIfExists('btnAgregarReserva', 'click', () => abrirModalReserva());
            addListenerIfExists('btnConfirmarCancelar', 'click', cerrarModalConfirmacion);
            addListenerIfExists('btnConfirmarAceptar', 'click', () => { if (confirmacionCallback) confirmacionCallback(); cerrarModalConfirmacion(); });

            // Eventos para calcular automáticamente la hora de fin según la ocasión
            const selectOcasion = document.getElementById('selectOcasionReserva');
            const inputHoraInicio = document.getElementById('inputHoraInicioReserva');
            const inputHoraFin = document.getElementById('inputHoraFinReserva');
            const duracionInfo = document.getElementById('duracionEvento');
            const tiempoDuracion = document.getElementById('tiempoDuracion');

            function actualizarHoraFin() {
                const ocasion = selectOcasion.value;
                const horaInicio = inputHoraInicio.value;
                
                if (ocasion && horaInicio) {
                    const duracion = duracionesEvento[ocasion] || 1.5;
                    const horaFin = calcularHoraFin(horaInicio, ocasion);
                    
                    if (tiempoDuracion) tiempoDuracion.textContent = duracion;
                    if (duracionInfo) duracionInfo.classList.remove('hidden');
                    if (inputHoraFin) inputHoraFin.value = horaFin;
                    
                    // Recargar mesas disponibles con el nuevo horario
                    cargarMesasDisponiblesEnReserva();
                } else {
                    if (duracionInfo) duracionInfo.classList.add('hidden');
                    if (inputHoraFin) inputHoraFin.value = '';
                }
            }

            if (selectOcasion) {
                selectOcasion.addEventListener('change', actualizarHoraFin);
            }
            
            if (inputHoraInicio) {
                inputHoraInicio.addEventListener('change', actualizarHoraFin);
            }
        });

        function addListenerIfExists(id, evt, fn) {
            const el = document.getElementById(id);
            if (el) el.addEventListener(evt, fn);
        }
