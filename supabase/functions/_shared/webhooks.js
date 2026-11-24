// ARCHIVO GENERADO por `npm run build:funciones` desde src/core. No editar a mano.

// src/core/config.js
var ConfigApp = class _ConfigApp {
  static #instancia = null;
  constructor() {
    if (_ConfigApp.#instancia) {
      throw new Error("ConfigApp es Singleton: usa ConfigApp.obtener()");
    }
    this.moneda = "MXN";
    this.diasHabilesMinimosArranque = 5;
    this.diasPrimeraVersion = 15;
    this.mesesPrograma = 4;
    this.arranquesPorDia = 2;
    this.pasarelaPorDefecto = "stripe";
    Object.freeze(this);
  }
  static obtener() {
    if (!_ConfigApp.#instancia) _ConfigApp.#instancia = new _ConfigApp();
    return _ConfigApp.#instancia;
  }
};

// src/core/eventos.js
var BusEventos = class {
  #suscriptores = /* @__PURE__ */ new Map();
  suscribir(evento, fn) {
    if (!this.#suscriptores.has(evento)) this.#suscriptores.set(evento, /* @__PURE__ */ new Set());
    this.#suscriptores.get(evento).add(fn);
    return () => this.#suscriptores.get(evento)?.delete(fn);
  }
  publicar(evento, datos) {
    const interesados = [...this.#suscriptores.get(evento) ?? [], ...this.#suscriptores.get("*") ?? []];
    interesados.forEach((fn) => fn(datos, evento));
  }
};
var EVENTOS = Object.freeze({
  COTIZADA: "orden.cotizada",
  PAGADA: "orden.pagada",
  AGENDADA: "orden.agendada",
  CANCELADA: "orden.cancelada",
  REEMBOLSADA: "orden.reembolsada",
  REEMBOLSO_SOLICITADO: "orden.reembolso_solicitado",
  PAGO_RECHAZADO: "pago.rechazado",
  LLAMADA_AGENDADA: "llamada.agendada"
});

// src/core/repositorioSupabase.js
var SELECCION_ORDEN = "*, partidas(*), pagos(*)";
var num = (v) => v == null ? v : Number(v);
function aOrden(fila) {
  const pago = fila.pagos?.[0];
  return {
    id: fila.id,
    estado: fila.estado,
    historial: fila.historial ?? [],
    cliente: fila.cliente,
    partidas: (fila.partidas ?? []).slice().sort((a, b) => a.id - b.id).map((p) => ({
      id: p.programa_id,
      nombre: p.nombre,
      tipo: p.tipo,
      precio: num(p.precio),
      cobroHoy: num(p.cobro_hoy),
      totalContrato: num(p.total_contrato)
    })),
    totalHoy: num(fila.total_hoy),
    totalContrato: num(fila.total_contrato),
    moneda: fila.moneda,
    requiereAgenda: fila.requiere_agenda,
    pago: pago ? { pasarela: pago.pasarela, idTransaccion: pago.id_transaccion, monto: num(pago.monto) } : null,
    fechaArranque: fila.fecha_arranque,
    fechaEntrega: fila.fecha_entrega,
    fechaFin: fila.fecha_fin,
    fechaAjustada: fila.fecha_ajustada,
    fechaPreferida: fila.fecha_preferida ?? null,
    reembolso: fila.reembolso,
    fechaOrden: fila.fecha_orden
  };
}
function aFilaEditable(orden) {
  return {
    cliente: orden.cliente,
    estado: orden.estado,
    historial: orden.historial ?? [],
    total_hoy: orden.totalHoy,
    total_contrato: orden.totalContrato,
    requiere_agenda: Boolean(orden.requiereAgenda),
    fecha_arranque: orden.fechaArranque ?? null,
    fecha_entrega: orden.fechaEntrega ?? null,
    fecha_fin: orden.fechaFin ?? null,
    fecha_ajustada: Boolean(orden.fechaAjustada),
    fecha_preferida: orden.fechaPreferida ?? null,
    reembolso: orden.reembolso ?? null
  };
}
var aFilasPartidas = (ordenId, partidas = []) => partidas.map((p) => ({
  orden_id: ordenId,
  programa_id: p.id,
  nombre: p.nombre,
  tipo: p.tipo,
  precio: p.precio,
  cobro_hoy: p.cobroHoy,
  total_contrato: p.totalContrato
}));
function errorDeBase(error, mensaje) {
  const e = new Error(mensaje);
  e.causa = error;
  e.codigo = error?.code;
  return e;
}
var RepositorioPedidosSupabase = class {
  constructor(cliente) {
    this.cliente = cliente;
  }
  async listar() {
    const { data, error } = await this.cliente.from("ordenes").select(SELECCION_ORDEN).order("fecha_orden", { ascending: false });
    if (error) throw errorDeBase(error, "No se pudieron cargar los pedidos");
    return data.map(aOrden);
  }
  async obtener(id) {
    if (!id) return null;
    const { data, error } = await this.cliente.from("ordenes").select(SELECCION_ORDEN).eq("id", id).maybeSingle();
    if (error) throw errorDeBase(error, "No se pudo cargar el pedido");
    return data ? aOrden(data) : null;
  }
  async guardar(orden) {
    const id = orden.id ? await this.#actualizar(orden) : await this.#crear(orden);
    if (orden.pago) await this.#registrarPago(id, orden.pago);
    return { ...orden, id };
  }
  async borrar() {
    throw new Error("Las \xF3rdenes no se borran: se cancelan");
  }
  // Número de orden a partir del pago (el aviso de reembolso de Stripe solo trae el pago).
  async ordenPorTransaccion(pasarela, idTransaccion) {
    const { data, error } = await this.cliente.from("pagos").select("orden_id").eq("pasarela", pasarela).eq("id_transaccion", idTransaccion).maybeSingle();
    if (error) throw errorDeBase(error, "No se pudo buscar el pago");
    return data?.orden_id ?? null;
  }
  // Cupo de arranques por día de TODOS los clientes, sin datos personales
  // (función arranques_por_dia de la migración 002). Devuelve { 'YYYY-MM-DD': n }.
  async arranquesPorDia(desde) {
    const { data, error } = await this.cliente.rpc("arranques_por_dia", { desde });
    if (error) throw errorDeBase(error, "No se pudo consultar la disponibilidad");
    return Object.fromEntries(data.map((r) => [r.fecha, r.arranques]));
  }
  async #crear(orden) {
    const { data: sesion } = await this.cliente.auth.getSession();
    const uid = sesion.session?.user?.id;
    if (!uid) throw new Error("Necesitas iniciar sesi\xF3n para comprar");
    const fila = { ...aFilaEditable(orden), cliente_id: uid, moneda: orden.moneda ?? "MXN" };
    if (orden.fechaOrden) fila.fecha_orden = orden.fechaOrden;
    const { data, error } = await this.cliente.from("ordenes").insert(fila).select("id").single();
    if (error) throw errorDeBase(error, "No se pudo crear el pedido");
    await this.#reemplazarPartidas(data.id, orden.partidas);
    return data.id;
  }
  async #actualizar(orden) {
    if (orden.estado === "cotizada" && orden.partidas) await this.#reemplazarPartidas(orden.id, orden.partidas);
    const { error } = await this.cliente.from("ordenes").update(aFilaEditable(orden)).eq("id", orden.id);
    if (error) throw errorDeBase(error, "No se pudo actualizar el pedido");
    return orden.id;
  }
  async #reemplazarPartidas(ordenId, partidas) {
    const borrado = await this.cliente.from("partidas").delete().eq("orden_id", ordenId);
    if (borrado.error) throw errorDeBase(borrado.error, "No se pudieron guardar los programas del pedido");
    const filas = aFilasPartidas(ordenId, partidas);
    if (filas.length === 0) return;
    const { error } = await this.cliente.from("partidas").insert(filas);
    if (error) throw errorDeBase(error, "No se pudieron guardar los programas del pedido");
  }
  async #registrarPago(ordenId, pago) {
    const { error } = await this.cliente.from("pagos").upsert(
      { orden_id: ordenId, pasarela: pago.pasarela, id_transaccion: pago.idTransaccion, monto: pago.monto },
      { onConflict: "pasarela,id_transaccion", ignoreDuplicates: true }
    );
    if (error) throw errorDeBase(error, "No se pudo registrar el pago");
  }
};

