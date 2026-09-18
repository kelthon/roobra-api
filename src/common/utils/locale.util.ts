import { LocaleType } from 'src/shared/types/locale.type';

export const SUPPORTED_LOCALES: readonly LocaleType[] = ['en', 'pt'];
export const DEFAULT_LOCALE: LocaleType = 'en';

/**
 * Resolves a browser `Accept-Language` header to one of this app's
 * supported locales. Tries each tag left-to-right (browsers already send
 * them in preference order): first an exact match, then its primary
 * subtag (`en-GB` → `en`, `pt-BR` → `pt`) — so a region we don't ship a
 * dedicated template for still resolves to the language we do support.
 * Falls back to DEFAULT_LOCALE when nothing matches.
 */
export function resolveLocale(acceptLanguageHeader?: string): LocaleType {
  if (!acceptLanguageHeader) return DEFAULT_LOCALE;

  const tags = acceptLanguageHeader
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase());

  for (const tag of tags) {
    if (SUPPORTED_LOCALES.includes(tag as LocaleType)) return tag as LocaleType;

    const primary = tag.split('-')[0];
    if (SUPPORTED_LOCALES.includes(primary as LocaleType))
      return primary as LocaleType;
  }

  return DEFAULT_LOCALE;
}
