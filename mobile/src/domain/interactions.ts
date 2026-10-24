// Pairwise checks across the active stack. Rules match on mechanism classes
// and describe pharmacology (shared receptors, additive effects). There are no
// "synergy" claims, and a pair with no matching rule is reported as unknown
// rather than safe.

import type { Compound, MechanismClass } from '@/data/types';

export type InteractionLevel = 'avoid' | 'caution' | 'monitor' | 'studied' | 'unknown';

export const LEVEL_ORDER: InteractionLevel[] = ['avoid', 'caution', 'monitor', 'studied', 'unknown'];

export const LEVEL_LABEL: Record<InteractionLevel, string> = {
  avoid: 'Avoid',
  caution: 'Caution',
  monitor: 'Monitor',
  studied: 'Studied together',
  unknown: 'No data',
};

export interface StackItem {
  /** Library compound, or null for a custom entry. */
  compound: Compound | null;
  name: string;
}

export interface InteractionFinding {
  level: InteractionLevel;
  title: string;
  detail: string;
}

export interface PairResult {
  a: StackItem;
  b: StackItem;
  level: InteractionLevel;
  findings: InteractionFinding[];
}

const INCRETIN: MechanismClass[] = ['glp1-agonist', 'gip-agonist', 'glucagon-agonist'];

type Has = (c: MechanismClass | MechanismClass[]) => boolean;

interface Rule {
  test: (a: Has, b: Has, ids: [string, string]) => boolean;
  finding: InteractionFinding;
}

const either = (a: Has, b: Has, x: MechanismClass | MechanismClass[], y: MechanismClass | MechanismClass[]) =>
  (a(x) && b(y)) || (a(y) && b(x));

const RULES: Rule[] = [
  {
    test: (_a, _b, [x, y]) => (x === 'cagrilintide' && y === 'semaglutide') || (x === 'semaglutide' && y === 'cagrilintide'),
    finding: {
      level: 'studied',
      title: 'Studied as a combination',
      detail:
        'Cagrilintide with semaglutide (CagriSema) has been tested in large clinical trials. Gastrointestinal side effects are additive, so trials escalated both doses gradually.',
    },
  },
  {
    test: (a, b) => a(INCRETIN) && b(INCRETIN),
    finding: {
      level: 'avoid',
      title: 'Overlapping incretin agonists',
      detail:
        'Both act on GLP-1-family receptors. Combining them duplicates the mechanism and adds nausea, vomiting, dehydration and hypoglycaemia risk. No trials support using two incretin agonists together.',
    },
  },
  {
    test: (a, b, [x, y]) =>
      either(a, b, 'amylin-agonist', 'glp1-agonist') && !((x === 'cagrilintide' && y === 'semaglutide') || (x === 'semaglutide' && y === 'cagrilintide')),
    finding: {
      level: 'monitor',
      title: 'Additive appetite and GI effects',
      detail: 'Amylin and GLP-1 agonists both slow gastric emptying and reduce appetite. This specific pairing has little trial data; watch hydration and GI tolerance.',
    },
  },
  {
    test: (a, b) => a('gh-secretagogue') && b('gh-secretagogue'),
    finding: {
      level: 'avoid',
      title: 'Same receptor twice',
      detail: 'Both act on the ghrelin (GHS-R1a) receptor. Combining them stacks side effects such as hunger, water retention and raised glucose without a documented benefit.',
    },
  },
  {
    test: (a, b) => a('ghrh-analog') && b('ghrh-analog'),
    finding: {
      level: 'avoid',
      title: 'Same receptor twice',
      detail: 'Both are GHRH-receptor agonists. Two at once duplicates the mechanism.',
    },
  },
  {
    test: (a, b) => either(a, b, 'gh-secretagogue', 'ghrh-analog'),
    finding: {
      level: 'monitor',
      title: 'Additive growth-hormone release',
      detail:
        'GHRH analogues and ghrelin-receptor agonists act on different receptors and together raise GH more than either alone. Watch for water retention, numbness or tingling, joint aches and raised fasting glucose.',
    },
  },
  {
    test: (a, b) => either(a, b, 'growth-hormone', ['gh-secretagogue', 'ghrh-analog', 'igf1-analog']),
    finding: {
      level: 'caution',
      title: 'Compounded GH / IGF-1 effect',
      detail: 'Growth hormone plus another agent that raises GH or IGF-1 magnifies effects on IGF-1, blood glucose and fluid retention. Lab monitoring of IGF-1 and glucose is standard.',
    },
  },
  {
    test: (a, b) => either(a, b, 'igf1-analog', ['gh-secretagogue', 'ghrh-analog']),
    finding: {
      level: 'caution',
      title: 'Additive IGF-1 axis activity',
      detail: 'IGF-1 lowers blood glucose while GH raises it; combining both kinds of agent makes glucose harder to predict.',
    },
  },
  {
    test: (a, b) => either(a, b, 'glucose-lowering', 'igf1-analog'),
    finding: {
      level: 'caution',
      title: 'Hypoglycaemia risk',
      detail: 'Both can lower blood glucose. The effect is additive; know the signs of low blood sugar.',
    },
  },
  {
    test: (a, b) => a('melanocortin-agonist') && b('melanocortin-agonist'),
    finding: {
      level: 'avoid',
      title: 'Overlapping melanocortin agonists',
      detail: 'Both activate melanocortin receptors. Combining adds nausea, flushing, blood-pressure rises and skin darkening.',
    },
  },
  {
    test: (a, b) => either(a, b, 'melanocortin-agonist', 'monoamine-reuptake-inhibitor'),
    finding: {
      level: 'caution',
      title: 'Blood pressure and heart rate',
      detail: 'Both can raise blood pressure and heart rate. Monitor both, especially if you already have hypertension.',
    },
  },
  {
    test: (a, b) => either(a, b, INCRETIN, 'monoamine-reuptake-inhibitor'),
    finding: {
      level: 'monitor',
      title: 'Resting heart rate',
      detail: 'GLP-1-family agonists raise resting heart rate modestly and monoamine reuptake inhibitors raise it further.',
    },
  },
  {
    test: (a, b) => a('androgen') && b('androgen'),
    finding: {
      level: 'caution',
      title: 'Two androgens',
      detail: 'Two testosterone preparations add together. Check the combined weekly amount is what you intend.',
    },
  },
  {
    test: (a, b) => either(a, b, 'gonadotropin', 'androgen'),
    finding: {
      level: 'monitor',
      title: 'Used together clinically',
      detail: 'hCG is prescribed alongside testosterone to maintain testicular function. It can raise estradiol; labs are usually monitored.',
    },
  },
];