// src/core/fechas.js
var aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var deISO = (iso) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
};
var esHabil = (d) => d.getDay() !== 0 && d.getDay() !== 6;
function sumarDias(fecha, dias) {
  const r = new Date(fecha);
  r.setDate(r.getDate() + dias);
  return r;
}
function sumarDiasHabiles(fecha, dias) {
  let r = new Date(fecha);
  let contados = 0;
  while (contados < dias) {
    r = sumarDias(r, 1);
    if (esHabil(r)) contados++;
  }
  return r;
}
function sumarMeses(fecha, meses) {
  const r = new Date(fecha);
  r.setMonth(r.getMonth() + meses);
  return r;
}

// src/core/entrega.js
function entregaInmediata(hoy) {
  return { tipo: "digital", fechaEntrega: aISO(hoy), descripcion: "Acceso inmediato al confirmar el pago" };
}
function entregaServicio(hoy, config, ocupacion = {}) {
  const minimo = sumarDiasHabiles(hoy, config.diasHabilesMinimosArranque);
  const arranque = primerDiaDisponible(minimo, config, ocupacion);
  return { tipo: "servicio", ...calendarioServicio(arranque, config) };
}
function calendarioServicio(arranque, config) {
  return {
    fechaArranque: aISO(arranque),
    fechaEntrega: aISO(sumarDias(arranque, config.diasPrimeraVersion)),
    // primera versión operando
    fechaFin: aISO(sumarMeses(arranque, config.mesesPrograma)),
    descripcion: `Primera versi\xF3n operando ${config.diasPrimeraVersion} d\xEDas despu\xE9s del arranque`
  };
}
var hayDisponibilidad = (fecha, config, ocupacion = {}) => esHabil(fecha) && (ocupacion[aISO(fecha)] ?? 0) < config.arranquesPorDia;
function primerDiaDisponible(desde, config, ocupacion = {}) {
  let d = new Date(desde);
  while (!hayDisponibilidad(d, config, ocupacion)) d = sumarDias(d, 1);
  return d;
}
function resolverFechaCliente(fechaISO, hoy, config, ocupacion = {}) {
  const minimo = deISO(aISO(sumarDiasHabiles(hoy, config.diasHabilesMinimosArranque)));
  const pedida = deISO(fechaISO);
  if (pedida >= minimo && hayDisponibilidad(pedida, config, ocupacion)) {
    return { confirmada: true, fecha: fechaISO, motivo: null, codigo: null };
  }
  const base = pedida < minimo ? minimo : pedida;
  const sugerida = aISO(primerDiaDisponible(base, config, ocupacion));
  const codigo = pedida < minimo ? "anticipacion" : !esHabil(pedida) ? "finDeSemana" : "sinLugar";
  const motivo = {
    anticipacion: `Se necesitan al menos ${config.diasHabilesMinimosArranque} d\xEDas h\xE1biles de anticipaci\xF3n`,
    finDeSemana: "Los arranques son de lunes a viernes",
    sinLugar: "Ese d\xEDa ya no tiene lugares"
  }[codigo];
  return { confirmada: false, fecha: sugerida, motivo, codigo };
}
var ESTRATEGIAS_COBRO = {
  unico: (precio) => ({ hoy: precio, totalContrato: precio, detalle: "Pago \xFAnico" }),
  dos_pagos: (precio) => ({ hoy: precio / 2, totalContrato: precio, detalle: "2 pagos: 50% hoy y 50% al mes 2" }),
  mensual: (precio, config) => ({
    hoy: precio,
    totalContrato: precio * config.mesesPrograma,
    detalle: `${config.mesesPrograma} mensualidades; hoy se cobra la primera`
  })
};

// src/core/estadoOrden.js
var ESTADOS = Object.freeze({
  COTIZADA: "cotizada",
  PAGADA: "pagada",
  AGENDADA: "agendada",
  EN_CURSO: "en_curso",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  REEMBOLSADA: "reembolsada"
});
var E = ESTADOS;
var TRANSICIONES = {
  [E.COTIZADA]: { pagar: E.PAGADA, cancelar: E.CANCELADA },
  [E.PAGADA]: { agendar: E.AGENDADA, completar: E.COMPLETADA, cancelar: E.CANCELADA, reembolsar: E.REEMBOLSADA },
  [E.AGENDADA]: { iniciar: E.EN_CURSO, cancelar: E.CANCELADA, reembolsar: E.REEMBOLSADA },
  [E.EN_CURSO]: { completar: E.COMPLETADA, reembolsar: E.REEMBOLSADA },
  [E.COMPLETADA]: { reembolsar: E.REEMBOLSADA },
  [E.CANCELADA]: { reembolsar: E.REEMBOLSADA },
  [E.REEMBOLSADA]: {}
};
var ETIQUETAS = {
  [E.COTIZADA]: "Cotizada",
  [E.PAGADA]: "Pagada",
  [E.AGENDADA]: "Agendada",
  [E.EN_CURSO]: "En curso",
  [E.COMPLETADA]: "Completada",
  [E.CANCELADA]: "Cancelada",
  [E.REEMBOLSADA]: "Reembolsada"
};
var puede = (orden, evento) => Boolean(TRANSICIONES[orden.estado]?.[evento]);
function transicionar(orden, evento, ahora = /* @__PURE__ */ new Date()) {
  const siguiente = TRANSICIONES[orden.estado]?.[evento];
  if (!siguiente) {
    throw new Error(`Transici\xF3n inv\xE1lida: no se puede "${evento}" una orden ${ETIQUETAS[orden.estado] ?? orden.estado}`);
  }
  return {
    ...orden,
    estado: siguiente,
    historial: [...orden.historial ?? [], { estado: siguiente, evento, fecha: ahora.toISOString() }]
  };
}

