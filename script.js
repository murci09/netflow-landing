/**
 * NetFlow — script.js
 * Estructura base de eventos. Se ejecuta cuando el DOM está listo.
 */

/* ==========================================================================
   CONFIGURACIÓN — editar solo estas dos constantes
   ========================================================================== */

/**
 * Endpoint que recibe los leads. VACÍO = modo WhatsApp (el actual): el envío
 * abre el chat con los datos ya redactados y no se guarda nada del lado nuestro.
 *
 * PARA CONECTARLO MÁS ADELANTE: pegar acá la URL y listo, no hay que tocar
 * ninguna otra línea del archivo. El POST ya está escrito en sendLead().
 *   Formspree → 'https://formspree.io/f/TU_ID'
 *   Make/n8n  → URL del webhook
 * Se envía POST con JSON plano: { especialidad, ciudad, tratamiento,
 * particulares, pacientes_adicionales, inversion, nombre, whatsapp, email }.
 *
 * Tres cosas a verificar el día que se conecte:
 *   1. El endpoint debe permitir CORS desde el dominio del sitio, o el fetch falla.
 *   2. La URL queda visible en este archivo: nunca poner acá una API key.
 *      Si el servicio pide autenticación, va detrás de un webhook intermedio.
 *   3. HubSpot necesita otro formato ({ fields: [{ name, value }] }): en ese caso
 *      hay que transformar el payload dentro de sendLead(), no acá.
 */
const FORM_ENDPOINT = '';

/** WhatsApp de NetFlow en formato internacional, solo dígitos. */
const WHATSAPP_NUMBER = '541168292740';

document.addEventListener('DOMContentLoaded', () => {
  initCtaTracking();
  initHeaderScrollState();
  initFaqAccordion();
  initQualifyForm();
  initAvatarFallback();
  initFooterYear();
});

/**
 * Trackea clics en los CTAs principales (data-action).
 * Punto de enganche para Google Analytics / Meta Pixel / etc.
 */
function initCtaTracking() {
  const ctas = document.querySelectorAll('[data-action]');

  ctas.forEach((cta) => {
    cta.addEventListener('click', (event) => {
      const action = event.currentTarget.dataset.action;

      // TODO: reemplazar por el proveedor de analítica real
      console.log(`[NetFlow] CTA clickeado: ${action}`);

      // Ejemplo de integración futura:
      // if (window.gtag) gtag('event', 'cta_click', { action });
    });
  });
}

/**
 * Agrega una clase al header cuando el usuario scrollea,
 * útil para reforzar el fondo/blur en scroll.
 */
function initHeaderScrollState() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }, { passive: true });
}

/* ==========================================================================
   SECCIÓN 8 — ACORDEÓN DE FAQs
   ========================================================================== */

/**
 * Acordeón accesible: el estado vive en aria-expanded del botón
 * y en el atributo [hidden] del panel. Solo una pregunta abierta a la vez.
 */
function initFaqAccordion() {
  const questions = document.querySelectorAll('.faq-item__question');
  if (!questions.length) return;

  questions.forEach((question) => {
    question.addEventListener('click', () => {
      const panel = document.getElementById(question.getAttribute('aria-controls'));
      const isOpen = question.getAttribute('aria-expanded') === 'true';

      // Cierra todas antes de abrir la clickeada (comportamiento tipo acordeón)
      closeAllFaqs(questions);

      if (!isOpen && panel) {
        question.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
      }
    });
  });
}

/** Colapsa todas las preguntas del acordeón. */
function closeAllFaqs(questions) {
  questions.forEach((question) => {
    const panel = document.getElementById(question.getAttribute('aria-controls'));
    question.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  });
}

/* ==========================================================================
   FORMULARIO DE CALIFICACIÓN PROGRESIVO (vive en el HERO, ancla #diagnostico)
   ========================================================================== */

/**
 * Formulario multipaso: navegación con validación obligatoria por paso.
 * No se avanza al paso siguiente si hay campos requeridos sin completar.
 */
