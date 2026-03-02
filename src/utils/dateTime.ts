export const IST_TIME_ZONE = 'Asia/Kolkata';

type DateLike = Date | string | number;

const toValidDate = (value: DateLike) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toISTDateInputValue = (value: DateLike = new Date()) => {
  const date = toValidDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const formatISTDate = (
  value: DateLike,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
  locale = 'en-GB',
) => {
  const date = toValidDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, { timeZone: IST_TIME_ZONE, ...options }).format(date);
};

export const formatISTDateTime = (
  value: DateLike,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  locale = 'en-GB',
) => {
  const date = toValidDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, { timeZone: IST_TIME_ZONE, ...options }).format(date);
};
