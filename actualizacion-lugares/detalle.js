document.addEventListener("DOMContentLoaded", async () => {
  const idLugar = localStorage.getItem("idLugar");

  const res = await axios.get("./lugares.json");
  const lugar = res.data.find(l => l.id == idLugar);

  mostrarDetalle(lugar);
});

function mostrarDetalle(lugar) {
  // Fondo dinámico
  document.body.style.background = `linear-gradient(135deg, ${lugar.categoria.colorPrimario}, ${lugar.categoria.colorSecundario})`;

  const contenedor = document.getElementById("detalle-pagina");

  // Validar arrays o usar valor por defecto
  const datosInteresantesHTML = Array.isArray(lugar.datosInteresantes)
    ? lugar.datosInteresantes.map(d => `<li><strong>${d.titulo}:</strong> ${d.valor}</li>`).join("")
    : "<li>No hay datos interesantes disponibles.</li>";

  const actividadesHTML = Array.isArray(lugar.actividadesRecomendadas)
    ? lugar.actividadesRecomendadas.map(a => `<li>${a}</li>`).join("")
    : "<li>No hay actividades recomendadas.</li>";

  // Estructura HTML
  contenedor.innerHTML = `
    <h2>${lugar.nombre}</h2>
    <img src="${lugar.url_imagen}" alt="${lugar.nombre}">
    <p><strong>Ubicación:</strong> ${lugar.ciudad}, ${lugar.pais}</p>
    <p><strong>Descripción:</strong> ${lugar.descripcion}</p>

    <h3>Ubicación en el mapa:</h3>
    <div class="mapa-container">
      <iframe
        src="https://maps.google.com/maps?q=${lugar.coordenadas.latitud},${lugar.coordenadas.longitud}&z=15&output=embed">
      </iframe>
    </div>

    <h3>Datos Interesantes</h3>
    <ul>${datosInteresantesHTML}</ul>

    <h3>Actividades Recomendadas</h3>
    <ul>${actividadesHTML}</ul>

    <h3>Categoría</h3>
    <p>${lugar.categoria.nombre || lugar.categoria}</p>

    <button id="btn-regresar">Regresar al inicio</button>
  `;

  // Botón regresar
  document.getElementById("btn-regresar").addEventListener("click", () => {
    window.location.href = "detalle.html";
  });
}
