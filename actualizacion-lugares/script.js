document.addEventListener("DOMContentLoaded", async () =>{



  const res = await axios.get("lugares.json");
  const lugares = res.data; 

  const contenedor = document.getElementById("contenedor-lugares");


  lugares.forEach(lugar => {
     const tarjeta = document.createElement("div");
     tarjeta.classList.add("tarjetas");

     tarjeta.innerHTML =  ` 
     <h2>${lugar.nombre} </h2>
     <img src="${lugar.url_imagen}" alt="${lugar.nombre}" >
     <p><i class="fas fa-map-marker-alt" style="color:red; margin-right:6px;"></i> ${lugar.ciudad} , ${lugar.pais} </p>
   <button onclick="verDetalle(${lugar.id})">Ver Más</button>

     `;

     contenedor.appendChild(tarjeta);

  });


});


 
function verDetalle(id) {
  localStorage.setItem("idLugar", id);
  window.location.href = "detalle.html";
}
