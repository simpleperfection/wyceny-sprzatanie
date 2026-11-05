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

  it('za dużo klientów albo zleceń w kopii podaje limit z modułu danych', () => {
    assert.equal(tekstBleduWczytania(new BladKopii('za_duzo_klientow')),
      'W aplikacji może być najwyżej 5000 klientów, a po wczytaniu tej kopii byłoby ich więcej.')
    assert.equal(tekstBleduWczytania(new BladKopii('za_duzo_zlecen')),
      'W aplikacji może być najwyżej 10000 zleceń, a po wczytaniu tej kopii byłoby ich więcej.')
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
  it('12 wycen, 2 klientów, 5 zleceń i ustawienia firmy', () => {
    assert.deepEqual(etykietyPodsumowania({ wycen: 12, klientow: 2, zlecen: 5, czyUstawienia: true }),
      ['12 wycen', '2 klientów', '5 zleceń', 'ustawienia firmy'])
  })

  it('odmiana: 1 wycena, 1 klient, 1 zlecenie; 2 wyceny, 22 klientów, 3 zlecenia; bez ustawień bez czwartego chipa', () => {
    assert.deepEqual(etykietyPodsumowania({ wycen: 1, klientow: 1, zlecen: 1, czyUstawienia: false }), ['1 wycena', '1 klient', '1 zlecenie'])
    assert.deepEqual(etykietyPodsumowania({ wycen: 2, klientow: 22, zlecen: 3, czyUstawienia: false }), ['2 wyceny', '22 klientów', '3 zlecenia'])
  })

  it('zero klientów i zleceń: „0 klientów”, „0 zleceń”', () => {
    assert.deepEqual(etykietyPodsumowania({ wycen: 0, klientow: 0, zlecen: 0, czyUstawienia: false }), ['0 wycen', '0 klientów', '0 zleceń'])
  })

  it('ujemna liczba wycen albo klientów daje BladFormatu', () => {
    assert.throws(() => etykietyPodsumowania({ wycen: -1, klientow: 0, zlecen: 0, czyUstawienia: false }), BladFormatu)
    assert.throws(() => etykietyPodsumowania({ wycen: 0, klientow: -1, zlecen: 0, czyUstawienia: false }), BladFormatu)
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
  const KLIENT = /** @type {any} */ ({ id: 'k1' })
  const ZLECENIE = /** @type {any} */ ({ id: 'z1' })
  const PUSTY = { wyceny: [], klienci: [], zlecenia: [], ustawienia: null }

  it('jedna wycena bez ustawień → pyta o Połącz/Zastąp', () => {
    assert.equal(czyPytacOTryb({ ...PUSTY, wyceny: [WYCENA] }), true)
  })

  it('ustawienia bez wycen → pyta o Połącz/Zastąp', () => {
    assert.equal(czyPytacOTryb({ ...PUSTY, ustawienia: USTAWIENIA }), true)
  })

  it('sam klient albo samo zlecenie → pyta o Połącz/Zastąp', () => {
    assert.equal(czyPytacOTryb({ ...PUSTY, klienci: [KLIENT] }), true)
    assert.equal(czyPytacOTryb({ ...PUSTY, zlecenia: [ZLECENIE] }), true)
  })

  it('bez wycen, klientów, zleceń i ustawień → nie pyta (kopia od razu zastępuje pustą aplikację)', () => {
    assert.equal(czyPytacOTryb(PUSTY), false)
  })
})