function initQualifyForm() {
  const form = document.getElementById('qualify-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.qform__step'));
  const dots = form.querySelectorAll('[data-step-dot]');
  const status = form.querySelector('#qform-status');
  const success = form.querySelector('#qform-success');
  const btnPrev = form.querySelector('[data-nav="prev"]');
  const btnNext = form.querySelector('[data-nav="next"]');
  const btnSubmit = form.querySelector('.qform__submit');
  const errorBox = form.querySelector('#qform-error');

  // Si falta cualquier pieza de la navegación, el formulario no se inicializa
  // en vez de romper con un TypeError sobre un nodo inexistente.
  if (!steps.length || !btnPrev || !btnNext || !btnSubmit) return;

  // Títulos por paso, para el indicador de progreso
  const stepLabels = ['Tu práctica', 'Tu situación comercial', 'Tus datos de contacto'];
  let currentStep = 0;

  // Bloque de recuperación de WhatsApp: se crea solo si el pop-up se bloquea
  let whatsappFallback = null;

  /** Muestra el paso indicado y sincroniza progreso y botones. */
  function renderStep(index) {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i <= index));

    const isLast = index === steps.length - 1;
    btnPrev.hidden = index === 0;
    btnNext.hidden = isLast;
    btnSubmit.hidden = !isLast;

    if (status) {
      status.textContent = `Paso ${index + 1} de ${steps.length} — ${stepLabels[index]}`;
    }
  }

  /** Valida todos los campos requeridos del paso; devuelve true si está completo. */
  function validateStep(index) {
    const fields = steps[index].querySelectorAll('input, select, textarea');
    let isValid = true;
    let firstInvalid = null;

    // Los radios comparten name: se valida el grupo una sola vez
    const checkedRadioGroups = new Set();

    fields.forEach((field) => {
      if (field.type === 'radio') {
        if (checkedRadioGroups.has(field.name)) return;
        checkedRadioGroups.add(field.name);

        const group = steps[index].querySelectorAll(`input[name="${field.name}"]`);
        const someChecked = Array.from(group).some((radio) => radio.checked);
        const wrapper = field.closest('.field__radios');

        if (field.required && !someChecked) {
          showFieldError(steps[index], field.name, 'Seleccioná una opción.');
          if (wrapper) wrapper.dataset.invalid = 'true';
          isValid = false;
          firstInvalid = firstInvalid || field;
        } else {
          clearFieldError(steps[index], field.name);
          if (wrapper) delete wrapper.dataset.invalid;
        }
        return;
      }

      const value = field.value.trim();

      if (field.required && !value) {
        markInvalid(steps[index], field, 'Este campo es obligatorio.');
        isValid = false;
        firstInvalid = firstInvalid || field;
        return;
      }

      // Validaciones de formato específicas
      if (value && field.type === 'email' && !isValidEmail(value)) {
        markInvalid(steps[index], field, 'Ingresá un email válido.');
        isValid = false;
        firstInvalid = firstInvalid || field;
        return;
      }

      if (value && field.type === 'tel' && !isValidPhone(value)) {
        markInvalid(steps[index], field, 'Ingresá un número de al menos 8 dígitos.');
        isValid = false;
        firstInvalid = firstInvalid || field;
        return;
      }

      markValid(steps[index], field);
    });

    // Lleva el foco al primer error para no dejar al usuario buscándolo
    if (firstInvalid) firstInvalid.focus();

    return isValid;
  }

  // Avanzar: solo si el paso actual está validado
  btnNext.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    renderStep(currentStep);
  });

  // Retroceder: sin validación, el usuario puede corregir libremente
  btnPrev.addEventListener('click', () => {
    currentStep = Math.max(currentStep - 1, 0);
    renderStep(currentStep);
  });

  // Enter dentro de un input avanza de paso en vez de enviar el formulario
  form.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    // En BUTTON, Enter ya tiene su propio significado (activarlo): interceptarlo
    // hacía que "Volver" avanzara de paso en lugar de retroceder.
    if (event.key !== 'Enter' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (currentStep < steps.length - 1) {
      event.preventDefault();
      btnNext.click();
    }
  });

  // Envío final: revalida todos los pasos antes de dar por completado
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Cada paso se renderiza ANTES de validarlo. Si el paso sigue en
    // display:none, el focus() sobre el primer campo con error no hace nada
    // y el usuario se queda sin saber qué tiene que corregir.
    for (let i = 0; i < steps.length; i += 1) {
      currentStep = i;
      renderStep(i);
      if (!validateStep(i)) return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    hideAlerts();

    // MODO WHATSAPP (FORM_ENDPOINT vacío, el actual). Se resuelve sin await:
    // window.open tiene que correr dentro del gesto del usuario o el bloqueador
    // de pop-ups lo frena.
    if (!FORM_ENDPOINT) {
      openWhatsapp(buildWhatsappUrl(payload));
      return;
    }

    // MODO ENDPOINT. Se activa solo con cargar la URL en FORM_ENDPOINT.
    setSubmitting(true);

    try {
      await sendLead(payload);
      showSuccess(false);
    } catch (error) {
      console.error('[NetFlow] Falló el envío del lead:', error);
      setSubmitting(false);
      if (errorBox) errorBox.hidden = false;
      if (status) status.textContent = 'No se pudo enviar el formulario';
    }
  });

  /**
   * Deriva el lead a WhatsApp. Si el navegador bloquea la ventana —Safari/iOS
   * y varios bloqueadores lo hacen— NO damos el envío por hecho: antes se
   * mostraba "listo" sin que se hubiera abierto nada y el usuario se iba
   * creyendo que nos había escrito. Ahora ofrecemos el botón de apertura
   * manual, cuyo click sí cuenta como gesto directo y nunca se bloquea.
   */
  function openWhatsapp(url) {
    const popup = window.open(url, '_blank', 'noopener');

    // Un pop-up bloqueado devuelve null; algunos bloqueadores devuelven en
    // cambio una ventana que ya nace cerrada o sin la propiedad `closed`.
    const isBlocked = !popup || popup.closed || typeof popup.closed === 'undefined';

    if (isBlocked) {
      showWhatsappFallback(url);
      return;
    }

    showSuccess(true);
  }

  /**
   * Muestra el aviso + botón para abrir WhatsApp a mano. El bloque se crea una
   * sola vez y se reutiliza; el formulario queda visible para poder reintentar.
   */
  function showWhatsappFallback(url) {
    if (!whatsappFallback) whatsappFallback = buildFallbackBox();

    whatsappFallback.link.href = url;
    whatsappFallback.box.hidden = false;
    if (status) status.textContent = 'Falta un paso: abrí WhatsApp para enviarnos el mensaje';

    // El foco lleva al usuario directo a la acción que le queda pendiente.
    whatsappFallback.link.focus();
  }

  /** Arma el bloque de recuperación reutilizando los estilos ya existentes. */
  function buildFallbackBox() {
    const box = document.createElement('div');
    box.className = 'qform__error';
    box.id = 'qform-whatsapp-fallback';
    box.setAttribute('role', 'alert');
    box.hidden = true;

    // <span>, no <p>: la regla global de <p> pisaría el tamaño de .qform__error
    const text = document.createElement('span');
    text.style.display = 'block';
    text.textContent = 'Tu navegador bloqueó la ventana de WhatsApp, así que el mensaje todavía no salió. Abrilo con este botón: tus datos ya están cargados.';

    const link = document.createElement('a');
    link.className = 'btn btn--primary';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir WhatsApp';
    // Estilos inline: son los dos únicos ajustes de layout que necesita este
    // nodo y así el arreglo no obliga a tocar styles.css.
    link.style.display = 'inline-flex';
    link.style.marginTop = '0.9rem';
    // Recién acá el envío se da por hecho: el click abre la ventana sí o sí.
    link.addEventListener('click', () => showSuccess(true));

    box.append(text, link);
    form.append(box);

    return { box, link };
  }

  /** Oculta los avisos de intentos anteriores antes de un nuevo envío. */
  function hideAlerts() {
    if (errorBox) errorBox.hidden = true;
    if (whatsappFallback) whatsappFallback.box.hidden = true;
  }

  /** Bloquea el botón mientras se envía, para evitar leads duplicados. */
  function setSubmitting(isSubmitting) {
    hideAlerts();
    btnSubmit.disabled = isSubmitting;
    btnSubmit.textContent = isSubmitting ? 'Enviando…' : 'Agendar diagnóstico';
  }

  /**
   * Reemplaza el formulario por la confirmación. El texto cambia según la vía:
   * por WhatsApp el mensaje todavía lo tiene que enviar el usuario, así que
   * prometer "recibimos tus datos" sería mentirle.
   */
  function showSuccess(viaWhatsapp) {
    hideAlerts();
    steps.forEach((step) => step.classList.remove('is-active'));
    const actions = form.querySelector('.qform__actions');
    if (actions) actions.hidden = true;
    if (status) status.textContent = 'Formulario enviado';
    if (!success) return;
    if (viaWhatsapp) {
      success.textContent = 'Abrimos WhatsApp con tus datos ya cargados. Enviá el mensaje y te respondemos dentro de las próximas 24 horas hábiles.';
    }
    success.hidden = false;
  }

  renderStep(currentStep);
}

