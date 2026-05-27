import { CAMP_END_DATE, CAMP_START_DATE } from './constants';

/** Returns true if the camp has ended (current time >= CAMP_END_DATE). */
export function isCampOver(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(CAMP_END_DATE).getTime();
}

/** Returns true if the camp is currently active (start <= now < end). */
export function isCampActive(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(CAMP_START_DATE).getTime() && t < new Date(CAMP_END_DATE).getTime();
}

/** Returns true if the camp hasn't started yet. */
export function isBeforeCamp(now: Date = new Date()): boolean {
  return now.getTime() < new Date(CAMP_START_DATE).getTime();
}
