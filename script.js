/**
 * NetFlow — script.js
 * Estructura base de eventos. Se ejecuta cuando el DOM está listo.
 */

/* ==========================================================================
   CONFIGURACIÓN — editar solo estas dos constantes
   ========================================================================== */

/**
 * Endpoint que recibe los leads (Formspree, Make, n8n, tu propia API...).
 * Mientras esté vacío el lead NO se pierde: el formulario deriva los datos
 * a WhatsApp ya cargados para que la conversación arranque igual.
 */
const FORM_ENDPOINT = '';

/** WhatsApp de NetFlow en formato internacional, solo dígitos. */
const WHATSAPP_NUMBER = '541168292740';

document.addEventListener('DOMContentLoaded', () => {
  initCtaTracking();
  initHeaderScrollState();
  initFaqAccordion();
  initQualifyForm();
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
   SECCIÓN 9 — ACORDEÓN DE FAQs
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
   SECCIÓN 10 — FORMULARIO DE CALIFICACIÓN PROGRESIVO
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
    setSubmitting(true);

    try {
      if (FORM_ENDPOINT) {
        const response = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`El endpoint respondió ${response.status}`);
      } else {
        // window.open va antes de cualquier await: así sigue contando como
        // gesto del usuario y el bloqueador de pop-ups no lo frena.
        window.open(buildWhatsappUrl(payload), '_blank', 'noopener');
      }
      showSuccess(!FORM_ENDPOINT);
    } catch (error) {
      console.error('[NetFlow] Falló el envío del lead:', error);
      setSubmitting(false);
      if (errorBox) errorBox.hidden = false;
      if (status) status.textContent = 'No se pudo enviar el formulario';
    }
  });

  /** Bloquea el botón mientras se envía, para evitar leads duplicados. */
  function setSubmitting(isSubmitting) {
    if (errorBox) errorBox.hidden = true;
    btnSubmit.disabled = isSubmitting;
    btnSubmit.textContent = isSubmitting ? 'Enviando…' : 'Agendar diagnóstico';
  }

  /**
   * Reemplaza el formulario por la confirmación. El texto cambia según la vía:
   * por WhatsApp el mensaje todavía lo tiene que enviar el usuario, así que
   * prometer "recibimos tus datos" sería mentirle.
   */
  function showSuccess(viaWhatsapp) {
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
   FOOTER
   ========================================================================== */

/** Mantiene el año del copyright actualizado sin tocar el HTML. */
function initFooterYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}
