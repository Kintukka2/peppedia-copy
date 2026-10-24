import { router } from 'expo-router';
import { Boxes, ChevronDown, ChevronUp, Plus, X } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { blend, diluentForTargetUnits, drawFromConcentration, oil, premixed, reconstitute, SOMATROPIN_IU_PER_MG } from '@/domain/calculator';
import type { AmountUnit, SyringeId } from '@/domain/model';
import { doseOn } from '@/domain/schedule';
import { convertAmount, formatAmount, SYRINGES, trim, UNITS_PER_ML } from '@/domain/units';
import { unitsText } from '@/features/inventory/format';
import { AmountInput, DrawReadout, QuickChips, SyringeChips } from '@/features/inventory/ui';
import { useStore } from '@/store';
import { Button, Chip, Field, num, NumberField, Segmented } from '@/ui/controls';
import { Dot, Notice, Stat } from '@/ui/feedback';
import { Card, Gap, HStack, IconButton, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space, useTheme } from '@/ui/theme';

type Mode = 'reconstitute' | 'premixed' | 'oil' | 'blend';


const VIAL_MG = [2, 5, 10, 15, 30];
const WATER_ML = [1, 2, 3, 5];
const TARGET_UNITS = [5, 10, 20, 25, 50];

interface PanelProps {
  syringe: SyringeId;
  picker: ReactNode;
  /** Hidden panels skip the gauge: it measures 0 wide under display:none. */
  active: boolean;
}

function concParts(conc: number, unit: 'mg/mL' | 'IU/mL'): { value: string; unit: string; sub?: string } {
  if (unit === 'IU/mL') return { value: trim(conc, 2), unit: 'IU/mL', sub: `1 unit = ${trim(conc / UNITS_PER_ML, 3)} IU` };
  return { value: trim(conc, 3), unit: 'mg/mL', sub: `${trim(conc * 1000, 1)} mcg/mL · 1 unit = ${formatAmount({ value: conc / UNITS_PER_ML, unit: 'mg' }, true)}` };
}

function Warnings({ list }: { list: string[] }) {
  if (list.length === 0) return null;
  return (
    <View style={{ gap: space.sm, marginTop: space.md }}>
      {list.map((w) => (
        <Notice key={w} tone="warn">
          {w}
        </Notice>
      ))}
    </View>
  );
}

function Waiting({ children }: { children: string }) {
  return (
    <T tone="soft" style={{ marginTop: space.lg }}>
      {children}
    </T>
  );
}

function SaveButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return <Button title="Save as inventory item" kind="secondary" icon={<Boxes size={18} color={c.ink} />} onPress={onPress} disabled={disabled} style={{ marginTop: space.lg }} />;
}

