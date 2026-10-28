// Bledy silnika wyceny: kod (stabilny, do mapowania na teksty w widokach) i komunikat dla programisty.

/** Dane referencyjne (data/*.json) sa niekompletne albo niespojne, np. `brak_pliku`, `brak_normy`, `zly_format`. */
export class BladKatalogu extends Error {
  /**
   * @param {string} kod
   * @param {string} komunikat
   * @param {{ cause?: unknown }} [opcje]
   */
  constructor(kod, komunikat, opcje) {
    super(komunikat, opcje)
    this.name = 'BladKatalogu'
    this.kod = kod
  }
}

/** Wejscie wyceny jest bledne, np. `nieznana_usluga`, `metraz`, `ilosc`. */
export class BladWejscia extends Error {
  /**
   * @param {string} kod
   * @param {string} [komunikat]
   */
  constructor(kod, komunikat = kod) {
    super(komunikat)
    this.name = 'BladWejscia'
    this.kod = kod
  }
}
