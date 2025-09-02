  // Variables globales
        let reservaEditando = null;
        let mesaPreseleccionada = null;
        let confirmacionCallback = null;







        
        // Funciones para el manejo de localStorage de mesas
        function getMesas() {
            return JSON.parse(localStorage.getItem("mesas")) || [];
        }


















        function saveMesas(mesas) {
            try {
                const json = JSON.stringify(mesas);
                localStorage.setItem("mesas", json);
                return true;
            } catch (err) {
                console.log("Error guardando mesas", err);
                return false;
            }
        }















        function getNextMesaId() {
            const key = "nextMesaId";
            let next = parseInt(localStorage.getItem(key), 10);
            if (isNaN(next)) {
                next = 1;
            }
            localStorage.setItem(key, String(next + 1));
            return "mesa" + next;
        }



















        // Visualización de mesas
        function cargarMesa() {
            const grid = document.getElementById("mesasGrid");
            grid.innerHTML = "";
            const mesas = getMesas();

            mesas.forEach(mesa => {
                const card = document.createElement("div");
                let bgColor = "";
                if (mesa.estado === "disponible") bgColor = "bg-green-500";
                else if (mesa.estado === "ocupada") bgColor = "bg-blue-500";
                else if (mesa.estado === "deshabilitada") bgColor = "bg-gray-500";

                card.className = `mesa-card cursor-pointer ${bgColor} rounded-lg flex flex-col items-center justify-center p-4 h-28 font-semibold text-white`;
                card.innerHTML = `
                    <div class="text-lg">${mesa.nombre ? mesa.nombre : mesa.id}</div>
                    <div class="text-sm">Capacidad: ${mesa.capacidad}</div>
                `;
                
                card.addEventListener("click", () => mostrarDetalleMesa(mesa));
                grid.appendChild(card);
            });
        }





















        // Detalle de mesa seleccionada
        function mostrarDetalleMesa(mesa) {
            const modal = document.getElementById("detalleMesa");
            document.getElementById("dm-id").textContent = mesa.id;
            document.getElementById("dm-nombre").textContent = mesa.nombre || mesa.id;
            document.getElementById("dm-capacidad").textContent = mesa.capacidad;
            document.getElementById("dm-ubicacion").textContent = mesa.ubicacion;

            const estadoSpan = document.getElementById("dm-estado");
            estadoSpan.className = "inline-block rounded px-2 py-0.5 text-sm";

            if (mesa.estado === "disponible") {
                estadoSpan.textContent = "Disponible";
                estadoSpan.classList.add("bg-green-500", "text-white");
            } else if (mesa.estado === "ocupada") {
                estadoSpan.textContent = "Ocupada";
                estadoSpan.classList.add("bg-blue-500", "text-white");
            } else if (mesa.estado === "deshabilitada") {
                estadoSpan.textContent = "Deshabilitada";
                estadoSpan.classList.add("bg-gray-500", "text-white");
            }

            modal.classList.remove("hidden");
            document.getElementById("dm-editar").onclick = () => {
                cerrarModalDetalle();
                abrirModalEditarMesa(mesa.id);
            };
            document.getElementById("dm-eliminar").onclick = () => {
                mostrarConfirmacion("¿Está seguro de eliminar esta mesa?", () => {
                    eliminarMesa(mesa.id);
                });
            };
            document.getElementById("dm-reservar").onclick = () => {
                cerrarModalDetalle();
                abrirModalReserva(mesa.id);
            };
        }


















        function cerrarModalDetalle() {
            const modal = document.getElementById("detalleMesa");
            modal.classList.add("hidden");
        }






















        // Validación de campos de mesa
        function validarCampoMesa(nombre, capacidad, ubicacion) {
            let valido = true;
            document.getElementById("error-nombre").classList.add("hidden");
            document.getElementById("error-capacidad").classList.add("hidden");
            document.getElementById("error-ubicacion").classList.add("hidden");

            if (nombre === "") {
                document.getElementById("error-nombre").textContent = "El Nombre Es Obligatorio";
                document.getElementById("error-nombre").classList.remove("hidden");
                valido = false;
            }

            if (isNaN(capacidad) || capacidad <= 0) {
                document.getElementById("error-capacidad").textContent = "Capacidad debe ser mayor a 0";
                document.getElementById("error-capacidad").classList.remove("hidden");
                valido = false;
            }

            if (ubicacion === "") {
                document.getElementById("error-ubicacion").textContent = "Debe escribir ubicación";
                document.getElementById("error-ubicacion").classList.remove("hidden");
                valido = false;
            }

            return valido;
        }




















        // Funciones para modal de agregar/editar mesa
        function abrirModalEditarMesa(mesaId) {
            const mesas = getMesas();
            const mesa = mesas.find(m => m.id === mesaId);
            if (!mesa) return;

            document.getElementById("am-nombre").value = mesa.nombre || "";
            document.getElementById("am-capacidad").value = mesa.capacidad || "";
            document.getElementById("am-ubicacion").value = mesa.ubicacion || "";
            document.getElementById("am-estado").value = mesa.estado;

            const botonGuardar = document.getElementById("am-guardar");
            botonGuardar.dataset.editarId = mesa.id;
            document.getElementById("am-titulo").textContent = "Editar Mesa";
            document.getElementById("agregarMesa").classList.remove("hidden");
        }



















        function abrirModalAgregarMesa() {
            document.getElementById("am-nombre").value = "";
            document.getElementById("am-capacidad").value = "";
            document.getElementById("am-ubicacion").value = "";
            document.getElementById("am-estado").value = "disponible";

            const botonGuardar = document.getElementById("am-guardar");
            if (botonGuardar.dataset.editarId) {
                delete botonGuardar.dataset.editarId;
            }

            document.getElementById("am-titulo").textContent = "Agregar Mesa";
            document.getElementById("agregarMesa").classList.remove("hidden");
        }

        function cerrarModalAgregarMesa() {
            document.getElementById("agregarMesa").classList.add("hidden");
        }


























        function guardarMesa() {
            const nombre = document.getElementById("am-nombre").value.trim();
            const capacidad = parseInt(document.getElementById("am-capacidad").value, 10);
            const ubicacion = document.getElementById("am-ubicacion").value;
            const estado = document.getElementById("am-estado").value;

            if (!validarCampoMesa(nombre, capacidad, ubicacion)) return;

            const mesas = getMesas();
            const botonGuardar = document.getElementById("am-guardar");
            const editarId = botonGuardar.dataset.editarId;

            if (editarId) {
                const mesa = mesas.find(m => m.id === editarId);
                if (mesa) {
                    mesa.nombre = nombre;
                    mesa.capacidad = capacidad;
                    mesa.ubicacion = ubicacion;
                    mesa.estado = estado;
                }
            } else {
                const nuevoId = getNextMesaId();
                const nuevaMesa = { id: nuevoId, nombre, capacidad, ubicacion, estado };
                mesas.push(nuevaMesa);
            }

            if (saveMesas(mesas)) {
                mostrarMensaje("Mesa guardada correctamente", "success");
                cerrarModalAgregarMesa();
                cargarMesa();
            } else {
                mostrarMensaje("Error al guardar la mesa", "error");
            }
        }

















        function eliminarMesa(mesaId) {
            const mesas = getMesas();
            const mesasActualizadas = mesas.filter(mesa => mesa.id !== mesaId);
            
            if (saveMesas(mesasActualizadas)) {
                mostrarMensaje("Mesa eliminada correctamente", "success");
                cerrarModalDetalle();
                cargarMesa();
            } else {
                mostrarMensaje("Error al eliminar la mesa", "error");
            }
        }









        // Gestión de reservas
        function getReservas() {
            const reservas = localStorage.getItem("reservas");
            return reservas ? JSON.parse(reservas) : [];
        }














        function saveReservas(reservas) {
            try {
                localStorage.setItem("reservas", JSON.stringify(reservas));
                return true;
            } catch (error) {
                console.log("Error guardando reservas", error);
                return false;
            }
        }
















        function getNextReservaId() {
            const key = "nextReservaId";
            let nextId = parseInt(localStorage.getItem(key)) || 1;
            localStorage.setItem(key, nextId + 1);
            return "reserva" + nextId;
        }
























        function verificarDisponibilidadMesa(mesaId, fecha, hora, excluirReservaId = null) {
            const reservas = getReservas();
            return !reservas.some(reserva => {
                if (excluirReservaId && reserva.idReserva === excluirReservaId) {
                    return false;
                }
                return reserva.idMesaAsignada === mesaId &&
                       reserva.fechaReserva === fecha &&
                       reserva.horaReserva === hora &&
                       reserva.estado !== "Cancelada" && 
                       reserva.estado !== "Finalizada";
            });
        }

























        function formatearFecha(fecha) {
            return new Date(fecha + "T00:00:00").toLocaleDateString('es-ES');
        }





















        function obtenerNombreMesa(mesaId) {
            const mesas = getMesas();
            const mesa = mesas.find(m => m.id === mesaId);
            return mesa ? (mesa.nombre || mesa.id) : "Mesa no encontrada";
        }



















        function mostrarMensaje(mensaje, tipo = "info") {
            const contenedorMensajes = document.getElementById("contenedorMensajes");
            const mensajeElemento = document.createElement("div");
            const bgColor = tipo === "error" ? "bg-red-500" : tipo === "success" ? "bg-green-500" : "bg-blue-500";
            mensajeElemento.className = `${bgColor} text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300`;
            mensajeElemento.textContent = mensaje;

            contenedorMensajes.appendChild(mensajeElemento);

            setTimeout(() => {
                mensajeElemento.style.opacity = "0";
                setTimeout(() => {
                    mensajeElemento.remove();
                }, 300);
            }, 3000);
        }













        function mostrarConfirmacion(mensaje, callback) {
            document.getElementById("confirmacionMensaje").textContent = mensaje;
            document.getElementById("modalConfirmacion").classList.remove("hidden");
            
            confirmacionCallback = callback;
        }













        function cerrarModalConfirmacion() {
            document.getElementById("modalConfirmacion").classList.add("hidden");
            confirmacionCallback = null;
        }














        // Modal de reserva
        function abrirModalReserva(mesaId = null, reserva = null) {
            reservaEditando = reserva;
            mesaPreseleccionada = mesaId;

            document.getElementById("tituloModalReserva").textContent = reserva ? "Editar Reserva" : "Nueva Reserva";

            if (reserva) {
                document.getElementById("inputNombreReserva").value = reserva.nombreCliente;
                document.getElementById("inputPersonasReserva").value = reserva.numeroPersonas;
                document.getElementById("inputFechaReserva").value = reserva.fechaReserva;
                document.getElementById("inputHoraReserva").value = reserva.horaReserva;
                document.getElementById("selectOcasionReserva").value = reserva.ocasionEspecial || "";
                document.getElementById("textareaNotasReserva").value = reserva.notasAdicionales || "";
            } else {
                document.getElementById("inputNombreReserva").value = "";
                document.getElementById("inputPersonasReserva").value = "";
                const hoy = new Date().toISOString().split('T')[0];
                document.getElementById("inputFechaReserva").min = hoy;
                document.getElementById("inputFechaReserva").value = hoy;
                document.getElementById("inputHoraReserva").value = "19:00";
                document.getElementById("selectOcasionReserva").value = "";
                document.getElementById("textareaNotasReserva").value = "";
            }

            cargarMesasDisponiblesEnReserva();
            document.querySelectorAll('[id^="error"]').forEach(el => {
                el.classList.add("hidden");
            });

            document.getElementById("modalReserva").classList.remove("hidden");
        }













        function cerrarModalReserva() {
            document.getElementById("modalReserva").classList.add("hidden");
            reservaEditando = null;
            mesaPreseleccionada = null;
        }
























        function cargarMesasDisponiblesEnReserva() {
            const selectMesa = document.getElementById("selectMesaReserva");
            const mesas = getMesas();
            const fecha = document.getElementById("inputFechaReserva").value;
            const hora = document.getElementById("inputHoraReserva").value;

            while (selectMesa.options.length > 1) {
                selectMesa.remove(1);
            }

            if (mesaPreseleccionada) {
                const mesa = mesas.find(m => m.id === mesaPreseleccionada);
                if (mesa) {
                    const option = document.createElement("option");
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
                if (mesa.estado === "disponible") {
                    const disponible = verificarDisponibilidadMesa(
                        mesa.id,
                        fecha,
                        hora,
                        reservaEditando ? reservaEditando.idReserva : null
                    );

                    if (disponible) {
                        const option = document.createElement("option");
                        option.value = mesa.id;
                        option.textContent = `${mesa.nombre || mesa.id} (Capacidad: ${mesa.capacidad})`;
                        selectMesa.appendChild(option);
                    }
                }
            });
        }

























        function validarFormularioReserva() {
            const nombre = document.getElementById("inputNombreReserva").value.trim();
            const numeroPersonas = document.getElementById("inputPersonasReserva").value;
            const fecha = document.getElementById("inputFechaReserva").value;
            const hora = document.getElementById("inputHoraReserva").value;
            const mesa = document.getElementById("selectMesaReserva").value;

            let valido = true;
            document.getElementById("errorNombreReserva").classList.add("hidden");
            document.getElementById("errorPersonasReserva").classList.add("hidden");
            document.getElementById("errorFechaReserva").classList.add("hidden");
            document.getElementById("errorHoraReserva").classList.add("hidden");
            document.getElementById("errorMesaReserva").classList.add("hidden");

            if (nombre === "") {
                document.getElementById("errorNombreReserva").textContent = "El nombre del cliente es obligatorio";
                document.getElementById("errorNombreReserva").classList.remove("hidden");
                valido = false;
            }

            if (numeroPersonas === "" || isNaN(numeroPersonas) || parseInt(numeroPersonas) <= 0) {
                document.getElementById("errorPersonasReserva").textContent = "El número de personas debe ser mayor a 0";
                document.getElementById("errorPersonasReserva").classList.remove("hidden");
                valido = false;
            }

            if (fecha === "") {
                document.getElementById("errorFechaReserva").textContent = "La fecha es obligatoria";
                document.getElementById("errorFechaReserva").classList.remove("hidden");
                valido = false;
            } else {
                const hoy = new Date().toISOString().split('T')[0];
                if (fecha < hoy) {
                    document.getElementById("errorFechaReserva").textContent = "La fecha debe ser hoy o en el futuro";
                    document.getElementById("errorFechaReserva").classList.remove("hidden");
                    valido = false;
                }
            }

            if (hora === "") {
                document.getElementById("errorHoraReserva").textContent = "La hora es obligatoria";
                document.getElementById("errorHoraReserva").classList.remove("hidden");
                valido = false;
            } else {
                const horaMin = "08:00";
                const horaMax = "20:00";
                if (hora < horaMin || hora > horaMax) {
                    document.getElementById("errorHoraReserva").textContent = "La hora debe estar entre 8:00 AM y 8:00 PM";
                    document.getElementById("errorHoraReserva").classList.remove("hidden");
                    valido = false;
                }
            }

            if (mesa === "") {
                document.getElementById("errorMesaReserva").textContent = "Debe seleccionar una mesa";
                document.getElementById("errorMesaReserva").classList.remove("hidden");
                valido = false;
            }

            return valido;
        }




















        function guardarReserva() {
            if (!validarFormularioReserva()) {
                return;
            }

            const nombreCliente = document.getElementById("inputNombreReserva").value.trim();
            const numeroPersonas = parseInt(document.getElementById("inputPersonasReserva").value, 10);
            const fechaReserva = document.getElementById("inputFechaReserva").value;
            const horaReserva = document.getElementById("inputHoraReserva").value;
            const ocasionEspecial = document.getElementById("selectOcasionReserva").value;
            const notasAdicionales = document.getElementById("textareaNotasReserva").value.trim();
            const idMesaAsignada = document.getElementById("selectMesaReserva").value;

            const reservas = getReservas();

            if (reservaEditando) {
                const index = reservas.findIndex(r => r.idReserva === reservaEditando.idReserva);
                if (index !== -1) {
                    reservas[index] = {
                        ...reservas[index],
                        nombreCliente,
                        numeroPersonas,
                        fechaReserva,
                        horaReserva,
                        ocasionEspecial,
                        notasAdicionales,
                        idMesaAsignada
                    };
                }
            } else {
                const idReserva = getNextReservaId();
                const nuevaReserva = {
                    idReserva,
                    nombreCliente,
                    numeroPersonas,
                    fechaReserva,
                    horaReserva,
                    ocasionEspecial,
                    notasAdicionales,
                    idMesaAsignada,
                    estado: "Pendiente"
                };
                reservas.push(nuevaReserva);

                const mesas = getMesas();
                const mesaIndex = mesas.findIndex(m => m.id === idMesaAsignada);
                if (mesaIndex !== -1) {
                    mesas[mesaIndex].estado = "ocupada";
                    saveMesas(mesas);
                }
            }

            if (saveReservas(reservas)) {
                mostrarMensaje(`Reserva ${reservaEditando ? 'actualizada' : 'creada'} correctamente`, "success");
                cerrarModalReserva();
                cargarMesa();
                if (document.getElementById("seccionReservas").classList.contains("hidden") === false) {
                    cargarReservas();
                }
            } else {
                mostrarMensaje("Error al guardar la reserva", "error");
            }
        }


















        function cargarReservas(filtroFecha = null, filtroEstado = null) {
            const tbody = document.getElementById("tbodyReservas");
            tbody.innerHTML = "";

            let reservas = getReservas();

            if (filtroFecha) {
                reservas = reservas.filter(r => r.fechaReserva === filtroFecha);
            }
            if (filtroEstado) {
                reservas = reservas.filter(r => r.estado === filtroEstado);
            }

            if (reservas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-4 text-center text-gray-500">No hay reservas</td></tr>`;
                return;
            }

            reservas.forEach(reserva => {
                const tr = document.createElement("tr");
                tr.className = "hover:bg-gray-50";
                const fechaFormateada = formatearFecha(reserva.fechaReserva);
                const nombreMesa = obtenerNombreMesa(reserva.idMesaAsignada);

                tr.innerHTML = `
                    <td class="px-4 py-3">${reserva.idReserva}</td>
                    <td class="px-4 py-3">${reserva.nombreCliente}</td>
                    <td class="px-4 py-3">${reserva.numeroPersonas}</td>
                    <td class="px-4 py-3">${fechaFormateada}</td>
                    <td class="px-4 py-3">${reserva.horaReserva}</td>
                    <td class="px-4 py-3">${nombreMesa}</td>
                    <td class="px-4 py-3">${reserva.ocasionEspecial || 'Ninguna'}</td>
                    <td class="px-4 py-3">
                        <span class="reserva-estado ${getClaseEstadoReserva(reserva.estado)}">${reserva.estado}</span>
                    </td>
                    <td class="px-4 py-3">
                        <button class="editar-reserva text-blue-600 hover:text-blue-800 mr-2" data-id="${reserva.idReserva}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="confirmar-reserva text-indigo-600 hover:text-indigo-800 mr-2" data-id="${reserva.idReserva}" title="Confirmar">
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button class="cancelar-reserva text-red-600 hover:text-red-800 mr-2" data-id="${reserva.idReserva}" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="pagar-reserva text-green-600 hover:text-green-800 mr-2" data-id="${reserva.idReserva}" title="Pagar">
                            <i class="fas fa-money-bill"></i>
                        </button>
                        <button class="eliminar-reserva text-red-600 hover:text-red-800" data-id="${reserva.idReserva}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.editar-reserva').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idReserva = btn.dataset.id;
                    editarReserva(idReserva);
                });
            });

            document.querySelectorAll('.confirmar-reserva').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idReserva = btn.dataset.id;
                    mostrarConfirmacion("¿Está seguro de confirmar esta reserva?", () => {
                        confirmarReserva(idReserva);
                    });
                });
            });

            document.querySelectorAll('.cancelar-reserva').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idReserva = btn.dataset.id;
                    mostrarConfirmacion("¿Está seguro de cancelar esta reserva?", () => {
                        cancelarReserva(idReserva);
                    });
                });
            });

            document.querySelectorAll('.pagar-reserva').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idReserva = btn.dataset.id;
                    mostrarConfirmacion("¿Está seguro de marcar esta reserva como pagada?", () => {
                        pagarReserva(idReserva);
                    });
                });
            });

            document.querySelectorAll('.eliminar-reserva').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idReserva = btn.dataset.id;
                    mostrarConfirmacion("¿Está seguro de eliminar esta reserva? Esta acción no se puede deshacer.", () => {
                        eliminarReserva(idReserva);
                    });
                });
            });
        }



















        function getClaseEstadoReserva(estado) {
            switch (estado) {
                case "Pendiente": return "bg-yellow-100 text-yellow-800";
                case "Confirmada": return "bg-blue-100 text-blue-800";
                case "Cancelada": return "bg-red-100 text-red-800";
                case "Finalizada": return "bg-green-100 text-green-800";
                case "No Show": return "bg-gray-100 text-gray-800";
                default: return "bg-gray-100 text-gray-800";
            }
        }























        function editarReserva(idReserva) {
            const reservas = getReservas();
            const reserva = reservas.find(r => r.idReserva === idReserva);
            if (reserva) {
                abrirModalReserva(null, reserva);
            }
        }
















        function confirmarReserva(idReserva) {
            const reservas = getReservas();
            const index = reservas.findIndex(r => r.idReserva === idReserva);
            if (index !== -1) {
                reservas[index].estado = "Confirmada";
                
                if (saveReservas(reservas)) {
                    mostrarMensaje("Reserva confirmada", "success");
                    cargarReservas();
                    cargarMesa();
                } else {
                    mostrarMensaje("Error al confirmar la reserva", "error");
                }
            }
        }




















        function cancelarReserva(idReserva) {
            const reservas = getReservas();
            const index = reservas.findIndex(r => r.idReserva === idReserva);
            if (index !== -1) {
                reservas[index].estado = "Cancelada";
                const mesaId = reservas[index].idMesaAsignada;
                const mesas = getMesas();
                const mesaIndex = mesas.findIndex(m => m.id === mesaId);
                if (mesaIndex !== -1) {
                    mesas[mesaIndex].estado = "disponible";
                    saveMesas(mesas);
                }

                if (saveReservas(reservas)) {
                    mostrarMensaje("Reserva cancelada", "success");
                    cargarReservas();
                    cargarMesa();
                } else {
                    mostrarMensaje("Error al cancelar la reserva", "error");
                }
            }
        }



















        function pagarReserva(idReserva) {
            const reservas = getReservas();
            const index = reservas.findIndex(r => r.idReserva === idReserva);
            if (index !== -1) {
                reservas[index].estado = "Finalizada";
                const mesaId = reservas[index].idMesaAsignada;
                const mesas = getMesas();
                const mesaIndex = mesas.findIndex(m => m.id === mesaId);
                if (mesaIndex !== -1) {
                    mesas[mesaIndex].estado = "disponible";
                    saveMesas(mesas);
                }

                if (saveReservas(reservas)) {
                    mostrarMensaje("Reserva finalizada y mesa liberada", "success");
                    cargarReservas();
                    cargarMesa();
                } else {
                    mostrarMensaje("Error al finalizar la reserva", "error");
                }
            }
        }























        function eliminarReserva(idReserva) {
            const reservas = getReservas();
            const reserva = reservas.find(r => r.idReserva === idReserva);
            const nuevasReservas = reservas.filter(r => r.idReserva !== idReserva);
            
            if (reserva) {
                // Liberar la mesa si la reserva estaba activa
                if (reserva.estado !== "Cancelada" && reserva.estado !== "Finalizada") {
                    const mesas = getMesas();
                    const mesaIndex = mesas.findIndex(m => m.id === reserva.idMesaAsignada);
                    if (mesaIndex !== -1) {
                        mesas[mesaIndex].estado = "disponible";
                        saveMesas(mesas);
                    }
                }
            }

            if (saveReservas(nuevasReservas)) {
                mostrarMensaje("Reserva eliminada", "success");
                cargarReservas();
                cargarMesa();
            } else {
                mostrarMensaje("Error al eliminar la reserva", "error");
            }
        }

























        // Eventos globales
        document.addEventListener("DOMContentLoaded", () => {
            cargarMesa();
        });

        document.getElementById("am-guardar").addEventListener("click", guardarMesa);
        document.getElementById("am-cancelar").addEventListener("click", cerrarModalAgregarMesa);

        const btnCerrarModal = document.getElementById("dm-cerrar");
        if (btnCerrarModal) {
            btnCerrarModal.addEventListener("click", cerrarModalDetalle);
        }

        document.getElementById("btnGuardarReserva").addEventListener("click", guardarReserva);
        document.getElementById("btnCancelarReserva").addEventListener("click", cerrarModalReserva);

        document.getElementById("inputFechaReserva").addEventListener("change", cargarMesasDisponiblesEnReserva);
        document.getElementById("inputHoraReserva").addEventListener("change", cargarMesasDisponiblesEnReserva);

        document.getElementById("btnVerReservas").addEventListener("click", () => {
            document.getElementById("main-title").textContent = "Gestión de Reservas";
            document.getElementById("seccionMesas").classList.add("hidden");
            document.getElementById("seccionReservas").classList.remove("hidden");
            document.getElementById("contenedor-botones").classList.add("hidden");
            cargarReservas();
        });

        document.getElementById("btnVolverMesas").addEventListener("click", () => {
            document.getElementById("main-title").textContent = "Gestión de Mesas";
            document.getElementById("seccionReservas").classList.add("hidden");
            document.getElementById("seccionMesas").classList.remove("hidden");
            document.getElementById("contenedor-botones").classList.remove("hidden");
        });

        document.getElementById("btnAplicarFiltros").addEventListener("click", () => {
            const filtroFecha = document.getElementById("filtroFecha").value;
            const filtroEstado = document.getElementById("filtroEstado").value;
            cargarReservas(filtroFecha || null, filtroEstado || null);
        });

        // Evento para el nuevo botón de agregar reserva
        document.getElementById("btnAgregarReserva").addEventListener("click", () => {
            abrirModalReserva();
        });

        document.getElementById("btnConfirmarCancelar").addEventListener("click", cerrarModalConfirmacion);
        document.getElementById("btnConfirmarAceptar").addEventListener("click", () => {
            if (confirmacionCallback) {
                confirmacionCallback();
            }
            cerrarModalConfirmacion();
        });