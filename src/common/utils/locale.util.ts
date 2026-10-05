import { LocaleType } from 'src/shared/types/locale.type';

export const SUPPORTED_LOCALES: readonly LocaleType[] = ['en', 'pt'];
export const DEFAULT_LOCALE: LocaleType = 'en';

/**
 * Resolves an `Accept-Language` header to a supported locale. Tags are tried in
 * order, each as is and then by its primary subtag (`pt-BR` → `pt`); falls back
 * to `DEFAULT_LOCALE`.
 *
 * @param acceptLanguageHeader The raw header value
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