function ReconstitutePanel({ syringe, picker, active }: PanelProps) {
  const { c } = useTheme();
  const protocols = useStore((s) => s.protocols);
  const inventory = useStore((s) => s.inventory);
  const mine = useMemo(() => protocols.filter((p) => p.status === 'active' && p.route !== 'oral'), [protocols]);
  const [vial, setVial] = useState('5');
  const [vialUnit, setVialUnit] = useState<AmountUnit>('mg');
  const [water, setWater] = useState('2');
  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState<AmountUnit>('mcg');
  const [solveOpen, setSolveOpen] = useState(false);
  const [target, setTarget] = useState('10');

  const vialAmount = { value: num(vial), unit: vialUnit };
  const doseAmount = { value: num(dose), unit: doseUnit };
  const waterMl = num(water);
  const hasDose = doseAmount.value > 0;
  const mismatch = hasDose && (vialUnit === 'iu') !== (doseUnit === 'iu');
  const total = vialUnit === 'iu' ? vialAmount.value : (convertAmount(vialAmount, 'mg') ?? NaN);
  const conc = total > 0 && waterMl > 0 ? concParts(total / waterMl, vialUnit === 'iu' ? 'IU/mL' : 'mg/mL') : null;
  const result = reconstitute({ vialAmount, diluentMl: waterMl, dose: doseAmount, syringe });
  const solved = diluentForTargetUnits(vialAmount, doseAmount, num(target));
  const spec = SYRINGES[syringe];

  /** Fills the dose from a protocol (today's titration step) and the vial and water from its linked powder vial. */
  const fillFrom = (id: string) => {
    const p = mine.find((x) => x.id === id);
    if (!p) return;
    const d = doseOn(p, new Date());
    setDose(trim(d.value));
    setDoseUnit(d.unit);
    const item = inventory.find((i) => i.id === p.inventoryId && i.form === 'powder');
    if (item) {
      setVial(trim(item.components[0].amount.value));
      setVialUnit(item.components[0].amount.unit === 'iu' ? 'iu' : 'mg');
      if (item.components[0].amount.unit === 'mcg') setVial(trim(item.components[0].amount.value / 1000));
      if (item.open?.diluentMl) setWater(trim(item.open.diluentMl));
    }
  };

  const convertToIu = () => {
    if (vialUnit !== 'iu') {
      setVial(trim(total * SOMATROPIN_IU_PER_MG));
      setVialUnit('iu');
    } else {
      const mg = convertAmount(doseAmount, 'mg');
      if (mg !== null) setDose(trim(mg * SOMATROPIN_IU_PER_MG));
      setDoseUnit('iu');
    }
  };

  return (
    <>
      <T tone="soft" style={{ marginBottom: space.lg }}>
        A powder vial mixed with bacteriostatic water.
      </T>
      {mine.length ? (
        <View style={{ marginBottom: space.lg }}>
          <T variant="smallStrong" tone="soft" style={{ marginBottom: space.sm }}>
            Fill from a protocol
          </T>
          <HStack wrap>
            {mine.map((p) => (
              <Chip key={p.id} label={`${p.name} · ${formatAmount(doseOn(p, new Date()))}`} onPress={() => fillFrom(p.id)} />
            ))}
          </HStack>
        </View>
      ) : null}
      <AmountInput label="Powder in the vial" value={vial} onChangeText={setVial} unit={vialUnit} onUnit={setVialUnit} units={['mg', 'iu']} placeholder="Amount on the label" />
      <QuickChips
        values={VIAL_MG}
        suffix="mg"
        current={vial}
        active={vialUnit === 'mg'}
        onPick={(v) => {
          setVial(v);
          setVialUnit('mg');
        }}
      />
      <NumberField label="Water added" value={water} onChangeText={setWater} placeholder="Bacteriostatic water" suffix="mL" style={{ marginBottom: space.sm }} />
      <QuickChips values={WATER_ML} suffix="mL" current={water} onPick={setWater} />
      <AmountInput label="Dose" value={dose} onChangeText={setDose} unit={doseUnit} onUnit={setDoseUnit} placeholder="The dose you take" />
      <Gap size={space.lg} />

      {picker}

      <Card>
        {conc ? (
          <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
            <Stat label="Concentration" value={conc.value} unit={conc.unit} sub={conc.sub} />
            {result ? <Stat label="Doses per vial" value={String(result.dosesPerVial)} /> : null}
          </HStack>
        ) : (
          <T tone="soft">Enter the powder amount and the water volume.</T>
        )}
        {result ? <DrawReadout volumeMl={result.volumeMl} syringe={syringe} active={active} /> : conc && !mismatch ? <Waiting>Enter a dose to see the draw.</Waiting> : null}
      </Card>

      {mismatch ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone="warn" title="Units don’t match">
            <T variant="small" tone="soft">
              IU and mass units (mcg, mg) do not convert in general. Use the unit printed on your vial for both. Somatropin is the exception: its labelling uses 1 mg ≈ {SOMATROPIN_IU_PER_MG} IU.
            </T>
            <Button title={vialUnit === 'iu' ? 'Convert dose to IU (somatropin)' : 'Convert vial to IU (somatropin)'} kind="ghost" small onPress={convertToIu} style={{ alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: 0 }} />
          </Notice>
        </View>
      ) : null}
      <Warnings list={result?.warnings ?? []} />

      <Card style={{ marginTop: space.lg, paddingVertical: space.md }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: solveOpen }} onPress={() => setSolveOpen(!solveOpen)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">Solve for water</T>
            <T variant="small" tone="soft">
              Pick the syringe reading you want per dose and see how much water gives it.
            </T>
          </View>
          {solveOpen ? <ChevronUp size={18} color={c.inkFaint} /> : <ChevronDown size={18} color={c.inkFaint} />}
        </Pressable>
        {solveOpen ? (
          <View style={{ marginTop: space.md }}>
            <NumberField label="Units per dose (U-100)" value={target} onChangeText={setTarget} suffix="units" style={{ marginBottom: space.sm }} />
            <QuickChips values={TARGET_UNITS} suffix="u" current={target} onPick={setTarget} />
            {solved !== null ? (
              <>
                <T>
                  Add <T variant="bodyStrong">{trim(solved, 2)} mL</T> of water and each dose of {formatAmount(doseAmount)} reads <T variant="bodyStrong">{unitsText(num(target))}</T> ({trim(num(target) / UNITS_PER_ML, 3)} mL).
                </T>
                {num(target) / UNITS_PER_ML > spec.capacityMl ? (
                  <T variant="small" tone="warn" style={{ marginTop: space.xs }}>
                    That is more than a {spec.label} holds.
                  </T>
                ) : null}
                <T variant="small" tone="faint" style={{ marginTop: space.xs }}>
                  Check that the vial can hold this volume.
                </T>
                <Button title={`Use ${trim(solved, 2)} mL`} kind="secondary" small onPress={() => setWater(trim(solved, 2))} style={{ alignSelf: 'flex-start', marginTop: space.md }} />
              </>
            ) : (
              <T tone="soft">Enter the powder amount and a dose in matching units first.</T>
            )}
          </View>
        ) : null}
      </Card>

      <SaveButton
        disabled={!(vialAmount.value > 0)}
        onPress={() =>
          router.push({
            pathname: '/inventory/form',
            params: { form: 'powder', amount: vial, unit: vialUnit, diluentMl: waterMl > 0 ? water : '', name: `${trim(vialAmount.value)} ${vialUnit === 'iu' ? 'IU' : vialUnit} vial` },
          })
        }
      />
    </>
  );
}

