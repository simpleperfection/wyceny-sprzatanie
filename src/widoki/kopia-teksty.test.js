import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BladKopii } from '../dane/kopia.js'
import { BladMagazynu } from '../dane/magazyn.js'
import { BladFormatu } from '../ui/format.js'
import { BladPliku } from '../ui/plik.js'
import {
  czyPytacOTryb, etykietyPodsumowania, jestBledemPliku, nazwaSurowegoPliku, tekstBleduWczytania, tekstOstatniejKopii, tekstWczytania,
} from './kopia-teksty.js'

describe('tekstBleduWczytania', () => {
  it('kody BladKopii z planu dają teksty verbatim', () => {
    assert.equal(tekstBleduWczytania(new BladKopii('zly_plik')), 'To nie jest plik kopii tej aplikacji.')
    assert.equal(tekstBleduWczytania(new BladKopii('nowsza_wersja')),
      'Ta kopia pochodzi z nowszej wersji aplikacji. Odśwież aplikację i spróbuj ponownie.')
    assert.equal(tekstBleduWczytania(new BladKopii('uszkodzony')), 'Plik kopii jest uszkodzony.')
  })

  it('za dużo wycen po połączeniu podpowiada „Zastąp” z limitem 5000', () => {
    assert.equal(tekstBleduWczytania(new BladKopii('za_duzo_wycen')), 'Po połączeniu byłoby ponad 5000 wycen. Wczytaj kopię opcją „Zastąp”.')
  })

  it('za duży plik i odmowa odczytu mają własne teksty', () => {
    assert.equal(tekstBleduWczytania(new BladPliku('za_duzy', 'x')), 'Ten plik jest za duży na kopię tej aplikacji (ponad 10 MB).')
    assert.equal(tekstBleduWczytania(new BladPliku('odczyt', 'x')), 'Nie udało się odczytać pliku. Spróbuj jeszcze raz.')
  })

  it('pełna pamięć przeglądarki mówi o braku miejsca', () => {
    assert.equal(tekstBleduWczytania(new BladMagazynu('pelny')), 'Nie udało się wczytać kopii: brak miejsca w pamięci przeglądarki.')
  })

  it('kod spoza listy i nieznany błąd dają ogólny komunikat', () => {
    assert.equal(tekstBleduWczytania(new BladKopii('tryb')), 'Nie udało się wczytać kopii. Spróbuj jeszcze raz.')
    assert.equal(tekstBleduWczytania(new TypeError('x')), 'Nie udało się wczytać kopii. Spróbuj jeszcze raz.')
  })
})

describe('jestBledemPliku', () => {
  it('zły plik i za duży plik to błędy pliku, pełna pamięć nie', () => {
    assert.equal(jestBledemPliku(new BladKopii('zly_plik')), true)
    assert.equal(jestBledemPliku(new BladPliku('za_duzy', 'x')), true)
    assert.equal(jestBledemPliku(new BladMagazynu('pelny')), false)
  })
})

describe('tekstOstatniejKopii', () => {
  it('kopia sprzed 9 dni daje datę i „9 dni temu”', () => {
    assert.equal(tekstOstatniejKopii(9, '2026-10-15T10:00:00.000Z'), 'Ostatnia kopia: 15 października 2026 (9 dni temu)')
  })

  it('kopia z dziś daje „dziś”, a z przyszłości (cofnięty zegar) też „dziś”', () => {
    assert.equal(tekstOstatniejKopii(0, '2026-10-25T10:00:00.000Z'), 'Ostatnia kopia: 25 października 2026 (dziś)')
    assert.equal(tekstOstatniejKopii(-2, '2026-10-27T10:00:00.000Z'), 'Ostatnia kopia: 27 października 2026 (dziś)')
  })

  it('bez kopii daje „Nie masz jeszcze kopii.”', () => {
    assert.equal(tekstOstatniejKopii(null, null), 'Nie masz jeszcze kopii.')
  })

  it('zła data ostatniej kopii daje BladFormatu', () => {
    assert.throws(() => tekstOstatniejKopii(3, 'wczoraj'), (blad) => blad instanceof BladFormatu && blad.kod === 'zla_data')
  })
})

describe('etykietyPodsumowania', () => {
  it('12 wycen, 7 wykonanych zleceń i ustawienia firmy (makieta z napisem „wykonanych”, decyzja właściciela 2026-10-28)', () => {
    assert.deepEqual(etykietyPodsumowania({ wycen: 12, wykonan: 7, czyUstawienia: true }), ['12 wycen', '7 wykonanych zleceń', 'ustawienia firmy'])
  })

  it('odmiana: 1 wycena, 1 wykonane zlecenie, 3 wykonane zlecenia; bez ustawień bez trzeciego chipa', () => {
    assert.deepEqual(etykietyPodsumowania({ wycen: 1, wykonan: 3, czyUstawienia: false }), ['1 wycena', '3 wykonane zlecenia'])
    assert.deepEqual(etykietyPodsumowania({ wycen: 2, wykonan: 1, czyUstawienia: false }), ['2 wyceny', '1 wykonane zlecenie'])
  })

  it('ujemna liczba wycen daje BladFormatu', () => {
    assert.throws(() => etykietyPodsumowania({ wycen: -1, wykonan: 0, czyUstawienia: false }), BladFormatu)
  })
})

describe('tekstWczytania', () => {
  const wyceny = [{}, {}, {}]

  it('kopia z 20 października z 3 wycenami', () => {
    const tekst = JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 1, utworzona: '2026-10-20T10:00:00.000Z', stan: {} })

    assert.equal(tekstWczytania(tekst, { wyceny }), 'Wczytano kopię z 20 października 2026: 3 wyceny.')
  })

  it('kopia bez poprawnej daty utworzenia pomija datę', () => {
    const tekst = JSON.stringify({ aplikacja: 'wyceny-sprzatanie', wersjaSchematu: 1, utworzona: 'kiedyś', stan: {} })

    assert.equal(tekstWczytania(tekst, { wyceny: [] }), 'Wczytano kopię: 0 wycen.')
  })
})

describe('nazwaSurowegoPliku', () => {
  it('5 marca 2026 daje wyceny-surowe-2026-03-05.txt', () => {
    assert.equal(nazwaSurowegoPliku(new Date(2026, 2, 5, 23, 30)), 'wyceny-surowe-2026-03-05.txt')
  })

  it('niepoprawna data daje BladFormatu', () => {
    assert.throws(() => nazwaSurowegoPliku(new Date('x')), (blad) => blad instanceof BladFormatu && blad.kod === 'zla_data')
  })
})

describe('czyPytacOTryb', () => {
  const USTAWIENIA = /** @type {any} */ ({ wojewodztwoId: null })
  const WYCENA = /** @type {any} */ ({ id: 'w1' })

  it('jedna wycena bez ustawień → pyta o Połącz/Zastąp', () => {
    assert.equal(czyPytacOTryb({ wyceny: [WYCENA], ustawienia: null }), true)
  })

  it('ustawienia bez wycen → pyta o Połącz/Zastąp', () => {
    assert.equal(czyPytacOTryb({ wyceny: [], ustawienia: USTAWIENIA }), true)
  })

  it('bez wycen i bez ustawień → nie pyta (kopia od razu zastępuje pustą aplikację)', () => {
    assert.equal(czyPytacOTryb({ wyceny: [], ustawienia: null }), false)
  })
})
