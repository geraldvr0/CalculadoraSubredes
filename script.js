// Función para calcular los tamaños de subred posibles
function calcularHosts(cidr) {
    const [ip, mask] = cidr.split('/');
    const bits = parseInt(mask, 10);

    // Validación básica del CIDR
    if (bits < 0 || bits > 30 || !ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
        return [];
    }

    // Total de direcciones disponibles en la red
    const totalHosts = Math.pow(2, 32 - bits) - 2; // Restamos 2 para red y broadcast

    // Calcular las posibles subredes (2^n - 2 usable hosts)
    const subredes = [];
    let size = 2;
    while (size - 2 <= totalHosts) {
        const usableHosts = size - 2;
        if (usableHosts > 0) {
            subredes.push(`${size} direcciones (${usableHosts} hosts utilizables)`);
        }
        size *= 2; // Incrementar al siguiente tamaño (potencia de 2)
    }

    return subredes;
}

// Función para actualizar las opciones del combobox
function actualizarOpcionesHost() {
    const cidrInput = document.getElementById('redPrincipal');
    const cidr = cidrInput.value;
    const subredes = calcularHosts(cidr);

    // Mostrar mensaje de validación
    const validacionMensaje = document.getElementById('validacionMensaje');
    if (subredes.length > 0) {
        if (!validacionMensaje.textContent.includes('Formato correcto')) {
            validacionMensaje.textContent = ''; // Solo limpia si no es un mensaje válido
        }
    } else {
        validacionMensaje.textContent = 'CIDR no válido o fuera de rango (debe ser /0 a /30)';
    }

    // Actualizar las filas existentes
    const filas = document.querySelectorAll('#tablaRequerimientos tr');
    filas.forEach((fila) => {
        const combobox = fila.querySelector('select');
        if (combobox) {
            // Guardar el valor seleccionado antes de actualizar
            const selectedValue = combobox.value;

            // Actualizar las opciones del combobox
            combobox.innerHTML = subredes
                .map((subred) => `<option value="${subred}">${subred}</option>`)
                .join('');

            // Restaurar el valor seleccionado
            combobox.value = selectedValue;
        }
    });
}

