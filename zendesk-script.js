(function() {
    'use strict';

    const WEB_APP_URL = "https://script.google.com/a/macros/yajuego.co/s/AKfycbzew7WGyHfR89vlykTbq35Fkfth4-o4kHPG0_YvhKuBVu2Hobnq5a6CO5frBOjVMJmG/exec";

    let ultimoIdProcesado = null;
    let ultimaUrl = location.href;
    let procesando = false;
    let temporizadorOcultar = null;
    let intentosSinId = 0;

    // 1. Extrae el ID del cliente (6 a 8 dígitos)
    function obtenerIdCliente() {
        const elCliente = document.querySelector('[data-test-id="user-name"]')
                       || document.querySelector('.header_user_name');

        if (elCliente && elCliente.innerText) {
            const texto = elCliente.innerText.trim();
            if (texto.includes('-')) {
                const partes = texto.split('-');
                const posibleId = partes[partes.length - 1].replace(/\D/g, '');
                if (posibleId.length >= 6 && posibleId.length <= 8) return posibleId;
            }
        }

        const elementosTexto = document.querySelectorAll('h2, header, [data-test-id="ticket-pane-header"], span');
        for (let el of elementosTexto) {
            if (el.innerText && el.innerText.includes('-')) {
                const match = el.innerText.match(/-\s*(\d{6,8})\b/);
                if (match && match[1]) return match[1];
            }
        }

        return null;
    }

    // 2. Oculta el cartel
    function ocultarCartel() {
        const cartel = document.getElementById('alerta-escalado-flotante');
        if (cartel) {
            cartel.style.opacity = '0';
            setTimeout(() => { cartel.style.display = 'none'; }, 300);
        }
    }

    // Función auxiliar para construir el HTML del correo
    function construirHtmlGmail(correo) {
        if (!correo || !correo.existeCorreo) {
            return `
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 11px; opacity: 0.9;">
                    🔎 <b>Gmail:</b> No hay correos asociados a este ID.
                </div>`;
        }

        const btnVerCorreo = correo.link ? `
            <div style="margin-top: 6px;">
                <a href="${correo.link}" target="_blank" style="
                    display: inline-block;
                    padding: 4px 10px;
                    background-color: #ffffff;
                    color: #1565c0;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 11px;
                    border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                ">🔗 Ver correo</a>
            </div>
        ` : '';

        if (correo.estadoCorreo === 'CON_RESPUESTA') {
            return `
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3);">
                    <b>📩 Gmail:</b> <span style="background: #ffffff; color: #2e7d32; padding: 1px 5px; border-radius: 4px; font-weight: bold;">¡TIENE RESPUESTA!</span><br>
                    📌 <b>Asunto:</b> <i>${correo.asunto}</i><br>
                    🕒 <small>Último mensaje: ${correo.fechaUltimoMensaje}</small>
                    ${btnVerCorreo}
                </div>`;
        } else {
            return `
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3);">
                    <b>⏳ Gmail:</b> Correo enviado <i>(Sin respuesta aún)</i><br>
                    📌 <b>Asunto:</b> <i>${correo.asunto}</i>
                    ${btnVerCorreo}
                </div>`;
        }
    }

    // 3. Muestra la alerta UNIFICADA (Sheets + Gmail)
    function mostrarAvisoEmergente(tipo, info = {}) {
        let cartel = document.getElementById('alerta-escalado-flotante');

        if (!cartel) {
            cartel = document.createElement('div');
            cartel.id = 'alerta-escalado-flotante';
            cartel.style.position = 'fixed';
            cartel.style.top = '15px';
            cartel.style.right = '20px';
            cartel.style.zIndex = '999999';
            cartel.style.padding = '14px 35px 14px 20px';
            cartel.style.borderRadius = '8px';
            cartel.style.fontWeight = 'normal';
            cartel.style.fontSize = '13px';
            cartel.style.color = '#ffffff';
            cartel.style.boxShadow = '0px 4px 12px rgba(0,0,0,0.35)';
            cartel.style.transition = 'opacity 0.2s ease';
            cartel.style.maxWidth = '420px';
            cartel.style.lineHeight = '1.4';

            const btnCerrar = document.createElement('span');
            btnCerrar.innerHTML = '&times;';
            btnCerrar.style.position = 'absolute';
            btnCerrar.style.top = '5px';
            btnCerrar.style.right = '10px';
            btnCerrar.style.cursor = 'pointer';
            btnCerrar.style.fontSize = '18px';
            btnCerrar.style.color = '#ffffff';

            btnCerrar.onclick = (e) => {
                e.stopPropagation();
                if (temporizadorOcultar) clearTimeout(temporizadorOcultar);
                ocultarCartel();
            };

            cartel.appendChild(btnCerrar);

            const textoSpan = document.createElement('div');
            textoSpan.id = 'alerta-escalado-texto';
            cartel.appendChild(textoSpan);

            document.body.appendChild(cartel);
        }

        const textoSpan = document.getElementById('alerta-escalado-texto');
        if (temporizadorOcultar) clearTimeout(temporizadorOcultar);

        const tieneCorreo = info.correo && info.correo.existeCorreo;
        const htmlCorreo = construirHtmlGmail(info.correo);

        if (tipo === 'ESCALADO') {
            const estadoNorm = info.estado ? info.estado.toLowerCase() : '';

            if (estadoNorm.includes('respondido')) {
                cartel.style.backgroundColor = '#2e7d32'; // Verde
            } else if (estadoNorm.includes('novedad')) {
                cartel.style.backgroundColor = '#c62828'; // Rojo
            } else if (estadoNorm.includes('pendiente')) {
                cartel.style.backgroundColor = '#f57c00'; // Naranja
            } else {
                cartel.style.backgroundColor = '#1565c0'; // Azul
            }

            const textoFecha = info.fecha ? `[${info.fecha}] ` : '';

            textoSpan.innerHTML = `
                <div>🚨 <b>${textoFecha}ID ${info.id}</b></div>
                <div><b>Motivo:</b> ${info.motivo}</div>
                <div><b>Estado:</b> ${info.estado}</div>
                ${htmlCorreo}
            `;

        } else if (tipo === 'LIMPIO') {
            // SI TIENE CORREO EN GMAIL (Aunque no esté en Sheets)
            if (tieneCorreo) {
                cartel.style.backgroundColor = '#1565c0'; // Azul informativo
                textoSpan.innerHTML = `
                    <div>ℹ️ <b>ID ${info.id} - SIN REGISTRO EN SHEETS</b></div>
                    ${htmlCorreo}
                `;
            } else {
                // SI NO TIENE NI ESCALADO NI CORREO
                cartel.style.backgroundColor = '#2e7d32'; // Verde
                textoSpan.innerHTML = `✅ <b>ID ${info.id} SIN CASOS ESCALADOS</b>`;
            }
        } else if (tipo === 'NO_ENCONTRADO') {
            cartel.style.backgroundColor = '#f57c00';
            textoSpan.innerHTML = `⚠️ <b>ID NO ENCONTRADO - VALIDAR MANUALMENTE</b>`;
        }

        cartel.style.display = 'block';
        cartel.style.opacity = '1';

        temporizadorOcultar = setTimeout(ocultarCartel, 10000);
    }

    // 4. Verificación principal (250ms)
    function ejecutarVerificacion() {
        if (location.href !== ultimaUrl) {
            ultimaUrl = location.href;
            ultimoIdProcesado = null;
            intentosSinId = 0;
        }

        if (procesando) return;

        const clienteId = obtenerIdCliente();

        if (clienteId) {
            intentosSinId = 0;

            if (clienteId !== ultimoIdProcesado) {
                procesando = true;
                ultimoIdProcesado = clienteId;

                GM_xmlhttpRequest({
                    method: "GET",
                    url: `${WEB_APP_URL}?id=${encodeURIComponent(clienteId)}`,
                    onload: function(response) {
                        try {
                            const res = JSON.parse(response.responseText);
                            mostrarAvisoEmergente(res.encontrado ? 'ESCALADO' : 'LIMPIO', res);
                        } catch (e) {
                            console.error("Error al procesar JSON:", e);
                            ultimoIdProcesado = null;
                        } finally {
                            procesando = false;
                        }
                    },
                    onerror: function() {
                        procesando = false;
                        ultimoIdProcesado = null;
                    }
                });
            }
        } else if (window.location.href.includes('/tickets/')) {
            intentosSinId++;
            if (intentosSinId === 20 && ultimoIdProcesado !== 'NO_ENCONTRADO') {
                ultimoIdProcesado = 'NO_ENCONTRADO';
                mostrarAvisoEmergente('NO_ENCONTRADO');
            }
        }
    }

    setInterval(ejecutarVerificacion, 250);
})();
