
/****************************
 * CONFIGURACIÓN
 ****************************/
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzgqIFhy8Ng3mc8RpnezmM5Yq79x_Y4sj68KFyOjlplrzwTtlzTTrKCAwdGU8_BLP-eYg/exec";
const WHATSAPP_NUMERO = "522731180394";


/****************************
 * SONIDO
 ****************************/
let sonidoActivo = true;
let audioCtx = null;

document.addEventListener("click", () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}, { once: true });

function playSound(freq = 600, duration = 0.08) {
  if (!sonidoActivo || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/****************************
 * PARTIDOS
 ****************************/
const partidosData = [
 
  "Galatasaray vs Juventus",
  "Dortmund vs Atalanta",
  "Mónaco vs PSG",
  "Benfica vs Real Madrid",
  "Olympiacos vs Leverkusen",
  "Bodo/Glimt vs Inter",
  "Club Brujas vs Atl. de Madrid",
  "Levante vs Villarreal",
  "Wolves vs Arsenal",
  "Milan vs Como"
  
];

let seleccionActual = [];
let quinielas = [];

/****************************
 * CARGA INICIAL
 ****************************/
document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("partidos");
  cont.innerHTML = "";

  partidosData.forEach((p, i) => {
    const [l, v] = p.split(" vs ");
    cont.innerHTML += `
      <div class="partido">
        <span>${l}</span>
        <div class="botones">
          <button onclick="sel(${i},'L',this)">L</button>
          <button onclick="sel(${i},'E',this)">E</button>
          <button onclick="sel(${i},'V',this)">V</button>
        </div>
        <span>${v}</span>
      </div>
    `;
  });

  actualizarEstado();
});

/****************************
 * SELECCIÓN
 ****************************/
function sel(i, v, btn) {
  playSound(700);

  if (!seleccionActual[i]) seleccionActual[i] = [];
  const idx = seleccionActual[i].indexOf(v);

  if (idx === -1) {
    let dobles = seleccionActual.filter(p => p && p.length === 2).length;
    let triples = seleccionActual.filter(p => p && p.length === 3).length;
    const nuevo = seleccionActual[i].length + 1;

    if (nuevo === 2 && dobles >= 2) return alert("Máx 2 dobles");
    if (nuevo === 3 && triples >= 2) return alert("Máx 2 triples");

    seleccionActual[i].push(v);
  } else {
    seleccionActual[i].splice(idx, 1);
  }

  btn.parentNode.querySelectorAll("button").forEach(b => b.classList.remove("seleccionado"));
  seleccionActual[i].forEach(s => {
    const pos = s === "L" ? 1 : s === "E" ? 2 : 3;
    btn.parentNode.querySelector(`button:nth-child(${pos})`)?.classList.add("seleccionado");
  });

  actualizarEstado();
}

/****************************
 * COSTOS
 ****************************/
function esSencilla(p) {
  return p.every(x => x.length === 1);
}

function calcularTotal(p) {
  let total = 20;
  p.forEach(x => {
    if (x.length === 2) total += 5;
    if (x.length === 3) total += 10;
  });
  return total;
}

function calcularPromoSencillas(c) {
  let total = 0;
  total += Math.floor(c / 6) * 100;
  c %= 6;
  total += Math.floor(c / 3) * 50;
  c %= 3;
  total += c * 20;
  return total;
}

/****************************
 * AGREGAR QUINIELA
 ****************************/
function agregar() {
  const nombre = document.getElementById("nombre").value.trim();
  const tel = document.getElementById("telefono").value.trim();

  if (!nombre || !/^\d{10}$/.test(tel)) return alert("Datos inválidos");

  if (
    seleccionActual.length !== partidosData.length ||
    seleccionActual.some(p => !p || p.length === 0)
  ) {
    return alert("Completa todos los partidos");
  }

  const folio = Math.random().toString(36).substring(2, 8).toUpperCase();

  quinielas.push({
    folio,
    nombre,
    tel,
    pronosticos: JSON.parse(JSON.stringify(seleccionActual))
  });

  /******** ENVIAR A GOOGLE SHEETS ********/
  const data = {
    fecha: new Date().toLocaleString(),
    folio,
    nombre,
    telefono: tel,
    tipo: esSencilla(seleccionActual) ? "SENCILLA" : "COMBINADA",
    total: esSencilla(seleccionActual) ? "PROMO" : calcularTotal(seleccionActual)
  };

  seleccionActual.forEach((p, i) => {
    data["p" + (i + 1)] = p.join("/");
  });

  fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  mostrarRegistros();
  limpiar();
  actualizarWhatsApp();
}