function hasFor(item: StackItem): Has {
  const classes = new Set(item.compound?.classes ?? []);
  return (c) => (Array.isArray(c) ? c.some((x) => classes.has(x)) : classes.has(c));
}

function idOf(item: StackItem): string {
  return item.compound?.id ?? `custom:${item.name.toLowerCase()}`;
}

export function checkPair(a: StackItem, b: StackItem): PairResult {
  const findings: InteractionFinding[] = [];
  const ids: [string, string] = [idOf(a), idOf(b)];

  if (ids[0] === ids[1]) {
    findings.push({
      level: 'caution',
      title: 'Same compound twice',
      detail: 'Two active protocols for the same compound add together. Check this is intended.',
    });
  } else if (a.compound && b.compound) {
    const ha = hasFor(a);
    const hb = hasFor(b);
    for (const rule of RULES) {
      if (rule.test(ha, hb, ids)) findings.push(rule.finding);
    }
  }

  if (findings.length === 0) {
    findings.push({
      level: 'unknown',
      title: 'No interaction data',
      detail: 'Titra has no rule for this pair. That is not evidence the combination is safe; ask a pharmacist or clinician.',
    });
  }

  findings.sort((x, y) => LEVEL_ORDER.indexOf(x.level) - LEVEL_ORDER.indexOf(y.level));
  return { a, b, level: findings[0].level, findings };
}

/** Every unordered pair in the stack, most serious first. */
export function checkStack(items: StackItem[]): PairResult[] {
  const out: PairResult[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) out.push(checkPair(items[i], items[j]));
  }
  return out.sort((x, y) => LEVEL_ORDER.indexOf(x.level) - LEVEL_ORDER.indexOf(y.level));
}
