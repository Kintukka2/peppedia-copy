import Constants from 'expo-constants';
import { View } from 'react-native';

import { COMPOUNDS } from '@/data/library';
import { EvidenceMeter, EVIDENCE_LABEL } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space } from '@/ui/theme';

const EVIDENCE_DEF = {
  extensive: 'Large randomised trial programmes or an approved medicine with a full label.',
  moderate: 'Several human trials, but not a complete development programme.',
  limited: 'Small, early or uncontrolled human studies.',
  preclinical: 'Animal or cell studies only. Human effects and safety are unknown.',
} as const;

function Para({ children }: { children: string }) {
  return (
    <T tone="soft" style={{ marginBottom: space.md }}>
      {children}
    </T>
  );
}

export default function AboutScreen() {
  const pkCount = COMPOUNDS.filter((c) => c.pk).length;
  return (
    <Screen back title="About & methodology">
      <T variant="display" style={{ marginBottom: space.sm }}>
        Titra
      </T>
      <T tone="soft" style={{ marginBottom: space.xl }}>
        An evidence-first peptide reference and a private protocol log. Version {Constants.expoConfig?.version ?? '0.1.0'}.
      </T>

      <Section title="Principles">
        <Card style={{ gap: space.md }}>
          {[
            ['Evidence first', 'Every compound is labelled by regulatory status and by how much human evidence exists. Half-lives and regimens appear only when they come from an approved label or published human trials.'],
            ['No dose recommendations', 'Titra records and calculates what you enter. It never suggests what or how much to take, and it lists no community or vendor protocols.'],
            ['Your data stays yours', 'Records live on this device, with automatic snapshots and one-tap export. There is no account, no tracking and no advertising.'],
            ['Honest about unknowns', 'When data is missing, Titra says so instead of filling the gap, for example "No reliable human PK data" or "No interaction data".'],
          ].map(([title, body]) => (
            <View key={title}>
              <T variant="bodyStrong">{title}</T>
              <T tone="soft">{body}</T>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Evidence levels">
        <Card style={{ gap: space.md }}>
          {(Object.keys(EVIDENCE_DEF) as (keyof typeof EVIDENCE_DEF)[]).map((k) => (
            <HStack key={k} style={{ alignItems: 'flex-start' }} gap={space.md}>
              <View style={{ marginTop: 4 }}>
                <EvidenceMeter level={k} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{EVIDENCE_LABEL[k]}</T>
                <T tone="soft">{EVIDENCE_DEF[k]}</T>
              </View>
            </HStack>
          ))}
        </Card>
        <T variant="small" tone="faint" style={{ marginTop: space.sm }}>
          The evidence level describes the quantity of human data, not whether results were favourable.
        </T>
      </Section>

      <Section title="Estimated levels">
        <Para>{`Level curves use a one-compartment model with first-order elimination and the published human half-life (${pkCount} of ${COMPOUNDS.length} library compounds have one). Where a time-to-peak is published, absorption is modelled with the Bateman function; otherwise doses are treated as instant. Bioavailability is assumed to be 100 %.`}</Para>
        <Para>{'"Clears" is five half-lives (plus time to peak) after the last dose, when roughly 3 % remains. Individual results vary widely; only a blood test measures levels.'}</Para>
      </Section>

      <Section title="Stack check">
        <Para>Pairs are checked against rules based on mechanism: two drugs on the same receptor, additive effects on glucose, blood pressure or the growth-hormone axis, and combinations tested together in human trials. A pair without a rule is shown as “No data”, never as safe.</Para>
      </Section>

      <Section title="Calculator">
        <Para>The calculator divides what is in the vial by the liquid added, then converts your dose to millilitres and U-100 insulin-syringe units (100 units = 1 mL). It is arithmetic on your inputs and does not recommend a dose.</Para>
      </Section>

      <Section title="Disclaimer">
        <Card>
          <T tone="soft">
            Titra is for education and personal record-keeping only. It is not a medical device and does not provide medical advice, diagnosis or treatment. Many compounds in the library are not approved for human use, and products sold as research chemicals are not quality-controlled. Talk to a qualified clinician before starting, stopping or changing any medicine.
          </T>
        </Card>
      </Section>
    </Screen>
  );
}