/****************************
 * TABLA
 ****************************/
function mostrarRegistros() {
  const tbody = document.querySelector("#registros tbody");
  tbody.innerHTML = "";

  let sencillas = 0;
  let total = 0;

  quinielas.forEach((q, i) => {
    let filaTotal = "";

    if (esSencilla(q.pronosticos)) {
      sencillas++;
      filaTotal = "PROMO";
    } else {
      const t = calcularTotal(q.pronosticos);
      total += t;
      filaTotal = `$${t}`;
    }

    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${q.folio}</td>
        <td>${q.nombre}</td>
        <td>${q.tel}</td>
        ${q.pronosticos.map(p => `<td>${p.join("/")}</td>`).join("")}
        <td>${filaTotal}</td>
      </tr>
    `;
  });

  total += calcularPromoSencillas(sencillas);
  document.getElementById("totalP").innerText = total;
}

/****************************
 * ESTADO
 ****************************/
function actualizarEstado() {
  let dobles = seleccionActual.filter(p => p && p.length === 2).length;
  let triples = seleccionActual.filter(p => p && p.length === 3).length;

  document.getElementById("estadoJuego").innerText =
    `Estás jugando: ${dobles} dobles / ${triples} triples`;

  const precio = seleccionActual.length ? calcularTotal(seleccionActual) : 20;
  document.getElementById("precioActual").innerText = `Total: $${precio}`;
}

/****************************
 * BOTONES
 ****************************/
function limpiar() {
  seleccionActual = [];
  document.querySelectorAll("#partidos button").forEach(b => b.classList.remove("seleccionado"));
  actualizarEstado();
}

function aleatorio() {
  limpiar();
  partidosData.forEach((_, i) => {
    const ops = ["L", "E", "V"];
    const r = ops[Math.floor(Math.random() * 3)];
    seleccionActual[i] = [r];
    const btns = document.querySelectorAll(`.partido:nth-child(${i + 1}) .botones button`);
    btns.forEach(b => b.classList.remove("seleccionado"));
    btns[r === "L" ? 0 : r === "E" ? 1 : 2].classList.add("seleccionado");
  });
  actualizarEstado();
}

function reiniciar() {
  quinielas = [];
  limpiar();
  document.querySelector("#registros tbody").innerHTML = "";
  document.getElementById("totalP").innerText = "0";
  actualizarWhatsApp();
}

function toggleSonido() {
  sonidoActivo = !sonidoActivo;
  document.getElementById("toggleSonido").innerText =
    sonidoActivo ? "🔊 Sonido ON" : "🔇 Sonido OFF";
}

/****************************
 * WHATSAPP
 ****************************/
function actualizarWhatsApp() {
  let texto = "🚨 Quinielas GL ⚽🏆 \n\n";
  let sencillas = 0;
  let totalNoSencillas = 0;

  quinielas.forEach((q, i) => {
    const pronos = q.pronosticos
      .map((p, j) => `P${j + 1}:${p.join("/")}`)
      .join(" | ");

    texto += `${i + 1}) ${q.nombre} - ${q.folio}\n`;
    texto += `${pronos}\n`;

    if (esSencilla(q.pronosticos)) {
      sencillas++;
      texto += `Tipo: Sencilla\n\n`;
    } else {
      const t = calcularTotal(q.pronosticos);
      totalNoSencillas += t;
      texto += `Total: $${t}\n\n`;
    }
  });

  const promo = calcularPromoSencillas(sencillas);
  const totalFinal = totalNoSencillas + promo;

  texto += `💵 Quinielas NO sencillas: $${totalNoSencillas}\n`;
  texto += `🎟️ Promo sencillas (${sencillas}): $${promo}\n`;
  texto += `💰 TOTAL A PAGAR: $${totalFinal} MXN`;

  const wa = document.querySelector(".whatsapp");
  wa.href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
  wa.target = "_blank";
}
