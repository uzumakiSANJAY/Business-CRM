import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const formatDate = (date) =>
  dayjs(String(date || '').slice(0, 10), 'YYYY-MM-DD').format('DD MMM YYYY');

export const daysDiff = (date) =>
  dayjs().startOf('day').diff(dayjs(String(date || '').slice(0, 10), 'YYYY-MM-DD'), 'day');