// src/core/pagos/checkoutStripe.js
var API_STRIPE = "https://api.stripe.com/v1";
var aCentavos = (pesos) => Math.round(Number(pesos) * 100);
function parametrosSesion(orden, origen) {
  const p = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": String(orden.moneda ?? "MXN").toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(aCentavos(orden.totalHoy)),
    "line_items[0][price_data][product_data][name]": `Socius \xB7 Orden ${orden.id}`,
    "line_items[0][price_data][product_data][description]": (orden.partidas ?? []).map((x) => x.nombre).join(", ").slice(0, 500) || "Programas Socius",
    client_reference_id: orden.id,
    "metadata[orden_id]": orden.id,
    "payment_intent_data[metadata][orden_id]": orden.id,
    success_url: `${origen}/confirmacion?orden=${encodeURIComponent(orden.id)}`,
    cancel_url: `${origen}/checkout?cancelado=${encodeURIComponent(orden.id)}`,
    locale: "es-419"
  });
  if (orden.cliente?.email) p.set("customer_email", orden.cliente.email);
  return p;
}
async function crearSesionCheckout({ orden, origen, llaveSecreta, fetch = globalThis.fetch }) {
  const cuerpo = parametrosSesion(orden, origen);
  const r = await fetch(`${API_STRIPE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llaveSecreta}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Idempotencia (Tema 3): si el navegador repite la petición, Stripe devuelve la
      // misma sesión en lugar de crear otra. Cambia si cambia el monto o el sitio.
      "Idempotency-Key": `checkout-${orden.id}-${aCentavos(orden.totalHoy)}-${origen}`
    },
    body: cuerpo.toString()
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.url) {
    const error = new Error(datos?.error?.message ?? "stripe_sin_respuesta");
    error.status = 502;
    throw error;
  }
  return { id: datos.id, url: datos.url };
}

// src/core/pagos/checkoutMercadoPago.js
var API_MERCADOPAGO = "https://api.mercadopago.com";
function parametrosPreferencia(orden, origen, urlAvisos) {
  const volver = `${origen}/confirmacion?orden=${encodeURIComponent(orden.id)}`;
  const p = {
    items: [
      {
        id: orden.id,
        title: `Socius \xB7 Orden ${orden.id}`,
        description: (orden.partidas ?? []).map((x) => x.nombre).join(", ").slice(0, 250) || "Programas Socius",
        quantity: 1,
        currency_id: String(orden.moneda ?? "MXN").toUpperCase(),
        unit_price: Number(orden.totalHoy)
      }
    ],
    external_reference: orden.id,
    metadata: { orden_id: orden.id },
    back_urls: {
      success: volver,
      pending: volver,
      // p. ej. pago en OXXO: la confirmación espera al aviso
      failure: `${origen}/checkout?cancelado=${encodeURIComponent(orden.id)}`
    },
    statement_descriptor: "SOCIUS"
  };
  if (origen.startsWith("https://")) p.auto_return = "approved";
  if (urlAvisos) p.notification_url = `${urlAvisos}?source_news=webhooks`;
  return p;
}
async function crearPreferencia({ orden, origen, llaveSecreta, urlAvisos, fetch = globalThis.fetch }) {
  const r = await fetch(`${API_MERCADOPAGO}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llaveSecreta}`,
      "Content-Type": "application/json",
      // Idempotencia: si el navegador repite la petición, no se crea otra preferencia.
      "X-Idempotency-Key": `preferencia-${orden.id}-${Math.round(Number(orden.totalHoy) * 100)}-${origen}`
    },
    body: JSON.stringify(parametrosPreferencia(orden, origen, urlAvisos))
  });
  const datos = await r.json().catch(() => ({}));
  const url = llaveSecreta?.startsWith("TEST-") ? datos.sandbox_init_point ?? datos.init_point : datos.init_point ?? datos.sandbox_init_point;
  if (!r.ok || !url) {
    const error = new Error(datos?.message ?? "mercadopago_sin_respuesta");
    error.status = 502;
    throw error;
  }
  return { id: datos.id, url };
}
var ESTADOS_MP = { approved: "aprobado", rejected: "rechazado", refunded: "reembolsado", cancelled: "rechazado" };
async function consultarPagoMercadoPago(idPago, { llaveSecreta, fetch = globalThis.fetch }) {
  if (!llaveSecreta) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN para consultar el pago");
  const r = await fetch(`${API_MERCADOPAGO}/v1/payments/${encodeURIComponent(idPago)}`, {
    headers: { Authorization: `Bearer ${llaveSecreta}` }
  });
  const p = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago no encontr\xF3 el pago ${idPago}: ${p?.message ?? r.status}`);
  const estado = ESTADOS_MP[p.status] ?? "pendiente";
  return {
    estado,
    referencia: p.external_reference ?? p.metadata?.orden_id ?? null,
    idTransaccion: String(p.id ?? idPago),
    // En un reembolso cuenta lo devuelto; en un pago, lo cobrado.
    monto: estado === "reembolsado" ? Number(p.transaction_amount_refunded ?? p.transaction_amount) : Number(p.transaction_amount),
    idReembolso: p.refunds?.[0]?.id != null ? String(p.refunds[0].id) : null
  };
}

