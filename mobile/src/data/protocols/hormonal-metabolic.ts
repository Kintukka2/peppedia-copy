// Protocol templates for metabolic, hormonal, melanocortin and GH-axis
// compounds, plus stacks made only of these compounds. Label and trial
// templates follow the prescribing information or the trial as run; clinic,
// community and vendor templates follow what those sources report. Every URL is
// a page that was checked, or a search link labelled as a search.

import type { Dose, ProtocolTemplate, SourceLink } from '../types';

const mg = (value: number): Dose => ({ value, unit: 'mg' });
const mcg = (value: number): Dose => ({ value, unit: 'mcg' });
const iu = (value: number): Dose => ({ value, unit: 'iu' });

/** Titration steps from [weeks, value] pairs, all in one unit. The last step holds indefinitely. */
const steps = (unit: (value: number) => Dose, pairs: [number, number][]) => pairs.map(([weeks, value]) => ({ weeks, dose: unit(value) }));

const SUN = 0;
const MON = 1;
const WED = 3;
const THU = 4;
const FRI = 5;

const pubmed = (pmid: string, label: string): SourceLink => ({ label, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
const pubmedSearch = (term: string, label: string): SourceLink => ({
  label,
  url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`,
});
const ctgov = (nct: string, label: string): SourceLink => ({ label, url: `https://clinicaltrials.gov/study/${nct}` });
const dailymed = (query: string, label: string): SourceLink => ({
  label,
  url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(query)}`,
});
const redditSearch = (sub: string, q: string): SourceLink => ({
  label: `r/${sub} search: "${q}"`,
  url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(q)}`,
});
const wiki = (slug: string, name: string): SourceLink => ({
  label: `Peptide Protocol Wiki: ${name} community protocols`,
  url: `https://www.peptideprotocolwiki.com/peptides/${slug}/community`,
});

const ENDO_SOCIETY_TRT: SourceLink = {
  label: 'Endocrine Society guideline: testosterone therapy in men with hypogonadism (JCEM 2018)',
  url: 'https://academic.oup.com/jcem/article/103/5/1715/4939465',
};
const HEALTHRX_TRT: SourceLink = {
  label: 'HealthRx: standard TRT protocol',
  url: 'https://healthrx.com/mens-trt/standard-trt-protocol',
};
const HCG_FERTILITY_REVIEW: SourceLink = {
  label: 'Lee & Ramasamy: hCG for infertility in hypogonadal men (Transl Androl Urol 2018, PMC)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6087849/',
};
const GLP3_TIRZ_MICRODOSE: SourceLink = {
  label: 'GLP3 Planner: tirzepatide microdosing guide',
  url: 'https://glp3planner.com/resources/tirzepatide-microdosing-guide',
};

export const HORMONAL_METABOLIC_TEMPLATES: ProtocolTemplate[] = [
  // ── Semaglutide ────────────────────────────────────────────────────────────
  {
    id: 'semaglutide-label-wegovy',
    name: 'Wegovy titration',
    source: 'label',
    reportedBy: 'Wegovy US prescribing information',
    goal: 'Chronic weight management',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'semaglutide', dose: mg(0.25) }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 0.25],
      [4, 0.5],
      [4, 1],
      [4, 1.7],
      [4, 2.4],
    ]),
    notes: [
      'Same day each week, any time, with or without food. Rotate abdomen, thigh and upper arm.',
      'If a step is not tolerated, the label allows delaying the next increase by 4 weeks.',
      'Maintenance is 2.4 mg (or 1.7 mg). After at least 4 weeks on 2.4 mg, the US label allows up to 7.2 mg weekly if more weight loss is needed.',
      'Nausea, reflux and constipation are most common in the days after each increase.',
    ],
    sources: [dailymed('Wegovy', 'DailyMed: Wegovy label')],
  },
  {
    id: 'semaglutide-label-wegovy-tablets',
    name: 'Wegovy tablets titration',
    source: 'label',
    reportedBy: 'Wegovy US prescribing information (tablets)',
    goal: 'Chronic weight management',
    route: 'oral',
    kind: 'single',
    components: [{ compoundId: 'semaglutide', dose: mg(1.5) }],
    schedule: { kind: 'daily', times: ['07:00'] },
    titration: steps(mg, [
      [4, 1.5],
      [4, 4],
      [4, 9],
      [4, 25],
    ]),
    notes: [
      'Take on waking on an empty stomach with up to 120 mL of plain water, then wait at least 30 minutes before food, drink or other oral medicines.',
      'The label steps are 30 days each (days 1–30, 31–60, 61–90); the app rounds them to 4 weeks. 25 mg daily is the maintenance dose.',
      'Tablet strengths differ from Rybelsus and the injection, so do not swap products at the same mg.',
    ],
    sources: [dailymed('Wegovy', 'DailyMed: Wegovy label')],
  },
  {
    id: 'semaglutide-community-microdose-split',
    name: 'Microdose, split twice weekly',
    source: 'community',
    reportedBy: 'Reported on r/Semaglutide and r/Peptides; compiled by Peptide Protocol Wiki',
    goal: 'Appetite control with less nausea',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'semaglutide', dose: mg(0.125), range: { min: 0.125, max: 0.25 } }],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '09:00' },
    notes: [
      'A low weekly dose split into two shots 3–4 days apart to flatten peaks; users report less nausea. Not tested in trials.',
      'Compounded vials vary (5 mg/2 mL is 2.5 mg/mL, where 0.125 mg is 5 units). Recheck the concentration with every new vial: mix-ups have caused 5–20× overdoses.',
      'Most step up only when the appetite effect fades, and hold if nausea persists.',
    ],
    sources: [wiki('semaglutide', 'Semaglutide'), redditSearch('Semaglutide', 'microdose split dose')],
  },
  {
    id: 'semaglutide-community-low-dose-maintenance',
    name: 'Low-dose maintenance',
    source: 'community',
    reportedBy: 'Common on r/Semaglutide and r/Ozempic; compiled by Peptide Protocol Wiki',
    goal: 'Keep weight off on the lowest dose that works',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'semaglutide', dose: mg(0.5), range: { min: 0.5, max: 1.7 } }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    notes: [
      'Reached through the usual 4-week steps, then held at 0.5–1 mg (or 1–1.7 mg) by people who hit their goal or cannot tolerate 2.4 mg.',
      'People step back up a level if appetite returns and weight drifts up.',
      'Weigh weekly at the same time so changes in dose can be judged.',
    ],
    sources: [wiki('semaglutide', 'Semaglutide'), redditSearch('Semaglutide', 'maintenance dose')],
  },

  // ── Tirzepatide ────────────────────────────────────────────────────────────
  {
    id: 'tirzepatide-label-zepbound',
    name: 'Zepbound titration',
    source: 'label',
    reportedBy: 'Zepbound and Mounjaro US prescribing information',
    goal: 'Chronic weight management or type 2 diabetes',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'tirzepatide', dose: mg(2.5) }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 2.5],
      [4, 5],
      [4, 7.5],
      [4, 10],
      [4, 12.5],
      [4, 15],
    ]),
    notes: [
      'Increase in 2.5 mg steps after at least 4 weeks on each dose. Maintenance is 5, 10 or 15 mg, so stopping at a lower step is within the label.',
      'Missed dose: take it within 4 days, otherwise skip it. Keep at least 3 days between doses if you change your injection day.',
      'On the pill, switch to a non-oral method or add a barrier method for 4 weeks after starting and after each increase.',
    ],
    sources: [dailymed('Zepbound', 'DailyMed: Zepbound label'), dailymed('Mounjaro', 'DailyMed: Mounjaro label')],
  },
  {
    id: 'tirzepatide-community-split',
    name: 'Split dose, twice weekly',
    source: 'community',
    reportedBy: 'Common on r/tirzepatidecompound and r/Mounjaro; compiled by Peptide Protocol Wiki and GLP3 Planner',
    goal: 'Steadier appetite control with fewer post-shot side effects',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'tirzepatide', dose: mg(1.25), range: { min: 1.25, max: 7.5 } }],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '09:00' },
    notes: [
      'The weekly dose is halved and given 3–4 days apart; users report steadier levels and less nausea. Not studied in trials.',
      'People keep the 4-week steps, each split in two (1.25 → 2.5 → 3.75 mg per shot and so on). Many settle at 7.5–10 mg a week in total.',
      'Needs a vial: Zepbound and Mounjaro pens cannot deliver a split dose.',
    ],
    sources: [wiki('tirzepatide', 'Tirzepatide'), GLP3_TIRZ_MICRODOSE, redditSearch('tirzepatidecompound', 'split dose twice weekly')],
  },
  {
    id: 'tirzepatide-community-microdose',
    name: 'Sub-starting microdose',
    source: 'community',
    reportedBy: 'Online communities and compounding-clinic protocols, as summarised by GLP3 Planner',
    goal: 'Mild appetite control below the label starting dose',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'tirzepatide', dose: mg(0.5), range: { min: 0.25, max: 1 } }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    notes: [
      '0.25–1 mg once weekly, below the 2.5 mg label start. No trial has tested these doses for weight loss.',
      'Work out units from your vial’s mg/mL every time; at 10 mg/mL, 0.5 mg is 5 units.',
      'Some split the same weekly total into two or three shots.',
    ],
    sources: [GLP3_TIRZ_MICRODOSE, wiki('tirzepatide', 'Tirzepatide')],
  },

  // ── Liraglutide ────────────────────────────────────────────────────────────
  {
    id: 'liraglutide-label-saxenda',
    name: 'Saxenda titration',
    source: 'label',
    reportedBy: 'Saxenda US prescribing information',
    goal: 'Chronic weight management',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'liraglutide', dose: mg(0.6) }],
    schedule: { kind: 'daily', times: ['08:00'] },
    titration: steps(mg, [
      [1, 0.6],
      [1, 1.2],
      [1, 1.8],
      [1, 2.4],
      [1, 3],
    ]),
    notes: [
      'Once daily at any time, with or without meals; keep roughly the same time each day.',
      'If a step is not tolerated, the label allows delaying the next increase by about a week. Stop if 3 mg cannot be tolerated.',
      'Check progress at 16 weeks: the label says to stop if you have not lost at least 4% of starting weight.',
    ],
    sources: [dailymed('Saxenda', 'DailyMed: Saxenda label')],
  },
  {
    id: 'liraglutide-label-victoza',
    name: 'Victoza start',
    source: 'label',
    reportedBy: 'Victoza US prescribing information',
    goal: 'Type 2 diabetes glucose control',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'liraglutide', dose: mg(0.6) }],
    schedule: { kind: 'daily', times: ['08:00'] },
    titration: steps(mg, [
      [1, 0.6],
      [1, 1.2],
    ]),
    notes: [
      'The 0.6 mg week is only to reduce GI effects; it does not control glucose.',
      'May increase to 1.8 mg daily if more glucose control is needed.',
      'Any time of day, with or without meals.',
    ],
    sources: [dailymed('Victoza', 'DailyMed: Victoza label')],
  },

  // ── Dulaglutide ────────────────────────────────────────────────────────────
  {
    id: 'dulaglutide-label-trulicity',
    name: 'Trulicity titration',
    source: 'label',
    reportedBy: 'Trulicity US prescribing information',
    goal: 'Type 2 diabetes glucose control',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'dulaglutide', dose: mg(0.75) }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 0.75],
      [4, 1.5],
      [4, 3],
      [4, 4.5],
    ]),
    notes: [
      'The label steps up only if more glucose control is needed; 3 mg and 4.5 mg each need at least 4 weeks on the dose before.',
      'Missed dose: take it if the next one is at least 3 days (72 hours) away, otherwise skip it.',
      'Approved for type 2 diabetes, not for weight management.',
    ],
    sources: [dailymed('Trulicity', 'DailyMed: Trulicity label')],
  },

  // ── Retatrutide ────────────────────────────────────────────────────────────
  {
    id: 'retatrutide-trial-phase2',
    name: 'Phase 2 escalation to 12 mg',
    source: 'trial',
    reportedBy: 'Phase 2 obesity trial (Jastreboff et al., NEJM 2023)',
    goal: 'Weight loss in obesity without diabetes',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'retatrutide', dose: mg(2) }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 2],
      [4, 4],
      [4, 8],
      [36, 12],
    ]),
    durationWeeks: 48,
    notes: [
      'The 12 mg arm started at 2 mg and stepped up every 4 weeks, reaching 12 mg at week 12; mean weight loss was 24.2% at 48 weeks.',
      'GI effects clustered during escalation and were partly reduced by starting at 2 mg rather than 4 mg.',
      'Heart rate rose with dose, peaked around week 24 and then declined.',
      'Phase 3 (TRIUMPH-1) used 4, 9 and 12 mg maintenance doses over 80 weeks, also starting at 2 mg.',
    ],
    sources: [
      { label: 'NEJM: Triple-hormone-receptor agonist retatrutide for obesity (2023)', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2301972' },
      pubmed('37366315', 'PubMed: retatrutide phase 2 obesity trial'),
      ctgov('NCT04881760', 'ClinicalTrials.gov: NCT04881760'),
    ],
  },
  {
    id: 'retatrutide-community-titration',
    name: 'Community slow titration',
    source: 'community',
    reportedBy: 'Common on r/Retatrutide and r/Peptides; compiled by Peptide Protocol Wiki',
    goal: 'Weight loss with fewer side effects than the trial pace',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'retatrutide', dose: mg(1), range: { min: 0.5, max: 8 } }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 1],
      [4, 2],
      [4, 4],
    ]),
    notes: [
      'Starts below the trial’s 2 mg (some begin at 0.5 mg). Many hold at 4–8 mg rather than climbing to 12 mg.',
      'Most hold a step longer, or drop back, if nausea or reflux persists.',
      'Typical mix: 10 mg vial with 1 mL BAC water = 10 mg/mL, so 1 mg is 10 units. For small doses some use 2 mL (5 mg/mL).',
      'Watch resting heart rate; it rose with dose in trials.',
    ],
    sources: [wiki('retatrutide', 'Retatrutide'), redditSearch('Retatrutide', 'titration schedule')],
  },

  // ── Mazdutide ──────────────────────────────────────────────────────────────
  {
    id: 'mazdutide-trial-glory1',
    name: 'GLORY-1 escalation to 6 mg',
    source: 'trial',
    reportedBy: 'GLORY-1 phase 3 trial (NEJM 2025)',
    goal: 'Weight loss in obesity or overweight',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'mazdutide', dose: mg(2) }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 2],
      [4, 4],
      [40, 6],
    ]),
    durationWeeks: 48,
    notes: [
      '2 mg for 4 weeks, 4 mg for 4 weeks, then 6 mg to week 48. The 4 mg arm stopped after the first step.',
      'Mean weight loss at week 32 was about 11% (4 mg) and 13% (6 mg) versus almost none on placebo.',
      'GI effects were mostly mild to moderate and clustered during escalation.',
      'Studied in Chinese adults; approved in China, not by FDA or EMA.',
    ],
    sources: [
      ctgov('NCT05607680', 'ClinicalTrials.gov: GLORY-1 (NCT05607680)'),
      pubmed('40421736', 'PubMed: once-weekly mazdutide in Chinese adults (NEJM 2025)'),
    ],
  },

  // ── Cagrilintide and CagriSema ─────────────────────────────────────────────
  {
    id: 'cagrilintide-trial-phase2',
    name: 'Phase 2 escalation to 4.5 mg',
    source: 'trial',
    reportedBy: 'Phase 2 dose-finding trial (Lau et al., Lancet 2021)',
    goal: 'Weight loss in overweight or obesity',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'cagrilintide', dose: mg(0.6) }],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [2, 0.6],
      [2, 1.2],
      [2, 2.4],
      [20, 4.5],
    ]),
    durationWeeks: 26,
    notes: [
      'Started at 0.6 mg and stepped up every 2 weeks to the final dose; lower-dose arms stopped earlier on the ladder.',
      'Mean weight loss at 26 weeks was 10.8% with 4.5 mg versus 3.0% with placebo, and had not plateaued.',
      'Nausea, constipation and diarrhoea were the most common side effects.',
    ],
    sources: [pubmed('34798060', 'PubMed: once-weekly cagrilintide phase 2 (Lancet 2021)'), ctgov('NCT03856047', 'ClinicalTrials.gov: NCT03856047')],
  },
  {
    id: 'cagrisema-trial-redefine1',
    name: 'CagriSema (REDEFINE 1)',
    source: 'trial',
    reportedBy: 'REDEFINE 1 phase 3 trial (Garvey et al., NEJM 2025)',
    goal: 'Weight loss in overweight or obesity',
    route: 'subq',
    kind: 'blend',
    components: [
      { compoundId: 'cagrilintide', dose: mg(0.25) },
      { compoundId: 'semaglutide', dose: mg(0.25) },
    ],
    schedule: { kind: 'weekdays', days: [SUN], time: '09:00' },
    titration: steps(mg, [
      [4, 0.25],
      [4, 0.5],
      [4, 1],
      [4, 1.7],
      [52, 2.4],
    ]),
    durationWeeks: 68,
    notes: [
      'Both drugs once weekly at equal doses, stepped up together every 4 weeks to 2.4 mg + 2.4 mg by week 16. Logged here as one combined dose.',
      'Investigators could keep people on a lower dose if escalation was not tolerated.',
      'Mean weight loss was 20.4% at 68 weeks versus 3.0% with placebo.',
      'DIY versions use two separate vials; measure each drug separately.',
    ],
    sources: [
      pubmed('40544433', 'PubMed: coadministered cagrilintide and semaglutide (NEJM 2025)'),
      ctgov('NCT05567796', 'ClinicalTrials.gov: REDEFINE 1 (NCT05567796)'),
    ],
  },

  // ── Orforglipron ───────────────────────────────────────────────────────────
  {
    id: 'orforglipron-label-foundayo',
    name: 'Foundayo titration',
    source: 'label',
    reportedBy: 'Foundayo US prescribing information',
    goal: 'Chronic weight management',
    route: 'oral',
    kind: 'single',
    components: [{ compoundId: 'orforglipron', dose: mg(0.8) }],
    schedule: { kind: 'daily', times: ['08:00'] },
    titration: steps(mg, [
      [5, 0.8],
      [5, 2.5],
      [5, 5.5],
      [5, 9],
      [5, 14.5],
      [5, 17.2],
    ]),
    notes: [
      'Once daily with or without food, at any time; swallow whole, one tablet a day.',
      'Each step needs at least 30 days, so the app uses 5-week steps. Maintenance can be 5.5, 9, 14.5 or 17.2 mg; go up only for response and tolerability.',
      'Missed 7 or more doses in a row: restart escalation at a lower dose.',
      'Strong CYP3A4 inhibitors cap the dose at 9 mg. On the pill, use a backup method.',
    ],
    sources: [
      { label: 'Foundayo prescribing information (Lilly)', url: 'https://uspl.lilly.com/foundayo/foundayo.html' },
      dailymed('Foundayo', 'DailyMed: Foundayo label'),
    ],
  },

  // ── Setmelanotide ──────────────────────────────────────────────────────────
  {
    id: 'setmelanotide-label-imcivree',
    name: 'Imcivree start (age 12+)',
    source: 'label',
    reportedBy: 'Imcivree US prescribing information',
    goal: 'Weight management in BBS or POMC, PCSK1 or LEPR deficiency',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'setmelanotide', dose: mg(2) }],
    schedule: { kind: 'daily', times: ['08:00'] },
    titration: steps(mg, [
      [2, 2],
      [2, 3],
    ]),
    notes: [
      'Once daily at the start of the day, with or without food. Increase to 3 mg after 2 weeks if 2 mg is tolerated.',
      'Younger children and acquired hypothalamic obesity use lower starting doses (see label).',
      'Expect skin darkening; have a full skin exam before starting and periodically.',
      'Watch for low mood or suicidal thoughts and for prolonged erections.',
    ],
    sources: [dailymed('Imcivree', 'DailyMed: Imcivree label')],
  },

  // ── Tesofensine ────────────────────────────────────────────────────────────
  {
    id: 'tesofensine-trial-tipo1',
    name: 'TIPO-1 daily dose',
    source: 'trial',
    reportedBy: 'TIPO-1 phase 2 trial (Astrup et al., Lancet 2008)',
    goal: 'Weight loss in obesity',
    route: 'oral',
    kind: 'single',
    components: [{ compoundId: 'tesofensine', dose: mg(0.5), range: { min: 0.25, max: 1 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    durationWeeks: 24,
    notes: [
      'Arms were 0.25, 0.5 and 1.0 mg once daily for 24 weeks with an energy-restricted diet: mean loss 4.5%, 9.2% and 10.6% versus 2.0% on placebo.',
      'The authors pointed to 0.5 mg as the dose to take forward.',
      'Heart rate rose about 7 bpm at 0.5 mg. Dry mouth, nausea, constipation and insomnia were common, so most take it in the morning.',
    ],
    sources: [pubmed('18950853', 'PubMed: tesofensine in obese patients (Lancet 2008)'), ctgov('NCT00394667', 'ClinicalTrials.gov: NCT00394667')],
  },
  {
    id: 'tesofensine-clinic-low-start',
    name: 'Clinic low start',
    source: 'clinic',
    reportedBy: 'US telehealth compounding programmes (e.g. Rx Peps Direct)',
    goal: 'Appetite suppression for weight loss',
    route: 'oral',
    kind: 'single',
    components: [{ compoundId: 'tesofensine', dose: mg(0.25), range: { min: 0.25, max: 1 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    notes: [
      'Starts at 0.25 mg each morning and moves to 0.5–1 mg over several weeks as tolerated.',
      'Check resting heart rate and blood pressure before starting and after each increase.',
      'Avoid with MAOIs or other serotonergic drugs.',
    ],
    sources: [
      { label: 'Rx Peps Direct: tesofensine (telehealth)', url: 'https://www.rxpepsdirect.com/peptides/weight-loss/tesofensine' },
      pubmedSearch('tesofensine obesity', 'PubMed search: tesofensine obesity'),
    ],
  },

  // ── AOD-9604 ───────────────────────────────────────────────────────────────
  {
    id: 'aod-9604-community-fasted-am',
    name: 'Fasted morning 300 mcg',
    source: 'community',
    reportedBy: 'Common on r/Peptides and in peptide-clinic guides; compiled by Peptide Protocol Wiki',
    goal: 'Fat loss',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'aod-9604', dose: mcg(300), range: { min: 250, max: 500 } }],
    schedule: { kind: 'daily', times: ['07:00'] },
    durationWeeks: 12,
    notes: [
      'Inject on waking, fasted; the community norm is no food for 1–2 hours beforehand.',
      'Some split it: 250 mcg in the morning and 250 mcg before bed, both on an empty stomach.',
      'Typical mix: 5 mg vial with 2 mL BAC water = 2.5 mg/mL, so 300 mcg is 12 units.',
      'Runs are usually 12–16 weeks. The phase 2b obesity trial did not beat placebo.',
    ],
    sources: [wiki('aod-9604', 'AOD-9604'), redditSearch('Peptides', 'AOD-9604 dose')],
  },

  // ── 5-Amino-1MQ ────────────────────────────────────────────────────────────
  {
    id: '5-amino-1mq-community-oral',
    name: 'Oral 50 mg morning',
    source: 'community',
    reportedBy: 'About 75 r/Peptides reports compiled by Peptide Protocol Wiki',
    goal: 'Fat loss and metabolic support',
    route: 'oral',
    kind: 'single',
    components: [{ compoundId: '5-amino-1mq', dose: mg(50), range: { min: 50, max: 150 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    durationWeeks: 12,
    notes: [
      'Usually one 50 mg capsule in the morning for 8–12 weeks.',
      'Higher-dose users take 100–150 mg a day, often as 50 mg two or three times daily.',
      'Doses are scaled from mouse studies; there are no human dose-finding or safety data.',
      'Some cycle 8 weeks on, 4 off, though there is no evidence cycling matters.',
    ],
    sources: [wiki('5-amino-1mq', '5-Amino-1MQ'), redditSearch('Peptides', '5-amino-1mq dose')],
  },

  // ── Testosterone cypionate ─────────────────────────────────────────────────
  {
    id: 'testosterone-cypionate-label',
    name: 'Depo-Testosterone label',
    source: 'label',
    reportedBy: 'Depo-Testosterone US prescribing information; Endocrine Society guideline',
    goal: 'Testosterone replacement in male hypogonadism',
    route: 'im',
    kind: 'single',
    components: [{ compoundId: 'testosterone-cypionate', dose: mg(200), range: { min: 50, max: 400 } }],
    schedule: { kind: 'everyNDays', n: 14, time: '09:00' },
    notes: [
      'Label range is 50–400 mg deep IM (gluteal) every 2–4 weeks. The Endocrine Society suggests 150–200 mg every 2 weeks or 75–100 mg weekly.',
      'Check testosterone midway between injections; adjust dose or interval if it is above 600 or below 350 ng/dL.',
      'Two-week intervals give high peaks and low troughs, which is why many split the dose weekly or twice weekly.',
      'Check hematocrit at baseline, 3–6 months, then yearly; hold therapy if it goes above 54%.',
    ],
    sources: [dailymed('testosterone cypionate', 'DailyMed: testosterone cypionate labels'), ENDO_SOCIETY_TRT],
  },
  {
    id: 'testosterone-cypionate-clinic-split',
    name: 'TRT split dosing',
    source: 'clinic',
    reportedBy: 'Common men’s-health clinic protocol (e.g. HealthRx standard TRT protocol)',
    goal: 'Steady testosterone levels on TRT',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'testosterone-cypionate', dose: mg(50), range: { min: 40, max: 100 } }],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '20:00' },
    notes: [
      'The weekly total (usually 100 mg to start, 100–200 mg range) is split into two shots 3.5 days apart; IM or subcutaneous both work.',
      'Some clinics start at 80 mg a week with cardiovascular risk or a baseline hematocrit above 46%.',
      'Labs: hematocrit at baseline and week 12, then every 6 months; estradiol around week 6; PSA every 6 months from age 40.',
      'At 200 mg/mL, 50 mg is 0.25 mL (25 units on an insulin syringe). Subq goes into belly fat with a 27–30G needle; rotate sides.',
    ],
    sources: [HEALTHRX_TRT, ENDO_SOCIETY_TRT, redditSearch('trt', 'twice weekly injections')],
  },
  {
    id: 'testosterone-cypionate-clinic-daily',
    name: 'Daily microdosing',
    source: 'clinic',
    reportedBy: 'Alternative schedule in men’s-health clinic protocols (e.g. HealthRx)',
    goal: 'Flattest possible testosterone levels',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'testosterone-cypionate', dose: mg(15), range: { min: 14, max: 20 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    notes: [
      'About 100–140 mg a week given as a small daily subcutaneous shot to keep levels flat.',
      'At 200 mg/mL, 15 mg is 0.075 mL (7.5 units on a U-100 insulin syringe).',
      'Same labs as any TRT: testosterone, hematocrit, estradiol, PSA.',
    ],
    sources: [HEALTHRX_TRT],
  },

  // ── Testosterone enanthate ─────────────────────────────────────────────────
  {
    id: 'testosterone-enanthate-label-im',
    name: 'Enanthate IM label',
    source: 'label',
    reportedBy: 'Testosterone enanthate injection US prescribing information; Endocrine Society guideline',
    goal: 'Testosterone replacement in male hypogonadism',
    route: 'im',
    kind: 'single',
    components: [{ compoundId: 'testosterone-enanthate', dose: mg(200), range: { min: 50, max: 400 } }],
    schedule: { kind: 'everyNDays', n: 14, time: '09:00' },
    notes: [
      'Label range is 50–400 mg deep IM every 2–4 weeks. The Endocrine Society suggests 150–200 mg every 2 weeks or 75–100 mg weekly.',
      'Check testosterone midway between injections; adjust if it is above 600 or below 350 ng/dL.',
      'Many split into weekly or twice-weekly shots for steadier levels. Monitor hematocrit and PSA.',
    ],
    sources: [dailymed('testosterone enanthate', 'DailyMed: testosterone enanthate labels'), ENDO_SOCIETY_TRT],
  },
  {
    id: 'testosterone-enanthate-label-xyosted',
    name: 'Xyosted weekly',
    source: 'label',
    reportedBy: 'Xyosted US prescribing information',
    goal: 'Testosterone replacement in male hypogonadism',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'testosterone-enanthate', dose: mg(75), range: { min: 50, max: 100 } }],
    schedule: { kind: 'weekdays', days: [MON], time: '09:00' },
    notes: [
      'Autoinjector into the abdomen only, once weekly. Strengths are 50, 75 and 100 mg.',
      'Check a trough testosterone 7 days after a dose, after 6 weeks and 6 weeks after any change: below 350 ng/dL add 25 mg, 650 or above drop 25 mg.',
      'Monitor blood pressure and hematocrit.',
    ],
    sources: [
      { label: 'Xyosted prescribing information (FDA)', url: 'https://www.accessdata.fda.gov/drugsatfda_docs/nda/2019/209863Orig1s000Lbl.pdf' },
      dailymed('Xyosted', 'DailyMed: Xyosted label'),
    ],
  },

  // ── hCG ────────────────────────────────────────────────────────────────────
  {
    id: 'hcg-label-hypogonadotropic',
    name: 'Hypogonadotropic hypogonadism',
    source: 'label',
    reportedBy: 'Novarel and Pregnyl US prescribing information',
    goal: 'Testosterone and sperm production in hypogonadotropic hypogonadism',
    route: 'im',
    kind: 'single',
    components: [{ compoundId: 'hcg', dose: iu(4000) }],
    schedule: { kind: 'weekdays', days: [MON, WED, FRI], time: '09:00' },
    titration: steps(iu, [
      [26, 4000],
      [13, 2000],
    ]),
    durationWeeks: 39,
    notes: [
      'Label: 4,000 USP units IM three times weekly for 6–9 months, then 2,000 units three times weekly for 3 more months.',
      'The other label option is 500–1,000 units three times weekly for 3 weeks, then the same dose twice weekly for 3 weeks.',
      'Refrigerate after mixing and use within the time on the label. hCG is not effective for weight loss.',
    ],
    sources: [dailymed('Novarel', 'DailyMed: Novarel label'), dailymed('Pregnyl', 'DailyMed: Pregnyl label')],
  },
  {
    id: 'hcg-clinic-crisler',
    name: 'Crisler protocol (with weekly TRT)',
    source: 'clinic',
    reportedBy: 'Dr John Crisler’s TRT protocol, published by Defy Medical',
    goal: 'Keep testicular function and size on weekly testosterone',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'hcg', dose: iu(250), range: { min: 250, max: 350 } }],
    schedule: { kind: 'weekdays', days: [WED, THU], time: '20:00' },
    notes: [
      '250 IU subcutaneously two days before and the day before a weekly IM testosterone cypionate shot (here Wednesday and Thursday for a Friday shot).',
      'Crisler kept single doses at or below 500 IU and rarely needed more than 350 IU per shot.',
      'Move the days with your testosterone day. hCG raises estradiol, so check it.',
    ],
    sources: [{ label: 'Defy Medical: an update to the Crisler hCG protocol', url: 'https://www.defymedical.com/blog/an-update-to-the-crisler-hcg-protocol' }],
  },
  {
    id: 'hcg-clinic-monotherapy',
    name: 'hCG monotherapy',
    source: 'clinic',
    reportedBy: 'Urology practice summarised by Lee & Ramasamy (Transl Androl Urol 2018)',
    goal: 'Raise testosterone while keeping fertility, without TRT',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'hcg', dose: iu(1500), range: { min: 1500, max: 2000 } }],
    schedule: { kind: 'weekdays', days: [MON, WED, FRI], time: '20:00' },
    notes: [
      'For hypogonadotropic hypogonadism, 1,500–2,000 IU two to three times weekly, adjusted to bring testosterone into the normal range.',
      'If sperm production has not returned after 4–6 months, urologists add FSH (75 IU every other day).',
      'Recheck testosterone, estradiol and semen analysis every few months. Urinary hCG labels are IM; clinics commonly use subq.',
    ],
    sources: [HCG_FERTILITY_REVIEW, wiki('hcg', 'hCG')],
  },

  // ── Gonadorelin ────────────────────────────────────────────────────────────
  {
    id: 'gonadorelin-community-trt-adjunct',
    name: 'TRT adjunct, 3× weekly',
    source: 'community',
    reportedBy: 'Reported on r/Testosterone and the Excel Male forum; compiled by Peptide Protocol Wiki',
    goal: 'Keep LH/FSH and testicular size on TRT (hCG alternative)',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'gonadorelin', dose: mcg(100), range: { min: 50, max: 200 } }],
    schedule: { kind: 'weekdays', days: [MON, WED, FRI], time: '20:00' },
    notes: [
      '100–200 mcg two to three times weekly; some clinics use 50–100 mcg as standard.',
      'Its half-life is minutes, so each shot is a brief pulse. Whether it matches hCG for testicular size is disputed, and continuous exposure can desensitise the pituitary.',
      'Typical mix: 2 mg vial with 1 mL BAC water = 2 mg/mL, so 100 mcg is 5 units.',
      'Only bloodwork (LH, testosterone, estradiol) shows whether it is doing anything.',
    ],
    sources: [wiki('gonadorelin', 'Gonadorelin'), redditSearch('Testosterone', 'gonadorelin dose')],
  },

  // ── Kisspeptin-10 ──────────────────────────────────────────────────────────
  {
    id: 'kisspeptin-10-community-twice-weekly',
    name: 'LH support, 2× weekly',
    source: 'community',
    reportedBy: 'Reported on r/Testosterone and peptide forums; compiled by Peptide Protocol Wiki',
    goal: 'Stimulate LH/FSH, mainly in men on or coming off TRT',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'kisspeptin-10', dose: mcg(100), range: { min: 100, max: 200 } }],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '08:00' },
    durationWeeks: 8,
    notes: [
      'Reported as 100–200 mcg one to three times a week for 4–8 weeks.',
      'Effects are short-lived; human studies show an acute LH rise after each dose.',
      'Typical mix: 5 mg vial with 2 mL BAC water = 2.5 mg/mL, so 100 mcg is 4 units.',
      'Frequent high exposure can blunt the response (tachyphylaxis has been seen with kisspeptin in human studies).',
    ],
    sources: [wiki('kisspeptin', 'Kisspeptin'), pubmedSearch('kisspeptin-10 human', 'PubMed search: kisspeptin-10 in humans')],
  },
  {
    id: 'kisspeptin-10-community-daily',
    name: 'Daily morning 100 mcg',
    source: 'community',
    reportedBy: 'Peptide Initiative kisspeptin-10 protocol guide; also reported on peptide forums',
    goal: 'Support the reproductive axis and libido',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'kisspeptin-10', dose: mcg(100), range: { min: 50, max: 200 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    durationWeeks: 6,
    notes: [
      'Morning subcutaneous injection; food makes no difference.',
      'Guides run 100 mcg for 4–6 weeks, with 1–2 weeks at 50 mcg as a cautious first run.',
      'Refrigerate after mixing and use within about 2–3 weeks.',
      'Have LH and testosterone checked to see whether it is having an effect.',
    ],
    sources: [
      { label: 'Peptide Initiative: kisspeptin-10 protocol', url: 'https://peptideinitiative.com/peptides/protocols/kisspeptin' },
      wiki('kisspeptin', 'Kisspeptin'),
    ],
  },

  // ── Bremelanotide (PT-141) ─────────────────────────────────────────────────
  {
    id: 'bremelanotide-label-vyleesi',
    name: 'Vyleesi as needed',
    source: 'label',
    reportedBy: 'Vyleesi US prescribing information',
    goal: 'Low sexual desire (HSDD) in premenopausal women',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'bremelanotide', dose: mg(1.75) }],
    schedule: { kind: 'asNeeded' },
    notes: [
      'Inject into the abdomen or thigh at least 45 minutes before anticipated sexual activity.',
      'No more than 1 dose in 24 hours and no more than 8 doses a month.',
      'Nausea is common, mostly with the first doses; blood pressure rises briefly after each dose.',
      'Stop after 8 weeks if desire has not improved.',
    ],
    sources: [dailymed('Vyleesi', 'DailyMed: Vyleesi label')],
  },
  {
    id: 'bremelanotide-community-men',
    name: 'PT-141 for men, as needed',
    source: 'community',
    reportedBy: 'Common on r/Peptides and men’s-health clinic pages; compiled by Peptide Protocol Wiki',
    goal: 'Libido and erections in men (off-label)',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'bremelanotide', dose: mg(1), range: { min: 0.5, max: 2 } }],
    schedule: { kind: 'asNeeded' },
    notes: [
      'Usually 1–2 mg taken 1–2 hours before sex; first-timers often try 0.5–1 mg to gauge nausea. Often used alongside a PDE5 inhibitor.',
      'Keep to the label limits: one dose per 24 hours, up to 8 a month.',
      'Flushing, nausea and a brief blood-pressure rise are common.',
      'Typical mix: 10 mg vial with 2 mL BAC water = 5 mg/mL, so 1 mg is 20 units.',
    ],
    sources: [wiki('pt-141', 'PT-141'), redditSearch('Peptides', 'PT-141 dose')],
  },

  // ── Melanotan II ───────────────────────────────────────────────────────────
  {
    id: 'melanotan-ii-community-loading',
    name: 'Loading phase',
    source: 'community',
    reportedBy: 'Common on r/Peptides and tanning forums; compiled by Peptide Protocol Wiki',
    goal: 'Build a tan before switching to maintenance',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'melanotan-ii', dose: mg(0.25), range: { min: 0.1, max: 0.5 } }],
    schedule: { kind: 'daily', times: ['21:00'] },
    durationWeeks: 3,
    notes: [
      'Daily for 2–4 weeks with some UV (sun or sunbed) until you reach the colour you want, then switch to maintenance.',
      'First-timers usually start at 0.1–0.25 mg. Nausea and flushing are worst early, so most dose at bedtime.',
      'Typical mix: 10 mg vial with 2 mL BAC water = 5 mg/mL, so 0.25 mg is 5 units.',
      'Photograph your moles before starting; see a dermatologist if one changes, grows or darkens unevenly.',
    ],
    sources: [wiki('melanotan-2', 'Melanotan-2'), redditSearch('Peptides', 'melanotan 2 loading dose')],
  },
  {
    id: 'melanotan-ii-community-maintenance',
    name: 'Maintenance',
    source: 'community',
    reportedBy: 'Common on r/Peptides and tanning forums; compiled by Peptide Protocol Wiki',
    goal: 'Hold a tan through the sunny months',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'melanotan-ii', dose: mg(0.5), range: { min: 0.25, max: 1 } }],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '21:00' },
    notes: [
      'After loading, 0.25–1 mg once or twice a week during sun season.',
      'Spontaneous erections, reduced appetite and yawning are common side effects.',
      'Keep checking moles; MT-II darkens existing moles and freckles.',
    ],
    sources: [
      wiki('melanotan-2', 'Melanotan-2'),
      { label: 'Peptide Protocol Wiki: Melanotan-2 dosing', url: 'https://www.peptideprotocolwiki.com/peptides/melanotan-2/dosing' },
    ],
  },

  // ── Afamelanotide ──────────────────────────────────────────────────────────
  {
    id: 'afamelanotide-label-scenesse',
    name: 'Scenesse implant',
    source: 'label',
    reportedBy: 'Scenesse US prescribing information and EU SmPC',
    goal: 'Pain-free light exposure in erythropoietic protoporphyria',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'afamelanotide', dose: mg(16) }],
    schedule: { kind: 'everyNDays', n: 60, time: '10:00' },
    notes: [
      'One 16 mg implant every 2 months, inserted under the skin above the hip crest by a trained clinician.',
      'EU: start before and continue through the sunny season; three implants a year are usual, maximum four.',
      'Full skin check every 6 months; it darkens moles and freckles. Keep up normal sun protection.',
    ],
    sources: [
      dailymed('Scenesse', 'DailyMed: Scenesse label'),
      { label: 'Scenesse EU SmPC (Clinuvel)', url: 'https://www.clinuvel.com/wp-content/uploads/2021/03/SCENESSE-SMPC-EN-1.pdf' },
    ],
  },

  // ── Oxytocin ───────────────────────────────────────────────────────────────
  {
    id: 'oxytocin-community-intranasal-as-needed',
    name: 'Intranasal, as needed',
    source: 'community',
    reportedBy: 'Reported on r/Nootropics and r/Peptides; compiled by Peptide Protocol Wiki',
    goal: 'Social ease, bonding and mood',
    route: 'nasal',
    kind: 'single',
    components: [{ compoundId: 'oxytocin', dose: iu(24), range: { min: 20, max: 40 } }],
    schedule: { kind: 'asNeeded' },
    notes: [
      '24 IU is the single dose used in most human research; split it between both nostrils.',
      'Taken shortly before social situations; research sessions usually test about 30–45 minutes after dosing.',
      'Compounded sprays differ in IU per spray, so check your bottle before counting sprays.',
      'Trial effects are small and inconsistent; an 8-week trial of 24 IU four times daily found no weight loss.',
    ],
    sources: [wiki('oxytocin', 'Oxytocin'), pubmed('38815173', 'PubMed: intranasal oxytocin for obesity (NEJM Evidence 2024)')],
  },
  {
    id: 'oxytocin-community-intranasal-daily',
    name: 'Low-dose daily',
    source: 'community',
    reportedBy: 'Reported on r/Nootropics and r/Peptides; compiled by Peptide Protocol Wiki',
    goal: 'Mood and stress',
    route: 'nasal',
    kind: 'single',
    components: [{ compoundId: 'oxytocin', dose: iu(10), range: { min: 10, max: 20 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    durationWeeks: 4,
    notes: [
      '10–20 IU once a day for 2–4 weeks.',
      'Nasal irritation is the most common complaint.',
      'At high doses oxytocin can cause water retention and low sodium.',
    ],
    sources: [wiki('oxytocin', 'Oxytocin')],
  },

  // ── Somatropin ─────────────────────────────────────────────────────────────
  {
    id: 'somatropin-label-adult-ghd',
    name: 'Adult GHD start',
    source: 'label',
    reportedBy: 'Genotropin US prescribing information',
    goal: 'Adult growth hormone deficiency',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'somatropin', dose: mg(0.2), range: { min: 0.15, max: 0.3 } }],
    schedule: { kind: 'daily', times: ['21:00'] },
    notes: [
      'Non-weight-based start: about 0.2 mg a day (0.15–0.3 mg), raised by 0.1–0.2 mg a day every 1–2 months based on response and IGF-1.',
      'Lower the dose if IGF-1 goes above the age- and sex-specific range or if swelling, joint pain or tingling appear.',
      '1 mg is about 3 IU, so 0.2 mg is roughly 0.6 IU.',
    ],
    sources: [
      { label: 'Genotropin prescribing information (FDA, 2025)', url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/020280s108lbl.pdf' },
      dailymed('somatropin', 'DailyMed: somatropin labels'),
    ],
  },
  {
    id: 'somatropin-community-low-dose',
    name: 'Low-dose daily (2 IU)',
    source: 'community',
    reportedBy: 'Common on r/Peptides, r/steroids and the Excel Male forum; compiled by Peptide Protocol Wiki',
    goal: 'Wellness, sleep, recovery and body composition',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'somatropin', dose: iu(2), range: { min: 1, max: 4 } }],
    schedule: { kind: 'daily', times: ['22:00'] },
    notes: [
      'Wellness use is usually 1–2 IU a day; body-composition use 2–4 IU, before bed or on waking fasted.',
      'The adult GHD label starts near 0.6 IU (0.2 mg) a day, so these doses are well above it.',
      'Watch for water retention, joint aches, carpal-tunnel tingling and rising fasting glucose; check IGF-1.',
      'Mix gently without shaking and keep it in the fridge.',
    ],
    sources: [wiki('hgh-191aa', 'HGH'), redditSearch('Peptides', 'HGH 2 IU daily')],
  },

  // ── Tesamorelin ────────────────────────────────────────────────────────────
  {
    id: 'tesamorelin-label-egrifta-wr',
    name: 'Egrifta WR daily',
    source: 'label',
    reportedBy: 'Egrifta WR US prescribing information',
    goal: 'Reduce excess abdominal fat in HIV-associated lipodystrophy',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'tesamorelin', dose: mg(1.28) }],
    schedule: { kind: 'daily', times: ['21:00'] },
    notes: [
      'Mix one vial with 1.3 mL of the supplied bacteriostatic water and swirl, do not shake. Each daily dose is 0.16 mL.',
      'A mixed vial covers 7 days; keep it at room temperature and discard it 7 days after mixing.',
      'Inject into the abdomen and rotate sites. Egrifta SV (1.4 mg) is a different product and not interchangeable.',
      'Check IGF-1 and blood glucose during treatment.',
    ],
    sources: [
      { label: 'Egrifta WR prescribing information (FDA, 2025)', url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/022505s020lbl.pdf' },
      dailymed('Egrifta', 'DailyMed: Egrifta labels'),
    ],
  },
  {
    id: 'tesamorelin-community-nightly',
    name: 'Nightly 1–2 mg',
    source: 'community',
    reportedBy: 'Reported on r/Peptides and peptide-clinic guides; compiled by Peptide Protocol Wiki',
    goal: 'Visceral fat loss',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'tesamorelin', dose: mg(1), range: { min: 1, max: 2 } }],
    schedule: { kind: 'daily', times: ['22:00'] },
    durationWeeks: 12,
    notes: [
      'Beginners start at 1 mg nightly and move to 2 mg, the dose in the original trials, once tolerated.',
      'Injected into the abdomen before bed; runs are 12–26 weeks. Some use 5 days on, 2 off for maintenance.',
      'Research vials are mixed with 1–2 mL BAC water and used within 2–3 weeks.',
      'Joint aches, swelling and higher fasting glucose are the usual complaints.',
    ],
    sources: [wiki('tesamorelin', 'Tesamorelin'), redditSearch('Peptides', 'tesamorelin dose')],
  },

  // ── Elamipretide (SS-31) ───────────────────────────────────────────────────
  {
    id: 'elamipretide-label-forzinity',
    name: 'Forzinity daily',
    source: 'label',
    reportedBy: 'Forzinity US prescribing information',
    goal: 'Muscle strength in Barth syndrome (30 kg and over)',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'elamipretide', dose: mg(40) }],
    schedule: { kind: 'daily', times: ['09:00'] },
    notes: [
      '40 mg once daily into the abdomen or thigh; 20 mg daily if eGFR is below 30 and not on dialysis.',
      'Injection-site redness, pain and itching are very common; rotate sites.',
      'Discard an opened vial 8 days after first use.',
    ],
    sources: [dailymed('Forzinity', 'DailyMed: Forzinity label')],
  },
  {
    id: 'elamipretide-community-ss31',
    name: 'SS-31 low-dose cycle',
    source: 'community',
    reportedBy: 'Reported on r/Peptides and r/nootropics; compiled by Peptide Protocol Wiki',
    goal: 'Mitochondrial support, energy and recovery',
    route: 'subq',
    kind: 'single',
    components: [{ compoundId: 'elamipretide', dose: mg(1), range: { min: 1, max: 5 } }],
    schedule: { kind: 'daily', times: ['08:00'] },
    durationWeeks: 6,
    notes: [
      '1–5 mg once daily for 4–8 weeks, then a break; far below the 40 mg label dose.',
      'Some time it around training (2–5 mg on workout days).',
      'Injection-site reactions are the most common complaint, as in the trials.',
      'Research "SS-31" is not the approved product, and purity varies.',
    ],
    sources: [wiki('ss-31', 'SS-31'), redditSearch('Peptides', 'SS-31 dose')],
  },

  // ── Stacks ─────────────────────────────────────────────────────────────────
  {
    id: 'stack-trt-hcg-clinic',
    name: 'TRT + hCG',
    source: 'clinic',
    reportedBy: 'Common TRT-clinic setup; hCG range from r/trt and Excel Male reports',
    goal: 'TRT while keeping testicular size and some fertility',
    route: 'subq',
    kind: 'stack',
    components: [
      { compoundId: 'testosterone-cypionate', dose: mg(50), range: { min: 40, max: 100 } },
      { compoundId: 'hcg', dose: iu(500), range: { min: 250, max: 500 } },
    ],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '20:00' },
    notes: [
      'Testosterone split twice weekly (about 100 mg a week) with 250–500 IU hCG on the same days, in separate syringes.',
      'Fertility-focused urologists use 500 IU every other day with TRT; 1,500 IU once a week is used when only testicular size matters.',
      'hCG raises estradiol; check estradiol and hematocrit at 6–12 weeks.',
    ],
    sources: [HEALTHRX_TRT, wiki('hcg', 'hCG'), HCG_FERTILITY_REVIEW],
  },
  {
    id: 'stack-trt-gonadorelin-clinic',
    name: 'TRT + gonadorelin',
    source: 'clinic',
    reportedBy: 'Men’s-health clinic protocol used where hCG is unavailable; listed in peptide-clinic directories',
    goal: 'TRT with an hCG substitute for testicular function',
    route: 'subq',
    kind: 'stack',
    components: [
      { compoundId: 'testosterone-cypionate', dose: mg(50), range: { min: 40, max: 100 } },
      { compoundId: 'gonadorelin', dose: mcg(100), range: { min: 100, max: 200 } },
    ],
    schedule: { kind: 'weekdays', days: [MON, THU], time: '20:00' },
    notes: [
      'Gonadorelin 100 mcg on each testosterone day (twice weekly).',
      'Evidence that it maintains testicular size as well as hCG is thin; many users report a weaker effect.',
      '2 mg vial with 1 mL BAC water = 2 mg/mL, so 100 mcg is 5 units. Refrigerate and use within 28 days.',
      'Usual TRT labs (testosterone, estradiol, hematocrit), plus LH to see whether gonadorelin is working.',
    ],
    sources: [
      { label: 'MyPeptideMatch: gonadorelin 2 mg dosing', url: 'https://www.mypeptidematch.com/protocols/gonadorelin-dosing-2mg' },
      wiki('gonadorelin', 'Gonadorelin'),
      HEALTHRX_TRT,
    ],
  },
];
