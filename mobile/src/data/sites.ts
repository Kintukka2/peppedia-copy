// Injection sites for the rotation map. Coordinates are in the body-map SVG's
// 200 × 440 viewBox. "Left" and "right" are the person's own sides, so on the
// front view their left is on the viewer's right.

import type { Route } from './types';

export type BodyView = 'front' | 'back';

export interface InjectionSite {
  id: string;
  label: string;
  short: string;
  view: BodyView;
  routes: Route[];
  x: number;
  y: number;
}

export const SITES: InjectionSite[] = [
  { id: 'abd-ul', label: 'Abdomen, upper left', short: 'Abd UL', view: 'front', routes: ['subq'], x: 116, y: 176 },
  { id: 'abd-ur', label: 'Abdomen, upper right', short: 'Abd UR', view: 'front', routes: ['subq'], x: 84, y: 176 },
  { id: 'abd-ll', label: 'Abdomen, lower left', short: 'Abd LL', view: 'front', routes: ['subq'], x: 118, y: 206 },
  { id: 'abd-lr', label: 'Abdomen, lower right', short: 'Abd LR', view: 'front', routes: ['subq'], x: 82, y: 206 },
  { id: 'thigh-l', label: 'Front thigh, left', short: 'Thigh L', view: 'front', routes: ['subq'], x: 118, y: 292 },
  { id: 'thigh-r', label: 'Front thigh, right', short: 'Thigh R', view: 'front', routes: ['subq'], x: 82, y: 292 },
  { id: 'vastus-l', label: 'Outer thigh (vastus lateralis), left', short: 'Vastus L', view: 'front', routes: ['im', 'subq'], x: 131, y: 304 },
  { id: 'vastus-r', label: 'Outer thigh (vastus lateralis), right', short: 'Vastus R', view: 'front', routes: ['im', 'subq'], x: 69, y: 304 },
  { id: 'delt-l', label: 'Deltoid, left', short: 'Delt L', view: 'front', routes: ['im'], x: 158, y: 106 },
  { id: 'delt-r', label: 'Deltoid, right', short: 'Delt R', view: 'front', routes: ['im'], x: 42, y: 106 },
  { id: 'arm-l', label: 'Back of upper arm, left', short: 'Arm L', view: 'back', routes: ['subq'], x: 40, y: 150 },
  { id: 'arm-r', label: 'Back of upper arm, right', short: 'Arm R', view: 'back', routes: ['subq'], x: 160, y: 150 },
  { id: 'flank-l', label: 'Flank (love handle), left', short: 'Flank L', view: 'back', routes: ['subq'], x: 70, y: 196 },
  { id: 'flank-r', label: 'Flank (love handle), right', short: 'Flank R', view: 'back', routes: ['subq'], x: 130, y: 196 },
  { id: 'ventro-l', label: 'Hip (ventrogluteal), left', short: 'Ventro L', view: 'back', routes: ['im'], x: 64, y: 226 },
  { id: 'ventro-r', label: 'Hip (ventrogluteal), right', short: 'Ventro R', view: 'back', routes: ['im'], x: 136, y: 226 },
  { id: 'glute-l', label: 'Upper outer buttock, left', short: 'Glute L', view: 'back', routes: ['im', 'subq'], x: 78, y: 246 },
  { id: 'glute-r', label: 'Upper outer buttock, right', short: 'Glute R', view: 'back', routes: ['im', 'subq'], x: 122, y: 246 },
];

export const SITE_BY_ID: Record<string, InjectionSite> = Object.fromEntries(SITES.map((s) => [s.id, s]));