// src/core/pagos/checkoutPayPal.js
var API_PAYPAL = "https://api-m.sandbox.paypal.com";
var tokens = /* @__PURE__ */ new Map();
async function tokenPayPal({ clientId, secreto }, { fetch = globalThis.fetch, ahora = Date.now() } = {}) {
  if (!clientId || !secreto) throw new Error("Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET");
  const guardado = tokens.get(clientId);
  if (guardado && guardado.vence > ahora) return guardado.token;
  const r = await fetch(`${API_PAYPAL}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${clientId}:${secreto}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.access_token) {
    const error = new Error(`PayPal no acept\xF3 las credenciales: ${datos?.error_description ?? r.status}`);
    error.status = 502;
    throw error;
  }
  tokens.set(clientId, { token: datos.access_token, vence: ahora + (Number(datos.expires_in ?? 0) - 60) * 1e3 });
  return datos.access_token;
}
function parametrosOrden(orden, origen) {
  const moneda = String(orden.moneda ?? "MXN").toUpperCase();
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: orden.id,
        custom_id: orden.id,
        description: `Socius \xB7 Orden ${orden.id}: ${(orden.partidas ?? []).map((x) => x.nombre).join(", ") || "Programas Socius"}`.slice(0, 127),
        amount: { currency_code: moneda, value: Number(orden.totalHoy).toFixed(2) }
      }
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "Socius",
          locale: "es-MX",
          shipping_preference: "NO_SHIPPING",
          // no se envía nada físico
          user_action: "PAY_NOW",
          // el botón de PayPal dice "Pagar ahora"
          return_url: `${origen}/confirmacion?orden=${encodeURIComponent(orden.id)}`,
          cancel_url: `${origen}/checkout?cancelado=${encodeURIComponent(orden.id)}`
        }
      }
    }
  };
}
async function crearOrdenPayPal({ orden, origen, llaveSecreta, fetch = globalThis.fetch }) {
  const token = await tokenPayPal(llaveSecreta, { fetch });
  const r = await fetch(`${API_PAYPAL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Idempotencia: si el navegador repite la petición, PayPal devuelve la misma orden.
      "PayPal-Request-Id": `orden-${orden.id}-${Math.round(Number(orden.totalHoy) * 100)}-${origen}`.slice(0, 108)
    },
    body: JSON.stringify(parametrosOrden(orden, origen))
  });
  const datos = await r.json().catch(() => ({}));
  const url = datos.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!r.ok || !url) {
    const error = new Error(datos?.details?.[0]?.description ?? datos?.message ?? "paypal_sin_respuesta");
    error.status = 502;
    throw error;
  }
  return { id: datos.id, url };
}
var ESTADOS_CAPTURA = { COMPLETED: "aprobado", DECLINED: "rechazado", FAILED: "rechazado", REFUNDED: "reembolsado" };
function leerCaptura(datos, idOrden) {
  const unidad = datos.purchase_units?.[0] ?? {};
  const captura = unidad.payments?.captures?.[0];
  return {
    estado: ESTADOS_CAPTURA[captura?.status] ?? "pendiente",
    referencia: captura?.custom_id ?? unidad.custom_id ?? unidad.reference_id ?? null,
    idTransaccion: captura?.id ?? idOrden,
    // el id de la captura es el que se usa para reembolsar
    monto: captura?.amount?.value != null ? Number(captura.amount.value) : null
  };
}
async function capturarOrdenPayPal(idOrden, { credenciales, fetch = globalThis.fetch }) {
  const token = await tokenPayPal(credenciales, { fetch });
  const encabezados = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const r = await fetch(`${API_PAYPAL}/v2/checkout/orders/${encodeURIComponent(idOrden)}/capture`, {
    method: "POST",
    headers: { ...encabezados, "PayPal-Request-Id": `captura-${idOrden}` }
  });
  let datos = await r.json().catch(() => ({}));
  if (!r.ok && datos?.details?.some((d) => d.issue === "ORDER_ALREADY_CAPTURED")) {
    const consulta = await fetch(`${API_PAYPAL}/v2/checkout/orders/${encodeURIComponent(idOrden)}`, { headers: encabezados });
    datos = await consulta.json().catch(() => ({}));
    if (!consulta.ok) throw new Error(`PayPal no encontr\xF3 la orden ${idOrden}: ${consulta.status}`);
  } else if (!r.ok) {
    throw new Error(`PayPal no pudo capturar la orden ${idOrden}: ${datos?.details?.[0]?.issue ?? datos?.message ?? r.status}`);
  }
  return leerCaptura(datos, idOrden);
}
async function verificarAvisoPayPal(cuerpo, encabezados, { clientId, secreto, webhookId }, { fetch = globalThis.fetch } = {}) {
  const campos = {
    auth_algo: encabezados["paypal-auth-algo"],
    cert_url: encabezados["paypal-cert-url"],
    transmission_id: encabezados["paypal-transmission-id"],
    transmission_sig: encabezados["paypal-transmission-sig"],
    transmission_time: encabezados["paypal-transmission-time"]
  };
  if (Object.values(campos).some((v) => !v)) return { ok: false, motivo: "sin_firma" };
  if (!webhookId) return { ok: false, motivo: "sin_webhook_id" };
  let evento;
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return { ok: false, motivo: "json_invalido" };
  }
  const token = await tokenPayPal({ clientId, secreto }, { fetch });
  const r = await fetch(`${API_PAYPAL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...campos, webhook_id: webhookId, webhook_event: evento })
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, motivo: "verificacion_no_disponible" };
  return datos.verification_status === "SUCCESS" ? { ok: true } : { ok: false, motivo: "firma_invalida" };
}

// src/core/pagos/paginasDePago.js
var CREADORES = {
  stripe: crearSesionCheckout,
  mercadopago: crearPreferencia,
  paypal: crearOrdenPayPal
};
var ErrorPago = class extends Error {
  constructor(motivo, status) {
    super(motivo);
    this.motivo = motivo;
    this.status = status;
  }
};
function origenPermitido(origen, permitidos) {
  return typeof origen === "string" && permitidos.map((p) => p.trim().replace(/\/$/, "")).includes(origen.replace(/\/$/, ""));
}
function esPagoReal(pago) {
  const id = String(pago?.idTransaccion ?? "");
  if (pago?.pasarela === "stripe") return /^pi_[A-Za-z0-9]{20,}$/.test(id);
  if (pago?.pasarela === "mercadopago") return /^\d{6,12}$/.test(id);
  if (pago?.pasarela === "paypal") return /^[A-Z0-9]{17}$/.test(id);
  return false;
}
async function crearPago({ ordenId, origen, pasarela = "stripe", repo, llaves = {}, urlsAvisos = {}, origenesPermitidos, fetch }) {
  try {
    const crear = CREADORES[pasarela];
    if (!crear) throw new ErrorPago("pasarela_sin_pagina", 400);
    const llaveSecreta = llaves[pasarela];
    if (!llaveSecreta) throw new ErrorPago(`sin_llave_${pasarela}`, 500);
    if (!origenPermitido(origen, origenesPermitidos)) throw new ErrorPago("origen_no_permitido", 400);
    if (!ordenId) throw new ErrorPago("sin_orden", 400);
    const orden = await repo.obtener(ordenId);
    if (!orden) throw new ErrorPago("orden_no_encontrada", 404);
    if (orden.estado !== "cotizada") throw new ErrorPago("orden_ya_pagada", 409);
    if (!(orden.totalHoy > 0)) throw new ErrorPago("monto_invalido", 400);
    const pagina = await crear({ orden, origen: origen.replace(/\/$/, ""), llaveSecreta, urlAvisos: urlsAvisos[pasarela], fetch });
    return { status: 200, cuerpo: pagina };
  } catch (e) {
    if (e instanceof ErrorPago) return { status: e.status, cuerpo: { error: e.motivo } };
    return { status: e.status ?? 500, cuerpo: { error: e.message } };
  }
}

// src/core/productos.js
var Producto = class {
  constructor(datos) {
    Object.assign(this, datos);
  }
  cobro(config) {
    return ESTRATEGIAS_COBRO[this.formaPago ?? "unico"](this.precio, config);
  }
};
var ProductoDigital = class extends Producto {
  requiereAgenda = false;
  etiquetaTipo = "Producto digital";
  entrega(hoy) {
    return entregaInmediata(hoy);
  }
};
var Servicio = class extends Producto {
  requiereAgenda = true;
  etiquetaTipo = "Servicio";
  entrega(hoy, config, ocupacion) {
    return entregaServicio(hoy, config, ocupacion);
  }
};
var REGISTRO = { digital: ProductoDigital, servicio: Servicio };
function crearProducto(datos) {
  const Clase = REGISTRO[datos.tipo];
  if (!Clase) throw new Error(`Tipo de producto desconocido: ${datos.tipo}`);
  return new Clase(datos);
}

// src/core/servicioPedidos.js
var ACTIVAS = [ESTADOS.AGENDADA, ESTADOS.EN_CURSO];
var ESTADO_REEMBOLSO = Object.freeze({ SOLICITADO: "solicitado", EMITIDO: "emitido" });
var ServicioPedidos = class {
  // fuenteOcupacion (opcional): async (desdeISO) => { 'YYYY-MM-DD': arranques }.
  // Con Supabase la da la base (el cliente no ve las órdenes de otros);
  // sin ella se cuenta sobre las órdenes del repositorio.
  // sesionesPago (opcional): pasarelas con página de pago propia (Stripe Checkout, Sprint 7).
  constructor({ repoPedidos, fabricaPasarelas, bus, config, catalogo, reloj = () => /* @__PURE__ */ new Date(), fuenteOcupacion = null, sesionesPago = null }) {
    Object.assign(this, { repoPedidos, fabricaPasarelas, bus, config, catalogo, reloj, fuenteOcupacion, sesionesPago });
  }
  // Cuántos arranques hay ya agendados por día: { '2026-12-01': 2, ... }
  async ocupacion() {
    if (this.fuenteOcupacion) return this.fuenteOcupacion(aISO(this.reloj()));
    const cuenta = {};
    for (const o of await this.repoPedidos.listar()) {
      if (ACTIVAS.includes(o.estado) && o.fechaArranque) cuenta[o.fechaArranque] = (cuenta[o.fechaArranque] ?? 0) + 1;
    }
    return cuenta;
  }
  // Cotiza uno o varios productos con la ocupación dada. No guarda nada.
  cotizar(ids, ocupacion = {}) {
    const hoy = this.reloj();
    const partidas = this.catalogo.filter((p) => ids.includes(p.id)).map((datos) => {
      const producto = crearProducto(datos);
      return { producto, cobro: producto.cobro(this.config), entrega: producto.entrega(hoy, this.config, ocupacion) };
    });
    const servicios = partidas.filter((x) => x.producto.requiereAgenda);
    return {
      partidas,
      totalHoy: partidas.reduce((s, x) => s + x.cobro.hoy, 0),
      totalContrato: partidas.reduce((s, x) => s + x.cobro.totalContrato, 0),
      requiereAgenda: servicios.length > 0,
      // Todos los servicios de una orden arrancan el mismo día.
      entregaPropuesta: servicios[0]?.entrega ?? partidas[0]?.entrega ?? null
    };
  }
  // El cliente propone fecha de arranque: se confirma o se sugiere la más cercana.
  revisarFecha(fechaISO, ocupacion = {}) {
    return resolverFechaCliente(fechaISO, this.reloj(), this.config, ocupacion);
  }
  // Compra completa: crea la orden, cobra, y la agenda (servicio) o la entrega (digital).
  async comprar({ ids, cliente, pasarela = this.config.pasarelaPorDefecto, tarjeta, fechaCliente, ordenId }) {
    const { orden: guardada, cot, ocupacion } = await this.#prepararOrden({ ids, cliente, fechaCliente, ordenId });
    let orden = guardada;
    const cobro = await this.fabricaPasarelas.crearPasarela(pasarela).cobrar({
      monto: orden.totalHoy,
      moneda: orden.moneda,
      referencia: orden.id,
      tarjeta
    });
    if (!cobro.ok) {
      this.bus.publicar(EVENTOS.PAGO_RECHAZADO, { orden, mensaje: cobro.mensaje });
      return { ok: false, orden, mensaje: cobro.mensaje };
    }
    const pago = { pasarela: cobro.pasarela, idTransaccion: cobro.idTransaccion, monto: orden.totalHoy };
    orden = await this.#aplicarPago(orden, pago, fechaCliente ?? cot.entregaPropuesta.fechaArranque, ocupacion);
    return { ok: true, orden };
  }
  // ¿Esta pasarela cobra en su propia página (Stripe Checkout) en lugar de con el SDK simulado?
  usaPaginaDePago(pasarela) {
    return Boolean(this.sesionesPago?.soporta(pasarela));
  }
  // Pago en la página de la pasarela: deja la orden cotizada y devuelve la URL a donde
  // mandar al cliente. Aquí no se cobra ni se marca nada como pagado: eso lo hace el
  // webhook firmado de la pasarela (confirmarPago), aunque el cliente cierre la pestaña.
  async iniciarPagoEnPasarela({ ids, cliente, pasarela = this.config.pasarelaPorDefecto, fechaCliente, ordenId, origen }) {
    if (!this.usaPaginaDePago(pasarela)) throw new Error(`La pasarela ${pasarela} no tiene p\xE1gina de pago conectada`);
    const { orden } = await this.#prepararOrden({ ids, cliente, fechaCliente, ordenId });
    try {
      const { url } = await this.sesionesPago.crear({ ordenId: orden.id, pasarela, origen });
      return { orden, url };
    } catch (e) {
      e.orden = orden;
      throw e;
    }
  }
  // Crea (o reutiliza, tras un rechazo o una cancelación) la orden cotizada y la guarda.
  async #prepararOrden({ ids, cliente, fechaCliente, ordenId }) {
    const ocupacion = await this.ocupacion();
    const cot = this.cotizar(ids, ocupacion);
    if (cot.partidas.length === 0) throw new Error("La cotizaci\xF3n est\xE1 vac\xEDa");
    let orden = ordenId ? await this.repoPedidos.obtener(ordenId) : null;
    const nueva = !orden || orden.estado !== ESTADOS.COTIZADA;
    if (nueva) {
      const ahora = this.reloj();
      orden = {
        estado: ESTADOS.COTIZADA,
        historial: [{ estado: ESTADOS.COTIZADA, evento: "cotizar", fecha: ahora.toISOString() }],
        fechaOrden: ahora.toISOString()
      };
    }
    orden = {
      ...orden,
      cliente,
      partidas: cot.partidas.map(({ producto, cobro }) => ({
        id: producto.id,
        nombre: producto.nombre,
        tipo: producto.tipo,
        precio: producto.precio,
        cobroHoy: cobro.hoy,
        totalContrato: cobro.totalContrato
      })),
      totalHoy: cot.totalHoy,
      totalContrato: cot.totalContrato,
      moneda: this.config.moneda,
      requiereAgenda: cot.requiereAgenda,
      // Se guarda para que, si el pago lo confirma después un webhook, se respete la fecha que eligió el cliente.
      fechaPreferida: fechaCliente ?? null
    };
    orden = await this.repoPedidos.guardar(orden);
    if (nueva) this.bus.publicar(EVENTOS.COTIZADA, orden);
    return { orden, cot, ocupacion };
  }
  // Pago confirmado por la pasarela desde su servidor (webhook), no por el navegador.
  // Es idempotente: si la orden ya no está cotizada, el pago ya se había aplicado y no cambia nada.
  async confirmarPago(id, pago) {
    const orden = await this.#obtener(id);
    if (orden.estado !== ESTADOS.COTIZADA) return { aplicado: false, orden };
    if (Number(pago.monto) !== Number(orden.totalHoy)) {
      throw new Error(`El monto pagado (${pago.monto}) no coincide con el de la orden ${id} (${orden.totalHoy})`);
    }
    const ocupacion = await this.ocupacion();
    const propuesta = orden.fechaPreferida ?? this.cotizar(orden.partidas.map((p) => p.id), ocupacion).entregaPropuesta?.fechaArranque;
    return { aplicado: true, orden: await this.#aplicarPago(orden, pago, propuesta, ocupacion) };
  }
  // Lo que pasa después de un cobro aprobado, venga del checkout o de un webhook:
  // la orden queda pagada y luego agendada (servicio) o completada (digital).
  async #aplicarPago(orden, pago, fechaPropuesta, ocupacion) {
    orden = { ...transicionar(orden, "pagar", this.reloj()), pago };
    this.bus.publicar(EVENTOS.PAGADA, orden);
    if (orden.requiereAgenda) {
      const fecha = this.revisarFecha(fechaPropuesta, ocupacion);
      orden = { ...transicionar(orden, "agendar", this.reloj()), ...calendarioServicio(deISO(fecha.fecha), this.config), fechaAjustada: !fecha.confirmada };
      this.bus.publicar(EVENTOS.AGENDADA, orden);
    } else {
      orden = { ...transicionar(orden, "completar", this.reloj()), fechaEntrega: aISO(this.reloj()) };
    }
    return this.repoPedidos.guardar(orden);
  }
  // Cancelación: antes de que el servicio arranque. Si ya había pago, se reembolsa;
  // si lo cobró la pasarela de verdad, se deja la solicitud para Socius (ver reembolsoManual).
  async cancelar(id) {
    let orden = await this.#obtener(id);
    orden = transicionar(orden, "cancelar", this.reloj());
    if (this.reembolsoManual(orden)) orden = { ...orden, reembolso: this.#solicitud("cancelacion", orden) };
    orden = await this.repoPedidos.guardar(orden);
    this.bus.publicar(EVENTOS.CANCELADA, orden);
    if (!orden.pago) return orden;
    if (orden.reembolso?.estado === ESTADO_REEMBOLSO.SOLICITADO) {
      this.bus.publicar(EVENTOS.REEMBOLSO_SOLICITADO, orden);
      return orden;
    }
    return this.#reembolsar(orden);
  }
  // Devolución: orden en curso o completada.
  async solicitarDevolucion(id) {
    const orden = await this.#obtener(id);
    if (!this.reembolsoManual(orden)) return this.#reembolsar(orden);
    if (!this.puedeDevolver(orden)) throw new Error(`La orden ${id} no admite devoluci\xF3n`);
    const conSolicitud = await this.repoPedidos.guardar({ ...orden, reembolso: this.#solicitud("devolucion", orden) });
    this.bus.publicar(EVENTOS.REEMBOLSO_SOLICITADO, conSolicitud);
    return conSolicitud;
  }
  // Opción B del Sprint 7: un pago real (Stripe o Mercado Pago) no lo reembolsa la app.
  // El cliente deja la solicitud, Socius decide y reembolsa desde el panel de la pasarela,
  // y su webhook marca la orden como reembolsada (registrarReembolso).
  reembolsoManual = (orden) => esPagoReal(orden.pago);
  #solicitud(tipo, orden) {
    return { estado: ESTADO_REEMBOLSO.SOLICITADO, tipo, monto: orden.pago.monto, fecha: this.reloj().toISOString() };
  }
  // Reembolso confirmado por la pasarela desde su servidor (webhook), venga o no de una solicitud.
  // Idempotente como confirmarPago: si ya estaba reembolsada, no cambia nada.
  async registrarReembolso(id, { idReembolso, monto }) {
    const orden = await this.#obtener(id);
    if (orden.estado === ESTADOS.REEMBOLSADA) return { aplicado: false, orden };
    const reembolsada = await this.repoPedidos.guardar({
      ...transicionar(orden, "reembolsar", this.reloj()),
      reembolso: { estado: ESTADO_REEMBOLSO.EMITIDO, tipo: orden.reembolso?.tipo ?? "directo", idReembolso: idReembolso ?? null, monto }
    });
    this.bus.publicar(EVENTOS.REEMBOLSADA, reembolsada);
    return { aplicado: true, orden: reembolsada };
  }
  // Número de orden a partir del pago (el aviso de reembolso de Stripe solo trae el pago).
  ordenPorTransaccion(pasarela, idTransaccion) {
    return this.repoPedidos.ordenPorTransaccion(pasarela, idTransaccion);
  }
  puedeCancelar = (orden) => puede(orden, "cancelar");
  puedeDevolver = (orden) => Boolean(orden.pago) && puede(orden, "reembolsar") && !puede(orden, "cancelar") && orden.reembolso?.estado !== ESTADO_REEMBOLSO.SOLICITADO;
  // Lista las órdenes, avanzando las que ya llegaron a su fecha (agendada → en curso → completada).
  async listar() {
    const hoy = aISO(this.reloj());
    const ordenes = await this.repoPedidos.listar();
    return Promise.all(ordenes.map(async (o) => {
      let orden = o;
      if (orden.estado === ESTADOS.AGENDADA && orden.fechaArranque <= hoy) orden = transicionar(orden, "iniciar", this.reloj());
      if (orden.estado === ESTADOS.EN_CURSO && orden.fechaFin <= hoy) orden = transicionar(orden, "completar", this.reloj());
      return orden !== o ? this.repoPedidos.guardar(orden) : orden;
    }));
  }
  obtener(id) {
    return this.repoPedidos.obtener(id);
  }
  async #obtener(id) {
    const orden = await this.repoPedidos.obtener(id);
    if (!orden) throw new Error(`No existe la orden ${id}`);
    return orden;
  }
  async #reembolsar(orden) {
    if (!orden.pago) throw new Error("La orden no tiene un pago que reembolsar");
    if (!puede(orden, "reembolsar")) transicionar(orden, "reembolsar");
    const r = await this.fabricaPasarelas.crearPasarela(orden.pago.pasarela).reembolsar({
      idTransaccion: orden.pago.idTransaccion,
      monto: orden.pago.monto,
      moneda: orden.moneda
    });
    if (!r.ok) throw new Error("La pasarela no pudo emitir el reembolso");
    let reembolsada = { ...transicionar(orden, "reembolsar", this.reloj()), reembolso: { estado: ESTADO_REEMBOLSO.EMITIDO, idReembolso: r.idReembolso, monto: orden.pago.monto } };
    reembolsada = await this.repoPedidos.guardar(reembolsada);
    this.bus.publicar(EVENTOS.REEMBOLSADA, reembolsada);
    return reembolsada;
  }
};

// src/data/programas.js
var programas = [
  {
    id: "nexus-growth",
    tipo: "servicio",
    formaPago: "unico",
    nombre: "Nexus Growth",
    precio: 8e4,
    moneda: "MXN",
    descripcion: "Infraestructura completa, operada por Socius",
    paraQuien: "Quien quiere que se lo operen",
    pago: "Pago en los primeros 30 d\xEDas",
    destacado: true
  },
  {
    id: "nexus-growth-split",
    tipo: "servicio",
    formaPago: "mensual",
    nombre: "Nexus Growth Split",
    precio: 35e3,
    moneda: "MXN/mes",
    descripcion: "La misma modalidad, mes a mes",
    paraQuien: "Mismo perfil, pago fraccionado",
    pago: "Mensual",
    destacado: false
  },
  {
    id: "nexus-partner",
    tipo: "servicio",
    formaPago: "unico",
    nombre: "Nexus Partner",
    precio: 6e4,
    moneda: "MXN",
    descripcion: "Infraestructura completa y comisi\xF3n por venta",
    paraQuien: "Quien prefiere que Socius participe del resultado",
    pago: "M\xE1s comisi\xF3n",
    destacado: true
  },
  {
    id: "nexus-partner-split",
    tipo: "servicio",
    formaPago: "mensual",
    nombre: "Nexus Partner Split",
    precio: 2e4,
    moneda: "MXN/mes",
    descripcion: "La misma modalidad, mes a mes",
    paraQuien: "Mismo perfil, pago fraccionado",
    pago: "Mensual + comisi\xF3n",
    destacado: false
  },
  {
    id: "socius-core",
    tipo: "servicio",
    formaPago: "dos_pagos",
    nombre: "Socius Core",
    precio: 15e4,
    moneda: "MXN",
    descripcion: "Se instala, opera y capacita al equipo interno del cliente",
    paraQuien: "Desarrolladores y brokers con equipo interno",
    pago: "2 pagos",
    destacado: true
  },
  {
    id: "nexus-ia",
    tipo: "servicio",
    formaPago: "unico",
    nombre: "Nexus IA",
    precio: 35e3,
    moneda: "MXN",
    descripcion: "Capa de IA y CRM: 2 agentes que responden, califican y agendan",
    paraQuien: "Quien ya genera prospectos",
    pago: "Setup + desde $10,000/mes",
    destacado: false
  },
  {
    id: "avi",
    tipo: "digital",
    formaPago: "unico",
    nombre: "AVI",
    precio: 7e3,
    moneda: "MXN",
    descripcion: "Programa formativo con agentes de IA",
    paraQuien: "Quien quiere aprender a hacerlo",
    pago: "Pago \xFAnico",
    destacado: false
  }
];

// src/core/webhooks/firmas.js
var texto = new TextEncoder();
async function hmacHex(secreto, mensaje) {
  const llave = await crypto.subtle.importKey("raw", texto.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("HMAC", llave, texto.encode(mensaje));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function igualSeguro(a = "", b = "") {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}
function partes(encabezado = "") {
  const r = {};
  for (const par of encabezado.split(",")) {
    const [k, ...v] = par.trim().split("=");
    if (k && v.length) (r[k] ??= []).push(v.join("="));
  }
  return r;
}
var mal = (motivo) => ({ ok: false, motivo });
var TOLERANCIA_SEGUNDOS = 300;
async function verificarStripe(cuerpo, encabezados, secreto, ahora) {
  const p = partes(encabezados["stripe-signature"]);
  const t = p.t?.[0];
  if (!t || !p.v1) return mal("sin_firma");
  if (Math.abs(ahora.getTime() / 1e3 - Number(t)) > TOLERANCIA_SEGUNDOS) return mal("firma_vencida");
  const esperada = await hmacHex(secreto, `${t}.${cuerpo}`);
  return p.v1.some((v) => igualSeguro(v, esperada)) ? { ok: true } : mal("firma_invalida");
}
async function verificarMercadoPago(cuerpo, encabezados, secreto) {
  const p = partes(encabezados["x-signature"]);
  const ts = p.ts?.[0];
  const v1 = p.v1?.[0];
  if (!ts || !v1) return mal("sin_firma");
  let dataId;
  try {
    dataId = String(JSON.parse(cuerpo)?.data?.id ?? "");
  } catch {
    return mal("json_invalido");
  }
  const idFirmado = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const esperada = await hmacHex(secreto, `id:${idFirmado};request-id:${encabezados["x-request-id"] ?? ""};ts:${ts};`);
  return igualSeguro(v1, esperada) ? { ok: true } : mal("firma_invalida");
}
var verificarPayPal = (cuerpo, encabezados, credenciales, _ahora, fetch) => verificarAvisoPayPal(cuerpo, encabezados, credenciales, { fetch });
var VERIFICADORES = {
  stripe: verificarStripe,
  mercadopago: verificarMercadoPago,
  paypal: verificarPayPal
};

// src/core/webhooks/traductores.js
var TIPOS = Object.freeze({
  APROBADO: "pago_aprobado",
  RECHAZADO: "pago_rechazado",
  REEMBOLSADO: "pago_reembolsado",
  CONSULTAR: "consultar_pago",
  OTRO: "otro"
});
function traducirStripe(datos) {
  const objeto = datos?.data?.object ?? {};
  if (datos?.type === "charge.refunded") {
    return {
      eventoId: datos?.id,
      tipo: TIPOS.REEMBOLSADO,
      referencia: objeto.metadata?.orden_id ?? null,
      idTransaccion: objeto.payment_intent ?? null,
      idReembolso: objeto.refunds?.data?.[0]?.id ?? null,
      monto: objeto.amount_refunded != null ? objeto.amount_refunded / 100 : null
    };
  }
  const tipo = {
    "payment_intent.succeeded": TIPOS.APROBADO,
    "payment_intent.payment_failed": TIPOS.RECHAZADO
  }[datos?.type] ?? TIPOS.OTRO;
  return {
    eventoId: datos?.id,
    tipo,
    referencia: objeto.metadata?.orden_id ?? null,
    idTransaccion: objeto.id ?? null,
    monto: objeto.amount != null ? objeto.amount / 100 : null
  };
}
function traducirMercadoPago(datos) {
  const idPago = datos?.data?.id != null ? String(datos.data.id) : null;
  return {
    // Número de aviso + pago: un reenvío del mismo aviso sigue siendo duplicado, pero dos
    // avisos con el mismo número y distinto pago no chocan (el simulador del panel usa
    // siempre "id": "123456").
    eventoId: `${datos?.id ?? datos?.action}:${idPago}`,
    tipo: datos?.type === "payment" && idPago ? TIPOS.CONSULTAR : TIPOS.OTRO,
    idPago,
    referencia: null,
    idTransaccion: idPago,
    monto: null
  };
}
function traducirPayPal(datos) {
  const r = datos?.resource ?? {};
  const base = { eventoId: datos?.id, referencia: r.custom_id ?? null, idTransaccion: r.id ?? null, monto: r.amount?.value != null ? Number(r.amount.value) : null };
  switch (datos?.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      const unidad = r.purchase_units?.[0] ?? {};
      return { ...base, tipo: TIPOS.CONSULTAR, idPago: r.id ?? null, referencia: unidad.custom_id ?? unidad.reference_id ?? null, monto: null };
    }
    case "PAYMENT.CAPTURE.COMPLETED":
      return { ...base, tipo: TIPOS.APROBADO };
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return { ...base, tipo: TIPOS.RECHAZADO };
    case "PAYMENT.CAPTURE.REFUNDED": {
      const captura = r.links?.find((l) => l.rel === "up")?.href?.split("/").pop() ?? null;
      return { ...base, tipo: TIPOS.REEMBOLSADO, idTransaccion: captura, idReembolso: r.id ?? null };
    }
    default:
      return { ...base, tipo: TIPOS.OTRO };
  }
}
var TRADUCTORES = {
  stripe: traducirStripe,
  mercadopago: traducirMercadoPago,
  paypal: traducirPayPal
};

// src/core/webhooks/receptor.js
async function recibirWebhook({ pasarela, cuerpo, encabezados = {}, secretos = {}, cola, reloj = () => /* @__PURE__ */ new Date(), fetch }) {
  const verificar = VERIFICADORES[pasarela];
  if (!verificar) return { status: 404, motivo: "pasarela_desconocida" };
  const secreto = secretos[pasarela];
  if (!secreto) return { status: 500, motivo: "sin_secreto" };
  const enc = Object.fromEntries(Object.entries(encabezados).map(([k, v]) => [k.toLowerCase(), v]));
  const firma = await verificar(cuerpo, enc, secreto, reloj(), fetch);
  if (!firma.ok) return { status: 400, motivo: firma.motivo };
  let datos;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return { status: 400, motivo: "json_invalido" };
  }
  const evento = TRADUCTORES[pasarela](datos);
  if (!evento.eventoId) return { status: 400, motivo: "sin_id_de_evento" };
  const { nuevo } = await cola.encolar({ pasarela, eventoId: evento.eventoId, tipo: evento.tipo, contenido: datos });
  return { status: 200, motivo: nuevo ? "recibido" : "duplicado" };
}

// src/core/webhooks/colaEventos.js
var ESTADOS_EVENTO = Object.freeze({
  PENDIENTE: "pendiente",
  PROCESANDO: "procesando",
  PROCESADO: "procesado",
  ERROR: "error"
});
var MAX_INTENTOS = 3;
var siguienteEstado = (intentos, max) => intentos >= max ? ESTADOS_EVENTO.ERROR : ESTADOS_EVENTO.PENDIENTE;
var aEvento = (f) => ({
  id: f.id,
  pasarela: f.pasarela,
  eventoId: f.evento_id,
  tipo: f.tipo,
  contenido: f.contenido,
  estado: f.estado,
  intentos: f.intentos,
  ultimoError: f.ultimo_error ?? null
});
var ColaEventosSupabase = class {
  constructor(cliente) {
    this.cliente = cliente;
  }
  async encolar({ pasarela, eventoId, tipo, contenido }) {
    const { data, error } = await this.cliente.from("eventos_pago").upsert({ pasarela, evento_id: eventoId, tipo, contenido }, { onConflict: "pasarela,evento_id", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`No se pudo guardar el aviso: ${error.message}`);
    return { nuevo: data.length > 0 };
  }
  // La función tomar_eventos_pago (migración 003) usa "for update skip locked":
  // si dos consumidores corren a la vez, cada aviso lo toma solo uno.
  async tomar(limite = 10) {
    const { data, error } = await this.cliente.rpc("tomar_eventos_pago", { limite });
    if (error) throw new Error(`No se pudieron tomar los avisos: ${error.message}`);
    return data.map(aEvento);
  }
  async marcarProcesado(evento) {
    const { error } = await this.cliente.from("eventos_pago").update({ estado: ESTADOS_EVENTO.PROCESADO, procesado_en: (/* @__PURE__ */ new Date()).toISOString(), ultimo_error: null }).eq("id", evento.id);
    if (error) throw new Error(`No se pudo marcar el aviso: ${error.message}`);
  }
  async registrarFallo(evento, mensaje, max = MAX_INTENTOS) {
    const intentos = evento.intentos + 1;
    const { error } = await this.cliente.from("eventos_pago").update({ intentos, ultimo_error: mensaje, estado: siguienteEstado(intentos, max) }).eq("id", evento.id);
    if (error) throw new Error(`No se pudo registrar el fallo: ${error.message}`);
  }
};

// src/core/webhooks/procesador.js
async function procesarPendientes({ cola, servicio, consultores = {}, limite = 10, maxIntentos = MAX_INTENTOS }) {
  const resumen = { procesados: 0, fallidos: 0 };
  for (const evento of await cola.tomar(limite)) {
    try {
      await aplicar(evento, servicio, consultores);
      await cola.marcarProcesado(evento);
      resumen.procesados++;
    } catch (e) {
      await cola.registrarFallo(evento, e.message, maxIntentos);
      resumen.fallidos++;
    }
  }
  return resumen;
}
async function aplicar(evento, servicio, consultores) {
  let datos = TRADUCTORES[evento.pasarela](evento.contenido);
  if (datos.tipo === TIPOS.CONSULTAR) {
    const consultar = consultores[evento.pasarela];
    if (!consultar) throw new Error(`Falta conectar la consulta a la API de ${evento.pasarela} (Sprint 7)`);
    const pago = await consultar(datos.idPago);
    const tipo = { aprobado: TIPOS.APROBADO, reembolsado: TIPOS.REEMBOLSADO }[pago.estado] ?? TIPOS.OTRO;
    datos = { ...pago, referencia: pago.referencia ?? datos.referencia, tipo };
  }
  if (datos.tipo === TIPOS.REEMBOLSADO) {
    const id = datos.referencia ?? await servicio.ordenPorTransaccion(evento.pasarela, datos.idTransaccion);
    if (!id) throw new Error(`El reembolso del pago ${datos.idTransaccion} no corresponde a ninguna orden`);
    await servicio.registrarReembolso(id, { idReembolso: datos.idReembolso, monto: datos.monto });
    return;
  }
  if (datos.tipo !== TIPOS.APROBADO) return;
  if (!datos.referencia) throw new Error("El aviso no trae el n\xFAmero de orden");
  await servicio.confirmarPago(datos.referencia, {
    pasarela: evento.pasarela,
    idTransaccion: datos.idTransaccion,
    monto: datos.monto
  });
}

// src/core/avisos/avisoLlamada.js
var API_RESEND = "https://api.resend.com/emails";
var escapar = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var DIAS = ["domingo", "lunes", "martes", "mi\xE9rcoles", "jueves", "viernes", "s\xE1bado"];
var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fechaLarga(fechaISO) {
  const [a, m, d] = String(fechaISO).split("-").map(Number);
  if (!a || !m || !d) return String(fechaISO ?? "");
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${a}`;
}
function correoLlamada(llamada) {
  const cuando = `${fechaLarga(llamada.fecha)} a las ${llamada.hora} (hora CDMX)`;
  const filas = [
    ["Cu\xE1ndo", cuando],
    ["Nombre", llamada.nombre],
    ["Empresa", llamada.empresa],
    ["Correo", llamada.email],
    ["Tel\xE9fono", llamada.telefono],
    ["Mensaje", llamada.mensaje || "\u2014"]
  ];
  const html = `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#111021;max-width:520px">
  <h2 style="margin:0 0 4px;color:#5348CF">Nueva llamada agendada</h2>
  <p style="margin:0 0 16px;color:#3a3950">Un prospecto agend\xF3 una llamada estrat\xE9gica desde app.sociusrealestate.com.</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${filas.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#6b6a7d;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;border-bottom:1px solid #EFECFD">${escapar(v)}</td></tr>`).join("\n    ")}
  </table>
  <p style="margin:16px 0 0;font-size:13px;color:#6b6a7d">Responde a este correo para escribirle directo al prospecto.</p>