function PremixedPanel({ syringe, picker, active }: PanelProps) {
  const [basis, setBasis] = useState<'ml' | 'vial'>('ml');
  const [strength, setStrength] = useState('');
  const [strengthUnit, setStrengthUnit] = useState<AmountUnit>('mg');
  const [volume, setVolume] = useState('');
  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState<AmountUnit>('mg');

  const vol = num(volume);
  const perMl = basis === 'ml' ? num(strength) : vol > 0 ? num(strength) / vol : NaN;
  const perMlBase = strengthUnit === 'iu' ? perMl : (convertAmount({ value: perMl, unit: strengthUnit }, 'mg') ?? NaN);
  const conc = perMlBase > 0 ? concParts(perMlBase, strengthUnit === 'iu' ? 'IU/mL' : 'mg/mL') : null;
  const doseAmount = { value: num(dose), unit: doseUnit };
  const mismatch = doseAmount.value > 0 && (strengthUnit === 'iu') !== (doseUnit === 'iu');
  const result = premixed({ value: perMl, unit: strengthUnit }, vol, doseAmount, syringe);
  const unitText = strengthUnit === 'iu' ? 'IU' : strengthUnit;

  return (
    <>
      <T tone="soft" style={{ marginBottom: space.lg }}>
        A vial or pen whose strength is printed on the label.
      </T>
      <T variant="smallStrong" tone="soft" style={{ marginBottom: 6 }}>
        Label shows
      </T>
      <Segmented
        value={basis}
        onChange={setBasis}
        options={[
          { value: 'ml', label: 'Amount per mL' },
          { value: 'vial', label: 'Total in the vial' },
        ]}
        style={{ marginBottom: space.md }}
      />
      <AmountInput
        label={basis === 'ml' ? 'Strength per mL' : 'Total in the vial'}
        value={strength}
        onChangeText={setStrength}
        unit={strengthUnit}
        onUnit={setStrengthUnit}
        placeholder={basis === 'ml' ? `${unitText} per mL` : `${unitText} in the vial`}
      />
      <NumberField label="Vial volume" value={volume} onChangeText={setVolume} placeholder={basis === 'ml' ? 'Optional · for doses per vial' : 'Liquid in the vial'} suffix="mL" style={{ marginBottom: space.sm }} />
      <QuickChips values={[1, 2, 3, 5, 10]} suffix="mL" current={volume} onPick={setVolume} />
      <AmountInput label="Dose" value={dose} onChangeText={setDose} unit={doseUnit} onUnit={setDoseUnit} placeholder="The dose you take" />
      <Gap size={space.lg} />

      {picker}

      <Card>
        {conc ? (
          <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
            <Stat label="Concentration" value={conc.value} unit={conc.unit} sub={conc.sub} />
            {result ? <Stat label="Doses per vial" value={vol > 0 ? String(result.dosesPerVial) : '—'} sub={vol > 0 ? undefined : 'Add the vial volume'} /> : null}
          </HStack>
        ) : (
          <T tone="soft">{basis === 'ml' ? 'Enter the strength per mL.' : 'Enter the total amount and the vial volume.'}</T>
        )}
        {result ? <DrawReadout volumeMl={result.volumeMl} syringe={syringe} active={active} /> : conc && !mismatch ? <Waiting>Enter a dose to see the draw.</Waiting> : null}
      </Card>
      {mismatch ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone="warn" title="Units don’t match">
            IU and mass units (mcg, mg) do not convert in general. Use the unit printed on the label for both.
          </Notice>
        </View>
      ) : null}
      <Warnings list={result?.warnings ?? []} />

      <SaveButton
        disabled={!(num(strength) > 0)}
        onPress={() => router.push({ pathname: '/inventory/form', params: { form: 'solution', amount: strength, unit: strengthUnit, vialMl: vol > 0 ? volume : '', basis } })}
      />
    </>
  );
}

