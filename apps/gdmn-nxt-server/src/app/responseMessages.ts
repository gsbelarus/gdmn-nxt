import { IResultError } from '@gsbelarus/util-api-types';

const localizations = {
  'Foreign key reference target does not exist': 'Нарушение ссылочной целостности',
  'violation of FOREIGN KEY': 'Запись нельзя удалить, так как она используется в другом документе',
  'lock conflict on no wait transaction': 'Документ уже изменяется другим пользователем'
};

export const resultError = (message: string): IResultError => {
  for (const [key, value] of Object.entries(localizations)) {
    if (message.includes(key)) return { errorMessage: value, description: message };
  }
  return { errorMessage: message };
};
