import assert from 'node:assert/strict'
import { before, describe, it, mock } from 'node:test'

import { AtrapaElementu, tekst, uzyjAtrapyDom, znajdz } from '../../tests/atrapa-dom.js'
import { katalogZDysku } from '../../tests/pomocnicze.js'
import { formularzDomyslny } from '../kreator/szybka.js'
import { polaFormularza } from './szybka-pola.js'

/** @typedef {import('../silnik/katalog.js').Katalog} Katalog */

const DODATEK = Object.freeze({ uslugaId: 'agd', pozycjaId: 'piekarnik', ilosc: 1, tryb: 'w_cenie' })

describe('pola szybkiej wyceny', () => {
  uzyjAtrapyDom()
  /** @type {Katalog} */
  let katalog

  before(async () => {
    katalog = await katalogZDysku()
  })

  /** @param {{ dodatki?: unknown[], czyOtwarte?: boolean, naPrzelacz?: (czy: boolean) => void }} [opcje] @returns {AtrapaElementu | undefined} */
  function dodatkiAgd({ dodatki = [], czyOtwarte = false, naPrzelacz = () => {} } = {}) {
    const formularz = { ...formularzDomyslny(katalog, 'mazowieckie'), dodatki }
    const pola = polaFormularza({ formularz, katalog, zmien: () => {}, naMetraz: () => {}, lazienki: new AtrapaElementu('div'),
      dodatki: { czyOtwarte, naPrzelacz } })
    return pola.flatMap((p) => znajdz(p, (e) => e.tag === 'details'))[0]
  }

  it('„AGD i dodatki” jest zwinięte bez dodatków i otwarte, gdy ekran je rozwinął', () => {
    assert.equal(tekst(dodatkiAgd()?.dzieci[0]), 'AGD i dodatki')
    assert.equal(dodatkiAgd()?.open, false)
    assert.equal(dodatkiAgd({ czyOtwarte: true })?.open, true)
  })

  it('z dodatkami w formularzu „AGD i dodatki” jest zawsze rozwinięte', () => {
    assert.equal(dodatkiAgd({ dodatki: [DODATEK] })?.open, true)
  })

  it('przełączenie wraca do ekranu z aktualnym stanem', () => {
    const naPrzelacz = mock.fn()
    const szczegoly = dodatkiAgd({ czyOtwarte: true, naPrzelacz })
    assert.ok(szczegoly)

    szczegoly.open = false
    szczegoly.obslugi.get('toggle')?.()

    assert.deepEqual(naPrzelacz.mock.calls.map((c) => c.arguments), [[false]])
  })
})
