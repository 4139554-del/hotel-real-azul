document.addEventListener("DOMContentLoaded", () => {
    // 1. GESTIÓN DE SESIÓN DE USUARIO EN EL ENCABEZADO
    const usuarioGuardado = JSON.parse(localStorage.getItem("hra_usuario"));
    const authContainer = document.getElementById("authArea");

    if (authContainer && usuarioGuardado) {
        authContainer.innerHTML = `
            <span style="color:#e0f2fe; font-size:14px; font-weight:600;">
                Hola, ${usuarioGuardado.nombre}
            </span>
            <button type="button" id="cerrarSesionBtn" class="logout-btn">Salir</button>
        `;
        document.getElementById("cerrarSesionBtn").addEventListener("click", () => {
            localStorage.removeItem("hra_usuario");
            window.location.reload();
        });
    }

    // 2. CONFIGURAR FECHAS MÍNIMAS EN BUSCADORES Y RESERVAS
    const hoy = new Date().toISOString().split("T")[0];
    const inputEntrada = document.getElementById("entrada");
    const inputSalida = document.getElementById("salida");

    if (inputEntrada) {
        inputEntrada.min = hoy;
        inputEntrada.addEventListener("change", () => {
            if (inputSalida) {
                inputSalida.min = inputEntrada.value;
                if (inputSalida.value && inputSalida.value <= inputEntrada.value) {
                    inputSalida.value = "";
                }
            }
            actualizarResumenReserva();
        });
    }
    if (inputSalida) {
        inputSalida.min = hoy;
        inputSalida.addEventListener("change", actualizarResumenReserva);
    }

    // 3. FORMULARIO DE INICIO DE SESIÓN Y REGISTRO (login.html)
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const correo = document.getElementById("correo").value.trim();
            const nombreInput = document.getElementById("nombreRegistro");
            const nombre = nombreInput && nombreInput.value.trim()
                ? nombreInput.value.trim()
                : correo.split("@")[0];

            localStorage.setItem("hra_usuario", JSON.stringify({ nombre, correo }));
            window.location.href = "index.html";
        });
    }

    // 4. PRECARGAR DATOS DE URL EN RESERVAS (reservas.html)
    const selectHabitacion = document.getElementById("habitacionSelect");
    const nombreReservaInput = document.getElementById("nombreHuesped");
    const correoReservaInput = document.getElementById("correoHuesped");

    if (selectHabitacion) {
        const params = new URLSearchParams(window.location.search);
        if (params.get("habitacion")) selectHabitacion.value = params.get("habitacion");
        if (params.get("entrada") && inputEntrada) inputEntrada.value = params.get("entrada");
        if (params.get("salida") && inputSalida) inputSalida.value = params.get("salida");

        if (usuarioGuardado) {
            if (nombreReservaInput) nombreReservaInput.value = usuarioGuardado.nombre;
            if (correoReservaInput) correoReservaInput.value = usuarioGuardado.correo;
        }

        selectHabitacion.addEventListener("change", actualizarResumenReserva);
        actualizarResumenReserva();
    }

    function actualizarResumenReserva() {
        const resumenEl = document.getElementById("resumenCalculo");
        if (!resumenEl || !selectHabitacion) return;

        const opcion = selectHabitacion.options[selectHabitacion.selectedIndex];
        const precioNoche = Number(opcion.dataset.precio || 65);
        let noches = 1;

        if (inputEntrada && inputSalida && inputEntrada.value && inputSalida.value) {
            const d1 = new Date(inputEntrada.value);
            const d2 = new Date(inputSalida.value);
            const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
            if (diff > 0) noches = diff;
        }

        const total = precioNoche * noches;
        resumenEl.innerHTML = `
            <strong>${opcion.text}</strong><br>
            Estadía: ${noches} ${noches === 1 ? "noche" : "noches"} &times; $${precioNoche} USD
            <div style="font-size:20px; color:#0b2575; font-weight:700; margin-top:6px;">
                Total estimado: $${total} USD
            </div>
        `;
    }

    // 5. PROCESAR RESERVACIÓN Y ENVIAR A CONFIRMACIÓN
    const reservaForm = document.getElementById("reservaForm");
    if (reservaForm) {
        reservaForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const opcion = selectHabitacion.options[selectHabitacion.selectedIndex];
            const precioNoche = Number(opcion.dataset.precio || 65);
            const entradaVal = inputEntrada.value;
            const salidaVal = inputSalida.value;

            const d1 = new Date(entradaVal);
            const d2 = new Date(salidaVal);
            const noches = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
            const codigo = "RA-2026-" + Math.floor(1000 + Math.random() * 9000);

            const datosReserva = {
                codigo,
                huesped: nombreReservaInput.value.trim(),
                correo: correoReservaInput.value.trim(),
                habitacion: opcion.text,
                entrada: entradaVal,
                salida: salidaVal,
                noches,
                total: precioNoche * noches
            };

            localStorage.setItem("hra_ultima_reserva", JSON.stringify(datosReserva));
            window.location.href = "confirmacion.html";
        });
    }

    // 6. MOSTRAR DATOS REALES EN EL COMPROBANTE (confirmacion.html)
    const voucherCodigo = document.getElementById("voucherCodigo");
    if (voucherCodigo) {
        const reserva = JSON.parse(localStorage.getItem("hra_ultima_reserva"));
        if (reserva) {
            voucherCodigo.textContent = reserva.codigo;
            document.getElementById("voucherHuesped").textContent = reserva.huesped;
            document.getElementById("voucherHabitacion").textContent = reserva.habitacion;
            document.getElementById("voucherFechas").textContent = `${reserva.entrada} al ${reserva.salida} (${reserva.noches} noches)`;
            document.getElementById("voucherTotal").textContent = `$${reserva.total} USD`;
        }
    }

    // 7. FILTRO DE HABITACIONES (habitaciones.html)
    const filterBtns = document.querySelectorAll("[data-filter]");
    const roomCards = document.querySelectorAll("[data-category]");
    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active-filter"));
            btn.classList.add("active-filter");
            const filtro = btn.dataset.filter;

            roomCards.forEach((card) => {
                card.style.display = (filtro === "todas" || card.dataset.category === filtro)
                    ? "flex"
                    : "none";
            });
        });
    });

    // 8. FORMULARIO DE CONTACTO (contacto.html)
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const alerta = document.getElementById("contactAlert");
            if (alerta) {
                alerta.style.display = "block";
                contactForm.reset();
            }
        });
    }
});