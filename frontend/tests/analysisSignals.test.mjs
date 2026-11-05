import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function loadSource(name, dependencies = {}) {
  const source = fs.readFileSync(new URL(`../src/components/kam/${name}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const scope = { exports: {}, URL, URLSearchParams, require: name => dependencies[name] || require(name) };
  vm.runInNewContext(compiled.outputText, scope);
  return scope.exports;
}
const helpers = loadSource('analysisSignals.ts');
const charts = loadSource('AnalysisSignalCharts.tsx', {
  './analysisSignals': helpers,
  './AnalysisSignalCharts.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
});

test('query keeps drill-down filters, encodes searches and omits empty values', () => {
  const params = new URLSearchParams(helpers.signalQuery({ q: 'Mines & énergie', sector: '', page: 2, focus_day: '2026-11-05' }));
  assert.equal(params.get('q'), 'Mines & énergie');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('focus_day'), '2026-11-05');
  assert.equal(params.has('sector'), false);
});

test('source links reject executable schemes, malformed URLs and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:secret@example.com', 'invalid']) {
    assert.equal(helpers.safeSourceUrl(url), null);
  }
  assert.equal(helpers.safeSourceUrl('https://example.com/source'), 'https://example.com/source');
});

test('timestamps are shown in Kinshasa and missing event dates remain unknown', () => {
  assert.equal(helpers.signalDate(null), 'Non renseignée');
  assert.equal(helpers.signalDate('invalid'), 'Non renseignée');
  assert.match(helpers.signalDate('2026-11-04T23:30:00Z', true), /05 nov\. 2026.*00:30/);
});

test('zero and single-point trend series retain finite, honest chart geometry', () => {
  const points = helpers.trendPoints([{ day: '2026-11-05', count: 0 }]);
  assert.equal(points[0].x, 300);
  assert.equal(points[0].y, 158);
  assert.equal(helpers.trendPoints([]).length, 0);
});

const data = {
  options: { categories: { NEWS: 'Actualités' }, priorities: { UNKNOWN: 'À qualifier', HIGH: 'Haute' },
    confidences: { SUPPORTED: 'Sourcé', IDENTITY_UNCERTAIN: 'Identité à confirmer' } },
  period: { start: '2026-11-04', end: '2026-11-05' },
  timeline: [{ day: '2026-11-04', count: 0 }, { day: '2026-11-05', count: 2 }],
  priority_matrix: [{ review_priority: 'UNKNOWN', confidence: 'IDENTITY_UNCERTAIN', count: 2 }],
  sector_matrix: [{ sector: 'Industrie', analyzed_companies: 3, categories: { NEWS: 2 } }],
};

test('priority matrix renders unknown qualification and explicit accessible cell values', () => {
  const html = renderToStaticMarkup(React.createElement(charts.SignalPriorityMatrix, { data, onSelect() {} }));
  assert.match(html, /À qualifier, Identité à confirmer : 2 signal/);
  assert.equal((html.match(/<button/g) || []).length, 4);
  assert.match(html, /sans probabilité artificielle/);
});

test('sector matrix shows research coverage separately from signals', () => {
  const html = renderToStaticMarkup(React.createElement(charts.SectorSignalMatrix, { data, onSelect() {} }));
  assert.match(html, /Entreprises analysées/);
  assert.match(html, /Industrie, Actualités : 2 signal/);
  assert.match(html, /tabular-nums">3<\/td>/);
});

test('trend exposes keyboard-operable points and a readable daily-value alternative', () => {
  const html = renderToStaticMarkup(React.createElement(charts.SignalTrend, { data, onSelect() {} }));
  assert.match(html, /role="button" tabindex="0"/);
  assert.match(html, /Consulter les valeurs par jour/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
