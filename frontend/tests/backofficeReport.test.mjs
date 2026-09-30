import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Exercise the adapter against the two existing API contracts without a running backend.
const filename = fileURLToPath(new URL('../src/components/backoffice/backofficeReport.ts', import.meta.url));
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
let response;
const requests = [];
const adapter = new Module(filename);
adapter.require = (specifier) => {
  assert.equal(specifier, '@/lib/api');
  return { fetchAPI: async (endpoint, options) => {
    requests.push({ endpoint, options });
    return response;
  } };
};
adapter._compile(compiled, filename);
const { getBackofficeReportHref, normalizeBackofficeReport, fetchBackofficeReport } = adapter.exports;

test('report and guided form IDs remain distinct and preserve the return page', () => {
  assert.equal(getBackofficeReportHref({ id: 7, type: 'REPORT' }, 'salespersons'),
    '/backoffice/daily-report/report/7?from=salespersons');
  assert.equal(getBackofficeReportHref({ id: 7, type: 'SUBMISSION' }, 'soho-managed'),
    '/backoffice/daily-report/submission/7?from=soho-managed');
});

test('AI report details retain the enterprise, email, transcript and actions', () => {
  const report = normalizeBackofficeReport({
    id: 12,
    preparation_details: {
      enterprise_details: { name: 'Ateliers Matadi', plaque_code: 'MAT-02' },
      salesperson_username: 'commercial_matadi',
    },
    executive_summary: 'La connexion doit être stabilisée.',
    confirmed_needs: ['Connexion de secours'],
    objections_raised: ['Budget annuel'],
    actions_todo: ['Envoyer la proposition'],
    follow_up_email_draft: 'Bonjour, voici la proposition.',
    raw_transcript: 'La connexion coupe pendant les livraisons.',
  }, 'report');
  assert.equal(report.enterprise_name, 'Ateliers Matadi');
  assert.equal(report.plaque_code, 'MAT-02');
  assert.equal(report.salesperson_name, 'commercial_matadi');
  assert.deepEqual(report.confirmed_needs, ['Connexion de secours']);
  assert.deepEqual(report.objections_raised, ['Budget annuel']);
  assert.deepEqual(report.actions_todo, ['Envoyer la proposition']);
  assert.equal(report.follow_up_email_draft, 'Bonjour, voici la proposition.');
  assert.equal(report.raw_transcript, 'La connexion coupe pendant les livraisons.');
});

test('guided form details retain questionnaire answers, a zero score and next action', () => {
  const answers = [{ question_text: 'Nombre de sites', answer: 0 }, { question_text: 'VPN installé', answer: false }];
  const report = normalizeBackofficeReport({
    id: 12,
    enterprise_name: 'Comptoir du Fleuve',
    ai_summary: 'Visite de qualification.',
    detected_needs: ['Fibre professionnelle'],
    objections_noted: 'Attendre le devis',
    next_action: 'Préparer le devis',
    qualification_score: 0,
    target_offer_name: 'Fibre Pro',
    answers,
  }, 'submission');
  assert.equal(report.executive_summary, 'Visite de qualification.');
  assert.deepEqual(report.confirmed_needs, ['Fibre professionnelle']);
  assert.deepEqual(report.objections_raised, ['Attendre le devis']);
  assert.deepEqual(report.actions_todo, ['Préparer le devis']);
  assert.equal(report.qualification_score, 0);
  assert.equal(report.target_offer_name, 'Fibre Pro');
  assert.deepEqual(report.answers, answers);
  assert.equal(report.follow_up_email_draft, '');
});

test('direct report navigation loads the sales report endpoint and propagates cancellation', async () => {
  response = { id: 31, enterprise_name: 'Ateliers Matadi', executive_summary: 'Rapport complet.' };
  const signal = new AbortController().signal;
  const report = await fetchBackofficeReport('report', 31, signal);
  assert.equal(report.id, 31);
  assert.equal(requests.at(-1).endpoint, '/api/sales/visit-reports/31/');
  assert.equal(requests.at(-1).options.signal, signal);
});

test('direct form navigation selects the requested submission after a reload', async () => {
  response = [{ id: 31, enterprise_name: 'Compte voisin' }, { id: 32, enterprise_name: 'Compte attendu' }];
  const report = await fetchBackofficeReport('submission', 32);
  assert.equal(report.enterprise_name, 'Compte attendu');
  assert.equal(requests.at(-1).endpoint, '/api/sales/visit-form/submissions/');
  await assert.rejects(fetchBackofficeReport('submission', 99), /introuvable/);
});

test('invalid report types never make an API request', async () => {
  const previousCount = requests.length;
  await assert.rejects(fetchBackofficeReport('invalid', 31), /introuvable/);
  assert.equal(requests.length, previousCount);
});
