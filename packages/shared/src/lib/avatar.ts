import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';

export const MALE_FIRST_NAMES = [
  'Sumit', 'Rahul', 'Vikram', 'Arjun', 'Rohan', 'Amit', 'Rajesh', 'Sanjay',
  'Karan', 'Nikhil', 'Manish', 'Ashok',
] as const;

export const FEMALE_FIRST_NAMES = [
  'Priya', 'Ananya', 'Neha', 'Kavita', 'Deepa', 'Sneha', 'Pooja', 'Meera',
  'Divya', 'Shreya', 'Ritu', 'Lakshmi',
] as const;

export type PersonGender = 'Male' | 'Female';

const ALL_FIRST_NAMES = [...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES];

const MALE_SET = new Set<string>(MALE_FIRST_NAMES);
const FEMALE_SET = new Set<string>(FEMALE_FIRST_NAMES);

/** Cashfree theme — soft lavenders and purples for avatar backgrounds. */
const AVATAR_BACKGROUNDS = ['EBE8F2', 'E8DEFF', 'D4C4F0', 'F5F0FF', 'C4B5FD', 'DDD6FE'];

/*
 * The background list is baked into the generated SVG, so it can't be restyled with CSS
 * from the consuming app — an app on a different palette has to pass its own. This is the
 * only reason `getAvatarUrl` takes a second argument; the default is unchanged, so apps
 * that don't pass one render exactly as before.
 *
 * The cache key includes the palette because it is keyed by person, and the same person
 * is rendered by more than one app in this monorepo — without it, whichever app asked
 * first would decide the colour for all of them.
 */
const avatarCache = new Map<string, string>();

export function genderFromFirstName(firstName: string): PersonGender {
  if (MALE_SET.has(firstName)) return 'Male';
  if (FEMALE_SET.has(firstName)) return 'Female';
  return 'Male';
}

export function pickFirstName(rng: { pick: <T>(arr: readonly T[]) => T }, pool?: readonly string[]): string {
  const names = pool ?? ALL_FIRST_NAMES;
  return rng.pick(names as readonly string[]);
}

export function pickMaleFirstName(rng: { pick: <T>(arr: readonly T[]) => T }): string {
  return rng.pick(MALE_FIRST_NAMES);
}

export interface AvatarPerson {
  id: string;
  name: string;
  gender?: PersonGender | 'Male' | 'Female' | 'Other';
}

function resolveGender(person: AvatarPerson): PersonGender {
  const firstName = person.name.split(' ')[0];
  if (person.gender === 'Female') return 'Female';
  if (person.gender === 'Male') return 'Male';
  return genderFromFirstName(firstName);
}

/**
 * Deterministic professional illustration avatars via DiceBear (notionists).
 * Same person.id always yields the same avatar across all four apps.
 *
 * Scope note: in-call capture simulation assets (demo/face-live.jpg, Aadhaar/PAN
 * photo crops, recording poster face) remain photographic — only avatar *circles*
 * use these illustrations; face-match scores depend on real photos in the sim.
 */
export function getAvatarUrl(
  person: AvatarPerson,
  /** Hex codes without `#`. Defaults to the lavender set above. */
  backgroundColor: readonly string[] = AVATAR_BACKGROUNDS,
): string {
  const cacheKey = `${person.id}|${backgroundColor.join(',')}`;
  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  const gender = resolveGender(person);
  const seed = `${person.id}:${gender}`;

  const svg = createAvatar(notionists, {
    seed,
    size: 128,
    backgroundColor: [...backgroundColor],
    backgroundType: ['solid'],
  }).toString();

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
