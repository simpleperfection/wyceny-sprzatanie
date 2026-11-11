// Postac kwoty szybkiej wyceny: widelki od–do, „ok. X zł” albo „orientacyjnie od”; zrodlo stalej dla silnika, zapisu widelek
// i tresci oferty. Osobny modul bez importow, zeby strona oferty (src/oferta-start.js) nie ladowala silnika szybkiej wyceny.
export const TRYBY_SZYBKIEJ = Object.freeze(/** @type {const} */ (['widelki', 'ok', 'od']))
