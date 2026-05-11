import { format, parseISO, differenceInDays, addDays, isMonday, isWednesday, getDay } from 'date-fns';

export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function formatDisplay(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE, d MMMM yyyy');
}

export function formatShort(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM');
}

export function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function todayDate() {
  return new Date();
}

export function daysBetween(a, b) {
  const da = typeof a === 'string' ? parseISO(a) : a;
  const db = typeof b === 'string' ? parseISO(b) : b;
  return Math.max(0, differenceInDays(db, da));
}

export function addDaysToDate(dateStr, n) {
  return format(addDays(parseISO(dateStr), n), 'yyyy-MM-dd');
}

export function isCDPathDay(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isMonday(d) || isWednesday(d);
}

export function daysUntilExam(examDate) {
  return Math.max(0, differenceInDays(parseISO(examDate), new Date()));
}
