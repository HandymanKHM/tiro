import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOB_TYPES,
  URGENCY,
  normalizePhone,
  validate,
  buildMessage,
  isConfigured,
  whatsappLink,
} from '../products/job-request/message.js';
import { config } from '../products/job-request/config.js';

const good = {
  name: 'Thandi Mokoena',
  phone: '082 123 4567',
  area: 'Hadison Park',
  jobType: 'Plumbing',
  urgency: 'Emergency (today)',
  description: 'Geyser leaking from the bottom since this morning.',
};

test('normalizePhone accepts local and international SA formats', () => {
  assert.equal(normalizePhone('082 123 4567'), '27821234567');
  assert.equal(normalizePhone('+27 82 123 4567'), '27821234567');
  assert.equal(normalizePhone('27821234567'), '27821234567');
  assert.equal(normalizePhone('(082) 123-4567'), '27821234567');
});

test('normalizePhone rejects wrong lengths, letters and empty input', () => {
  for (const bad of ['', '12345', '0821234567890', '082abc4567', undefined, null]) {
    assert.equal(normalizePhone(bad), null, `expected ${bad} to be rejected`);
  }
});

test('a complete request is valid', () => {
  assert.deepEqual(validate(good), {});
});

test('every missing field is reported', () => {
  const errors = validate({});
  assert.deepEqual(
    Object.keys(errors).sort(),
    ['area', 'description', 'jobType', 'name', 'phone', 'urgency'],
  );
});

test('unknown job type or urgency is rejected', () => {
  assert.ok(validate({ ...good, jobType: 'Hacking' }).jobType);
  assert.ok(validate({ ...good, urgency: 'Yesterday' }).urgency);
});

test('description must be meaningful but not huge', () => {
  assert.ok(validate({ ...good, description: 'leak' }).description);
  assert.ok(validate({ ...good, description: 'x'.repeat(1001) }).description);
});

test('message contains every detail, trimmed, with international phone', () => {
  const msg = buildMessage({ ...good, name: '  Thandi Mokoena ' }, { businessName: 'Acme' });
  assert.match(msg, /^New job request for Acme/);
  for (const line of [
    'Name: Thandi Mokoena',
    'Phone: +27821234567',
    'Area: Hadison Park',
    'Job: Plumbing',
    'Urgency: Emergency (today)',
    good.description,
  ]) {
    assert.ok(msg.includes(line), `missing: ${line}`);
  }
});

test('whatsapp link encodes the message safely', () => {
  const link = whatsappLink('27821234567', 'Hi & bye\nline two?');
  assert.equal(link, 'https://wa.me/27821234567?text=Hi%20%26%20bye%0Aline%20two%3F');
});

test('isConfigured only accepts digits-only international numbers', () => {
  assert.equal(isConfigured({ whatsappNumber: '' }), false);
  assert.equal(isConfigured({ whatsappNumber: '082 123 4567' }), false);
  assert.equal(isConfigured({ whatsappNumber: '+27821234567' }), false);
  assert.equal(isConfigured({ whatsappNumber: '27821234567' }), true);
});

test('shipped config is either empty (preview) or a valid number', () => {
  assert.equal(typeof config.businessName, 'string');
  assert.ok(config.businessName.trim().length > 0);
  assert.ok(config.whatsappNumber === '' || isConfigured(config));
});

test('option lists are non-empty and unique', () => {
  for (const list of [JOB_TYPES, URGENCY]) {
    assert.ok(list.length > 0);
    assert.equal(new Set(list).size, list.length);
  }
});