function OilPanel({ syringe, picker, active }: PanelProps) {
  const [conc, setConc] = useState('');
  const [vialMl, setVialMl] = useState('10');
  const [weekly, setWeekly] = useState('');
  const [perWeek, setPerWeek] = useState('1');

  const c = num(conc);
  const vol = num(vialMl);
  const r = oil({ concentrationMgPerMl: c, vialVolumeMl: vol, weeklyDoseMg: num(weekly), injectionsPerWeek: num(perWeek) });
  const draw = r ? drawFromConcentration(c, 'mg/mL', c * (vol > 0 ? vol : 0), { value: r.perInjectionMg, unit: 'mg' }, syringe) : null;

  return (
    <>
      <T tone="soft" style={{ marginBottom: space.lg }}>
        An oil-based vial dosed as a weekly total split across injections.
      </T>
      <NumberField label="Concentration" value={conc} onChangeText={setConc} placeholder="Printed on the vial" suffix="mg/mL" style={{ marginBottom: space.sm }} />
      <QuickChips values={[100, 200, 250]} suffix="mg/mL" current={conc} onPick={setConc} />
      <NumberField label="Vial volume" value={vialMl} onChangeText={setVialMl} suffix="mL" style={{ marginBottom: space.sm }} />
      <QuickChips values={[1, 5, 10]} suffix="mL" current={vialMl} onPick={setVialMl} />
      <NumberField label="Weekly amount" value={weekly} onChangeText={setWeekly} placeholder="Total per week" suffix="mg" />
      <NumberField label="Injections per week" value={perWeek} onChangeText={setPerWeek} style={{ marginBottom: space.sm }} />
      <QuickChips values={[1, 2, 3, 7]} suffix="×" current={perWeek} onPick={setPerWeek} />
      <Gap size={space.sm} />

      {picker}

      <Card>
        {r ? (
          <>
            <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
              <Stat label="Per injection" value={trim(r.perInjectionMg, 2)} unit="mg" />
              <Stat label="Weeks per vial" value={r.weeksPerVial > 0 ? trim(r.weeksPerVial, 1) : '—'} sub={r.weeksPerVial > 0 && draw ? `${draw.dosesPerVial} injections` : undefined} />
            </HStack>
            <DrawReadout volumeMl={r.perInjectionMl} syringe={syringe} active={active} />
          </>
        ) : (
          <T tone="soft">Enter the concentration, the weekly amount and how many injections it is split into.</T>
        )}
      </Card>
      <Warnings list={draw?.warnings ?? []} />

      <SaveButton disabled={!(c > 0)} onPress={() => router.push({ pathname: '/inventory/form', params: { form: 'oil', amount: conc, unit: 'mg', vialMl: vol > 0 ? vialMl : '', basis: 'ml' } })} />
    </>
  );
}

