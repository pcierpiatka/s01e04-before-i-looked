// :night is a date segment only. Shared so a bad param never becomes a path.
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function isNight(s: string): boolean {
  return NIGHT.test(s);
}
