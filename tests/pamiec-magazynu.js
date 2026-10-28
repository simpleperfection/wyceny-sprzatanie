// Atrapa interfejsu Storage (localStorage) w pamieci dla testow Node; `pelna = true` wymusza QuotaExceededError w setItem.

export class PamiecMagazynu {
  /** @type {Map<string, string>} */
  #wpisy = new Map()
  pelna = false

  get length() {
    return this.#wpisy.size
  }

  /** @param {number} indeks */
  key(indeks) {
    return [...this.#wpisy.keys()][indeks] ?? null
  }

  /** @param {string} klucz */
  getItem(klucz) {
    return this.#wpisy.get(String(klucz)) ?? null
  }

  /** @param {string} klucz @param {string} wartosc */
  setItem(klucz, wartosc) {
    if (this.pelna) throw new DOMException('Przekroczono limit magazynu', 'QuotaExceededError')
    this.#wpisy.set(String(klucz), String(wartosc))
  }

  /** @param {string} klucz */
  removeItem(klucz) {
    this.#wpisy.delete(String(klucz))
  }

  clear() {
    this.#wpisy.clear()
  }
}
