import { type MaybeRefOrGetter, toValue, watchEffect } from 'vue'

export const APP_NAME = 'Food Cost'

export function documentTitle(pageTitle?: string | null) {
  const prefix = pageTitle?.trim()
  return prefix ? `${prefix} — ${APP_NAME}` : APP_NAME
}

export function setDocumentTitle(pageTitle?: string | null) {
  document.title = documentTitle(pageTitle)
}

/** Bind the browser tab title to a reactive page prefix. */
export function usePageTitle(title: MaybeRefOrGetter<string | undefined | null>) {
  watchEffect(() => {
    setDocumentTitle(toValue(title))
  })
}