</div>`;
  const texto2 = ["Nueva llamada agendada", ...filas.map(([k, v]) => `${k}: ${v ?? ""}`)].join("\n");
  return { asunto: `Llamada agendada: ${llamada.nombre} (${llamada.empresa}) \xB7 ${cuando}`, html, texto: texto2 };
}
async function avisarLlamada({ cuerpo, encabezados = {}, config = {}, fetch = globalThis.fetch }) {
  const { secreto, llaveResend, para, de } = config;
  if (!secreto || !llaveResend || !para || !de) return { status: 500, motivo: "falta_configuracion" };
  const enc = Object.fromEntries(Object.entries(encabezados).map(([k, v]) => [k.toLowerCase(), v]));
  if (!igualSeguro(String(enc["x-aviso-secreto"] ?? ""), secreto)) return { status: 401, motivo: "secreto_invalido" };
  let datos;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return { status: 400, motivo: "json_invalido" };
  }
  if (datos?.type !== "INSERT" || datos?.table !== "llamadas" || !datos.record) return { status: 204, motivo: "ignorado" };
  const llamada = datos.record;
  const { asunto, html, texto: texto2 } = correoLlamada(llamada);
  const r = await fetch(API_RESEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llaveResend}`,
      "Content-Type": "application/json",
      // Si Supabase reintenta el mismo aviso, Resend no manda el correo dos veces.
      "Idempotency-Key": `llamada-${llamada.id ?? `${llamada.fecha}-${llamada.hora}`}`
    },
    body: JSON.stringify({
      from: de,
      to: [para],
      reply_to: llamada.email || void 0,
      subject: asunto,
      html,
      text: texto2
    })
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    return { status: 502, motivo: `resend_${r.status}`, detalle };
  }
  const { id } = await r.json().catch(() => ({}));
  return { status: 200, motivo: "enviado", id };
}

// src/core/webhooks/servidor.js
function crearServicioServidor(cliente) {
  const repo = new RepositorioPedidosSupabase(cliente);
  return new ServicioPedidos({
    repoPedidos: repo,
    fabricaPasarelas: null,
    bus: new BusEventos(),
    config: ConfigApp.obtener(),
    catalogo: programas,
    fuenteOcupacion: (desde) => repo.arranquesPorDia(desde)
  });
}
export {
  ColaEventosSupabase,
  RepositorioPedidosSupabase,
  avisarLlamada,
  capturarOrdenPayPal,
  consultarPagoMercadoPago,
  crearPago,
  crearServicioServidor,
  procesarPendientes,
  recibirWebhook
};
