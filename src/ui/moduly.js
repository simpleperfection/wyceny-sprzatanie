// Moduly aplikacji na ekranie Start (R1): kafel ma ikone, nazwe i trase modulu. Kolejnosc docelowa: Zlecenia, Wycena,
// Klienci, Chemia. Modul dostaje kafel dopiero w jednostce, ktora go konczy (bez kafli „Wkrótce”): Klientow dopisuje
// IU-13, Zlecenia IU-15. Linie stanu kafli liczy src/widoki/start-dane.js (stanKafla).

/** @typedef {import('./ikony.js').NazwaIkony} NazwaIkony */
/** @typedef {import('./trasy.js').NazwaTrasy} NazwaTrasy */
/**
 * @typedef {'zlecenia' | 'wycena' | 'klienci' | 'chemia'} IdModulu
 * @typedef {{ id: IdModulu, nazwa: string, ikona: NazwaIkony, trasa: NazwaTrasy }} Modul
 */

/** Rejestr stalych planu aplikacji modulowej (zrodlo: IU-9; konsumenci IU-9, IU-13, IU-15). @type {readonly Readonly<Modul>[]} */
export const MODULY = Object.freeze([
  Object.freeze({ id: 'wycena', nazwa: 'Wycena', ikona: 'file-text', trasa: 'wyceny' }),
  Object.freeze({ id: 'klienci', nazwa: 'Klienci', ikona: 'users', trasa: 'klienci' }),
  Object.freeze({ id: 'chemia', nazwa: 'Chemia', ikona: 'flask', trasa: 'chemia' }),
])