// Función para agregar filas dinámicas
function agregarFila() {
    const tabla = document.getElementById('tablaRequerimientos');
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="p-2">
        <input 
          type="text" 
          placeholder="Marketing" 
          class="w-full border border-gray-300 rounded-lg p-2">
      </td>
      <td class="p-2">
        <select class="w-full border border-gray-300 rounded-lg p-2">
          <option>Seleccione una red principal para ver opciones</option>
        </select>
      </td>
      <td class="p-2 text-center">
        <button 
          onclick="eliminarFila(this)" 
          class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">
          Eliminar
        </button>
      </td>
    `;
    tabla.appendChild(fila);
    actualizarOpcionesHost(); // Actualizar las opciones de host al agregar una nueva fila
}

// Función para eliminar filas dinámicas
function eliminarFila(boton) {
    const fila = boton.closest('tr');
    fila.remove();
}

document.getElementById('redPrincipal').addEventListener('input', function () {
    const input = this.value.trim();
    const mensajeDiv = document.getElementById('validacionMensaje');
    mensajeDiv.textContent = ''; // Limpia mensajes previos
    mensajeDiv.className = 'mt-2 text-sm'; // Reinicia estilos

    if (!input) return; // No validar si el campo está vacío

    const cidrRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d|[12]\d|3[0-2])$/;
    const match = input.match(cidrRegex);

    if (!match) {
        mensajeDiv.textContent = 'Formato requerido 192.168.0.0/24';
        mensajeDiv.classList.add('text-red-500');
        return;
    }

    const [, direccionRed, mascara] = match;
    const octetos = direccionRed.split('.').map(Number);

    // Validar rango de los octetos
    if (octetos.some(octeto => octeto < 0 || octeto > 255)) {
        mensajeDiv.textContent = 'Dirección IP fuera de rango. Cada octeto debe estar entre 0 y 255.';
        mensajeDiv.classList.add('text-red-500');
        return;
    }

    // Calcular la cantidad de hosts disponibles
    const bitsHost = 32 - parseInt(mascara, 10);
    const hostsDisponibles = Math.pow(2, bitsHost) - 2; // Restar dirección de red y broadcast

    mensajeDiv.textContent = `Formato correcto. Hosts disponibles: ${hostsDisponibles}`;
    mensajeDiv.classList.add('text-green-500');
    actualizarOpcionesHost();
});

// Función para calcular subredes
function calcular() {
    const redPrincipal = document.getElementById('redPrincipal').value.trim();
    const tabla = document.getElementById('tablaRequerimientos');
    const filas = tabla.querySelectorAll('tr');

    if (!redPrincipal || filas.length === 0) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    let requerimientos = Array.from(filas).map(fila => {
        const inputs = fila.querySelectorAll('input');
        const combobox = fila.querySelector('select'); // Seleccionar el combobox en la fila
        return {
            nombre: inputs[0].value.trim(),
            hosts: parseInt(combobox.value.trim())
        };
    });

    // Eliminar los objetos donde hosts sea NaN
    requerimientos = requerimientos.filter(item => !isNaN(item.hosts));

    // Verificar que todos tengan un nombre
    const hayFaltantes = requerimientos.some(item => !item.nombre);

    // Si hay un elemento sin nombre, muestra la alerta
    if (hayFaltantes) {
        alert("Hay elementos sin nombre.");
        return;
    }
    // Ordenar los requisitos de mayor a menor según los hosts
    requerimientos.sort((a, b) => b.hosts - a.hosts);

    function calcularHostsDisponibles(cidr) {
        const [direccionRed, mascara] = cidr.split('/');
        const mascaraBits = parseInt(mascara, 10);
        const bitsDisponibles = 32 - mascaraBits;
        const hostsDisponibles = Math.pow(2, bitsDisponibles) - 2;
        return hostsDisponibles;
    }

    const hostsDisponibles = calcularHostsDisponibles(redPrincipal);
    const hostsRequeridos = requerimientos.reduce((total, req) => total + (Math.pow(2, 32 - (32 - (Math.ceil(Math.log2(req.hosts))))) - 2), 0);

    if (hostsRequeridos > hostsDisponibles) {
        alert(`¡Advertencia! El número total de hosts requeridos (${hostsRequeridos}) supera el número de hosts disponibles en la red principal (${hostsDisponibles}).`);
        return;
    }

    function calcularSubredes(cidr, subredes) {
        const [direccionRed, mascara] = cidr.split('/'); 
        const mascaraBits = parseInt(mascara, 10); 
        let direccionRedOctetos = direccionRed.split('.').map(octeto => parseInt(octeto));
    
        // Aquí ajustamos la dirección de red según el prefijo de la máscara
        const octetosRed = mascaraBits / 8;
        const restoBits = mascaraBits % 8;
        
        // Setear a 0 los octetos de la red según el prefijo
        for (let i = octetosRed; i < 4; i++) {
            direccionRedOctetos[i] = 0;
        }
        
        if (restoBits > 0) {
            const mascaraParcial = Math.pow(2, 8 - restoBits) - 1;
            direccionRedOctetos[octetosRed] &= mascaraParcial; // Ajuste en el octeto
        }
    
        let subredesCalculadas = [];
        let redActual = direccionRedOctetos.slice();
    
        subredes.forEach(req => {
            const hostsNecesarios = req.hosts;  // Incluyendo la dirección de red y de broadcast
            const bitsHost = Math.ceil(Math.log2(hostsNecesarios));
            const nuevoPrefijo = 32 - bitsHost;
    
            if (nuevoPrefijo < mascaraBits) {
                alert(`No hay suficiente espacio en la red para la subred ${req.nombre} con ${req.hosts} hosts.`);
                return;
            }
    
            const numeroHostsPorSubred = Math.pow(2, 32 - nuevoPrefijo) - 2;
    
            // Calcular el rango de IPs válidas
            const direccionBroadcast = calcularDireccionBroadcast(redActual, nuevoPrefijo);
    
            const rangoIPs = calcularRangoIPs(redActual.join('.'), direccionBroadcast);
    
            subredesCalculadas.push({
                nombre: req.nombre,
                direccionRed: `${redActual.join('.')}/${nuevoPrefijo}`,
                rangoIP: rangoIPs,
                direccionBroadcast: direccionBroadcast,
                mascaraSubred: calcularMascaraSubred(nuevoPrefijo),
                numeroHosts: numeroHostsPorSubred
            });
    
            // Ajustamos la dirección de la subred actual para que avance correctamente
            redActual[3] += Math.pow(2, 32 - nuevoPrefijo);
            if (redActual[3] >= 256) {
                redActual[2] += Math.floor(redActual[3] / 256);
                redActual[3] %= 256;
            }
    
            // Verificamos si el segundo octeto debe ser ajustado también
            if (redActual[2] >= 256) {
                redActual[1] += Math.floor(redActual[2] / 256);
                redActual[2] %= 256;
            }
    
            // Verificamos si el primer octeto también necesita ser ajustado
            if (redActual[1] >= 256) {
                redActual[0] += Math.floor(redActual[1] / 256);
                redActual[1] %= 256;
            }
    
            // Verificamos si el cuarto octeto debe ser ajustado también
            if (redActual[0] >= 256) {
                redActual[0] %= 256;  // Si el primer octeto también supera 255, se vuelve a ajustar
            }
        });
    
        return subredesCalculadas;
    }
    

    // function calcularSubredes(cidr, subredes) {
    //     const [direccionRed, mascara] = cidr.split('/');
    //     const mascaraBits = parseInt(mascara, 10);
    //     let direccionRedOctetos = direccionRed.split('.').map(octeto => parseInt(octeto));

    //     let subredesCalculadas = [];
    //     let redActual = direccionRedOctetos.slice();

    //     subredes.forEach(req => {
    //         const hostsNecesarios = req.hosts;  // Incluyendo la dirección de red y de broadcast
    //         const bitsHost = Math.ceil(Math.log2(hostsNecesarios));
    //         const nuevoPrefijo = 32 - bitsHost;

    //         if (nuevoPrefijo < mascaraBits) {
    //             alert(`No hay suficiente espacio en la red para la subred ${req.nombre} con ${req.hosts} hosts.`);
    //             return;
    //         }

    //         const numeroHostsPorSubred = Math.pow(2, 32 - nuevoPrefijo) - 2;

    //         // Calcular el rango de IPs válidas
    //         const direccionBroadcast = calcularDireccionBroadcast(redActual, nuevoPrefijo);

    //         const rangoIPs = calcularRangoIPs(redActual.join('.'), direccionBroadcast);

    //         subredesCalculadas.push({
    //             nombre: req.nombre,
    //             direccionRed: `${redActual.join('.')}/${nuevoPrefijo}`,
    //             rangoIP: rangoIPs,
    //             direccionBroadcast: direccionBroadcast,
    //             mascaraSubred: calcularMascaraSubred(nuevoPrefijo),
    //             numeroHosts: numeroHostsPorSubred
    //         });

    //         // Ajustamos la dirección de la subred actual para que avance correctamente
    //         redActual[3] += Math.pow(2, 32 - nuevoPrefijo);
    //         if (redActual[3] >= 256) {
    //             redActual[2] += Math.floor(redActual[3] / 256);
    //             redActual[3] %= 256;
    //         }

    //         // Verificamos si el segundo octeto debe ser ajustado también
    //         if (redActual[2] >= 256) {
    //             redActual[1] += Math.floor(redActual[2] / 256);
    //             redActual[2] %= 256;
    //         }

    //         // Verificamos si el primer octeto también necesita ser ajustado
    //         if (redActual[1] >= 256) {
    //             redActual[0] += Math.floor(redActual[1] / 256);
    //             redActual[1] %= 256;
    //         }

    //         // Verificamos si el cuarto octeto debe ser ajustado también
    //         if (redActual[0] >= 256) {
    //             redActual[0] %= 256;  // Si el primer octeto también supera 255, se vuelve a ajustar
    //         }
    //     });

    //     return subredesCalculadas;
    // }

    // Función para calcular la dirección de broadcast
    function calcularDireccionBroadcast(direccionRed, prefijo) {
        // Convertimos la dirección de red a un número entero de 32 bits
        let direccionRedDecimal = direccionRed[0] * Math.pow(256, 3) + direccionRed[1] * Math.pow(256, 2) + direccionRed[2] * Math.pow(256, 1) + direccionRed[3];

        // Calculamos la máscara de subred en formato decimal según el prefijo
        let mascaraDecimal = Math.pow(2, 32) - Math.pow(2, 32 - prefijo);  // Máscara en formato decimal

        // Invertimos la máscara para obtener la parte de los hosts
        let mascaraInversaDecimal = ~mascaraDecimal & 0xFFFFFFFF;  // Inversión de los bits

        // Calculamos la dirección de broadcast aplicando la operación OR entre la dirección de red y la máscara inversa
        let direccionBroadcastDecimal = direccionRedDecimal | mascaraInversaDecimal;

        // Convertimos la dirección de broadcast a formato de dirección IP
        let direccionBroadcast = [];
        for (let i = 0; i < 4; i++) {
            direccionBroadcast.unshift(direccionBroadcastDecimal >>> (i * 8) & 0xFF);
        }

        return direccionBroadcast.join('.');
    }





    // Función para calcular el rango de IPs válidas
    function calcularRangoIPs(direccionRed, direccionBroadcast) {
        let red = direccionRed.split('.').map(octeto => parseInt(octeto));
        let broadcast = direccionBroadcast.split('.').map(octeto => parseInt(octeto));

        // La primera IP válida es la siguiente de la dirección de red
        red[3] += 1;

        // La última IP válida es la anterior a la dirección de broadcast
        broadcast[3] -= 1;

        return `${red.join('.')} - ${broadcast.join('.')}`;
    }


    // Función para calcular la máscara de subred en formato decimal
    function calcularMascaraSubred(prefijo) {
        const mascaraBits = Math.floor(prefijo / 8);
        const mascaraResto = prefijo % 8;
        let mascaraDecimal = [];

        for (let i = 0; i < 4; i++) {
            if (i < mascaraBits) {
                mascaraDecimal.push(255);
            } else if (i === mascaraBits) {
                mascaraDecimal.push(256 - Math.pow(2, 8 - mascaraResto));
            } else {
                mascaraDecimal.push(0);
            }
        }

        return mascaraDecimal.join('.');
    }

    // Calcular las subredes
    const subredesCalculadas = calcularSubredes(redPrincipal, requerimientos);

    // Mostrar los resultados en la tabla
    let resultadosHtml = '';
    subredesCalculadas.forEach(subred => {
        resultadosHtml += `
        <tr>
          <td class="border p-2">${subred.nombre}</td>
          <td class="border p-2">${subred.direccionRed}</td>
          <td class="border p-2">${subred.rangoIP}</td>
          <td class="border p-2">${subred.direccionBroadcast}</td>
          <td class="border p-2">${subred.mascaraSubred}</td>
          <td class="border p-2">${subred.numeroHosts}</td>
        </tr>
      `;
    });

    document.querySelector('#resultados tbody').innerHTML = resultadosHtml;
}
