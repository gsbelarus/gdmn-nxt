export const countries: countriesType[] = ['Belarus', 'Russia', 'Kazakhstan', 'Ukraine', 'Azerbaijan',
  'Armenia', 'Kyrgyzstan', 'Moldova', 'Tadjikistan', 'Tyrkmenistan', 'Uzbekistan'];

export type countriesType = 'Russia' | 'Belarus' | 'Kazakhstan' | 'Ukraine' | 'Azerbaijan'
| 'Armenia' | 'Kyrgyzstan' | 'Moldova' | 'Tadjikistan' | 'Tyrkmenistan' | 'Uzbekistan';

export const getNumberMask = (code: countriesType): string => {
  switch (code) {
    case 'Russia': return '+7 (999) 999-99-99';
    case 'Belarus': return '+375 (99) 999-99-99';
    case 'Kazakhstan': return '+7 (999) 999-99-99';
    case 'Ukraine': return '+380 (99) 999-99-99';
    case 'Azerbaijan': return '+\\9\\94 (99) 999-99-99';
    case 'Armenia': return '+374 (99) 999-99-99';
    case 'Kyrgyzstan': return '+\\9\\96 (99) 999-99-99';
    case 'Moldova': return '+373 (99) 999-99-99';
    case 'Tadjikistan': return '+\\9\\92 (99) 999-99-99';
    case 'Tyrkmenistan': return '+\\9\\93 (99) 999-99-99';
    case 'Uzbekistan': return '+\\9\\98 (99) 999-99-99';
    default: return '';
  }
};
