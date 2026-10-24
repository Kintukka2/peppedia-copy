import { buildExport, doseLogCsv, importData, listSnapshots, parseExport, restoreSnapshot } from '../backup';
import { EMPTY_DATA, getData, migrate, useStore } from '../index';
import { buildSample } from '../sample';

beforeEach(() => {
  useStore.getState().replaceAll(EMPTY_DATA);
});

describe('logging', () => {
  it('deducts inventory and supplies, and restores on delete', () => {
    const sample = buildSample(new Date('2026-03-01T12:00:00'));
    useStore.getState().replaceAll(sample);
    const inv = getData().inventory.find((i) => i.form === 'powder')!;
    const before = inv.open!.remaining;
    const syringesBefore = getData().supplies[0].count;

    const log = useStore.getState().logDose({
      compoundId: 'hcg',
      name: 'hCG',
      takenAt: new Date('2026-03-01T19:30:00').toISOString(),
      amount: { value: 500, unit: 'iu' },
      route: 'subq',
      inventoryId: inv.id,
    });
    expect(getData().inventory.find((i) => i.id === inv.id)!.open!.remaining).toBe(before - 500);
    expect(getData().supplies[0].count).toBe(syringesBefore - 1);

    useStore.getState().deleteLog(log.id);
    expect(getData().inventory.find((i) => i.id === inv.id)!.open!.remaining).toBe(before);
  });

  it('skipped doses do not deduct', () => {
    useStore.getState().replaceAll(buildSample(new Date('2026-03-01T12:00:00')));
    const inv = getData().inventory[0];
    const before = JSON.stringify(inv);
    useStore.getState().logDose({ compoundId: 'x', name: 'x', takenAt: new Date().toISOString(), amount: { value: 1, unit: 'mg' }, route: 'subq', inventoryId: inv.id, skipped: true });
    expect(JSON.stringify(getData().inventory[0])).toBe(before);
  });

  it('journal upserts by date', () => {
    useStore.getState().upsertJournal({ id: 'a', date: '2026-01-01', mood: 2, symptoms: [] });
    useStore.getState().upsertJournal({ id: 'b', date: '2026-01-01', mood: 4, symptoms: ['Headache'] });
    expect(getData().journal).toHaveLength(1);
    expect(getData().journal[0].mood).toBe(4);
  });

  it('deleting a protocol keeps its history', () => {
    useStore.getState().replaceAll(buildSample(new Date('2026-03-01T12:00:00')));
    const p = getData().protocols[0];
    const n = getData().logs.length;
    useStore.getState().deleteProtocol(p.id);
    expect(getData().logs).toHaveLength(n);
    expect(getData().logs.some((l) => l.protocolId === p.id)).toBe(false);
  });
});

describe('backup', () => {
  it('round-trips through export and import, snapshotting first', async () => {
    useStore.getState().replaceAll(buildSample(new Date('2026-03-01T12:00:00')));
    const file = JSON.stringify(buildExport());
    const counts = getData().logs.length;

    useStore.getState().replaceAll(EMPTY_DATA);
    const parsed = parseExport(file);
    if ('error' in parsed) throw new Error(parsed.error);
    await importData(parsed.data);
    expect(getData().logs).toHaveLength(counts);

    // The import itself was preceded by a snapshot only if there was data; now restore works.
    await importData(EMPTY_DATA);
    const snaps = await listSnapshots();
    expect(snaps[0].reason).toBe('before-import');
    expect(await restoreSnapshot(snaps[0].at)).toBe(true);
    expect(getData().logs).toHaveLength(counts);
  });

  it('rejects foreign or newer files', () => {
    expect(parseExport('nope')).toHaveProperty('error');
    expect(parseExport(JSON.stringify({ app: 'other', data: {} }))).toHaveProperty('error');
    expect(parseExport(JSON.stringify({ app: 'titra', version: 999, data: {} }))).toHaveProperty('error');
  });

  it('migrate fills missing fields', () => {
    const d = migrate({ protocols: 'bad', settings: { currency: 'GBP' } });
    expect(d.protocols).toEqual([]);
    expect(d.settings.currency).toBe('GBP');
    expect(d.settings.weightUnit).toBe('kg');
  });

  it('exports CSV with escaping', () => {
    useStore.getState().logDose({ compoundId: null, name: 'A, "B"', takenAt: '2026-01-01T00:00:00.000Z', amount: { value: 1, unit: 'mg' }, route: 'oral' });
    const csv = doseLogCsv();
    expect(csv.split('\n')[1]).toContain('"A, ""B"""');
  });
});

describe('sample', () => {
  it('builds a consistent dataset', () => {
    const s = buildSample(new Date('2026-03-01T12:00:00'));
    expect(s.protocols).toHaveLength(3);
    expect(s.logs.length).toBeGreaterThan(15);
    // Today's doses are left open for the Today screen.
    expect(s.logs.every((l) => new Date(l.scheduledFor!) < new Date('2026-03-01T00:00:00'))).toBe(true);
    for (const i of s.inventory) expect(i.open?.remaining ?? 0).toBeGreaterThanOrEqual(0);
  });
});