/**
 * Envía el lead al endpoint configurado. Es el ÚNICO lugar que hay que tocar
 * si el servicio elegido pide otro formato de body (por ejemplo HubSpot);
 * para Formspree, Make o n8n funciona tal cual está.
 * Lanza si la respuesta no es 2xx, para que el submit muestre el aviso de fallo.
 */
async function sendLead(payload) {
  const response = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`El endpoint respondió ${response.status}`);

  return response;
}

/**
 * Arma el link de WhatsApp con el lead ya redactado. Es la red de seguridad
 * mientras no haya FORM_ENDPOINT: el contacto llega igual.
 */
function buildWhatsappUrl(payload) {
  const labels = {
    nombre: 'Nombre',
    especialidad: 'Especialidad',
    ciudad: 'Ciudad',
    tratamiento: 'Tratamiento a potenciar',
    particulares: 'Atiende particulares',
    pacientes_adicionales: 'Pacientes adicionales por mes',
    inversion: 'Inversión actual en publicidad',
    whatsapp: 'WhatsApp',
    email: 'Email',
  };

  const lines = Object.entries(labels)
    .filter(([key]) => payload[key])
    .map(([key, label]) => `${label}: ${payload[key]}`);

  const message = ['Hola NetFlow, quiero agendar un diagnóstico.', '', ...lines].join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Marca un campo como inválido y muestra su mensaje. */
function markInvalid(scope, field, message) {
  field.setAttribute('aria-invalid', 'true');
  showFieldError(scope, field.name, message);
}

/** Limpia el estado de error de un campo válido. */
function markValid(scope, field) {
  field.removeAttribute('aria-invalid');
  clearFieldError(scope, field.name);
}

/** Escribe el mensaje en el <p> de error asociado al campo. */
function showFieldError(scope, name, message) {
  const target = scope.querySelector(`[data-error-for="${name}"]`);
  if (target) target.textContent = message;
}

/** Vacía el mensaje de error asociado al campo. */
function clearFieldError(scope, name) {
  const target = scope.querySelector(`[data-error-for="${name}"]`);
  if (target) target.textContent = '';
}

/** Validación de email suficiente para front (el backend valida en serio). */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Acepta espacios, guiones, paréntesis y +, exigiendo 8 dígitos mínimo. */
function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8;
}

/* ==========================================================================
   TESTIMONIOS — FALLBACK DE AVATARES
   ========================================================================== */

/**
 * Si una foto de testimonio no carga, la retira del DOM para que se vea el
 * círculo neutro con iniciales (data-initials) en lugar del ícono roto.
 * El script corre con defer: una imagen puede haber fallado antes, por eso
 * además del listener se revisan las que ya terminaron sin píxeles.
 */
function initAvatarFallback() {
  const avatars = document.querySelectorAll('.testimonial-card__avatar img');

  avatars.forEach((img) => {
    const dropImage = () => img.remove();

    if (img.complete && img.naturalWidth === 0) {
      dropImage();
      return;
    }

    img.addEventListener('error', dropImage, { once: true });
  });
}

/* ==========================================================================
   FOOTER
   ========================================================================== */

/** Mantiene el año del copyright actualizado sin tocar el HTML. */
function initFooterYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}
