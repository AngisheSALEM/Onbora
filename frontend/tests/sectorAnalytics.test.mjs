import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

// Exercise the actual TypeScript helpers using the project's existing compiler.
const source = fs.readFileSync(new URL('../src/components/kam/sectorAnalytics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } });
const scope = { exports: {} };
vm.runInNewContext(compiled.outputText, scope);
const { renewalDays, sectorGroups, confirmedNeedGroups } = scope.exports;
const account = (id, sector, needs = []) => ({ id, sector, needs, offers: [] });

test('renewal windows include today and exact boundaries without timezone drift', () => {
  assert.equal(renewalDays('2026-11-05', '2026-11-05'), 0);
  assert.equal(renewalDays('2026-12-05', '2026-11-05'), 30);
  assert.equal(renewalDays('2026-12-06', '2026-11-05'), 31);
  assert.equal(renewalDays('2027-01-04', '2026-11-05'), 60);
  assert.equal(renewalDays('2027-01-05', '2026-11-05'), 61);
  assert.equal(renewalDays('2027-02-03', '2026-11-05'), 90);
  assert.equal(renewalDays('2026-11-04', '2026-11-05'), -1);
  assert.equal(renewalDays(null, '2026-11-05'), null);
  assert.equal(renewalDays('invalid', '2026-11-05'), null);
});

test('sector labels ignore case, preserve unknown sectors and sort by account count', () => {
  const groups = sectorGroups([account('1', 'Banque'), account('2', 'banque'), account('3', 'Secteur non renseigné')]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Banque');
  assert.equal(groups[0].accounts.length, 2);
  assert.equal(groups[1].label, 'Secteur non renseigné');
  assert.equal(sectorGroups([]).length, 0);
});

test('a repeated confirmed need counts each account once and retains drill-down ids', () => {
  const groups = confirmedNeedGroups([
    account('1', 'Banque', ['sauvegarde', 'sauvegarde', 'connexion']),
    account('2', 'Santé', ['sauvegarde']),
  ]);
  assert.equal(groups[0].label, 'sauvegarde');
  assert.equal(groups[0].accounts.length, 2);
  assert.equal(groups[0].accounts[0].id, '1');
  assert.equal(groups[0].accounts[1].id, '2');
  assert.equal(confirmedNeedGroups([account('3', 'Santé')]).length, 0);
});
