// Kwota wyceny dla klienta i regula abonamentu: jedno zrodlo dla zapisu wycen, zlecen, widokow i kroku migracji v1 → v2.
// Osobny modul bez importow, bo migracja (src/dane/migracja-v2.js) jest wolana z magazynu, a src/dane/wyceny.js przez
// src/dane/ustawienia.js zalezy od magazynu (import wyceny.js z migracji zamknalby cykl). src/dane/wyceny.js eksportuje oba.

/** @typedef {import('./wyceny.js').MigawkaWyniku} MigawkaWyniku */

/** Zlecenie jednorazowe ma w migawce null (uslugi bez wariantow) albo 1 wizyte (wariant `jednorazowe` biura); wiecej = abonament. */
const WIZYT_ZLECENIA_JEDNORAZOWEGO = 1

/** Abonament (wiecej niz 1 wizyta w miesiacu); zrodlo reguly dla zlecen, podsumowania i migracji. @param {Pick<MigawkaWyniku, 'wizytWMiesiacu'>} wynik */
export const czyAbonament = (wynik) => wynik.wizytWMiesiacu !== null && wynik.wizytWMiesiacu > WIZYT_ZLECENIA_JEDNORAZOWEGO

/**
 * Kwota dla klienta: cena reczna wygrywa, potem cena z migawki; null, gdy szkic nie ma jeszcze ceny.
 * @param {{ cenaReczna: number | null, wynik: Pick<MigawkaWyniku, 'cena'> | null }} w
 * @returns {number | null}
 */
export const kwotaWyceny = (w) => w.cenaReczna ?? w.wynik?.cena ?? null
