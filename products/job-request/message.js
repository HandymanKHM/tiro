// Pure logic for the Job Request page. No DOM access, so it runs in Node tests.

export const JOB_TYPES = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Tiling',
  'Roofing',
  'General repairs',
  'Other',
];

export const URGENCY = ['Emergency (today)', 'This week', 'Flexible'];

const MAX_DESCRIPTION = 1000;

// South African numbers: 0XXXXXXXXX or +27XXXXXXXXX / 27XXXXXXXXX.
// Returns the international form (27XXXXXXXXX) or null if invalid.
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;
  if (/^0\d{9}$/.test(digits)) return '27' + digits.slice(1);
  if (/^27\d{9}$/.test(digits)) return digits;
  return null;
}

// Returns an object of field -> message. Empty object means valid.
export function validate(request) {
  const r = request ?? {};
  const errors = {};
  const name = String(r.name ?? '').trim();
  const area = String(r.area ?? '').trim();
  const description = String(r.description ?? '').trim();

  if (name.length < 2) errors.name = 'Please enter your name.';
  if (normalizePhone(r.phone) === null) {
    errors.phone = 'Please enter a valid South African phone number, e.g. 082 123 4567.';
  }
  if (area.length < 2) errors.area = 'Please enter your suburb or area.';
  if (!JOB_TYPES.includes(r.jobType)) errors.jobType = 'Please choose the type of job.';
  if (!URGENCY.includes(r.urgency)) errors.urgency = 'Please choose how urgent it is.';
  if (description.length < 10) {
    errors.description = 'Please describe the job in a sentence or two.';
  } else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Please keep the description under ${MAX_DESCRIPTION} characters.`;
  }
  return errors;
}

export function buildMessage(request, config) {
  const phone = normalizePhone(request.phone);
  return [
    `New job request for ${config.businessName}`,
    '',
    `Name: ${request.name.trim()}`,
    `Phone: +${phone}`,
    `Area: ${request.area.trim()}`,
    `Job: ${request.jobType}`,
    `Urgency: ${request.urgency}`,
    '',
    'Details:',
    request.description.trim(),
  ].join('\n');
}

// The business number must be in international form, digits only (e.g. 27821234567).
export function isConfigured(config) {
  return /^\d{10,15}$/.test(String(config?.whatsappNumber ?? ''));
}

export function whatsappLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
