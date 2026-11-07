import { normalizeSearchString, removeAccents } from '#lib/utils/string-utils.ts';

describe('string-utils', () => {
  describe('removeAccents', () => {
    it('removes accents from characters', () => {
      expect(removeAccents('Café')).toBe('Cafe');
      expect(removeAccents('São Paulo')).toBe('Sao Paulo');
      expect(removeAccents('München')).toBe('Munchen');
    });
  });

  describe('normalizeSearchString', () => {
    it.each([
      { input: '  Émilie ', expected: 'emilie' },
      { input: 'José\t', expected: 'jose' },
      { input: 'plain', expected: 'plain' },
    ])('turns "$input" into "$expected"', ({ input, expected }) => {
      expect(normalizeSearchString(input)).toBe(expected);
    });

    it('normalizes standard lowercase and accents', () => {
      expect(normalizeSearchString('São Paulo')).toBe('sao paulo');
      expect(normalizeSearchString('CAFÉ')).toBe('cafe');
    });

    it('normalizes various minus, hyphen, and dash variants to ASCII hyphen-minus', () => {
      expect(normalizeSearchString('Pacific/Midway (−11:00)')).toBe('pacific/midway (-11:00)');
      expect(normalizeSearchString('A–B—C‐D‑E')).toBe('a-b-c-d-e');
      expect(normalizeSearchString('－11﹣00')).toBe('-11-00');
    });

    it('normalizes various plus variants to ASCII plus', () => {
      expect(normalizeSearchString('Europe/Berlin (＋01:00)')).toBe('europe/berlin (+01:00)');
      expect(normalizeSearchString('﹢01⁺01₊01')).toBe('+01+01+01');
    });

    it('strips bidi marks and invisible zero-width characters', () => {
      expect(normalizeSearchString('Pacific/Midway (\u200E−11:00)')).toBe('pacific/midway (-11:00)');
      expect(normalizeSearchString('\u200E\u200F\u200B-11')).toBe('-11');
    });

    it('normalizes various whitespace characters to standard space', () => {
      expect(normalizeSearchString('GMT\u00A0-11:00')).toBe('gmt -11:00');
      expect(normalizeSearchString('UTC\u202F+01:00')).toBe('utc +01:00');
    });
  });
});
