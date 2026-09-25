import { DEFAULT_LOCALE, resolveLocale } from './locale.util.js';

describe('resolveLocale', () => {
  it('should return the default locale when no header is provided', () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('should return the default locale for an empty header', () => {
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
  });

  it('should return an exact match for a supported locale', () => {
    expect(resolveLocale('pt')).toBe('pt');
  });

  it('should fall back to the primary subtag for a supported regional variant', () => {
    expect(resolveLocale('pt-BR')).toBe('pt');
  });

  it('should be case-insensitive', () => {
    expect(resolveLocale('PT-br')).toBe('pt');
  });

  it('should prefer the first supported tag over later ones', () => {
    expect(resolveLocale('pt,en;q=0.5')).toBe('pt');
  });

  it('should skip an unsupported leading tag and match a later one', () => {
    expect(resolveLocale('fr;q=0.9,pt;q=0.5')).toBe('pt');
  });

  it('should fall back to the default locale when no tag is supported', () => {
    expect(resolveLocale('fr-FR,de;q=0.5')).toBe(DEFAULT_LOCALE);
  });
});
