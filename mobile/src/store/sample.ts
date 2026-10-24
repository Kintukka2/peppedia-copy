// Example records for exploring the app. Built from approved medicines at
// labelled regimens (tirzepatide titration, testosterone cypionate, hCG) so
// the sample never models an unapproved compound's dose.

import { addDays, startOfDay, subDays } from 'date-fns';

import type { DoseLog, InventoryItem, JournalEntry, LabResult, Protocol, Supply, VitalEntry } from '@/domain/model';
import { dayKey, doseOn, occurrences } from '@/domain/schedule';
import { suggestSite } from '@/domain/sites';
import { deduct } from '@/domain/inventory';

import { DEFAULT_SETTINGS, PROTOCOL_COLORS, uid, type Data } from './index';

/** Deterministic pseudo-random sequence so the sample looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildSample(now = new Date()): Data {
  const rand = rng(42);
  const created = subDays(now, 36).toISOString();
  const start = startOfDay(subDays(now, 35));

  let tirzInv: InventoryItem = {
    id: uid(),
    name: 'Tirzepatide 20 mg / 2 mL',
    form: 'solution',
    components: [{ compoundId: 'tirzepatide', name: 'Tirzepatide', amount: { value: 20, unit: 'mg' } }],
    vialVolumeMl: 2,
    unopened: 2,
    vendor: 'Compounding pharmacy',
    batch: 'TZ-24117',
    pricePerVial: 199,
    purchasedAt: dayKey(subDays(now, 38)),
    expiresAt: dayKey(addDays(now, 120)),
    lowStockAt: 1,
    createdAt: created,
  };
  let testInv: InventoryItem = {
    id: uid(),
    name: 'Testosterone cypionate 200 mg/mL',
    form: 'oil',
    components: [{ compoundId: 'testosterone-cypionate', name: 'Testosterone cypionate', amount: { value: 2000, unit: 'mg' } }],
    vialVolumeMl: 10,
    unopened: 2,
    vendor: 'Pharmacy',
    batch: 'TC-8812',
    pricePerVial: 62,
    expiresAt: dayKey(addDays(now, 400)),
    lowStockAt: 0,
    createdAt: created,
  };
  let hcgInv: InventoryItem = {
    id: uid(),
    name: 'hCG 5,000 IU',
    form: 'powder',
    components: [{ compoundId: 'hcg', name: 'hCG', amount: { value: 5000, unit: 'iu' } }],
    unopened: 1,
    open: { openedAt: subDays(now, 30).toISOString(), remaining: 5000, diluentMl: 5 },
    vendor: 'Pharmacy',
    batch: 'HG-3301',
    pricePerVial: 85,
    expiresAt: dayKey(addDays(now, 20)),
    lowStockAt: 1,
    createdAt: created,
  };

  const tirz: Protocol = {
    id: uid(),
    compoundId: 'tirzepatide',
    name: 'Tirzepatide',
    route: 'subq',
    dose: { value: 2.5, unit: 'mg' },
    titration: [
      { weeks: 4, dose: { value: 2.5, unit: 'mg' } },
      { weeks: 4, dose: { value: 5, unit: 'mg' } },
      { weeks: 4, dose: { value: 7.5, unit: 'mg' } },
    ],
    schedule: { kind: 'weekdays', days: [start.getDay()], time: '08:00' },
    startDate: dayKey(start),
    inventoryId: tirzInv.id,
    reminders: true,
    status: 'active',
    color: PROTOCOL_COLORS[0],
    notes: 'Label titration: step up by 2.5 mg after at least 4 weeks.',
    createdAt: created,
  };
  const test: Protocol = {
    id: uid(),
    compoundId: 'testosterone-cypionate',
    name: 'Testosterone cypionate',
    route: 'im',
    dose: { value: 50, unit: 'mg' },
    schedule: { kind: 'weekdays', days: [1, 4], time: '19:30' },
    startDate: dayKey(start),
    inventoryId: testInv.id,
    reminders: true,
    status: 'active',
    color: PROTOCOL_COLORS[1],
    createdAt: created,
  };
  const hcg: Protocol = {
    id: uid(),
    compoundId: 'hcg',
    name: 'hCG',
    route: 'subq',
    dose: { value: 500, unit: 'iu' },
    schedule: { kind: 'weekdays', days: [1, 4], time: '19:30' },
    startDate: dayKey(start),
    inventoryId: hcgInv.id,
    reminders: true,
    status: 'active',
    color: PROTOCOL_COLORS[2],
    createdAt: created,
  };

  // Past doses with ~93 % adherence and rotated sites.
  const logs: DoseLog[] = [];
  const today = startOfDay(now);
  for (const p of [tirz, test, hcg]) {
    for (const at of occurrences(p, start, now)) {
      // Leave today's doses open so the Today screen has something to log.
      if (at >= today) continue;
      const skip = rand() < 0.07;
      const dose = doseOn(p, at);
      const log: DoseLog = {
        id: uid(),
        protocolId: p.id,
        compoundId: p.compoundId,
        name: p.name,
        takenAt: new Date(at.getTime() + Math.round(rand() * 40) * 60_000).toISOString(),
        scheduledFor: at.toISOString(),
        amount: dose,
        route: p.route,
        inventoryId: skip ? undefined : p.inventoryId,
        siteId: skip ? undefined : suggestSite(p.route, logs)?.id,
        skipped: skip || undefined,
      };
      logs.push(log);
      if (!skip) {
        const at2 = new Date(log.takenAt);
        if (p.id === tirz.id) tirzInv = deduct(tirzInv, dose, at2);
        if (p.id === test.id) testInv = deduct(testInv, dose, at2);
        if (p.id === hcg.id) hcgInv = deduct(hcgInv, dose, at2);
      }
    }
  }
  const vitals: VitalEntry[] = [];
  for (let d = 35; d >= 0; d -= 2 + Math.round(rand())) {
    const at = new Date(subDays(startOfDay(now), d).getTime() + 7 * 3_600_000);
    const weight = 101.4 - (35 - d) * 0.09 + (rand() - 0.5) * 0.8;
    vitals.push({ id: uid(), kind: 'weight', value: Math.round(weight * 10) / 10, at: at.toISOString() });
    vitals.push({ id: uid(), kind: 'restingHr', value: Math.round(64 + (35 - d) * 0.08 + (rand() - 0.5) * 4), at: at.toISOString() });
    vitals.push({ id: uid(), kind: 'sleep', value: Math.round((6.6 + rand() * 1.4) * 10) / 10, at: at.toISOString() });
  }
  for (const d of [30, 16, 3]) {
    vitals.push({ id: uid(), kind: 'bloodPressure', value: 124 - Math.round(rand() * 6), value2: 80 - Math.round(rand() * 4), at: subDays(now, d).toISOString() });
  }
  vitals.push({ id: uid(), kind: 'bodyFat', value: 27.8, at: subDays(now, 34).toISOString() });
  vitals.push({ id: uid(), kind: 'bodyFat', value: 26.9, at: subDays(now, 4).toISOString() });

  const journal: JournalEntry[] = [];
  const stepUp = addDays(start, 28);
  for (let d = 34; d >= 0; d--) {
    const day = subDays(startOfDay(now), d);
    if (rand() < 0.25) continue;
    const sinceStep = Math.round((day.getTime() - stepUp.getTime()) / 86_400_000);
    const symptoms: string[] = [];
    if (sinceStep >= 0 && sinceStep <= 2) symptoms.push('Nausea');
    if (d > 28 && rand() < 0.4) symptoms.push('Reduced appetite');
    if (rand() < 0.08) symptoms.push('Headache');
    journal.push({
      id: uid(),
      date: dayKey(day),
      mood: symptoms.includes('Nausea') ? 2 : 3 + Math.round(rand() * 2),
      energy: 3 + Math.round(rand() * 2),
      symptoms,
    });
  }

  const labDate = dayKey(subDays(now, 21));
  const labs: LabResult[] = [
    { id: uid(), date: labDate, markerId: 'total-t', value: 742, labName: 'Quest' },
    { id: uid(), date: labDate, markerId: 'e2', value: 36, labName: 'Quest' },
    { id: uid(), date: labDate, markerId: 'hct', value: 49.4, labName: 'Quest' },
    { id: uid(), date: labDate, markerId: 'hba1c', value: 5.6, labName: 'Quest' },
    { id: uid(), date: labDate, markerId: 'lipase', value: 38, labName: 'Quest' },
    { id: uid(), date: labDate, markerId: 'alt', value: 29, labName: 'Quest' },
    { id: uid(), date: dayKey(subDays(now, 70)), markerId: 'total-t', value: 298, labName: 'Quest' },
    { id: uid(), date: dayKey(subDays(now, 70)), markerId: 'hba1c', value: 5.9, labName: 'Quest' },
  ];

  const supplies: Supply[] = [
    { id: uid(), name: 'Insulin syringes (U-100, 1 mL)', count: 64, lowStockAt: 20, perInjection: 1 },
    { id: uid(), name: 'Alcohol swabs', count: 140, lowStockAt: 30, perInjection: 1 },
    { id: uid(), name: 'Bacteriostatic water 30 mL', count: 2, lowStockAt: 1, perInjection: 0 },
  ];

  return {
    protocols: [tirz, test, hcg],
    logs,
    inventory: [tirzInv, testInv, hcgInv],
    supplies,
    vitals,
    journal,
    labs,
    bookmarks: ['tirzepatide', 'semaglutide', 'bpc-157'],
    settings: { ...DEFAULT_SETTINGS, sex: 'male', goalWeightKg: 90 },
  };
}
