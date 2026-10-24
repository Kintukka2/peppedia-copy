import Constants from 'expo-constants';
import { View } from 'react-native';

import { COMPOUNDS } from '@/data/library';
import { PROTOCOL_TEMPLATES, SOURCE_BLURB } from '@/data/protocols';
import type { ProtocolSource } from '@/data/types';
import { SourceBadge } from '@/features/protocols/components';
import { EvidenceMeter, EVIDENCE_LABEL } from '@/ui/feedback';
import { Card, HStack, Screen, Section } from '@/ui/layout';
import { T } from '@/ui/text';
import { space } from '@/ui/theme';

const SOURCE_DEF: Record<ProtocolSource, string> = {
  label: 'The approved prescribing information: the dose, titration and schedule the regulator signed off.',
  trial: 'The regimen as run in a published human trial, named so you can read it.',
  clinic: 'What prescribing, HRT and longevity clinics commonly run. Practice, not trial data.',
  community: 'What users commonly report on forums and in guides. Moves fastest and often leads the trials; not trial-tested.',
  vendor: 'Dosing guides published by peptide suppliers. Useful for blends sold premixed; not trial-tested.',
};

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
        A peptide reference, a library of labelled protocols and a private tracker, synced with Google Fit. Version {Constants.expoConfig?.version ?? '0.2.0'}.
      </T>

      <Section title="Principles">
        <Card style={{ gap: space.md }}>
          {[
            ['Every protocol, labelled', `${PROTOCOL_TEMPLATES.length} ready-to-use protocols from labels, trials, clinics, the community and vendors. Each carries its source, so you always know whether a number was trial-tested or reported in practice.`],
            ['Evidence stays visible', 'Every compound is rated by regulatory status and by how much human evidence exists. Half-lives come only from human data.'],
            ['Your data stays on your phone', 'Records live on this device, with automatic snapshots and one-tap export. Google Fit data is read through Health Connect on the phone and never leaves it. No account, no tracking.'],
            ['Honest about unknowns', 'When data is missing, Titra says so instead of filling the gap, for example "No reliable human PK data" or "No interaction data".'],
          ].map(([title, body]) => (
            <View key={title}>
              <T variant="bodyStrong">{title}</T>
              <T tone="soft">{body}</T>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Protocol sources">
        <Card style={{ gap: space.md }}>
          {(Object.keys(SOURCE_DEF) as ProtocolSource[]).map((k) => (
            <View key={k}>
              <HStack style={{ marginBottom: 4 }}>
                <SourceBadge source={k} />
                <T variant="small" tone="faint" style={{ flex: 1 }}>
                  {SOURCE_BLURB[k]}
                </T>
              </HStack>
              <T tone="soft">{SOURCE_DEF[k]}</T>
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
        <Para>Pairs are checked against rules based on mechanism: two drugs on the same receptor, additive effects on glucose, blood pressure or the growth-hormone axis, and combinations tested together in human trials. A pair without a rule is shown as “No data”, never as safe. Pairs that appear in a named clinic, community or vendor stack are flagged with that stack.</Para>
      </Section>

      <Section title="Calculator">
        <Para>The calculator divides what is in the vial by the liquid added, then converts your dose to millilitres and U-100 insulin-syringe units (100 units = 1 mL). It can fill the dose, vial and water straight from one of your protocols and its linked vial.</Para>
      </Section>

      <Section title="Google Fit and Health Connect">
        <Para>Google retired the Google Fit APIs, and on Android the Google Fit app now shares its data through Health Connect. Titra reads Health Connect on the phone: daily steps, distance, active energy and exercise minutes (deduplicated across apps by Health Connect), workouts, sleep, resting heart rate, weight, body fat and blood pressure.</Para>
        <Para>Syncs run when the app opens and every 15 minutes while it is open, re-reading the last two days so late watch data lands. Each record keeps its Health Connect id, so re-syncing updates rather than duplicates. With write-back on, weight, body fat and blood pressure you log in Titra are written to Health Connect so Google Fit sees them too.</Para>
      </Section>
    </Screen>
  );
}
