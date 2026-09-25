import { config } from './config.js';
import {
  JOB_TYPES,
  URGENCY,
  validate,
  buildMessage,
  isConfigured,
  whatsappLink,
} from './message.js';

const form = document.getElementById('job-form');
const preview = document.getElementById('preview');
const previewText = document.getElementById('preview-text');
const live = isConfigured(config);

document.getElementById('business-name').textContent = config.businessName;
document.getElementById('preview-banner').hidden = live;

function fillSelect(id, options) {
  const select = document.getElementById(id);
  for (const value of options) select.append(new Option(value, value));
}
fillSelect('jobType', JOB_TYPES);
fillSelect('urgency', URGENCY);

function showErrors(errors) {
  for (const el of form.querySelectorAll('[data-error-for]')) {
    const field = el.dataset.errorFor;
    el.textContent = errors[field] ?? '';
    form.elements[field].setAttribute('aria-invalid', field in errors ? 'true' : 'false');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const request = Object.fromEntries(new FormData(form));
  const errors = validate(request);
  showErrors(errors);
  if (Object.keys(errors).length > 0) {
    form.elements[Object.keys(errors)[0]].focus();
    return;
  }
  const text = buildMessage(request, config);
  if (live) {
    window.location.href = whatsappLink(config.whatsappNumber, text);
  } else {
    previewText.textContent = text;
    preview.hidden = false;
    preview.scrollIntoView({ behavior: 'smooth' });
  }
});
