/**
 * NetFlow — script.js
 * Estructura base de eventos. Se ejecuta cuando el DOM está listo.
 */

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
    if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return;
    if (currentStep < steps.length - 1) {
      event.preventDefault();
      btnNext.click();
    }
  });

  // Envío final: revalida todos los pasos antes de dar por completado
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        currentStep = i;
        renderStep(i);
        return;
      }
    }

    // Datos listos para enviar al backend / CRM
    const payload = Object.fromEntries(new FormData(form).entries());
    console.log('[NetFlow] Lead calificado:', payload);

    // TODO: reemplazar por el POST real al endpoint/CRM
    // fetch('/api/leads', { method: 'POST', body: JSON.stringify(payload) });

    steps.forEach((step) => step.classList.remove('is-active'));
    form.querySelector('.qform__actions').hidden = true;
    if (status) status.textContent = 'Formulario enviado';
    if (success) success.hidden = false;
  });

  renderStep(currentStep);
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
