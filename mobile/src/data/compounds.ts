import type { Compound } from './types';

// Reference library content. Editorial rules:
// - Evidence-first, original wording, neutral clinical tone.
// - `pk` only where reliable human pharmacokinetic data exist (label or
//   published human studies). Never estimated.
// - `studiedRegimens` only from an approved label or a published human trial.
//   Never community or vendor protocols.
// - Sources are search links (PubMed, ClinicalTrials.gov, DailyMed, EMA, WADA)
//   rather than specific citations, so nothing is fabricated.
// Entries are sorted alphabetically by `name`.

type Source = Compound['sources'][number];

const pubmed = (term: string, label: string): Source => ({
  label,
  url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`,
});

const trials = (term: string, label: string): Source => ({
  label,
  url: `https://clinicaltrials.gov/search?term=${encodeURIComponent(term)}`,
});

const dailymed = (term: string, label: string): Source => ({
  label,
  url: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(term)}`,
});

const ema = (term: string, label: string): Source => ({
  label,
  url: `https://www.ema.europa.eu/en/search?search_api_fulltext=${encodeURIComponent(term)}`,
});

const WADA_LIST: Source = {
  label: 'WADA Prohibited List',
  url: 'https://www.wada-ama.org/en/prohibited-list',
};

const UNVERIFIED = 'Product purity and identity are unverified for research-chemical supply';
const LONG_TERM_UNKNOWN = 'Long-term human safety unknown';
const NOT_ESTABLISHED = 'Long-term safety not yet established';
const NON_STERILE = 'Infection risk from non-sterile products';
const RESEARCH_STORAGE =
  'Lyophilised: refrigerate, protect from light. Reconstituted: refrigerate and use within the period stated by the supplier.';
const NOT_APPROVED_RC = 'Not approved for human use; sold as a research chemical.';
// FDA compounding status per FDA's Category 2 page (content current 22 Apr 2026)
// and its 503A categories list (updated 14 May 2026).
const FDA_CAT2 =
  'FDA lists it among bulk substances with potential significant safety risks for compounding (Category 2).';
const FDA_CAT2_WITHDRAWN =
  'FDA previously placed it in Category 2 (bulk substances that may present significant safety risks in compounding); the nomination was later withdrawn, so it is no longer on that list, and it is not on FDA’s 503A bulks list.';
const PCAC_2026_FOR =
  'In July 2026 FDA’s Pharmacy Compounding Advisory Committee voted to recommend adding it to the 503A bulks list; the vote is not binding, and adding it would require FDA rulemaking.';
const WADA_S2 = 'Prohibited at all times (WADA S2)';
const WADA_S1 = 'Prohibited at all times (WADA S1, anabolic agents)';
const WADA_S2_MALES = 'Prohibited at all times in males (WADA S2)';

