export const removeAccents = (str: string) => {
  return str.normalize('NFD').replaceAll(/[\u{300}-\u{36F}]/gu, '');
};

export const normalizeSearchString = (str: string) => {
  return removeAccents(
    str
      .normalize('NFKC')

      // Normalize +s and -s in order to match en-dash, em-dash etc. with ASCII chars.
      .replaceAll(/[\u200E\u200F\u061C\u200B-\u200D\u2060\uFEFF\u00AD]/gu, '')
      .replaceAll(/[\u2212\u2010-\u2015\uFE63\uFF0D\u2043\u2213\u2796]/gu, '-')
      .replaceAll(/[\uFE62\uFF0B\u207A\u208A\uFB29\u2795]/gu, '+')
      .replaceAll(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/gu, ' ')
      .toLocaleLowerCase(),
  );
};