interface BlendRow {
  name: string;
  mg: string;
}

function BlendPanel({ syringe, picker, active }: PanelProps) {
  const { c } = useTheme();
  const [rows, setRows] = useState<BlendRow[]>([
    { name: '', mg: '' },
    { name: '', mg: '' },
  ]);
  const [diluent, setDiluent] = useState('');
  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState<AmountUnit>('mcg');

  const label = (r: BlendRow, i: number) => r.name.trim() || `Component ${i + 1}`;
  const inputs = rows.map((r, i) => ({ name: label(r, i), amountMg: num(r.mg) })).filter((x, i) => i === 0 || x.amountMg > 0);
  const diluentMl = num(diluent);
  const doseAmount = { value: num(dose), unit: doseUnit };
  const result = blend(inputs, diluentMl, doseAmount);
  const primaryMg = num(rows[0].mg);
  const draw = result ? drawFromConcentration(primaryMg / diluentMl, 'mg/mL', primaryMg, doseAmount, syringe) : null;
  const setRow = (i: number, patch: Partial<BlendRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <>
      <T tone="soft" style={{ marginBottom: space.lg }}>
        Several compounds in one vial. The dose is set on the first component; the others follow in proportion.
      </T>
      {rows.map((r, i) => (
        <View key={i}>
          <HStack style={{ marginBottom: 6 }}>
            <T variant="smallStrong" tone="soft" style={{ flex: 1 }}>
              {i === 0 ? 'Primary component' : `Component ${i + 1}`}
            </T>
            <T variant="smallStrong" tone="soft" style={{ width: 120 }}>
              mg in vial
            </T>
            {rows.length > 2 ? <View style={{ width: 42 }} /> : null}
          </HStack>
          <HStack style={{ alignItems: 'flex-start' }}>
            <Field value={r.name} onChangeText={(v) => setRow(i, { name: v })} placeholder="Name" style={{ flex: 1 }} />
            <NumberField value={r.mg} onChangeText={(v) => setRow(i, { mg: v })} placeholder="mg" style={{ width: 120 }} />
            {rows.length > 2 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove component ${i + 1}`} onPress={() => setRows(rows.filter((_, j) => j !== i))} style={{ padding: 12 }}>
                <X size={18} color={c.inkFaint} />
              </Pressable>
            ) : null}
          </HStack>
        </View>
      ))}
      {rows.length < 4 ? (
        <Button title="Add component" kind="ghost" small icon={<Plus size={16} color={c.accent} />} onPress={() => setRows([...rows, { name: '', mg: '' }])} style={{ alignSelf: 'flex-start', marginBottom: space.md }} />
      ) : null}
      <NumberField label="Water added" value={diluent} onChangeText={setDiluent} placeholder="Bacteriostatic water" suffix="mL" style={{ marginBottom: space.sm }} />
      <QuickChips values={WATER_ML} suffix="mL" current={diluent} onPick={setDiluent} />
      <AmountInput label={`Dose of ${label(rows[0], 0)}`} value={dose} onChangeText={setDose} unit={doseUnit} onUnit={setDoseUnit} units={['mcg', 'mg']} placeholder="The dose you take" />
      <Gap size={space.lg} />

      {picker}

      <Card>
        {result ? (
          <>
            <HStack gap={space.lg} style={{ alignItems: 'flex-start' }}>
              <Stat label="Doses per vial" value={String(result.dosesPerVial)} />
              <Stat label="Volume" value={trim(result.volumeMl, 3)} unit="mL" />
            </HStack>
            <DrawReadout volumeMl={result.volumeMl} syringe={syringe} active={active} />
            <View style={{ marginTop: space.lg }}>
              <T variant="micro" tone="faint" style={{ marginBottom: space.xs }}>
                Each dose delivers
              </T>
              {result.components.map((x, i) => (
                <HStack key={i} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong" numberOfLines={1}>
                      {x.name}
                    </T>
                    <T variant="small" tone="soft">
                      {trim(x.concentrationMgPerMl, 3)} mg/mL
                    </T>
                  </View>
                  <T variant="bodyStrong" tabular>
                    {formatAmount({ value: x.deliveredMg, unit: 'mg' }, true)}
                  </T>
                </HStack>
              ))}
            </View>
          </>
        ) : (
          <T tone="soft">Enter the primary component’s amount, the water volume and a dose.</T>
        )}
      </Card>
      <Warnings list={draw?.warnings ?? []} />

      <SaveButton
        disabled={!(primaryMg > 0)}
        onPress={() => {
          const comps = rows.map((r, i) => ({ name: label(r, i), amount: num(r.mg), unit: 'mg' as const })).filter((x, i) => i === 0 || x.amount > 0);
          router.push({
            pathname: '/inventory/form',
            params: {
              form: 'powder',
              amount: rows[0].mg,
              unit: 'mg',
              diluentMl: diluentMl > 0 ? diluent : '',
              name: comps.map((x) => x.name).join(' + '),
              components: JSON.stringify(comps),
            },
          });
        }}
      />
    </>
  );
}

const HIDDEN = { display: 'none' } as const;

export default function CalculatorScreen() {
  const { c } = useTheme();
  const defaultSyringe = useStore((s) => s.settings.syringe);
  const [mode, setMode] = useState<Mode>('reconstitute');
  const [syringe, setSyringe] = useState<SyringeId>(defaultSyringe);

  const picker = (
    <Section title="Syringe">
      <SyringeChips value={syringe} onChange={setSyringe} />
    </Section>
  );

  return (
    <Screen
      large
      title="Calculator"
      subtitle="Concentration, draw volume and syringe units"
      right={
        <IconButton label="Inventory" onPress={() => router.push('/inventory')}>
          <Boxes size={18} color={c.ink} />
        </IconButton>
      }>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'reconstitute', label: 'Powder' },
          { value: 'premixed', label: 'Pre-mixed' },
          { value: 'oil', label: 'Oil' },
          { value: 'blend', label: 'Blend' },
        ]}
        style={{ marginBottom: space.xl }}
      />
      {/* Panels stay mounted so switching modes keeps what was typed. */}
      <View style={mode === 'reconstitute' ? undefined : HIDDEN}>
        <ReconstitutePanel syringe={syringe} picker={picker} active={mode === 'reconstitute'} />
      </View>
      <View style={mode === 'premixed' ? undefined : HIDDEN}>
        <PremixedPanel syringe={syringe} picker={picker} active={mode === 'premixed'} />
      </View>
      <View style={mode === 'oil' ? undefined : HIDDEN}>
        <OilPanel syringe={syringe} picker={picker} active={mode === 'oil'} />
      </View>
      <View style={mode === 'blend' ? undefined : HIDDEN}>
        <BlendPanel syringe={syringe} picker={picker} active={mode === 'blend'} />
      </View>

      <HStack style={{ marginTop: space.xl, justifyContent: 'center' }}>
        <Dot color={c.inkFaint} size={4} />
        <T variant="small" tone="faint" style={{ flexShrink: 1 }}>
          U-100 insulin syringes: 100 units = 1 mL. Every result updates as you type.
        </T>
      </HStack>
    </Screen>
  );
}
