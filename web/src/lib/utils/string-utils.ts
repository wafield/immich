export const removeAccents = (str: string) => {
  return str.normalize('NFD').replaceAll(/[\u{300}-\u{36F}]/gu, '');
};

export const normalizeSearchString = (str: string) => {
  return removeAccents(
    str
      .normalize('NFKC')

      // Normalize +s and -s in order to match en-dash, em-dash etc. with ASCII chars.
      .replaceAll(/[\u{200E}\u{200F}\u{61C}\u{200B}-\u{200D}\u{2060}\u{FEFF}\u{AD}]/gu, '')
      .replaceAll(/[\u{2212}\u{2010}-\u{2015}\u{FE63}\u{FF0D}\u{2043}\u{2213}\u{2796}]/gu, '-')
      .replaceAll(/[\u{FE62}\u{FF0B}\u{207A}\u{208A}\u{FB29}\u{2795}]/gu, '+')
      .replaceAll(/[\u{A0}\u{2000}-\u{200A}\u{202F}\u{205F}\u{3000}]/gu, ' ')
      .toLocaleLowerCase()
      .trim(),
  );
};