export const COMPOUNDS: Compound[] = [
  {
    id: '5-amino-1mq',
    name: '5-Amino-1MQ',
    aliases: ['5-Amino-1-methylquinolinium'],
    category: 'metabolic',
    classes: [],
    summary:
      'A small-molecule NNMT inhibitor that reduced fat mass in obese mice; it has not been tested in published human trials.',
    mechanism:
      'It inhibits nicotinamide N-methyltransferase (NNMT), an enzyme highly expressed in fat tissue that consumes nicotinamide and S-adenosylmethionine. In diet-induced obese mice, blocking NNMT raised NAD+ levels in fat cells, shrank fat cells and lowered body weight. It is not a peptide, and whether these effects occur in people is unknown.',
    regulatory: {
      status: 'unapproved',
      detail: NOT_APPROVED_RC,
    },
    evidence: 'preclinical',
    evidenceNote:
      'Evidence comes from cell and mouse studies only; no controlled human trials have been published.',
    routes: ['oral'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised in human studies'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED],
    cautions: ['Pregnancy and breastfeeding', 'Liver or kidney disease (no data)', 'Under 18 (no safety data)'],
    sources: [
      pubmed('5-amino-1-methylquinolinium', 'PubMed: 5-amino-1MQ'),
      pubmed('nicotinamide N-methyltransferase inhibitor obesity', 'PubMed: NNMT inhibition and obesity'),
    ],
  },
  {
    id: 'afamelanotide',
    name: 'Afamelanotide',
    aliases: ['Scenesse', 'Melanotan I', 'MT-I', '[Nle4, D-Phe7]-α-MSH'],
    category: 'skin',
    classes: ['melanocortin-agonist'],
    summary:
      'A synthetic alpha-MSH analogue, given as a slow-release implant, approved to increase pain-free light exposure in erythropoietic protoporphyria.',
    mechanism:
      'Afamelanotide is a longer-acting analogue of alpha-melanocyte-stimulating hormone that activates melanocortin receptors, including MC1R on melanocytes. MC1R activation increases eumelanin production, darkening the skin and adding a light-absorbing pigment layer. In erythropoietic protoporphyria this reduces light-triggered phototoxic pain.',
    regulatory: {
      status: 'approved',
      detail:
        'EMA-approved (2014) and FDA-approved (2019) as Scenesse, a 16 mg subcutaneous implant, to increase pain-free light exposure in adults with erythropoietic protoporphyria. Not approved for cosmetic tanning.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Approval rests on randomised controlled trials in a rare disease involving a few hundred patients in total; there are no trials supporting cosmetic use.',
    routes: ['subq'],
    studiedRegimens: [
      {
        context: 'Erythropoietic protoporphyria (adults)',
        regimen:
          'One 16 mg implant inserted subcutaneously by a trained healthcare professional every 2 months.',
        source: 'Scenesse US prescribing information',
      },
    ],
    commonSideEffects: [
      'Implant-site reactions',
      'Nausea',
      'Sore throat',
      'Cough',
      'Fatigue',
      'Skin darkening',
    ],
    seriousRisks: [
      'Darkening of moles and freckles',
      'Pigmented lesions need twice-yearly skin checks',
      'Long-term data still limited',
    ],
    cautions: [
      'History of melanoma or atypical moles',
      'Pregnancy and breastfeeding',
      'Not for cosmetic tanning',
    ],
    storage: 'Refrigerate at 2–8 °C in the original package to protect from light.',
    sources: [
      dailymed('Scenesse', 'DailyMed: Scenesse label'),
      ema('Scenesse', 'EMA: Scenesse'),
      pubmed('afamelanotide erythropoietic protoporphyria', 'PubMed: afamelanotide in EPP'),
    ],
  },
  {
    id: 'aod-9604',
    name: 'AOD-9604',
    aliases: ['Tyr-hGH(177–191)', 'AOD9604'],
    category: 'metabolic',
    classes: ['lipolytic'],
    summary:
      'A modified fragment of the tail end of human growth hormone, developed as an obesity drug, that did not outperform placebo in clinical trials.',
    mechanism:
      'AOD-9604 corresponds to amino acids 177–191 of human growth hormone with an added tyrosine. In animal and cell studies it stimulated fat breakdown and inhibited fat formation without the growth-promoting or blood-glucose effects of full growth hormone, and it does not meaningfully raise IGF-1. These effects did not translate into clinically meaningful weight loss in human trials.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for human use; sold as a research chemical. Development as an obesity treatment was discontinued after a phase 2b trial. ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Company-sponsored human trials were run in the 2000s; the largest (phase 2b) did not show meaningful weight loss versus placebo, and most results were not fully published in peer-reviewed form.',
    routes: ['subq', 'oral'],
    studiedRegimens: [],
    commonSideEffects: [
      'Not well characterised in published data',
      'Injection-site reactions (injected use)',
    ],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: ['Pregnancy and breastfeeding', 'Competitive athletes (prohibited)'],
    storage: RESEARCH_STORAGE,
    antiDoping: 'Prohibited at all times (WADA S2, growth hormone fragments)',
    sources: [
      pubmed('AOD9604', 'PubMed: AOD9604'),
      pubmed('AOD9604 obesity', 'PubMed: AOD9604 and obesity'),
      WADA_LIST,
    ],
  },
  {
    id: 'ara-290',
    name: 'ARA-290',
    aliases: ['Cibinetide', 'ARA 290', 'Pyroglutamate helix B surface peptide'],
    category: 'repair',
    classes: ['tissue-repair', 'anti-inflammatory'],
    summary:
      'An investigational 11-amino-acid peptide derived from erythropoietin, studied for small-fibre neuropathy, that does not stimulate red-cell production.',
    mechanism:
      'Cibinetide mimics a region of erythropoietin (helix B) that engages the proposed innate repair receptor, a complex of the erythropoietin receptor and the beta-common receptor (CD131). In preclinical models this signalling is tissue-protective and anti-inflammatory. It does not activate the classic erythropoietin receptor pathway, so it does not raise haemoglobin.',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved. Tested in phase 2 trials, for example in sarcoidosis-associated small-fibre neuropathy and diabetic complications; development activity is uncertain, so check current status. Products sold online are research chemicals.',
    },
    evidence: 'limited',
    evidenceNote:
      'Small phase 2 trials reported improvements in some symptom and nerve-fibre measures, but larger confirmatory trials have not been published.',
    routes: ['subq', 'iv'],
    studiedRegimens: [],
    commonSideEffects: ['Injection-site reactions', 'Few adverse events in small trials'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: ['Pregnancy and breastfeeding (no data)', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('ARA 290 cibinetide', 'PubMed: ARA 290 (cibinetide)'),
      pubmed('cibinetide small fiber neuropathy', 'PubMed: cibinetide in small-fibre neuropathy'),
      trials('ARA 290', 'ClinicalTrials.gov: ARA 290'),
    ],
  },
  {
    id: 'aviptadil',
    name: 'Aviptadil',
    aliases: ['Vasoactive intestinal peptide', 'VIP', 'Zyesami', 'RLF-100'],
    category: 'immune',
    classes: ['neuropeptide', 'anti-inflammatory'],
    summary:
      'A synthetic form of vasoactive intestinal peptide (VIP), a natural neuropeptide that widens blood vessels and dampens inflammation, studied mainly in lung disease.',
    mechanism:
      'Aviptadil is identical to human VIP, a 28-amino-acid neuropeptide that acts on VPAC1 and VPAC2 receptors. VIP relaxes smooth muscle in blood vessels and airways, stimulates intestinal fluid secretion and has anti-inflammatory effects on immune cells. It is broken down within minutes in the bloodstream.',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved by FDA or EMA. An intravenous formulation (Zyesami) was studied for COVID-19 respiratory failure but has not been approved. An injectable combination with phentolamine is authorised for erectile dysfunction in some European countries. Compounded and research-chemical VIP is unapproved; for compounding, FDA lists vasoactive intestinal peptide in 503A Category 1 (under evaluation). Check current status.',
    },
    evidence: 'limited',
    evidenceNote:
      'Human data come from small studies and COVID-19 trials that did not meet their primary endpoints; nasal VIP used in some clinics lacks controlled trial support.',
    routes: ['iv', 'nasal'],
    studiedRegimens: [],
    commonSideEffects: ['Facial flushing', 'Low blood pressure', 'Diarrhoea', 'Fast heart rate'],
    seriousRisks: [
      'Marked hypotension',
      'Heart rhythm disturbances',
      'Severe watery diarrhoea at high exposure',
      UNVERIFIED,
    ],
    cautions: ['Low blood pressure', 'Heart rhythm disorders', 'Pregnancy and breastfeeding'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('aviptadil', 'PubMed: aviptadil'),
      pubmed('vasoactive intestinal peptide clinical trial', 'PubMed: VIP clinical trials'),
      trials('aviptadil', 'ClinicalTrials.gov: aviptadil'),
    ],
  },
  {
    id: 'bpc-157',
    name: 'BPC-157',
    aliases: ['Body Protection Compound-157', 'PL 14736', 'Bepecin'],
    category: 'repair',
    classes: ['tissue-repair'],
    summary:
      'A synthetic 15-amino-acid peptide based on a sequence from a stomach protein, widely promoted for injury healing but supported almost only by animal studies.',
    mechanism:
      'BPC-157 is a 15-residue fragment derived from a protein found in human gastric juice. In rodent studies it has been reported to speed healing of tendon, muscle, gut and other tissues. Proposed mechanisms include increased blood-vessel growth (VEGF receptor signalling), nitric oxide pathway effects and fibroblast migration; none has been confirmed in humans.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for human use anywhere; sold as a research chemical. FDA previously placed it in Category 2 (bulk substances that may present significant safety risks in compounding), citing possible immunogenicity, impurities and a lack of human safety data; the nomination was later withdrawn, so it is no longer on that list, and it is not on FDA’s 503A bulks list. ${PCAC_2026_FOR}`,
    },
    evidence: 'preclinical',
    evidenceNote:
      'Nearly all evidence is from animal studies, much of it from a single research group. Human data are limited to very small, uncontrolled reports; no controlled efficacy trials have been published.',
    routes: ['subq', 'oral'],
    studiedRegimens: [],
    commonSideEffects: ['Not systematically studied in humans', 'Injection-site reactions'],
    seriousRisks: [
      LONG_TERM_UNKNOWN,
      UNVERIFIED,
      'Theoretical tumour risk from blood-vessel growth',
      NON_STERILE,
    ],
    cautions: [
      'Pregnancy and breastfeeding',
      'Active or past cancer (theoretical)',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: 'Prohibited at all times (WADA S0, non-approved substances)',
    sources: [
      pubmed('BPC-157', 'PubMed: BPC-157'),
      pubmed('BPC 157 human', 'PubMed: BPC-157 human studies'),
      WADA_LIST,
    ],
  },
  {
    id: 'bremelanotide',
    name: 'Bremelanotide',
    aliases: ['PT-141', 'Vyleesi'],
    category: 'sexual-health',
    classes: ['melanocortin-agonist'],
    summary:
      'An as-needed melanocortin receptor agonist injection approved for low sexual desire (HSDD) in premenopausal women.',
    mechanism:
      'Bremelanotide is a cyclic peptide closely related to melanotan II that activates several melanocortin receptors, with MC4R considered most relevant to its effect. MC4R signalling in brain pathways involved in sexual motivation is thought to underlie the change in desire, although the exact mechanism is not fully understood. Activity at MC1R explains the focal skin darkening seen in some users.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved (2019) as Vyleesi for acquired, generalised hypoactive sexual desire disorder in premenopausal women. Not approved by EMA, and not approved for men or postmenopausal women.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Approval was based on two phase 3 randomised trials (RECONNECT) in more than 1,200 premenopausal women, which showed modest improvements in desire and related distress versus placebo. Evidence in men is limited to earlier small studies.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 2.7,
      tmaxHours: 1,
      route: 'subq',
      note: 'Mean half-life approx. 2.7 hours; peak concentration about 1 hour after injection.',
      source: 'Vyleesi US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Hypoactive sexual desire disorder in premenopausal women',
        regimen:
          '1.75 mg SC (abdomen or thigh) at least 45 minutes before anticipated sexual activity, as needed. No more than 1 dose in 24 hours and no more than 8 doses per month; stop after 8 weeks if no improvement.',
        source: 'Vyleesi US prescribing information',
      },
    ],
    commonSideEffects: [
      'Nausea (common, sometimes severe)',
      'Flushing',
      'Injection-site reactions',
      'Headache',
      'Vomiting',
    ],
    seriousRisks: [
      'Transient blood pressure rise after each dose',
      'Focal skin darkening (may persist)',
      'Reduces oral naltrexone levels',
    ],
    cautions: [
      'Uncontrolled high blood pressure',
      'Known cardiovascular disease',
      'Taking oral naltrexone',
      'Pregnancy (stop if pregnant)',
    ],
    storage: 'Store at or below 25 °C; do not freeze; protect from light.',
    sources: [
      dailymed('Vyleesi', 'DailyMed: Vyleesi label'),
      pubmed('bremelanotide RECONNECT', 'PubMed: RECONNECT trials'),
      pubmed('bremelanotide hypoactive sexual desire disorder', 'PubMed: bremelanotide in HSDD'),
    ],
  },
  {
    id: 'cagrilintide',
    name: 'Cagrilintide',
    aliases: ['CagriSema (combination with semaglutide)'],
    category: 'metabolic',
    classes: ['amylin-agonist'],
    summary:
      'A long-acting amylin analogue developed for obesity, mainly as a once-weekly combination with semaglutide (CagriSema) that has been submitted for FDA approval.',
    mechanism:
      'Cagrilintide is a lipidated analogue of amylin, a hormone released with insulin after meals, engineered for once-weekly dosing. It activates amylin and calcitonin receptors, reducing appetite, slowing stomach emptying and suppressing glucagon after meals. Because it acts through pathways distinct from GLP-1, it is being developed in combination with semaglutide.',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved by FDA or EMA. Novo Nordisk filed the fixed combination CagriSema (cagrilintide 2.4 mg with semaglutide 2.4 mg) with FDA for weight management in December 2025, based on the REDEFINE phase 3 programme. Check current status. Products sold online as "research" cagrilintide are unapproved.',
    },
    evidence: 'extensive',
    evidenceNote:
      'A phase 2 trial of cagrilintide alone and phase 3 trials of the semaglutide combination have been published. In REDEFINE 1, mean weight loss at 68 weeks was 20.4% with CagriSema versus 3.0% with placebo; in a head-to-head trial (REDEFINE 4) it did not show non-inferior weight loss versus tirzepatide 15 mg. Long-term safety and outcome data are still accruing.',
    routes: ['subq'],
    studiedRegimens: [
      {
        context: 'Overweight or obesity, cagrilintide alone (phase 2 dose-finding)',
        regimen:
          'Once-weekly SC doses of 0.3, 0.6, 1.2, 2.4 or 4.5 mg for 26 weeks, compared with placebo and liraglutide 3.0 mg daily.',
        source: 'Phase 2 trial (Lau et al., Lancet 2021)',
      },
      {
        context: 'Overweight or obesity, combined with semaglutide (CagriSema)',
        regimen:
          'Cagrilintide 2.4 mg plus semaglutide 2.4 mg SC once weekly after stepwise dose escalation; 68 weeks.',
        source: 'REDEFINE 1 phase 3 trial (NEJM 2025)',
      },
    ],
    commonSideEffects: ['Nausea', 'Constipation', 'Diarrhoea', 'Vomiting', 'Injection-site reactions'],
    seriousRisks: [NOT_ESTABLISHED, 'GI effects leading to stopping treatment', UNVERIFIED],
    cautions: [
      'Pregnancy and breastfeeding',
      'Insulin or sulfonylurea use (hypoglycaemia risk)',
    ],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('cagrilintide', 'PubMed: cagrilintide'),
      pubmed('cagrilintide semaglutide REDEFINE', 'PubMed: CagriSema REDEFINE trials'),
      trials('cagrilintide', 'ClinicalTrials.gov: cagrilintide'),
    ],
  },
  {
    id: 'cerebrolysin',
    name: 'Cerebrolysin',
    aliases: [],
    category: 'cognitive',
    classes: ['neuropeptide'],
    summary:
      'A mixture of small peptides and amino acids extracted from pig brain, used in some countries after stroke and brain injury.',
    mechanism:
      'Cerebrolysin is made by controlled enzymatic breakdown of purified porcine brain proteins, yielding a mixture of low-molecular-weight peptides and free amino acids. It is proposed to mimic the actions of neurotrophic factors, supporting neuron survival and plasticity in laboratory models. Because it is a biological mixture, its active components and exact mechanisms are not fully defined.',
    regulatory: {
      status: 'investigational',
      detail:
        'Authorised nationally in a number of countries in Europe, Asia and elsewhere for stroke, traumatic brain injury and dementia. Not approved by FDA and not centrally authorised by EMA.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Many randomised trials exist, mostly small or industry-funded. A Cochrane review in acute ischaemic stroke found no reduction in death and a possible increase in non-fatal serious adverse events.',
    routes: ['iv', 'im'],
    studiedRegimens: [],
    commonSideEffects: [
      'Dizziness',
      'Headache',
      'Agitation or restlessness',
      'Nausea',
      'Injection-site reactions',
    ],
    seriousRisks: [
      'Hypersensitivity reactions',
      'Seizures in predisposed people',
      'Possible excess non-fatal serious events',
    ],
    cautions: ['Epilepsy', 'Severe kidney impairment', 'Allergy to pork-derived products'],
    sources: [
      pubmed('cerebrolysin randomized controlled trial', 'PubMed: cerebrolysin randomised trials'),
      pubmed('cerebrolysin acute ischaemic stroke Cochrane', 'PubMed: cerebrolysin Cochrane review'),
      trials('cerebrolysin', 'ClinicalTrials.gov: cerebrolysin'),
    ],
  },
  {
    id: 'cjc-1295',
    name: 'CJC-1295 (with DAC)',
    aliases: ['CJC-1295 DAC', 'DAC:GRF'],
    category: 'gh-axis',
    classes: ['ghrh-analog'],
    summary:
      'A long-acting GHRH analogue that binds albumin and raised growth hormone and IGF-1 for days after a single injection in small early-phase studies.',
    mechanism:
      'CJC-1295 is a modified version of the first 29 amino acids of growth hormone–releasing hormone carrying a reactive "drug affinity complex" (DAC) that bonds to circulating albumin. This greatly extends its duration of action, so one injection stimulates pituitary GH release and raises IGF-1 for about a week or longer. Development as a medicine stopped after early clinical studies.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for human use; sold as a research chemical. Clinical development was discontinued after early-phase studies. ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Small published studies in healthy adults showed dose-dependent, sustained rises in GH and IGF-1; no trials have shown clinical benefit or long-term safety.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 168,
      route: 'subq',
      note: 'Estimated mean half-life 5.8–8.1 days after a single injection in healthy adults (7 days used for the curve).',
      source: 'Published human PK study (Teichman et al., J Clin Endocrinol Metab 2006)',
    },
    studiedRegimens: [],
    commonSideEffects: ['Injection-site reactions', 'Flushing or warmth', 'Headache'],
    seriousRisks: [
      'Sustained GH and IGF-1 elevation',
      'Fluid retention and joint pain',
      'Reduced insulin sensitivity',
      LONG_TERM_UNKNOWN,
      UNVERIFIED,
    ],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('CJC-1295', 'PubMed: CJC-1295'),
      pubmed('CJC-1295 growth hormone healthy adults', 'PubMed: CJC-1295 in healthy adults'),
      WADA_LIST,
    ],
  },
  {
    id: 'dihexa',
    name: 'Dihexa',
    aliases: ['PNB-0408'],
    category: 'cognitive',
    classes: ['neuropeptide'],
    summary:
      'A small angiotensin IV–derived compound promoted as a nootropic, with evidence limited to animal studies.',
    mechanism:
      'Dihexa is a modified fragment of angiotensin IV designed to be stable and to enter the brain. In laboratory and rodent studies it enhanced hepatocyte growth factor (HGF) signalling through the c-Met receptor, promoting new synaptic connections and improving performance in rat memory tests. HGF/c-Met signalling is also involved in cancer growth.',
    regulatory: {
      status: 'unapproved',
      detail: `${NOT_APPROVED_RC} ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'preclinical',
    evidenceNote: 'Only cell and animal data have been published; there are no published human trials.',
    routes: ['oral', 'topical'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised in humans'],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Theoretical cancer risk (c-Met activation)', UNVERIFIED],
    cautions: ['Active or past cancer', 'Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    sources: [
      pubmed('dihexa', 'PubMed: dihexa'),
      pubmed('dihexa hepatocyte growth factor', 'PubMed: dihexa and HGF/c-Met'),
    ],
  },
  {
    id: 'dsip',
    name: 'DSIP',
    aliases: ['Delta sleep-inducing peptide', 'Emideltide'],
    category: 'cognitive',
    classes: ['neuropeptide'],
    summary:
      'A nine-amino-acid peptide first isolated from rabbits in the 1970s and studied for sleep, with inconsistent results in people.',
    mechanism:
      'DSIP was identified in the blood of rabbits during induced sleep and named for its apparent ability to promote slow-wave (delta) sleep. Its receptor and natural role remain unclear, and a gene encoding it has not been identified. Proposed effects on sleep, stress hormones and pain have not been consistently reproduced.',
    regulatory: {
      status: 'unapproved',
      detail: `${NOT_APPROVED_RC} ${FDA_CAT2_WITHDRAWN} In July 2026 FDA’s Pharmacy Compounding Advisory Committee voted against recommending it for the 503A bulks list.`,
    },
    evidence: 'limited',
    evidenceNote:
      'Small human studies, mostly from the 1980s, in insomnia and withdrawal states gave mixed results; there are no modern controlled trials.',
    routes: ['subq', 'iv'],
    studiedRegimens: [],
    commonSideEffects: ['Not well characterised in humans', 'Injection-site reactions'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: ['Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('delta sleep-inducing peptide', 'PubMed: delta sleep-inducing peptide'),
      pubmed('delta sleep-inducing peptide insomnia', 'PubMed: DSIP in insomnia'),
    ],
  },
  {
    id: 'dulaglutide',
    name: 'Dulaglutide',
    aliases: ['Trulicity'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'glucose-lowering'],
    summary: 'A once-weekly GLP-1 receptor agonist injection approved for type 2 diabetes.',
    mechanism:
      'Dulaglutide consists of two GLP-1 analogue chains fused to a modified antibody (IgG4 Fc) fragment, which slows its clearance and allows weekly dosing. Like other GLP-1 receptor agonists it increases glucose-dependent insulin release, lowers glucagon, slows gastric emptying and reduces appetite.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA- and EMA-approved as Trulicity for type 2 diabetes; in the US also to reduce the risk of major cardiovascular events in adults with type 2 diabetes. Not approved for weight management.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Supported by the AWARD phase 3 programme and the REWIND cardiovascular outcomes trial.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 120,
      tmaxHours: 48,
      route: 'subq',
      note: 'Half-life approx. 5 days; peak concentration 24–72 hours after injection (median about 48 hours).',
      source: 'Trulicity US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Type 2 diabetes (adults)',
        regimen:
          '0.75 mg SC once weekly; may increase to 1.5 mg for additional glucose control, then to 3 mg and 4.5 mg, each after at least 4 weeks on the previous dose. Maximum 4.5 mg weekly.',
        source: 'Trulicity US prescribing information',
      },
    ],
    commonSideEffects: [
      'Nausea',
      'Diarrhoea',
      'Vomiting',
      'Abdominal pain',
      'Decreased appetite',
      'Fatigue',
    ],
    seriousRisks: [
      'Thyroid C-cell tumour risk (boxed warning)',
      'Acute pancreatitis',
      'Gallbladder disease',
      'Hypoglycaemia with insulin or sulfonylureas',
      'Acute kidney injury from dehydration',
      'Diabetic retinopathy complications',
    ],
    cautions: [
      'Personal or family history of MTC',
      'Multiple endocrine neoplasia type 2',
      'Pregnancy or planning pregnancy',
      'History of pancreatitis',
      'Severe gastrointestinal disease',
    ],
    storage:
      'Refrigerate at 2–8 °C; do not freeze; protect from light. May be kept at room temperature (up to 30 °C) for up to 14 days.',
    sources: [
      dailymed('Trulicity', 'DailyMed: Trulicity label'),
      ema('Trulicity', 'EMA: Trulicity'),
      pubmed('dulaglutide REWIND', 'PubMed: REWIND trial'),
    ],
  },
  {
    id: 'elamipretide',
    name: 'Elamipretide',
    aliases: ['Forzinity', 'SS-31', 'MTP-131', 'Bendavia'],
    category: 'longevity',
    classes: ['mitochondrial'],
    summary:
      'A mitochondria-targeted tetrapeptide studied in rare mitochondrial diseases and given US accelerated approval for Barth syndrome.',
    mechanism:
      'Elamipretide is a small, cell-permeable peptide that concentrates in the inner mitochondrial membrane and binds cardiolipin, a lipid needed for the structure of the energy-producing respiratory chain. By stabilising cardiolipin it is proposed to improve mitochondrial energy production and reduce oxidative stress. Barth syndrome, its main target, is caused by abnormal cardiolipin.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA accelerated approval in September 2025 as Forzinity (Stealth BioTherapeutics) to improve muscle strength in people with Barth syndrome weighing at least 30 kg, based on knee-extensor strength (an intermediate endpoint); continued approval depends on a confirmatory trial. Not approved by EMA. "SS-31" sold online is an unapproved research chemical, not the approved product.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Several phase 2 and 3 trials (mitochondrial myopathy, Barth syndrome, heart failure, eye disease) have been run; key randomised trials missed their primary endpoints. The Barth syndrome approval rests on 12 patients, with strength gains seen in the open-label extension rather than the randomised phase.',
    routes: ['subq', 'iv'],
    studiedRegimens: [
      {
        context: 'Barth syndrome, patients weighing at least 30 kg (Forzinity)',
        regimen:
          '40 mg SC once daily into the abdomen or thigh; 20 mg once daily in adults with eGFR below 30 mL/min who are not on dialysis.',
        source: 'Forzinity US prescribing information',
      },
      {
        context: 'Barth syndrome (TAZPOWER, phase 2/3)',
        regimen:
          '40 mg SC once daily (two 12-week randomised crossover periods versus placebo, then open-label extension).',
        source: 'TAZPOWER trial',
      },
      {
        context: 'Primary mitochondrial myopathy (MMPOWER-3, phase 3)',
        regimen: '40 mg SC once daily for 24 weeks; primary endpoints not met.',
        source: 'MMPOWER-3 trial',
      },
    ],
    commonSideEffects: [
      'Injection-site redness, pain, hardening or itching (very common)',
      'Raised eosinophil count (lab finding, usually transient)',
    ],
    seriousRisks: [
      'Hypersensitivity reactions, including serious allergic reactions',
      'Injection-site reactions leading to stopping',
      NOT_ESTABLISHED,
      UNVERIFIED,
    ],
    cautions: [
      'Severe kidney impairment (lower dose)',
      'Neonates (contains benzyl alcohol)',
      'Pregnancy and breastfeeding (limited data)',
    ],
    storage:
      'Forzinity: refrigerate unopened vials at 2–8 °C; do not freeze. After first use, keep refrigerated or at room temperature (20–25 °C) and discard 8 days after opening.',
    sources: [
      dailymed('Forzinity', 'DailyMed: Forzinity label'),
      pubmed('elamipretide', 'PubMed: elamipretide'),
      pubmed('elamipretide Barth syndrome', 'PubMed: elamipretide in Barth syndrome'),
      trials('elamipretide', 'ClinicalTrials.gov: elamipretide'),
    ],
  },
  {
    id: 'epitalon',
    name: 'Epitalon',
    aliases: ['Epithalon', 'Epithalone', 'AEDG peptide', 'Ala-Glu-Asp-Gly'],
    category: 'longevity',
    classes: ['bioregulator'],
    summary:
      'A synthetic four-amino-acid peptide promoted for anti-ageing, based mainly on studies from a single Russian research group.',
    mechanism:
      'Epitalon (Ala-Glu-Asp-Gly) was designed to reproduce the activity of epithalamin, an extract of bovine pineal gland. Studies by its developers reported telomerase activation in cell cultures and effects on melatonin rhythms and lifespan in rodents. These findings have not been widely replicated by independent groups.',
    regulatory: {
      status: 'unapproved',
      detail: `${NOT_APPROVED_RC} ${FDA_CAT2_WITHDRAWN} ${PCAC_2026_FOR}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Human reports are small, mostly from the originating group, and lack independent randomised replication; claims of lifespan extension in people are not supported by trial data.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: ['Not well characterised in humans', 'Injection-site reactions'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: ['Pregnancy and breastfeeding', 'Active or past cancer (telomerase effects)', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('epitalon', 'PubMed: epitalon'),
      pubmed('Ala-Glu-Asp-Gly peptide', 'PubMed: AEDG peptide'),
    ],
  },
  {
    id: 'foxo4-dri',
    name: 'FOXO4-DRI',
    aliases: ['FOXO4-D-Retro-Inverso', 'Proxofim'],
    category: 'longevity',
    classes: ['senolytic'],
    summary:
      'An experimental senolytic peptide that cleared senescent cells in mice; it has not been tested in published human trials.',
    mechanism:
      'FOXO4-DRI is a modified (D-retro-inverso) peptide that blocks the binding of the transcription factor FOXO4 to p53 in senescent cells. That interaction helps senescent cells avoid programmed cell death, so disrupting it pushes them into apoptosis. In a 2017 mouse study it improved fitness, fur density and kidney function in aged and chemotherapy-treated mice.',
    regulatory: {
      status: 'unapproved',
      detail: NOT_APPROVED_RC,
    },
    evidence: 'preclinical',
    evidenceNote:
      'Evidence is from cell culture and mouse studies (notably Baar et al., Cell 2017); no human trials have been published.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised in humans'],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Effects on healthy cells unknown in humans', UNVERIFIED],
    cautions: ['Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('FOXO4-DRI', 'PubMed: FOXO4-DRI'),
      pubmed('FOXO4 p53 senescent cells', 'PubMed: FOXO4–p53 and senescence'),
    ],
  },
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    aliases: ['Copper tripeptide-1', 'Copper peptide GHK', 'Glycyl-L-histidyl-L-lysine copper'],
    category: 'skin',
    classes: ['copper-peptide', 'tissue-repair'],
    summary:
      'A naturally occurring copper-binding tripeptide used in cosmetic skin and hair products; injected use is unstudied in humans.',
    mechanism:
      'GHK (glycine–histidine–lysine) occurs naturally in human plasma, saliva and urine and binds copper ions tightly. In cell and animal studies GHK-Cu stimulated collagen and glycosaminoglycan production, supported wound healing and altered the expression of many genes involved in tissue remodelling. Plasma levels reportedly fall with age, which prompted cosmetic interest.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Not approved as a medicine. Widely used as a cosmetic ingredient (copper tripeptide-1) in topical products. Injectable forms are not approved for human use and are sold as research chemicals. For compounding, FDA previously placed injectable GHK-Cu in Category 2 (potential significant safety risks); that nomination was withdrawn in 2026, and FDA lists non-injectable GHK-Cu in 503A Category 1 (under evaluation), with advisory committee review planned before the end of February 2027.',
    },
    evidence: 'limited',
    evidenceNote:
      'Small cosmetic studies of topical products report improvements in skin appearance, but most are small and manufacturer-linked; there are no controlled trials of injected GHK-Cu.',
    routes: ['topical', 'subq'],
    studiedRegimens: [],
    commonSideEffects: [
      'Skin irritation or redness (topical)',
      'Injection-site pain or reactions (injected)',
    ],
    seriousRisks: ['Injected use: human safety unknown', UNVERIFIED, NON_STERILE],
    cautions: [
      'Wilson disease or copper disorders',
      'Copper allergy',
      'Pregnancy and breastfeeding',
    ],
    storage:
      'Lyophilised (injectable): refrigerate, protect from light; once reconstituted, refrigerate and use within the period stated by the supplier. Topical products: as labelled by the manufacturer.',
    sources: [
      pubmed('GHK-Cu', 'PubMed: GHK-Cu'),
      pubmed('copper tripeptide skin', 'PubMed: copper tripeptide and skin'),
    ],
  },
  {
    id: 'ghrp-2',
    name: 'GHRP-2',
    aliases: ['Pralmorelin', 'Growth hormone-releasing peptide-2'],
    category: 'gh-axis',
    classes: ['gh-secretagogue'],
    summary:
      'A synthetic growth hormone–releasing peptide that acts on the ghrelin receptor; used in Japan as a diagnostic test agent.',
    mechanism:
      'GHRP-2 activates the growth hormone secretagogue receptor (GHS-R1a, the ghrelin receptor) in the pituitary and hypothalamus, triggering pulses of GH release. It also increases appetite and can raise cortisol (via ACTH) and prolactin. Its GH effect is strongest when combined with GHRH.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Not approved by FDA or EMA. In Japan, pralmorelin has been approved as a diagnostic agent for growth hormone deficiency. Elsewhere it is sold as a research chemical. For outsourcing facilities (503B), FDA lists it among bulk substances with potential significant safety risks for injectable and nasal use (Category 2); for 503A pharmacies it was nominated without adequate support (Category 3).',
    },
    evidence: 'limited',
    evidenceNote:
      'Small human studies have characterised its hormone responses and diagnostic use; there are no trials showing long-term benefit or safety.',
    routes: ['subq', 'iv'],
    studiedRegimens: [],
    commonSideEffects: [
      'Increased appetite',
      'Flushing',
      'Raised cortisol and prolactin',
      'Injection-site reactions',
    ],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Reduced insulin sensitivity', UNVERIFIED],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('GHRP-2 pralmorelin', 'PubMed: GHRP-2 (pralmorelin)'),
      pubmed('growth hormone releasing peptide-2 human', 'PubMed: GHRP-2 human studies'),
      WADA_LIST,
    ],
  },
  {
    id: 'ghrp-6',
    name: 'GHRP-6',
    aliases: ['Growth hormone-releasing hexapeptide', 'Growth hormone-releasing peptide-6'],
    category: 'gh-axis',
    classes: ['gh-secretagogue'],
    summary:
      'An early synthetic growth hormone–releasing hexapeptide that strongly stimulates appetite; not approved for any use.',
    mechanism:
      'GHRP-6 was one of the first synthetic growth hormone secretagogues, developed before ghrelin itself was discovered. It activates the ghrelin receptor (GHS-R1a), producing GH release, a marked increase in hunger and smaller rises in cortisol and prolactin.',
    regulatory: {
      status: 'unapproved',
      detail: `${NOT_APPROVED_RC} For outsourcing facilities (503B), FDA lists it among bulk substances with potential significant safety risks (Category 2); for 503A pharmacies it was nominated without adequate support (Category 3).`,
    },
    evidence: 'limited',
    evidenceNote:
      'Small human physiology studies have characterised its hormone effects; there are no trials of clinical benefit or long-term safety.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: [
      'Strong increase in appetite',
      'Raised cortisol and prolactin',
      'Fluid retention',
      'Injection-site reactions',
    ],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Reduced insulin sensitivity', UNVERIFIED],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('GHRP-6', 'PubMed: GHRP-6'),
      pubmed('GHRP-6 growth hormone humans', 'PubMed: GHRP-6 human studies'),
      WADA_LIST,
    ],
  },
  {
    id: 'gonadorelin',
    name: 'Gonadorelin',
    aliases: ['GnRH', 'LHRH', 'Gonadotropin-releasing hormone', 'Gonadorelin acetate'],
    category: 'hormone',
    classes: ['gonadotropin'],
    summary:
      'A synthetic copy of natural gonadotropin-releasing hormone (GnRH) that prompts the pituitary to release LH and FSH.',
    mechanism:
      'Gonadorelin is identical to the hypothalamic decapeptide GnRH. Given in short pulses, it stimulates the pituitary to release luteinising hormone (LH) and follicle-stimulating hormone (FSH), which drive sex-hormone production and fertility. Because it is cleared quickly, its effect depends on the dosing pattern: pulsatile delivery mimics natural physiology, whereas continuous exposure can desensitise the pituitary and suppress the axis.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Human products previously marketed in the US (for diagnostic testing of pituitary function and for pulsatile fertility treatment) have been discontinued. It remains available in some countries and through compounding, and veterinary gonadorelin products are approved for cattle. Check current status.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Decades of clinical use support its diagnostic and pulsatile fertility uses; evidence for the intermittent injections used alongside testosterone in some men’s-health clinics is largely lacking.',
    routes: ['subq', 'iv'],
    studiedRegimens: [],
    commonSideEffects: ['Headache', 'Nausea', 'Flushing', 'Injection-site reactions'],
    seriousRisks: [
      'Hypersensitivity reactions (rare)',
      'Continuous exposure suppresses the axis',
      'Ovarian hyperstimulation (fertility use)',
    ],
    cautions: [
      'Hormone-sensitive cancers',
      'Pregnancy',
      'Competitive athletes (prohibited in males)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2_MALES,
    sources: [
      pubmed('gonadorelin', 'PubMed: gonadorelin'),
      pubmed('pulsatile GnRH therapy', 'PubMed: pulsatile GnRH therapy'),
      WADA_LIST,
    ],
  },
  {
    id: 'hcg',
    name: 'hCG',
    aliases: [
      'Human chorionic gonadotropin',
      'Pregnyl',
      'Novarel',
      'Choriogonadotropin alfa',
      'Ovidrel',
      'Ovitrelle',
    ],
    category: 'hormone',
    classes: ['gonadotropin'],
    summary:
      'A pregnancy hormone used medically in fertility treatment and to stimulate testosterone production in men with hypogonadotropic hypogonadism.',
    mechanism:
      'hCG is a glycoprotein hormone made by the placenta that acts on the same receptor as luteinising hormone (the LH/hCG receptor). In women it triggers final egg maturation and ovulation; in men it stimulates Leydig cells in the testes to make testosterone and supports sperm production. Urine-derived and recombinant (choriogonadotropin alfa) forms exist.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved as urinary hCG (Novarel, Pregnyl) and recombinant hCG (Ovidrel; Ovitrelle in the EU, EMA-approved) for infertility treatment; urinary hCG is also approved for prepubertal cryptorchidism and hypogonadotropic hypogonadism in males. US labels state it has not been shown to be effective for weight loss.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Long established in reproductive medicine with extensive trial and clinical data. It is not effective for weight loss.',
    routes: ['im', 'subq'],
    studiedRegimens: [
      {
        context: 'Final follicular maturation in assisted reproduction',
        regimen: '250 mcg SC once, one day after the last dose of follicle-stimulating medication.',
        source: 'Ovidrel US prescribing information',
      },
      {
        context: 'Hypogonadotropic hypogonadism in males',
        regimen:
          'Labels list several IM regimens, e.g. 500–1,000 USP units three times weekly for 3 weeks, then twice weekly for 3 weeks; or 4,000 USP units three times weekly for 6–9 months, then 2,000 units three times weekly for 3 more months.',
        source: 'Novarel and Pregnyl US prescribing information',
      },
    ],
    commonSideEffects: [
      'Headache',
      'Irritability or restlessness',
      'Fatigue',
      'Fluid retention (oedema)',
      'Breast enlargement in males',
      'Injection-site pain',
    ],
    seriousRisks: [
      'Ovarian hyperstimulation syndrome (women)',
      'Multiple pregnancy (fertility use)',
      'Blood clots (thromboembolism)',
      'Precocious puberty (children)',
    ],
    cautions: [
      'Prostate cancer or androgen-dependent tumours',
      'Precocious puberty',
      'Not for weight loss',
      'Competitive athletes (prohibited in males)',
    ],
    storage:
      'Urinary hCG powder: store at room temperature before mixing; after reconstitution refrigerate and use within the time on the label. Recombinant prefilled syringes or pens: refrigerate as labelled.',
    antiDoping: WADA_S2_MALES,
    sources: [
      dailymed('chorionic gonadotropin', 'DailyMed: chorionic gonadotropin labels'),
      dailymed('Ovidrel', 'DailyMed: Ovidrel label'),
      ema('Ovitrelle', 'EMA: Ovitrelle'),
      WADA_LIST,
    ],
  },
  {
    id: 'hexarelin',
    name: 'Hexarelin',
    aliases: ['Examorelin'],
    category: 'gh-axis',
    classes: ['gh-secretagogue'],
    summary:
      'A potent synthetic growth hormone–releasing hexapeptide studied in small human trials; not approved for any use.',
    mechanism:
      'Hexarelin is a GHRP-6 derivative that activates the ghrelin receptor (GHS-R1a), producing strong GH release along with rises in cortisol and prolactin. It also binds CD36, a receptor in the heart and blood vessels, which prompted research into cardiac effects. In human studies the GH response diminishes with continued use.',
    regulatory: {
      status: 'unapproved',
      detail: NOT_APPROVED_RC,
    },
    evidence: 'limited',
    evidenceNote:
      'Small human studies characterised hormone responses and acute cardiac effects; no trials have shown long-term benefit or safety.',
    routes: ['subq', 'iv'],
    studiedRegimens: [],
    commonSideEffects: [
      'Increased appetite',
      'Raised cortisol and prolactin',
      'Flushing',
      'Injection-site reactions',
    ],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Reduced insulin sensitivity', UNVERIFIED],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('hexarelin', 'PubMed: hexarelin'),
      pubmed('hexarelin growth hormone humans', 'PubMed: hexarelin human studies'),
      WADA_LIST,
    ],
  },
  {
    id: 'ibutamoren',
    name: 'Ibutamoren',
    aliases: ['MK-677', 'MK-0677', 'LUM-201', 'Ibutamoren mesylate'],
    category: 'gh-axis',
    classes: ['gh-secretagogue'],
    summary:
      'An oral, non-peptide ghrelin receptor agonist that raises growth hormone and IGF-1; studied in clinical trials but not approved.',
    mechanism:
      'Ibutamoren is a small molecule (not a peptide) that mimics ghrelin at the growth hormone secretagogue receptor. Once-daily oral dosing increases GH pulse size and, in older adults, raised IGF-1 to levels typical of young adults. It also increases appetite and can raise blood glucose.',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved by FDA or EMA. Studied by Merck in the 1990s–2000s and later as LUM-201 for paediatric growth hormone deficiency (phase 2); check current status. Widely sold as a research chemical. FDA lists ibutamoren mesylate among bulk substances with potential significant safety risks for compounding (Category 2), citing the heart failure signal.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Several randomised trials (healthy older adults, hip-fracture recovery, Alzheimer’s disease) showed increased GH, IGF-1 and lean mass but no proven functional benefit; a hip-fracture trial was stopped early because of a heart failure signal.',
    routes: ['oral'],
    studiedRegimens: [
      {
        context: 'Healthy older adults (body composition)',
        regimen: '25 mg orally once daily for up to 2 years.',
        source: 'Randomised trial (Nass et al., Annals of Internal Medicine 2008)',
      },
      {
        context: 'Alzheimer’s disease (no effect on progression)',
        regimen: '25 mg orally once daily for 12 months.',
        source: 'Randomised trial (Sevigny et al., Neurology 2008)',
      },
    ],
    commonSideEffects: [
      'Increased appetite',
      'Mild fluid retention or swelling',
      'Muscle or joint pain',
      'Raised fasting blood glucose',
    ],
    seriousRisks: [
      'Reduced insulin sensitivity',
      'Heart failure signal in frail older adults',
      'Safety beyond 2 years unknown',
      UNVERIFIED,
    ],
    cautions: [
      'Diabetes or prediabetes',
      'Heart failure',
      'Active or past cancer',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    antiDoping: WADA_S2,
    sources: [
      pubmed('ibutamoren MK-677', 'PubMed: ibutamoren (MK-677)'),
      pubmed('MK-677 randomized trial', 'PubMed: MK-677 randomised trials'),
      trials('MK-677', 'ClinicalTrials.gov: MK-677'),
      WADA_LIST,
    ],
  },
  {
    id: 'igf-1-lr3',
    name: 'IGF-1 LR3',
    aliases: ['Long R3 IGF-1', 'LR3-IGF-1'],
    category: 'gh-axis',
    classes: ['igf1-analog'],
    summary:
      'An engineered, longer-acting IGF-1 analogue made for cell culture; it has not been studied in humans.',
    mechanism:
      'IGF-1 LR3 is human IGF-1 with an arginine at position 3 and a 13-amino-acid extension at the N-terminus. These changes greatly reduce binding to IGF-binding proteins, so more of it stays free and active, and it lasts longer than native IGF-1 in animal studies. It activates the IGF-1 receptor, promoting cell growth and glucose uptake.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Not approved for human use. Manufactured as a cell-culture reagent and sold as a research chemical.',
    },
    evidence: 'preclinical',
    evidenceNote: 'Data come from cell culture and animal studies; there are no published human studies.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised in humans', 'Low blood sugar symptoms (expected)'],
    seriousRisks: [
      'Hypoglycaemia (expected IGF-1 effect)',
      'Theoretical promotion of tumour growth',
      LONG_TERM_UNKNOWN,
      UNVERIFIED,
    ],
    cautions: [
      'Active or past cancer',
      'Diabetes or glucose-lowering drugs',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('LR3 IGF-1', 'PubMed: LR3 IGF-1'),
      pubmed('Long R3 IGF-I', 'PubMed: Long R3 IGF-I'),
      WADA_LIST,
    ],
  },
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    aliases: ['Ipamorelin acetate'],
    category: 'gh-axis',
    classes: ['gh-secretagogue'],
    summary:
      'A synthetic pentapeptide ghrelin receptor agonist that releases growth hormone; clinical development for postoperative ileus did not lead to approval.',
    mechanism:
      'Ipamorelin activates the growth hormone secretagogue (ghrelin) receptor, producing a pulse of GH release. In animal studies it was more selective than older GHRPs, with little effect on cortisol or prolactin at GH-releasing doses. It was also studied for its ghrelin-like effects on gut motility.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Not approved for human use; sold as a research chemical. A phase 2 trial for postoperative ileus did not lead to further development. For outsourcing facilities (503B), FDA lists ipamorelin acetate among bulk substances with potential significant safety risks (Category 2); it was previously in Category 2 for 503A pharmacies too, until that nomination was withdrawn.',
    },
    evidence: 'limited',
    evidenceNote:
      'Human data come from pharmacokinetic studies and a phase 2 trial in postoperative ileus that showed no clear benefit; there are no trials of the uses it is marketed for.',
    routes: ['subq', 'iv'],
    pk: {
      halfLifeHours: 2,
      route: 'iv',
      note: 'Terminal half-life approx. 2 hours after intravenous infusion in healthy volunteers.',
      source: 'Published human PK study (Gobburu et al., Pharmaceutical Research 1999)',
    },
    studiedRegimens: [],
    commonSideEffects: ['Not well characterised in humans', 'Injection-site reactions'],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Reduced insulin sensitivity (GH effect)', UNVERIFIED],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('ipamorelin', 'PubMed: ipamorelin'),
      trials('ipamorelin', 'ClinicalTrials.gov: ipamorelin'),
      WADA_LIST,
    ],
  },
  {
    id: 'kisspeptin-10',
    name: 'Kisspeptin-10',
    aliases: ['KP-10', 'Metastin 45–54'],
    category: 'hormone',
    classes: ['kisspeptin'],
    summary:
      'The shortest active fragment of kisspeptin, a hypothalamic hormone that switches on the reproductive axis; used only in human research studies.',
    mechanism:
      'Kisspeptins act on the KISS1 receptor (GPR54) on GnRH neurons in the hypothalamus, stimulating GnRH release and, downstream, LH and FSH. Kisspeptin-10 is the C-terminal decapeptide that retains full receptor activity. In small human studies, injections acutely raised LH and testosterone in men; it has a short half-life.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for any indication; used in academic human research. Products sold online are research chemicals. ${FDA_CAT2}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Small physiological studies in healthy volunteers and people with reproductive disorders; the related kisspeptin-54 has been tested as an IVF egg-maturation trigger.',
    routes: ['iv', 'subq'],
    studiedRegimens: [],
    commonSideEffects: ['Few effects reported in short studies', 'Injection-site reactions'],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Effects of repeated dosing unclear', UNVERIFIED],
    cautions: [
      'Hormone-sensitive cancers',
      'Pregnancy and breastfeeding',
      'Under 18 (no safety data)',
      'Competitive athletes (prohibited in males)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2_MALES,
    sources: [
      pubmed('kisspeptin-10 human', 'PubMed: kisspeptin-10 in humans'),
      pubmed('kisspeptin luteinizing hormone testosterone men', 'PubMed: kisspeptin and LH in men'),
      WADA_LIST,
    ],
  },
  {
    id: 'kpv',
    name: 'KPV',
    aliases: ['Lys-Pro-Val', 'α-MSH (11–13)'],
    category: 'immune',
    classes: ['anti-inflammatory'],
    summary:
      'A tripeptide from the tail of alpha-MSH with anti-inflammatory effects in laboratory and animal models of colitis and skin inflammation.',
    mechanism:
      'KPV is the C-terminal three amino acids (lysine–proline–valine) of alpha-melanocyte-stimulating hormone. In cell and mouse studies it reduced inflammatory signalling, including NF-κB activation, and lessened colitis; uptake into gut cells via the PepT1 transporter has been proposed. Unlike full alpha-MSH it is not expected to cause pigmentation.',
    regulatory: {
      status: 'unapproved',
      detail: `${NOT_APPROVED_RC} ${FDA_CAT2_WITHDRAWN} ${PCAC_2026_FOR}`,
    },
    evidence: 'preclinical',
    evidenceNote:
      'Evidence comes from cell and rodent studies; no controlled human trials have been published.',
    routes: ['oral', 'subq', 'topical'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised in humans', 'Injection-site reactions (injected use)'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: ['Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('KPV tripeptide', 'PubMed: KPV tripeptide'),
      pubmed('KPV colitis', 'PubMed: KPV in colitis models'),
    ],
  },
  {
    id: 'liraglutide',
    name: 'Liraglutide',
    aliases: ['Victoza', 'Saxenda'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'glucose-lowering'],
    summary:
      'A once-daily GLP-1 receptor agonist injection approved for type 2 diabetes and for weight management.',
    mechanism:
      'Liraglutide is a GLP-1 analogue with a fatty-acid side chain that binds albumin, extending its action to allow once-daily dosing. It increases glucose-dependent insulin release, lowers glucagon, slows gastric emptying and acts on brain appetite centres to reduce food intake.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA- and EMA-approved as Victoza (type 2 diabetes, including cardiovascular risk reduction) and Saxenda (chronic weight management in adults, and in adolescents aged 12 and over with obesity who weigh more than 60 kg). Generic versions have been approved in the US.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Supported by the LEAD and SCALE phase 3 programmes and the LEADER cardiovascular outcomes trial.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 13,
      tmaxHours: 10,
      route: 'subq',
      note: 'Half-life approx. 13 hours, suiting once-daily dosing; peak concentration about 8–12 hours after injection (10 h used for the curve).',
      source: 'Victoza US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Chronic weight management (Saxenda, adults)',
        regimen:
          '0.6 mg SC once daily in week 1, increased by 0.6 mg each week (1.2, 1.8, 2.4 mg) to 3.0 mg once daily from week 5.',
        source: 'Saxenda US prescribing information',
      },
      {
        context: 'Type 2 diabetes (Victoza)',
        regimen:
          '0.6 mg SC once daily for 1 week, then 1.2 mg daily; may increase to 1.8 mg daily for additional glucose control.',
        source: 'Victoza US prescribing information',
      },
    ],
    commonSideEffects: [
      'Nausea',
      'Diarrhoea',
      'Constipation',
      'Vomiting',
      'Injection-site reactions',
      'Headache',
    ],
    seriousRisks: [
      'Thyroid C-cell tumour risk (boxed warning)',
      'Acute pancreatitis',
      'Gallbladder disease',
      'Hypoglycaemia with insulin or sulfonylureas',
      'Increased heart rate',
      'Acute kidney injury from dehydration',
    ],
    cautions: [
      'Personal or family history of MTC',
      'Multiple endocrine neoplasia type 2',
      'Pregnancy or planning pregnancy',
      'History of pancreatitis',
      'Other GLP-1 receptor agonists',
    ],
    storage:
      'Before first use: refrigerate at 2–8 °C. After first use: up to 30 days at room temperature (15–30 °C) or in the refrigerator. Do not freeze; keep the pen cap on to protect from light.',
    sources: [
      dailymed('Saxenda', 'DailyMed: Saxenda label'),
      dailymed('Victoza', 'DailyMed: Victoza label'),
      ema('liraglutide', 'EMA: liraglutide'),
      pubmed('liraglutide 3.0 mg SCALE', 'PubMed: SCALE trials'),
    ],
  },
  {
    id: 'll-37',
    name: 'LL-37',
    aliases: ['Cathelicidin', 'Human cathelicidin antimicrobial peptide', 'hCAP18 (precursor)'],
    category: 'immune',
    classes: ['antimicrobial'],
    summary:
      'The only human cathelicidin, a natural antimicrobial and immune-signalling peptide; injected use has not been tested in controlled human trials.',
    mechanism:
      'LL-37 is a 37-amino-acid peptide cleaved from the precursor protein hCAP18 and made by white blood cells and epithelial cells. It can disrupt bacterial membranes and neutralise endotoxin, and it signals to immune cells, influencing inflammation, wound healing and blood-vessel growth. Its immune effects can be pro- or anti-inflammatory depending on context, and excess LL-37 is implicated in psoriasis and rosacea.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for human use. A topical formulation has been tested in small phase 2 trials for hard-to-heal venous leg ulcers. Injectable forms are sold as research chemicals. ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Human data are limited to small topical trials in leg ulcers with mixed results; there are no controlled trials of injected LL-37.',
    routes: ['subq', 'topical'],
    studiedRegimens: [],
    commonSideEffects: ['Injection-site reactions', 'Local irritation (topical)'],
    seriousRisks: [
      'May worsen inflammatory skin disease',
      'Cytotoxic at high concentrations (lab data)',
      LONG_TERM_UNKNOWN,
      UNVERIFIED,
    ],
    cautions: ['Psoriasis, rosacea or lupus', 'Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('LL-37 cathelicidin', 'PubMed: LL-37 (cathelicidin)'),
      pubmed('LL-37 venous leg ulcers', 'PubMed: LL-37 in venous leg ulcers'),
    ],
  },
  {
    id: 'mazdutide',
    name: 'Mazdutide',
    aliases: ['IBI362', 'LY3305677'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'glucagon-agonist', 'glucose-lowering'],
    summary:
      'A once-weekly dual GLP-1 and glucagon receptor agonist, approved in China for weight management but not by FDA or EMA.',
    mechanism:
      'Mazdutide is an oxyntomodulin-like peptide that activates both the GLP-1 receptor and the glucagon receptor. GLP-1 activity reduces appetite and improves glucose control, while glucagon receptor activity is thought to increase energy expenditure and reduce liver fat. It is injected once weekly.',
    regulatory: {
      status: 'investigational',
      detail:
        'Approved in China in 2025 (as Xinermei, developed there by Innovent under licence from Eli Lilly) for chronic weight management and, later that year, for glycaemic control in type 2 diabetes. Not approved by FDA or EMA. Check current status.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Phase 2 and phase 3 trials, mostly in Chinese adults, show clinically meaningful weight loss; data in other populations and long-term outcome data are limited.',
    routes: ['subq'],
    studiedRegimens: [
      {
        context: 'Overweight or obesity in Chinese adults (GLORY-1, phase 3)',
        regimen: '4 mg or 6 mg SC once weekly (after dose escalation) for 48 weeks.',
        source: 'GLORY-1 phase 3 trial (NEJM 2025)',
      },
    ],
    commonSideEffects: ['Nausea', 'Diarrhoea', 'Vomiting', 'Decreased appetite', 'Increased heart rate'],
    seriousRisks: [
      'GLP-1 class risks (pancreatitis, gallbladder disease)',
      NOT_ESTABLISHED,
      UNVERIFIED,
    ],
    cautions: [
      'Pregnancy and breastfeeding',
      'Personal or family history of MTC/MEN 2',
      'History of pancreatitis',
    ],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('mazdutide', 'PubMed: mazdutide'),
      trials('mazdutide', 'ClinicalTrials.gov: mazdutide'),
    ],
  },
  {
    id: 'mecasermin',
    name: 'Mecasermin',
    aliases: ['Increlex', 'Recombinant human IGF-1', 'rhIGF-1'],
    category: 'gh-axis',
    classes: ['igf1-analog'],
    summary:
      'Recombinant human IGF-1, approved for children with severe primary IGF-1 deficiency whose growth does not respond to growth hormone.',
    mechanism:
      'Mecasermin is identical to human insulin-like growth factor-1, the main mediator of growth hormone’s growth-promoting effects. It activates the IGF-1 receptor to stimulate bone and tissue growth and has insulin-like effects that lower blood glucose. It is used when growth failure is caused by an inability to make IGF-1 in response to GH.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA- and EMA-approved as Increlex for growth failure in children with severe primary IGF-1 deficiency. Not approved for adults, anti-ageing or performance use.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Approval rests on small, mostly open-label studies in a rare paediatric condition, supported by long-term registry data.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 5.8,
      route: 'subq',
      note: 'Mean terminal half-life approx. 5.8 hours in children with severe primary IGF-1 deficiency.',
      source: 'Increlex US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Severe primary IGF-1 deficiency (children)',
        regimen:
          'Start 0.04–0.08 mg/kg SC twice daily; if tolerated for at least 1 week, increase by 0.04 mg/kg per dose to a maximum of 0.12 mg/kg twice daily. Give within 20 minutes before or after a meal or snack.',
        source: 'Increlex US prescribing information',
      },
    ],
    commonSideEffects: [
      'Hypoglycaemia',
      'Fatty lumps at injection sites',
      'Enlarged tonsils or adenoids',
      'Snoring',
      'Headache',
      'Ear infections or hearing changes',
    ],
    seriousRisks: [
      'Severe hypoglycaemia',
      'Benign and malignant tumours',
      'Intracranial hypertension',
      'Slipped capital femoral epiphysis',
      'Hypersensitivity reactions',
    ],
    cautions: [
      'Active or suspected cancer',
      'Closed growth plates',
      'Skipping meals (hypoglycaemia)',
      'Not a substitute for GH therapy',
    ],
    storage:
      'Refrigerate at 2–8 °C; do not freeze; protect from light. Use within 30 days after first opening the vial.',
    antiDoping: WADA_S2,
    sources: [
      dailymed('Increlex', 'DailyMed: Increlex label'),
      ema('Increlex', 'EMA: Increlex'),
      WADA_LIST,
    ],
  },
  {
    id: 'melanotan-ii',
    name: 'Melanotan II',
    aliases: ['MT-II', 'MT2', 'Melanotan 2'],
    category: 'skin',
    classes: ['melanocortin-agonist'],
    summary:
      'An unapproved, non-selective melanocortin agonist sold for tanning and libido, with case reports of serious harm.',
    mechanism:
      'Melanotan II is a cyclic analogue of alpha-MSH that activates several melanocortin receptors. MC1R activation increases melanin production and skin darkening, while MC4R activation affects sexual arousal and appetite. Its lack of selectivity explains side effects such as nausea, flushing and spontaneous erections.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for human use anywhere; sold as a research chemical. Health regulators in several countries have warned consumers against it. ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Small human studies in the 1990s examined tanning and erectile effects; there are no large or long-term safety trials, and serious harms are documented in case reports.',
    routes: ['subq', 'nasal'],
    studiedRegimens: [],
    commonSideEffects: [
      'Nausea',
      'Facial flushing',
      'Spontaneous erections',
      'Reduced appetite',
      'Yawning and stretching',
      'Darkening of moles and freckles',
    ],
    seriousRisks: [
      'New or changing moles; melanoma case reports',
      'Priapism',
      'Rhabdomyolysis and kidney injury (case reports)',
      UNVERIFIED,
    ],
    cautions: [
      'History of melanoma or atypical moles',
      'Cardiovascular disease or high blood pressure',
      'Pregnancy and breastfeeding',
    ],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('melanotan II', 'PubMed: melanotan II'),
      pubmed('melanotan case report', 'PubMed: melanotan case reports'),
    ],
  },
  {
    id: 'mod-grf-1-29',
    name: 'Mod GRF 1-29',
    aliases: ['CJC-1295 without DAC', 'Modified GRF (1-29)', 'Tetrasubstituted GRF (1-29)'],
    category: 'gh-axis',
    classes: ['ghrh-analog'],
    summary:
      'A modified, more stable version of the first 29 amino acids of GHRH, sold as a research chemical, with almost no published human data.',
    mechanism:
      'Mod GRF 1-29 is sermorelin (GHRH 1-29) with four amino-acid substitutions intended to resist enzymatic breakdown. Like natural GHRH it stimulates pituitary GHRH receptors to release growth hormone in pulses. It lacks the albumin-binding DAC group of CJC-1295, so its action is much shorter than that compound.',
    regulatory: {
      status: 'unapproved',
      detail: NOT_APPROVED_RC,
    },
    evidence: 'preclinical',
    evidenceNote:
      'There are no published clinical trials of this specific analogue; expectations about its effects in people are extrapolated from sermorelin and other GHRH analogues.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: [
      'Not characterised in humans',
      'Injection-site reactions',
      'Flushing (GHRH class effect)',
    ],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('modified GRF 1-29', 'PubMed: modified GRF (1-29)'),
      pubmed('growth hormone-releasing hormone analog', 'PubMed: GHRH analogues'),
      WADA_LIST,
    ],
  },
  {
    id: 'mots-c',
    name: 'MOTS-c',
    aliases: ['Mitochondrial open reading frame of the 12S rRNA type-c'],
    category: 'longevity',
    classes: ['mitochondrial'],
    summary:
      'A 16-amino-acid peptide encoded in mitochondrial DNA that improved metabolism in mice; it has not been tested in published human trials.',
    mechanism:
      'MOTS-c is encoded by a short open reading frame within the mitochondrial 12S rRNA gene. In cell and mouse studies it acts mainly on skeletal muscle, activating AMPK signalling and improving insulin sensitivity, and under metabolic stress it can move into the nucleus to influence gene expression. Circulating levels have been measured in people, but its effects as a drug in humans are unknown.',
    regulatory: {
      status: 'unapproved',
      detail: `Not approved for human use; sold as a research chemical. A modified analogue entered early-stage human trials but was not developed further. ${FDA_CAT2_WITHDRAWN} ${PCAC_2026_FOR}`,
    },
    evidence: 'preclinical',
    evidenceNote:
      'Evidence comes from cell and animal studies plus observational measurements of blood levels in people; no controlled trials of MOTS-c itself have been published.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised in humans', 'Injection-site reactions'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED, NON_STERILE],
    cautions: ['Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('MOTS-c', 'PubMed: MOTS-c'),
      pubmed('MOTS-c insulin resistance', 'PubMed: MOTS-c and insulin resistance'),
    ],
  },
  {
    id: 'nad-plus',
    name: 'NAD+',
    aliases: ['Nicotinamide adenine dinucleotide', 'NAD'],
    category: 'longevity',
    classes: ['nad-precursor'],
    summary:
      'A coenzyme central to cellular energy metabolism, given by IV infusion or injection in some clinics; human evidence of benefit is minimal.',
    mechanism:
      'NAD+ carries electrons in energy-producing reactions and is a required substrate for enzymes such as sirtuins and PARPs involved in DNA repair and cell signalling. Tissue NAD+ levels fall with age in animal and some human studies, prompting interest in raising them. Infused NAD+ is rapidly broken down outside cells and how much reaches tissues intact is uncertain; oral NAD+ is largely degraded in the gut, which is why precursors such as nicotinamide riboside and NMN are studied instead.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Not an approved medicine for these uses. Given as IV or injectable preparations by clinics (often compounded) and sold as a dietary supplement. For compounding, FDA lists NAD in 503A Category 1 (under evaluation).',
    },
    evidence: 'limited',
    evidenceNote:
      'Small pilot studies have measured blood levels after IV NAD+; there are no controlled trials showing health or longevity benefits. Oral precursors have more trial data, with modest or inconsistent effects.',
    routes: ['iv', 'subq', 'oral'],
    studiedRegimens: [],
    commonSideEffects: [
      'Flushing (especially with fast infusion)',
      'Nausea',
      'Chest tightness',
      'Abdominal cramping',
      'Headache',
      'Injection-site pain',
    ],
    seriousRisks: [
      'Long-term effects of high doses unknown',
      'Infection risk with IV or non-sterile products',
      'Quality varies between compounded and supplement products',
    ],
    cautions: ['Pregnancy and breastfeeding', 'Active cancer (theoretical concern)'],
    antiDoping: 'IV infusions or injections over 100 mL per 12 hours are prohibited (WADA M2.2)',
    sources: [
      pubmed('NAD+ intravenous infusion', 'PubMed: intravenous NAD+'),
      pubmed('nicotinamide riboside randomized trial', 'PubMed: NAD+ precursor trials'),
      WADA_LIST,
    ],
  },
  {
    id: 'orforglipron',
    name: 'Orforglipron',
    aliases: ['Foundayo', 'LY3502970'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'glucose-lowering'],
    summary:
      'An oral, once-daily small-molecule (non-peptide) GLP-1 receptor agonist approved in the US for weight management and studied in type 2 diabetes.',
    mechanism:
      'Orforglipron is a non-peptide molecule that activates the GLP-1 receptor, producing effects similar to injectable GLP-1 drugs: reduced appetite, slower gastric emptying and glucose-dependent insulin release. Because it is not a peptide, it is absorbed from the gut without the strict fasting requirements of oral semaglutide.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved in April 2026 as Foundayo (Eli Lilly) for chronic weight management in adults with obesity, or with overweight and at least one weight-related condition; type 2 diabetes is not an approved US indication on the current label. Authorised in the UK (August 2026) for weight management and type 2 diabetes. EMA’s CHMP recommended approval in October 2026; check whether the European Commission has since granted it.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Several large phase 3 randomised trials in obesity (ATTAIN) and type 2 diabetes (ACHIEVE) have been reported. In ATTAIN-1, mean weight loss at the highest dose was about 11% over 72 weeks versus about 2% with placebo, smaller than reported for injectable semaglutide or tirzepatide in separate trials; long-term outcome data are still limited.',
    routes: ['oral'],
    pk: {
      halfLifeHours: 39,
      tmaxHours: 6,
      route: 'oral',
      note: 'Elimination half-life approx. 29–49 hours (39 h used for the curve); peak concentration 4–8 hours after a dose (6 h used for the curve).',
      source: 'Foundayo US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Chronic weight management (Foundayo, adults)',
        regimen:
          '0.8 mg orally once daily for at least 30 days, then 2.5 mg and then 5.5 mg, each for at least 30 days; may increase stepwise to 9 mg, 14.5 mg or 17.2 mg once daily based on response and tolerability. Maximum 17.2 mg daily (9 mg with a strong CYP3A4 inhibitor). Take with or without food.',
        source: 'Foundayo US prescribing information',
      },
      {
        context: 'Obesity without diabetes (ATTAIN-1, phase 3)',
        regimen:
          'Once-daily oral dose, started low and escalated every 4 weeks to maintenance doses of 6, 12 or 36 mg (an investigational formulation; the label presents these as 5.5, 9 and 17.2 mg); 72 weeks.',
        source: 'ATTAIN-1 phase 3 trial (NEJM 2025)',
      },
    ],
    commonSideEffects: ['Nausea', 'Constipation', 'Diarrhoea', 'Vomiting', 'Indigestion', 'Abdominal pain'],
    seriousRisks: [
      'Thyroid C-cell tumour risk (boxed warning)',
      'Acute pancreatitis',
      'Gallbladder disease',
      'Acute kidney injury from dehydration',
      'Hypoglycaemia with insulin or sulfonylureas',
      'Aspiration risk under anaesthesia or sedation',
    ],
    cautions: [
      'Personal or family history of MTC',
      'Multiple endocrine neoplasia type 2',
      'Pregnancy or planning pregnancy',
      'Oral contraceptives (use a backup method)',
      'Strong CYP3A4 inhibitors or inducers',
      'History of pancreatitis',
      'Severe gastroparesis',
    ],
    storage: 'Store at room temperature (20–25 °C).',
    sources: [
      dailymed('Foundayo', 'DailyMed: Foundayo label'),
      pubmed('orforglipron', 'PubMed: orforglipron'),
      trials('orforglipron', 'ClinicalTrials.gov: orforglipron'),
    ],
  },
  {
    id: 'oxytocin',
    name: 'Oxytocin',
    aliases: ['Pitocin', 'Syntocinon'],
    category: 'hormone',
    classes: ['oxytocin-agonist'],
    summary:
      'A natural hypothalamic hormone used in hospitals to induce labour and control bleeding after birth; intranasal use for social or mood effects is experimental.',
    mechanism:
      'Oxytocin is a nine-amino-acid hormone released from the posterior pituitary that acts on oxytocin receptors. It causes rhythmic contraction of the uterus and milk ejection during breastfeeding, and in the brain it is involved in social bonding and stress responses. It is cleared from blood within minutes, and how much intranasal oxytocin reaches the brain is debated.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved (Pitocin and generics) for inducing or strengthening labour and controlling postpartum bleeding; authorised nationally in Europe (e.g. Syntocinon). Intranasal oxytocin for social, psychiatric or weight effects is investigational.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Obstetric use is well established. Intranasal research on social behaviour and mood is large but mixed, with small samples and replication problems; a large trial in autistic children and adolescents found no benefit.',
    routes: ['iv', 'im', 'nasal'],
    pk: {
      halfLifeHours: 0.05,
      route: 'iv',
      note: 'Plasma half-life approx. 1–6 minutes (3 minutes used for the curve).',
      source: 'Pitocin US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Labour induction or augmentation (hospital use only)',
        regimen:
          'IV infusion starting at 0.5–1 milliunit/min, increased by 1–2 milliunits/min every 30–60 minutes until an adequate contraction pattern.',
        source: 'Pitocin US prescribing information',
      },
      {
        context: 'Postpartum bleeding control (hospital use only)',
        regimen:
          '10–40 units in 1,000 mL IV fluid infused at the rate needed to control uterine atony, or 10 units IM after delivery of the placenta.',
        source: 'Pitocin US prescribing information',
      },
    ],
    commonSideEffects: [
      'Nausea and vomiting',
      'Uterine hyperstimulation (obstetric use)',
      'Heart rate or rhythm changes',
      'Nasal irritation (intranasal use)',
    ],
    seriousRisks: [
      'Water intoxication and low sodium',
      'Uterine rupture (obstetric use)',
      'Fetal distress (obstetric use)',
      'Low blood pressure with rapid IV bolus',
    ],
    cautions: [
      'Pregnancy outside supervised obstetric care',
      'Elective labour induction (boxed warning)',
      'Low blood sodium or fluid overload',
      'Heart rhythm disorders',
    ],
    sources: [
      dailymed('oxytocin', 'DailyMed: oxytocin labels'),
      pubmed('intranasal oxytocin randomized controlled trial', 'PubMed: intranasal oxytocin trials'),
      pubmed('intranasal oxytocin autism trial', 'PubMed: oxytocin trials in autism'),
    ],
  },
  {
    id: 'retatrutide',
    name: 'Retatrutide',
    aliases: ['LY3437943'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'gip-agonist', 'glucagon-agonist', 'glucose-lowering'],
    summary:
      'An investigational once-weekly injection that activates GIP, GLP-1 and glucagon receptors, in phase 3 trials for obesity.',
    mechanism:
      'Retatrutide is a single peptide engineered to activate three receptors: GIP, GLP-1 and glucagon. GLP-1 and GIP activity reduce appetite and improve glucose control, while glucagon receptor activity is thought to raise energy expenditure and reduce liver fat. It is injected once weekly.',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved by FDA or EMA. In phase 3 development by Eli Lilly (TRIUMPH and TRANSCEND programmes) for obesity, type 2 diabetes and related conditions; the first phase 3 results were reported in 2026. Check current status. Products sold online as "research" retatrutide are unapproved and of unverified identity.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Phase 2 trials in obesity and type 2 diabetes showed large, dose-dependent weight loss (mean 24.2% at 48 weeks with 12 mg in the obesity trial). In the phase 3 TRIUMPH-1 trial, mean weight loss at 80 weeks was 25.0% with 12 mg versus 3.9% with placebo. Long-term safety is not established.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 144,
      route: 'subq',
      note: 'Half-life approx. 6 days in early human studies, supporting once-weekly dosing.',
      source: 'Published phase 1 human PK studies',
    },
    studiedRegimens: [
      {
        context: 'Obesity without diabetes (phase 2)',
        regimen:
          'Once-weekly SC doses of 1, 4, 8 or 12 mg for 48 weeks; higher-dose arms started at 2 or 4 mg and were escalated (the 12 mg arm started at 2 mg).',
        source: 'Phase 2 obesity trial (Jastreboff et al., NEJM 2023)',
      },
      {
        context: 'Obesity without diabetes (TRIUMPH-1, phase 3)',
        regimen: 'Once-weekly SC maintenance doses of 4, 9 or 12 mg for 80 weeks, compared with placebo.',
        source: 'TRIUMPH-1 phase 3 trial (NEJM 2026)',
      },
    ],
    commonSideEffects: ['Nausea', 'Diarrhoea', 'Vomiting', 'Constipation', 'Increased heart rate'],
    seriousRisks: [
      'GLP-1 class risks (pancreatitis, gallbladder disease)',
      'Dose-related heart rate increases',
      NOT_ESTABLISHED,
      UNVERIFIED,
    ],
    cautions: [
      'Pregnancy and breastfeeding',
      'Personal or family history of MTC/MEN 2',
      'History of pancreatitis',
    ],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('retatrutide', 'PubMed: retatrutide'),
      pubmed('retatrutide obesity phase 2', 'PubMed: retatrutide phase 2 obesity trial'),
      trials('retatrutide', 'ClinicalTrials.gov: retatrutide'),
    ],
  },
  {
    id: 'selank',
    name: 'Selank',
    aliases: ['TP-7', 'Thr-Lys-Pro-Arg-Pro-Gly-Pro'],
    category: 'cognitive',
    classes: ['neuropeptide'],
    summary:
      'A synthetic analogue of the immune peptide tuftsin, registered in Russia as an anti-anxiety nasal spray.',
    mechanism:
      'Selank is the tetrapeptide tuftsin (Thr-Lys-Pro-Arg) extended with Pro-Gly-Pro for stability. Russian studies report anti-anxiety effects with possible modulation of GABA-A receptor signalling, monoamines and enkephalin-degrading enzymes, as well as immune effects. These mechanisms are not well characterised outside that research base.',
    regulatory: {
      status: 'unapproved',
      detail: `Registered as a medicine in Russia; not approved by FDA or EMA. Sold elsewhere as a research chemical. ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Small clinical studies, mostly published in Russian, report anti-anxiety effects; independent, well-controlled trials are lacking.',
    routes: ['nasal'],
    studiedRegimens: [],
    commonSideEffects: ['Not well characterised', 'Nasal irritation'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED],
    cautions: ['Pregnancy and breastfeeding', 'Combining with sedatives (unstudied)', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('selank', 'PubMed: selank'),
      pubmed('selank anxiety', 'PubMed: selank and anxiety'),
    ],
  },
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    aliases: ['Ozempic', 'Wegovy', 'Rybelsus'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'glucose-lowering'],
    summary:
      'A GLP-1 receptor agonist, given weekly by injection or daily by mouth, approved for type 2 diabetes, weight management and cardiovascular risk reduction.',
    mechanism:
      'Semaglutide is a GLP-1 analogue with a fatty-acid side chain that binds albumin, giving it a half-life of about a week. It activates GLP-1 receptors to increase glucose-dependent insulin release, reduce glucagon, slow gastric emptying and act on brain appetite centres, lowering food intake. The tablet form uses an absorption enhancer (SNAC) to allow absorption in the stomach.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA- and EMA-approved as Ozempic (weekly injection) and Rybelsus (daily tablet) for type 2 diabetes, and as Wegovy (weekly injection) for chronic weight management and cardiovascular risk reduction in adults with established cardiovascular disease and obesity or overweight. In the US, Wegovy injection is also approved for MASH with moderate-to-advanced liver fibrosis (accelerated approval), a daily Wegovy tablet is approved for weight management and cardiovascular risk reduction, and a reformulated diabetes tablet is sold as Ozempic tablets.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Supported by large phase 3 programmes (SUSTAIN, PIONEER, STEP) and the SELECT cardiovascular outcomes trial; mean weight loss was about 15% at 68 weeks with 2.4 mg weekly in STEP 1.',
    routes: ['subq', 'oral'],
    pk: {
      halfLifeHours: 168,
      tmaxHours: 48,
      route: 'subq',
      note: 'Elimination half-life approx. 1 week; peak concentration 1–3 days after injection (2 days used for the curve).',
      source: 'Wegovy US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Chronic weight management (Wegovy, adults)',
        regimen:
          '0.25 mg SC once weekly for weeks 1–4, then 0.5 mg (weeks 5–8), 1 mg (weeks 9–12), 1.7 mg (weeks 13–16); maintenance from week 17 is 2.4 mg (recommended) or 1.7 mg once weekly. If 2.4 mg has been tolerated for at least 4 weeks and more weight reduction is needed, the dose may be raised to a maximum of 7.2 mg once weekly.',
        source: 'Wegovy US prescribing information',
      },
      {
        context: 'Chronic weight management (Wegovy tablets, adults)',
        regimen:
          '1.5 mg once daily for days 1–30, then 4 mg (days 31–60), 9 mg (days 61–90), then 25 mg once daily as maintenance. Take on an empty stomach in the morning with up to 120 mL of plain water, at least 30 minutes before food, drink or other oral medicines.',
        source: 'Wegovy US prescribing information',
      },
      {
        context: 'Type 2 diabetes (Ozempic)',
        regimen:
          '0.25 mg SC once weekly for 4 weeks, then 0.5 mg weekly; may increase to 1 mg and then 2 mg weekly, each after at least 4 weeks on the previous dose.',
        source: 'Ozempic US prescribing information',
      },
      {
        context: 'Type 2 diabetes (Rybelsus tablets)',
        regimen:
          '3 mg once daily for 30 days, then 7 mg daily; may increase to 14 mg from day 61 if more glucose control is needed. Take on an empty stomach with up to 120 mL of plain water, at least 30 minutes before food, drink or other oral medicines. The reformulated US Ozempic tablets use different strengths (1.5 mg for 30 days, then 4 mg, then 9 mg if needed) and are not interchangeable mg for mg.',
        source: 'Rybelsus and Ozempic tablets US prescribing information',
      },
    ],
    commonSideEffects: [
      'Nausea',
      'Vomiting',
      'Diarrhoea',
      'Constipation',
      'Abdominal pain',
      'Headache or fatigue',
    ],
    seriousRisks: [
      'Thyroid C-cell tumour risk (boxed warning)',
      'Acute pancreatitis',
      'Gallbladder disease',
      'Hypoglycaemia with insulin or sulfonylureas',
      'Acute kidney injury from dehydration',
      'Diabetic retinopathy complications',
    ],
    cautions: [
      'Personal or family history of MTC',
      'Multiple endocrine neoplasia type 2',
      'Pregnancy (stop 2 months before trying)',
      'History of pancreatitis',
      'Upcoming surgery or sedation (aspiration risk)',
    ],
    storage:
      'Pens: refrigerate at 2–8 °C before first use; do not freeze; protect from light. Room-temperature and in-use limits differ by product (e.g. Ozempic up to 56 days after first use), so follow the product label. Tablets: room temperature, in the original container to protect from moisture.',
    sources: [
      dailymed('Wegovy', 'DailyMed: Wegovy label'),
      dailymed('Ozempic', 'DailyMed: Ozempic label'),
      ema('semaglutide', 'EMA: semaglutide'),
      pubmed('semaglutide STEP trial obesity', 'PubMed: STEP trials'),
    ],
  },
  {
    id: 'semax',
    name: 'Semax',
    aliases: ['ACTH(4–7)-Pro-Gly-Pro', 'Met-Glu-His-Phe-Pro-Gly-Pro'],
    category: 'cognitive',
    classes: ['neuropeptide'],
    summary:
      'A synthetic ACTH fragment registered in Russia as a nasal drug for stroke and cognitive disorders; not approved elsewhere.',
    mechanism:
      'Semax combines the ACTH(4–7) fragment with a stabilising Pro-Gly-Pro tail. It has no meaningful hormonal (cortisol-releasing) activity. Russian laboratory studies report increased brain-derived neurotrophic factor (BDNF) expression and effects on monoamine signalling, but its mechanisms in humans are not well established.',
    regulatory: {
      status: 'unapproved',
      detail: `Registered as a medicine in Russia and some neighbouring countries; not approved by FDA or EMA. Sold elsewhere as a research chemical. ${FDA_CAT2_WITHDRAWN} ${PCAC_2026_FOR}`,
    },
    evidence: 'limited',
    evidenceNote:
      'Clinical studies are mostly small and published in Russian, in stroke and cognitive disorders; independent, well-controlled trials are lacking.',
    routes: ['nasal'],
    studiedRegimens: [],
    commonSideEffects: ['Not well characterised', 'Nasal irritation'],
    seriousRisks: [LONG_TERM_UNKNOWN, UNVERIFIED],
    cautions: ['Pregnancy and breastfeeding', 'Under 18 (no safety data)'],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('semax peptide', 'PubMed: semax'),
      pubmed('semax stroke', 'PubMed: semax in stroke'),
    ],
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    aliases: ['GRF 1-29', 'GHRH (1-29)', 'Geref'],
    category: 'gh-axis',
    classes: ['ghrh-analog'],
    summary:
      'A synthetic copy of the first 29 amino acids of GHRH, once FDA-approved for childhood growth hormone deficiency but no longer marketed.',
    mechanism:
      'Sermorelin is the shortest fully active fragment of natural growth hormone–releasing hormone. It stimulates GHRH receptors in the pituitary, increasing pulsatile GH secretion and, in turn, IGF-1, while normal feedback control remains in place. Its action is short-lived, so it was given daily.',
    regulatory: {
      status: 'unapproved',
      detail:
        'Previously FDA-approved (Geref) for diagnosing and treating growth hormone deficiency in children; discontinued in 2008, and FDA later determined it was not withdrawn for reasons of safety or effectiveness. No approved product is currently marketed; it is supplied through compounding in some countries and as a research chemical.',
    },
    evidence: 'limited',
    evidenceNote:
      'Older paediatric studies supported its former approval; adult and anti-ageing studies are small and short, with no trials showing long-term benefit.',
    routes: ['subq'],
    studiedRegimens: [],
    commonSideEffects: [
      'Injection-site pain or redness',
      'Facial flushing',
      'Headache',
      'Dizziness',
    ],
    seriousRisks: ['Hypersensitivity reactions', 'Long-term adult safety unknown', UNVERIFIED],
    cautions: [
      'Active or past cancer',
      'Diabetes or prediabetes',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('sermorelin', 'PubMed: sermorelin'),
      pubmed('GHRH 1-29 growth hormone', 'PubMed: GHRH (1-29)'),
      WADA_LIST,
    ],
  },
  {
    id: 'setmelanotide',
    name: 'Setmelanotide',
    aliases: ['Imcivree', 'RM-493'],
    category: 'metabolic',
    classes: ['melanocortin-agonist'],
    summary:
      'A daily MC4R agonist injection approved for obesity caused by specific rare genetic disorders or by hypothalamic damage.',
    mechanism:
      'Setmelanotide is a cyclic peptide agonist of the melanocortin-4 receptor (MC4R), a key part of the brain’s leptin–melanocortin pathway that regulates hunger and energy use. In rare genetic disorders where signalling upstream of MC4R is broken (POMC, PCSK1 or LEPR deficiency, Bardet–Biedl syndrome), it restores pathway activity and reduces hunger and weight. Some activity at MC1R causes skin darkening.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA- and EMA-approved as Imcivree for chronic weight management in obesity due to genetically confirmed POMC, PCSK1 or LEPR deficiency, or Bardet–Biedl syndrome. In the US it is also approved for acquired hypothalamic obesity (age 4 and over). Not approved for common obesity.',
    },
    evidence: 'moderate',
    evidenceNote:
      'Approval was based on small phase 3 trials in rare forms of obesity (open-label for POMC, PCSK1 and LEPR deficiency; with placebo-controlled periods for Bardet–Biedl syndrome and hypothalamic obesity); it has not been shown to be useful in common obesity.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 11,
      tmaxHours: 8,
      route: 'subq',
      note: 'Effective half-life approx. 11 hours, supporting once-daily dosing; median time to peak about 8 hours.',
      source: 'Imcivree US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Bardet–Biedl syndrome or POMC, PCSK1 or LEPR deficiency (adults and children 12 and over)',
        regimen:
          '2 mg SC once daily for 2 weeks, then 3 mg once daily if tolerated. Lower starting doses apply to younger children and to acquired hypothalamic obesity (0.5 mg); see label.',
        source: 'Imcivree US prescribing information',
      },
    ],
    commonSideEffects: [
      'Injection-site reactions',
      'Skin darkening (hyperpigmentation)',
      'Nausea',
      'Headache',
      'Diarrhoea',
      'Spontaneous erections',
    ],
    seriousRisks: [
      'Depression and suicidal thoughts',
      'Prolonged erections or other sexual effects',
      'Serious hypersensitivity reactions (anaphylaxis)',
      'Darkening of moles; skin checks advised',
      'Adrenal insufficiency or sodium imbalance (hypothalamic obesity)',
    ],
    cautions: [
      'Not for common obesity',
      'History of depression',
      'Pregnancy',
      'History of melanoma or atypical moles',
    ],
    storage:
      'Unopened vials: refrigerate at 2–8 °C and protect from light. Follow the label for in-use limits.',
    sources: [
      dailymed('Imcivree', 'DailyMed: Imcivree label'),
      ema('Imcivree', 'EMA: Imcivree'),
      pubmed('setmelanotide', 'PubMed: setmelanotide'),
    ],
  },
  {
    id: 'somatropin',
    name: 'Somatropin',
    aliases: [
      'Growth hormone',
      'Human growth hormone',
      'hGH',
      'rhGH',
      'Genotropin',
      'Norditropin',
      'Humatrope',
      'Omnitrope',
    ],
    category: 'gh-axis',
    classes: ['growth-hormone'],
    summary:
      'Recombinant human growth hormone, approved for growth hormone deficiency and several childhood growth disorders.',
    mechanism:
      'Somatropin is identical to the 191-amino-acid growth hormone made by the pituitary. It acts on GH receptors, mainly in the liver, to stimulate IGF-1 production, and also acts directly on tissues to promote growth in children, increase protein synthesis and fat breakdown, and oppose insulin action.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA- and EMA-approved under many brands (e.g. Genotropin, Norditropin, Humatrope, Omnitrope) for growth hormone deficiency in children and adults and other growth disorders such as Turner syndrome, Prader–Willi syndrome and short stature after being born small for gestational age. Anti-ageing and performance uses are not approved; in the US, distributing GH for such uses is illegal.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Decades of randomised trials and registry data support approved uses; benefits in healthy adults without deficiency are not established and side effects are common.',
    routes: ['subq', 'im'],
    studiedRegimens: [
      {
        context: 'Adult growth hormone deficiency',
        regimen:
          'Non-weight-based option: start about 0.2 mg/day SC (range 0.15–0.3 mg), increasing by about 0.1–0.2 mg/day every 1–2 months guided by response and IGF-1.',
        source: 'Genotropin US prescribing information',
      },
      {
        context: 'Paediatric growth hormone deficiency',
        regimen:
          '0.16–0.24 mg/kg/week SC, divided into 6–7 daily injections. Doses differ by product and indication.',
        source: 'Genotropin US prescribing information',
      },
    ],
    commonSideEffects: [
      'Fluid retention and swelling',
      'Joint and muscle pain',
      'Tingling or numbness (carpal tunnel)',
      'Headache',
      'Injection-site reactions',
    ],
    seriousRisks: [
      'Increased mortality in acute critical illness',
      'Glucose intolerance and diabetes',
      'Intracranial hypertension',
      'Tumour risk in cancer survivors',
      'Slipped capital femoral epiphysis (children)',
      'Deaths in Prader–Willi with severe obesity',
    ],
    cautions: [
      'Active cancer',
      'Acute critical illness',
      'Active diabetic retinopathy',
      'Closed growth plates (for growth use)',
      'Prader–Willi with severe obesity or breathing problems',
    ],
    storage:
      'Most products: refrigerate at 2–8 °C, do not freeze, protect from light. In-use storage differs by product; follow the specific label.',
    antiDoping: WADA_S2,
    sources: [
      dailymed('somatropin', 'DailyMed: somatropin labels'),
      ema('somatropin', 'EMA: somatropin'),
      pubmed('growth hormone deficiency adults randomized trial', 'PubMed: GH therapy trials in adults'),
      WADA_LIST,
    ],
  },
  {
    id: 'survodutide',
    name: 'Survodutide',
    aliases: ['BI 456906'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'glucagon-agonist', 'glucose-lowering'],
    summary:
      'An investigational once-weekly dual glucagon and GLP-1 receptor agonist in phase 3 trials for obesity and metabolic liver disease.',
    mechanism:
      'Survodutide is a peptide that activates both the glucagon receptor and the GLP-1 receptor. GLP-1 activity reduces appetite and slows gastric emptying, and glucagon activity is thought to increase energy expenditure and reduce liver fat. This is why it is also being developed for metabolic dysfunction-associated steatohepatitis (MASH).',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved by FDA or EMA. In phase 3 development by Boehringer Ingelheim (with Zealand Pharma) for obesity and MASH; the first phase 3 obesity results (SYNCHRONIZE) were reported in 2026. Check current status.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Phase 2 trials in obesity and in MASH with liver fibrosis reported substantial weight loss and liver improvements. In the phase 3 SYNCHRONIZE-1 trial in adults without diabetes, mean weight loss at 76 weeks was 12–13% versus 5.4% with placebo; long-term safety data are still limited.',
    routes: ['subq'],
    studiedRegimens: [
      {
        context: 'Overweight or obesity without diabetes (phase 2)',
        regimen:
          'Once-weekly SC doses of 0.6, 2.4, 3.6 or 4.8 mg; 20 weeks of dose escalation followed by 26 weeks of maintenance.',
        source: 'Phase 2 obesity trial (le Roux et al., Lancet Diabetes & Endocrinology 2024)',
      },
      {
        context: 'Obesity without diabetes (SYNCHRONIZE-1, phase 3)',
        regimen: 'Once-weekly SC doses escalated to maintenance doses of up to 3.6 mg or 6.0 mg; 76 weeks.',
        source: 'SYNCHRONIZE-1 phase 3 trial (NEJM 2026)',
      },
    ],
    commonSideEffects: ['Nausea', 'Vomiting', 'Diarrhoea', 'Constipation', 'Increased heart rate'],
    seriousRisks: [
      'GLP-1 class risks (pancreatitis, gallbladder disease)',
      'GI effects leading to stopping treatment',
      NOT_ESTABLISHED,
      UNVERIFIED,
    ],
    cautions: [
      'Pregnancy and breastfeeding',
      'Personal or family history of MTC/MEN 2',
      'History of pancreatitis',
    ],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('survodutide', 'PubMed: survodutide'),
      trials('survodutide', 'ClinicalTrials.gov: survodutide'),
    ],
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    aliases: ['Egrifta', 'Egrifta SV', 'Egrifta WR', 'TH9507'],
    category: 'gh-axis',
    classes: ['ghrh-analog'],
    summary:
      'A stabilised GHRH analogue approved to reduce excess abdominal fat in adults with HIV-associated lipodystrophy.',
    mechanism:
      'Tesamorelin is the full 44-amino-acid GHRH sequence with a chemical modification (a trans-3-hexenoyl group) that protects it from rapid breakdown. It stimulates pituitary GHRH receptors, increasing pulsatile GH and IGF-1, which reduces visceral (deep abdominal) fat. Normal feedback regulation of GH is preserved.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved as Egrifta SV and Egrifta WR (two formulations with different doses that are not interchangeable) to reduce excess abdominal fat in adults with HIV and lipodystrophy. Not authorised in the EU; an EU marketing application was withdrawn in 2012.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Two phase 3 randomised trials in about 800 adults with HIV-associated abdominal fat showed reduced visceral fat; the effect reverses after stopping, and evidence for other uses is limited.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 0.13,
      tmaxHours: 0.15,
      route: 'subq',
      note: 'Mean elimination half-life approx. 8 minutes in healthy adults after a 1.4 mg dose; median time to peak about 9 minutes.',
      source: 'Egrifta SV US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Excess abdominal fat in adults with HIV lipodystrophy (Egrifta SV)',
        regimen: '1.4 mg SC once daily into the abdomen, given immediately after mixing.',
        source: 'Egrifta SV US prescribing information',
      },
      {
        context: 'Excess abdominal fat in adults with HIV lipodystrophy (Egrifta WR)',
        regimen: '1.28 mg SC once daily into the abdomen, from a vial that is discarded 7 days after mixing.',
        source: 'Egrifta WR US prescribing information',
      },
    ],
    commonSideEffects: [
      'Joint pain',
      'Injection-site redness or itching',
      'Pain in arms or legs',
      'Swelling (peripheral oedema)',
      'Muscle pain',
      'Tingling or numbness',
    ],
    seriousRisks: [
      'Raised IGF-1 (monitor)',
      'Glucose intolerance or diabetes',
      'Fluid retention',
      'Hypersensitivity reactions',
    ],
    cautions: [
      'Pregnancy (contraindicated)',
      'Pituitary disorders, surgery or head irradiation',
      'Active cancer',
      'Diabetes (monitor glucose)',
      'Competitive athletes (prohibited)',
    ],
    storage:
      'Store vials at room temperature (20–25 °C) in the original box to protect from light. Egrifta SV: use immediately after mixing. Egrifta WR: keep the mixed solution at room temperature and discard 7 days after mixing.',
    antiDoping: WADA_S2,
    sources: [
      dailymed('Egrifta', 'DailyMed: Egrifta label'),
      pubmed('tesamorelin HIV visceral fat', 'PubMed: tesamorelin trials'),
      WADA_LIST,
    ],
  },
  {
    id: 'tesofensine',
    name: 'Tesofensine',
    aliases: ['NS2330'],
    category: 'metabolic',
    classes: ['monoamine-reuptake-inhibitor'],
    summary:
      'An oral triple monoamine reuptake inhibitor studied for obesity; not approved by FDA or EMA.',
    mechanism:
      'Tesofensine is a small-molecule (non-peptide) drug that blocks the reuptake of noradrenaline, dopamine and serotonin in the brain. Raising these neurotransmitters reduces appetite and may modestly increase energy expenditure. It was originally developed for Parkinson’s and Alzheimer’s disease, where weight loss was noted as a side effect.',
    regulatory: {
      status: 'investigational',
      detail:
        'Not approved by FDA or EMA. Phase 3 development for obesity has taken place in Mexico, and a combination with metoprolol has been studied for hypothalamic obesity. Check current status.',
    },
    evidence: 'moderate',
    evidenceNote:
      'A published phase 2 randomised trial showed dose-dependent weight loss over 24 weeks (about 10% at 1 mg versus 2% with placebo), with further trials in Mexico; heart rate increases were seen. The journal later published an expression of concern about under-reporting of adverse effects in that trial.',
    routes: ['oral'],
    studiedRegimens: [
      {
        context: 'Obesity (phase 2)',
        regimen: '0.25, 0.5 or 1.0 mg orally once daily for 24 weeks, with an energy-restricted diet.',
        source: 'Phase 2 trial (Astrup et al., Lancet 2008)',
      },
    ],
    commonSideEffects: ['Dry mouth', 'Nausea', 'Constipation', 'Insomnia', 'Diarrhoea'],
    seriousRisks: [
      'Increased heart rate',
      'Blood pressure increase at higher doses',
      'Mood or psychiatric effects',
      NOT_ESTABLISHED,
    ],
    cautions: [
      'Heart disease or uncontrolled hypertension',
      'MAOIs or other serotonergic drugs',
      'Psychiatric illness',
      'Pregnancy and breastfeeding',
    ],
    sources: [
      pubmed('tesofensine', 'PubMed: tesofensine'),
      pubmed('tesofensine obesity randomised', 'PubMed: tesofensine obesity trials'),
      trials('tesofensine', 'ClinicalTrials.gov: tesofensine'),
    ],
  },
  {
    id: 'testosterone-cypionate',
    name: 'Testosterone Cypionate',
    aliases: ['Depo-Testosterone', 'Testosterone cyp'],
    category: 'hormone',
    classes: ['androgen'],
    summary:
      'A long-acting injectable testosterone ester approved for testosterone replacement in men with hypogonadism.',
    mechanism:
      'Testosterone cypionate is testosterone attached to a cyclopentylpropionate ester and dissolved in oil, so it is released slowly after intramuscular injection. Once the ester is removed, testosterone acts on androgen receptors directly and as dihydrotestosterone, and part is converted to oestradiol. External testosterone suppresses the body’s own LH and FSH, reducing natural testosterone and sperm production.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved (Depo-Testosterone and generics) for testosterone replacement in males with primary or hypogonadotropic hypogonadism. Labelled for intramuscular use; subcutaneous use is off-label. Schedule III controlled substance in the US.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Testosterone replacement is supported by extensive trial data in men with confirmed hypogonadism, including the TRAVERSE cardiovascular safety trial (which used a gel). Benefits in men with normal testosterone are not established.',
    routes: ['im', 'subq'],
    pk: {
      halfLifeHours: 192,
      route: 'im',
      note: 'Half-life approx. 8 days after intramuscular injection.',
      source: 'Depo-Testosterone US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Male hypogonadism (replacement therapy)',
        regimen: '50–400 mg IM every 2–4 weeks, adjusted to response and testosterone levels.',
        source: 'Depo-Testosterone US prescribing information',
      },
    ],
    commonSideEffects: [
      'Acne or oily skin',
      'Injection-site pain',
      'Raised haematocrit',
      'Breast tenderness or enlargement',
      'Mood changes',
      'Testicular shrinkage',
    ],
    seriousRisks: [
      'Erythrocytosis (raised haematocrit)',
      'Blood pressure increases',
      'Venous blood clots',
      'Suppressed sperm production and fertility',
      'Abuse and dependence',
    ],
    cautions: [
      'Breast or prostate cancer',
      'Pregnancy or possible pregnancy',
      'Already high haematocrit',
      'Untreated severe sleep apnoea',
      'Wish to preserve fertility',
    ],
    storage:
      'Store at room temperature (20–25 °C), protect from light. Crystals may form when cold; warming and shaking redissolves them.',
    antiDoping: WADA_S1,
    sources: [
      dailymed('testosterone cypionate', 'DailyMed: testosterone cypionate labels'),
      pubmed('testosterone TRAVERSE trial', 'PubMed: TRAVERSE trial'),
      WADA_LIST,
    ],
  },
  {
    id: 'testosterone-enanthate',
    name: 'Testosterone Enanthate',
    aliases: ['Xyosted', 'Testosterone enantate', 'Testoviron'],
    category: 'hormone',
    classes: ['androgen'],
    summary:
      'A long-acting injectable testosterone ester approved for testosterone replacement, available as an intramuscular injection and a weekly subcutaneous autoinjector.',
    mechanism:
      'Testosterone enanthate is testosterone linked to a heptanoate (enanthate) ester in oil, which slows its release from the injection site. After the ester is removed, testosterone acts on androgen receptors and is partly converted to dihydrotestosterone and oestradiol. Like all external testosterone, it suppresses LH and FSH, reducing natural testosterone and sperm production.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved as a generic intramuscular injection (male hypogonadism and delayed puberty) and as Xyosted, a weekly subcutaneous autoinjector for testosterone replacement. Authorised nationally in many European countries. Schedule III controlled substance in the US.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Long established for testosterone replacement, with supporting trials for the subcutaneous autoinjector. Benefits in men with normal testosterone are not established.',
    routes: ['im', 'subq'],
    studiedRegimens: [
      {
        context: 'Male hypogonadism (IM injection)',
        regimen: '50–400 mg IM every 2–4 weeks.',
        source: 'Testosterone enanthate injection US prescribing information',
      },
      {
        context: 'Testosterone replacement (Xyosted autoinjector)',
        regimen:
          'Start 75 mg SC once weekly in the abdomen; adjust the dose based on trough testosterone levels.',
        source: 'Xyosted US prescribing information',
      },
    ],
    commonSideEffects: [
      'Acne or oily skin',
      'Injection-site pain',
      'Raised haematocrit',
      'Breast tenderness or enlargement',
      'Mood changes',
      'Testicular shrinkage',
    ],
    seriousRisks: [
      'Blood pressure increases',
      'Erythrocytosis (raised haematocrit)',
      'Venous blood clots',
      'Suppressed sperm production and fertility',
      'Abuse and dependence',
    ],
    cautions: [
      'Breast or prostate cancer',
      'Pregnancy or possible pregnancy',
      'Already high haematocrit',
      'Untreated severe sleep apnoea',
      'Wish to preserve fertility',
    ],
    storage: 'Store at room temperature (20–25 °C) and protect from light; do not freeze.',
    antiDoping: WADA_S1,
    sources: [
      dailymed('testosterone enanthate', 'DailyMed: testosterone enanthate labels'),
      dailymed('Xyosted', 'DailyMed: Xyosted label'),
      WADA_LIST,
    ],
  },
  {
    id: 'thymosin-alpha-1',
    name: 'Thymosin Alpha-1',
    aliases: ['Thymalfasin', 'Zadaxin', 'Tα1'],
    category: 'immune',
    classes: ['thymic-peptide'],
    summary:
      'A 28-amino-acid thymic peptide that modulates T-cell function, approved in some countries (but not by FDA or EMA) for hepatitis B.',
    mechanism:
      'Thymosin alpha-1 was originally isolated from thymus tissue. It acts on immune cells, partly through Toll-like receptors on dendritic cells, to promote T-cell maturation and shift immune responses, including increased interferon and interleukin-2 production. It is described as an immune modulator rather than a simple stimulant.',
    regulatory: {
      status: 'investigational',
      detail:
        `Approved as thymalfasin (Zadaxin) in a number of countries, including China, mainly for chronic hepatitis B and as an immune adjunct; not approved by FDA and not centrally authorised by EMA. Studied in trials for sepsis, cancer and infections. Research-chemical products are unapproved. ${FDA_CAT2_WITHDRAWN}`,
    },
    evidence: 'moderate',
    evidenceNote:
      'Many clinical trials exist, mostly in hepatitis B, sepsis and as an adjunct in cancer; results are mixed, many trials are small or open-label, and a large phase 3 sepsis trial (TESTS, about 1,100 patients) did not show a reduction in 28-day mortality.',
    routes: ['subq'],
    studiedRegimens: [
      {
        context: 'Chronic hepatitis B (where approved)',
        regimen: '1.6 mg SC twice weekly for 6 months.',
        source: 'Zadaxin product labelling (where approved)',
      },
    ],
    commonSideEffects: ['Injection-site discomfort or redness', 'Few adverse effects in trials'],
    seriousRisks: [
      'Caution with immunosuppressive treatment',
      'Long-term use in healthy people unstudied',
      UNVERIFIED,
    ],
    cautions: [
      'Organ transplant or intended immunosuppression',
      'Pregnancy and breastfeeding',
      'Autoimmune disease (theoretical)',
    ],
    storage: RESEARCH_STORAGE,
    sources: [
      pubmed('thymosin alpha 1', 'PubMed: thymosin alpha-1'),
      pubmed('thymalfasin hepatitis B', 'PubMed: thymalfasin in hepatitis B'),
      trials('thymosin alpha 1', 'ClinicalTrials.gov: thymosin alpha-1'),
    ],
  },
  {
    id: 'thymosin-beta-4',
    name: 'Thymosin Beta-4',
    aliases: ['TB-500', 'TB4', 'Tβ4'],
    category: 'repair',
    classes: ['tissue-repair'],
    summary:
      'A natural 43-amino-acid actin-binding peptide involved in cell migration and repair; TB-500, a synthetic version sold as a research chemical, is untested in human trials.',
    mechanism:
      'Thymosin beta-4 is one of the most abundant peptides inside cells and binds actin monomers, regulating the cytoskeleton and cell movement. In animal models it promoted wound healing and new blood-vessel formation and reduced inflammation and scarring after heart, eye and skin injury. TB-500 is a synthetic peptide based on its actin-binding region (sometimes sold as the full-length peptide), and the composition of commercial products varies.',
    regulatory: {
      status: 'investigational',
      detail:
        'Full-length thymosin beta-4 has been tested in clinical trials (for example as eye drops for dry eye and neurotrophic keratopathy, and as a topical wound gel) but is not approved; check current status. TB-500 is not approved for human use and is sold as a research chemical. For compounding, FDA previously placed the thymosin beta-4 fragment LKKTETQ (TB-500) in Category 2 (bulk substances that may present significant safety risks); the nomination was later withdrawn, so it is no longer on that list, and it is not on FDA’s 503A bulks list. In July 2026 FDA’s Pharmacy Compounding Advisory Committee voted to recommend adding it to the 503A bulks list; the vote is not binding, and adding it would require FDA rulemaking.',
    },
    evidence: 'limited',
    evidenceNote:
      'Small phase 2–3 trials of eye-drop and topical forms gave mixed results; there are no published human trials of injected TB-500.',
    routes: ['subq', 'topical'],
    studiedRegimens: [],
    commonSideEffects: ['Not characterised for injected TB-500', 'Injection-site reactions'],
    seriousRisks: [LONG_TERM_UNKNOWN, 'Theoretical tumour-promoting effects', UNVERIFIED],
    cautions: [
      'Active or past cancer (theoretical)',
      'Pregnancy and breastfeeding',
      'Competitive athletes (prohibited)',
    ],
    storage: RESEARCH_STORAGE,
    antiDoping: WADA_S2,
    sources: [
      pubmed('thymosin beta 4', 'PubMed: thymosin beta-4'),
      trials('thymosin beta 4', 'ClinicalTrials.gov: thymosin beta-4'),
      WADA_LIST,
    ],
  },
  {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    aliases: ['Mounjaro', 'Zepbound', 'LY3298176'],
    category: 'metabolic',
    classes: ['glp1-agonist', 'gip-agonist', 'glucose-lowering'],
    summary:
      'A once-weekly dual GIP and GLP-1 receptor agonist injection approved for type 2 diabetes, weight management and obesity-related sleep apnoea.',
    mechanism:
      'Tirzepatide is a single peptide that activates both the GIP receptor and the GLP-1 receptor, with a fatty-acid chain that allows once-weekly dosing. Together these actions increase glucose-dependent insulin secretion, lower glucagon, slow gastric emptying and reduce appetite and food intake.',
    regulatory: {
      status: 'approved',
      detail:
        'FDA-approved as Mounjaro (type 2 diabetes in adults and children aged 10 and over; cardiovascular risk reduction in adults with type 2 diabetes at high cardiovascular risk) and Zepbound (chronic weight management; moderate-to-severe obstructive sleep apnoea in adults with obesity). EMA-approved as Mounjaro for type 2 diabetes and weight management.',
    },
    evidence: 'extensive',
    evidenceNote:
      'Supported by the SURPASS (type 2 diabetes) and SURMOUNT (obesity) phase 3 programmes; mean weight loss was about 21% at 72 weeks with 15 mg in SURMOUNT-1.',
    routes: ['subq'],
    pk: {
      halfLifeHours: 120,
      tmaxHours: 24,
      route: 'subq',
      note: 'Half-life approx. 5 days; median time to peak 24 hours (range 8–72 hours) after injection.',
      source: 'Zepbound US prescribing information',
    },
    studiedRegimens: [
      {
        context: 'Chronic weight management (Zepbound) and type 2 diabetes (Mounjaro)',
        regimen:
          '2.5 mg SC once weekly for 4 weeks, then 5 mg; increase in 2.5 mg steps after at least 4 weeks on each dose. Maintenance 5, 10 or 15 mg weekly (10 or 15 mg for sleep apnoea); maximum 15 mg weekly in adults (10 mg for children on Mounjaro).',
        source: 'Zepbound and Mounjaro US prescribing information',
      },
    ],
    commonSideEffects: [
      'Nausea',
      'Diarrhoea',
      'Vomiting',
      'Constipation',
      'Abdominal pain or indigestion',
      'Injection-site reactions',
    ],
    seriousRisks: [
      'Thyroid C-cell tumour risk (boxed warning)',
      'Acute pancreatitis',
      'Gallbladder disease',
      'Hypoglycaemia with insulin or sulfonylureas',
      'Acute kidney injury from dehydration',
      'Aspiration risk under anaesthesia or sedation',
    ],
    cautions: [
      'Personal or family history of MTC',
      'Multiple endocrine neoplasia type 2',
      'Pregnancy or planning pregnancy',
      'Oral contraceptives (use a backup method)',
      'Severe gastrointestinal disease',
      'History of pancreatitis',
    ],
    storage:
      'Refrigerate at 2–8 °C; do not freeze; protect from light. If needed, single-dose pens and vials may be kept unrefrigerated up to 30 °C for up to 21 days; multi-dose KwikPens and vials have a 30-day limit, so follow the product label.',
    sources: [
      dailymed('Zepbound', 'DailyMed: Zepbound label'),
      dailymed('Mounjaro', 'DailyMed: Mounjaro label'),
      ema('Mounjaro', 'EMA: Mounjaro'),
      pubmed('tirzepatide SURMOUNT', 'PubMed: SURMOUNT trials'),
    ],
  },
];
