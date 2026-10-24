import type { Compound, MechanismClass } from '@/data/types';

import { checkPair, checkStack } from '../interactions';

function c(id: string, classes: MechanismClass[]): Compound {
  return {
    id,
    name: id,
    aliases: [],
    category: 'metabolic',
    classes,
    summary: '',
    mechanism: '',
    regulatory: { status: 'approved', detail: '' },
    evidence: 'extensive',
    evidenceNote: '',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: [],
    seriousRisks: [],
    cautions: [],
    sources: [],
  };
}

const item = (compound: Compound) => ({ compound, name: compound.name });

const sema = c('semaglutide', ['glp1-agonist', 'glucose-lowering']);
const tirz = c('tirzepatide', ['glp1-agonist', 'gip-agonist', 'glucose-lowering']);
const cagri = c('cagrilintide', ['amylin-agonist']);
const ipa = c('ipamorelin', ['gh-secretagogue']);
const mk = c('ibutamoren', ['gh-secretagogue']);
const tesa = c('tesamorelin', ['ghrh-analog']);
const igf = c('igf-1-lr3', ['igf1-analog']);
const pt = c('bremelanotide', ['melanocortin-agonist']);
const mt2 = c('melanotan-ii', ['melanocortin-agonist']);
const bpc = c('bpc-157', ['tissue-repair']);

describe('checkPair', () => {
  it('flags two incretin agonists as avoid', () => {
    expect(checkPair(item(sema), item(tirz)).level).toBe('avoid');
  });

  it('recognises the studied CagriSema pairing', () => {
    const r = checkPair(item(cagri), item(sema));
    expect(r.level).toBe('studied');
    expect(r.findings.some((f) => f.level === 'monitor')).toBe(false);
  });

  it('other amylin + GLP-1 pairings are monitor', () => {
    expect(checkPair(item(cagri), item(tirz)).level).toBe('monitor');
  });

  it('duplicate GHS receptor is avoid; GHRH + GHS is monitor', () => {
    expect(checkPair(item(ipa), item(mk)).level).toBe('avoid');
    expect(checkPair(item(ipa), item(tesa)).level).toBe('monitor');
  });

  it('IGF-1 with a glucose-lowering drug is caution', () => {
    expect(checkPair(item(igf), item(sema)).level).toBe('caution');
  });

  it('two melanocortin agonists are avoid', () => {
    expect(checkPair(item(pt), item(mt2)).level).toBe('avoid');
  });

  it('unmatched pairs are unknown, never safe', () => {
    const r = checkPair(item(bpc), item(sema));
    expect(r.level).toBe('unknown');
    expect(r.findings[0].detail).toMatch(/not evidence/);
  });

  it('same compound twice is caution', () => {
    expect(checkPair(item(sema), item(sema)).level).toBe('caution');
  });

  it('custom entries are unknown', () => {
    expect(checkPair({ compound: null, name: 'Mystery' }, item(sema)).level).toBe('unknown');
  });
});

describe('checkStack', () => {
  it('evaluates every pair, most serious first', () => {
    const r = checkStack([item(sema), item(tirz), item(bpc), item(cagri), item(ipa)]);
    expect(r).toHaveLength(10);
    expect(r[0].level).toBe('avoid');
    expect(r[r.length - 1].level).toBe('unknown');
  });
});
