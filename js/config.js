const SUPABASE_URL = 'https://cvjobvwcnuiplvwmvewv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IUujdNZtYjJNoGhrtgabHQ_70qDfFys';

const DAYS = [
  { id: 1, short: 'Пн', full: 'Понедельник' },
  { id: 2, short: 'Вт', full: 'Вторник' },
  { id: 3, short: 'Ср', full: 'Среда' },
  { id: 4, short: 'Чт', full: 'Четверг' },
  { id: 5, short: 'Пт', full: 'Пятница' }
];

const LESSON_TIMES = {
  1: '08:15 - 08:55',
  2: '09:05 - 09:45',
  3: '09:55 - 10:35',
  4: '10:50 - 11:30',
  5: '11:45 - 12:25',
  6: '12:35 - 13:15',
  7: '13:25 - 14:05',
  8: '14:15 - 14:55',
  9: '15:05 - 15:45',
  10: '15:55 - 16:35'
};

const DEFAULT_BASE_SCHEDULE = {
  1: [
    { lesson_number: 1, subject: 'Разговор о важном', teacher: 'Захарова И.Б.', lesson_time: '08:15 - 08:55' },
    { lesson_number: 2, subject: 'Нет урока', teacher: '', lesson_time: '09:05 - 09:45' },
    { lesson_number: 3, subject: 'Англ. язык', teacher: 'Милова В.В.', lesson_time: '09:55 - 10:35' },
    { lesson_number: 4, subject: 'Русский язык', teacher: 'Тихонькова Т.Н.', lesson_time: '10:50 - 11:30' },
    { lesson_number: 5, subject: 'Физика', teacher: 'Некратова Е.Ф.', lesson_time: '11:45 - 12:25' },
    { lesson_number: 6, subject: 'Алгебра', teacher: 'Некратова Е.Ф.', lesson_time: '12:35 - 13:15' },
    { lesson_number: 7, subject: 'Литература', teacher: 'Тихонькова Т.Н.', lesson_time: '13:25 - 14:05' },
    { lesson_number: 8, subject: 'Алгебра', teacher: 'Некратова Е.Ф.', lesson_time: '14:15 - 14:55' }
  ],
  2: [
    { lesson_number: 1, subject: 'Нет урока', teacher: '', lesson_time: '08:15 - 08:55' },
    { lesson_number: 2, subject: 'Проектная деятельность', teacher: 'Вахрушева О.В.', lesson_time: '09:05 - 09:45' },
    { lesson_number: 3, subject: 'Обществознание', teacher: 'Бурнашова Н.Г.', lesson_time: '09:55 - 10:35' },
    { lesson_number: 4, subject: 'Англ. язык', teacher: 'Милова В.В.', lesson_time: '10:50 - 11:30' },
    { lesson_number: 5, subject: 'Физика', teacher: 'Некратова Е.Ф.', lesson_time: '11:45 - 12:25' },
    { lesson_number: 6, subject: 'Физкультура', teacher: 'Захарова И.Б.', lesson_time: '12:35 - 13:15' },
    { lesson_number: 7, subject: 'Геометрия', teacher: 'Некратова Е.Ф.', lesson_time: '13:25 - 14:05' },
    { lesson_number: 8, subject: 'Геометрия', teacher: 'Некратова Е.Ф.', lesson_time: '14:15 - 14:55' }
  ],
  3: [
    { lesson_number: 1, subject: 'Англ. язык', teacher: 'Милова В.В.', lesson_time: '08:15 - 08:55' },
    { lesson_number: 2, subject: 'Литература', teacher: 'Тихонькова Т.Н.', lesson_time: '09:05 - 09:45' },
    { lesson_number: 3, subject: 'Алгебра', teacher: 'Некратова Е.Ф.', lesson_time: '09:55 - 10:35' },
    { lesson_number: 4, subject: 'История', teacher: 'Бурнашова Н.Г.', lesson_time: '10:50 - 11:30' },
    { lesson_number: 5, subject: 'Обществознание', teacher: 'Бурнашова Н.Г.', lesson_time: '11:45 - 12:25' },
    { lesson_number: 6, subject: 'Физика', teacher: 'Некратова Е.Ф.', lesson_time: '12:35 - 13:15' },
    { lesson_number: 7, subject: 'Информатика', teacher: 'Григорьева Н.В.', lesson_time: '13:25 - 14:05' }
  ],
  4: [
    { lesson_number: 1, subject: 'Нет урока', teacher: '', lesson_time: '08:15 - 08:55' },
    { lesson_number: 2, subject: 'Нет урока', teacher: '', lesson_time: '09:05 - 09:45' },
    { lesson_number: 3, subject: 'Биология', teacher: 'Ефимова Г.В.', lesson_time: '09:55 - 10:35' },
    { lesson_number: 4, subject: 'Русский язык', teacher: 'Тихонькова Т.Н.', lesson_time: '10:50 - 11:30' },
    { lesson_number: 5, subject: 'Литература', teacher: 'Тихонькова Т.Н.', lesson_time: '11:45 - 12:25' },
    { lesson_number: 6, subject: 'Химия', teacher: 'Авдеева Т.Д.', lesson_time: '12:35 - 13:15' },
    { lesson_number: 7, subject: 'Физика', teacher: 'Некратова Е.Ф.', lesson_time: '13:25 - 14:05' },
    { lesson_number: 8, subject: 'Геометрия', teacher: 'Некратова Е.Ф.', lesson_time: '14:15 - 14:55' },
    { lesson_number: 9, subject: 'Россия — мои горизонты', teacher: 'Захарова И.Б.', lesson_time: '15:05 - 15:45' }
  ],
  5: [
    { lesson_number: 1, subject: 'Физика', teacher: 'Некратова Е.Ф.', lesson_time: '08:15 - 08:55' },
    { lesson_number: 2, subject: 'Нет урока', teacher: '', lesson_time: '09:05 - 09:45' },
    { lesson_number: 3, subject: 'История', teacher: 'Бурнашова Н.Г.', lesson_time: '09:55 - 10:35' },
    { lesson_number: 4, subject: 'География', teacher: 'Ветрова Е.В.', lesson_time: '10:50 - 11:30' },
    { lesson_number: 5, subject: 'ОБЗР', teacher: 'Мазильникова Л.', lesson_time: '11:45 - 12:25' },
    { lesson_number: 6, subject: 'Алгебра', teacher: 'Некратова Е.Ф.', lesson_time: '12:35 - 13:15' },
    { lesson_number: 7, subject: 'Вероятность и статистика', teacher: 'Некратова Е.Ф.', lesson_time: '13:25 - 14:05' },
    { lesson_number: 8, subject: 'Физкультура', teacher: 'Захарова И.Б.', lesson_time: '14:15 - 14:55' }
  ]
};

