import { describe, expect, test } from 'vitest';
import { normalizeSearchString, removeAccents } from './string-utils';

describe('string-utils', () => {
  describe('removeAccents', () => {
    test('removes accents from characters', () => {
      expect(removeAccents('Café')).toBe('Cafe');
      expect(removeAccents('São Paulo')).toBe('Sao Paulo');
      expect(removeAccents('München')).toBe('Munchen');
    });
  });

  describe('normalizeSearchString', () => {
    test('normalizes standard lowercase and accents', () => {
      expect(normalizeSearchString('São Paulo')).toBe('sao paulo');
      expect(normalizeSearchString('CAFÉ')).toBe('cafe');
    });

    test('normalizes various minus, hyphen, and dash variants to ASCII hyphen-minus', () => {
      // U+2212 (MINUS SIGN)
      expect(normalizeSearchString('Pacific/Midway (−11:00)')).toBe('pacific/midway (-11:00)');
      // U+2013 (EN DASH), U+2014 (EM DASH), U+2010 (HYPHEN), U+2011 (NON-BREAKING HYPHEN)
      expect(normalizeSearchString('A–B—C‐D‑E')).toBe('a-b-c-d-e');
      // Fullwidth and small hyphen-minus
      expect(normalizeSearchString('－11﹣00')).toBe('-11-00');
    });

    test('normalizes various plus variants to ASCII plus', () => {
      // Fullwidth, small, superscript, subscript plus
      expect(normalizeSearchString('Europe/Berlin (＋01:00)')).toBe('europe/berlin (+01:00)');
      expect(normalizeSearchString('﹢01⁺01₊01')).toBe('+01+01+01');
    });

    test('strips bidi marks and invisible zero-width characters', () => {
      // U+200E (LRM), U+200F (RLM), U+200B (ZWSP)
      expect(normalizeSearchString('Pacific/Midway (\u200E−11:00)')).toBe('pacific/midway (-11:00)');
      expect(normalizeSearchString('\u200E\u200F\u200B-11')).toBe('-11');
    });

    test('normalizes various whitespace characters to standard space', () => {
      // Non-breaking space U+00A0, narrow no-break space U+202F, ideographic space U+3000
      expect(normalizeSearchString('GMT\u00A0-11:00')).toBe('gmt -11:00');
      expect(normalizeSearchString('UTC\u202F+01:00')).toBe('utc +01:00');
    });
  });
});
