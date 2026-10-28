import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { dodajPunkt, przesunPunkt, punktyDoZapisu, punktyZTekstow, usunPunkt, zmienPunkt } from './edytor-listy.js'

const LISTA = Object.freeze([{ id: 'a', tekst: 'Odkurzanie' }, { id: 'b', tekst: 'Kurze' }, { id: 'c', tekst: 'Łazienka' }])

describe('operacje edytora listy', () => {
  it('dodajPunkt dopisuje pusty punkt z podanym id na końcu, bez zmiany listy wejściowej', () => {
    const wynik = dodajPunkt(LISTA, 'd')
    assert.deepEqual(wynik.map((p) => p.id), ['a', 'b', 'c', 'd'])
    assert.deepEqual(wynik[3], { id: 'd', tekst: '' })
    assert.equal(LISTA.length, 3)
  })

  it('zmienPunkt zmienia tekst tylko punktu o tym id', () => {
    assert.deepEqual(zmienPunkt(LISTA, 'b', 'Kurze na meblach'), [
      { id: 'a', tekst: 'Odkurzanie' }, { id: 'b', tekst: 'Kurze na meblach' }, { id: 'c', tekst: 'Łazienka' }])
  })

  it('usunPunkt usuwa punkt o tym id, nieznane id zostawia listę bez zmian', () => {
    assert.deepEqual(usunPunkt(LISTA, 'a').map((p) => p.id), ['b', 'c'])
    assert.deepEqual(usunPunkt(LISTA, 'x').map((p) => p.id), ['a', 'b', 'c'])
  })

  it('przesunPunkt zamienia punkt z sąsiadem w górę i w dół', () => {
    assert.deepEqual(przesunPunkt(LISTA, 'b', -1).map((p) => p.id), ['b', 'a', 'c'])
    assert.deepEqual(przesunPunkt(LISTA, 'b', 1).map((p) => p.id), ['a', 'c', 'b'])
  })

  it('przesunPunkt poza brzeg listy albo nieznanego punktu nic nie zmienia', () => {
    assert.deepEqual(przesunPunkt(LISTA, 'a', -1).map((p) => p.id), ['a', 'b', 'c'])
    assert.deepEqual(przesunPunkt(LISTA, 'c', 1).map((p) => p.id), ['a', 'b', 'c'])
    assert.deepEqual(przesunPunkt(LISTA, 'x', 1).map((p) => p.id), ['a', 'b', 'c'])
  })

  it('punktyDoZapisu przycina teksty i pomija puste punkty', () => {
    const lista = [{ id: 'a', tekst: '  Odkurzanie ' }, { id: 'b', tekst: '   ' }, { id: 'c', tekst: '' }, { id: 'd', tekst: 'Okna' }]
    assert.deepEqual(punktyDoZapisu(lista), [{ id: 'a', tekst: 'Odkurzanie' }, { id: 'd', tekst: 'Okna' }])
  })

  it('punktyZTekstow nadaje kolejne id z przedrostkiem', () => {
    assert.deepEqual(punktyZTekstow(['Mycie okien', 'AGD'], 'nie'), [{ id: 'nie-0', tekst: 'Mycie okien' }, { id: 'nie-1', tekst: 'AGD' }])
  })
})