const TEACHER_RULES = [
  { keys: ['разговор о важном', 'разговоры о важном', 'разговор', 'ров'], teacher: 'Захарова И.Б.' },
  { keys: ['англ язык', 'английский язык', 'английский', 'англ', 'иностранный язык'], teacher: 'Милова В.В.' },
  { keys: ['русский язык', 'русский', 'рус'], teacher: 'Тихонькова Т.Н.' },
  { keys: ['физкультура', 'физическая культура', 'физк', 'физра', 'фк'], teacher: 'Захарова И.Б.' },
  { keys: ['физика', 'физ'], teacher: 'Некратова Е.Ф.' },
  { keys: ['литература', 'литра', 'лит'], teacher: 'Тихонькова Т.Н.' },
  { keys: ['алгебра', 'алг'], teacher: 'Некратова Е.Ф.' },
  { keys: ['проектная деятельность', 'индивидуальный проект', 'проект'], teacher: 'Вахрушева О.В.' },
  { keys: ['обществознание', 'общество', 'общага', 'общ'], teacher: 'Бурнашова Н.Г.' },
  { keys: ['геометрия', 'геом'], teacher: 'Некратова Е.Ф.' },
  { keys: ['география', 'геог'], teacher: 'Ветрова Е.В.' },
  { keys: ['информатика', 'инфа', 'инф', 'икт'], teacher: 'Григорьева Н.В.' },
  { keys: ['история', 'ист'], teacher: 'Бурнашова Н.Г.' },
  { keys: ['биология', 'био'], teacher: 'Ефимова Г.В.' },
  { keys: ['химия', 'хим'], teacher: 'Авдеева Т.Д.' },
  { keys: ['россия мои горизонты', 'россия', 'горизонты', 'рмг'], teacher: 'Захарова И.Б.' },
  { keys: ['обзр', 'обж'], teacher: 'Мазильникова Л.' },
  { keys: ['вероятность и статистика', 'вероятность', 'вер и ст', 'статистика', 'вис'], teacher: 'Некратова Е.Ф.' }
];

const ICON = {
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  photo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  photoSm: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  grip: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="8" x2="19" y2="8"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="5" y1="16" x2="19" y2="16"/></svg>`,
  mail: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7l-10 6L2 7"/></svg>`,
  dash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  clock: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`
};