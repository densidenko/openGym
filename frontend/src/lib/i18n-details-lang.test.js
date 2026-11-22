/* The first details load and a language switch can overlap: setLang reloads the descriptions
   only once a load has finished, so one that started under German and finished under French
   used to put German descriptions under French. They are kept only for the language they were
   loaded for; the loader then loads the current language's own. */
import { describe, expect, it } from 'vitest'
import * as core from './i18n-core.js'

const ex = { id: '9999', st: [] }

describe('a language switch while the details load', () => {
  it('keeps the descriptions of one language from landing under another', () => {
    core._setLangState('de', {}, null, null, true, false)
    expect(core._setDetails({ 9999: ['Lift.'] }, { 9999: 'A lift.' }, { 9999: 'Ein Heben.' }, 'de')).toBe(true)
    expect(core.descFor(ex)).toBe('Ein Heben.')
    core._setLangState('fr', {}, null, null, true, false)
    // German descriptions that finished loading after the switch to French
    expect(core._setDetails({ 9999: ['Lift.'] }, { 9999: 'A lift.' }, { 9999: 'Ein Heben.' }, 'de')).toBe(false)
    expect(core.descFor(ex)).not.toBe('Ein Heben.')
    expect(core.instrFor(ex)).toEqual(['Lift.'])   // the English steps are every language's
    expect(core._setDetails(null, null, { 9999: 'Un levé.' }, 'fr')).toBe(true)
    expect(core.descFor(ex)).toBe('Un levé.')
  })
})

// Common mistakes and tips: the language's own list, else the English one, else a custom
// exercise's own, each list on its own (a language may have translated only one of them).
describe('common mistakes and tips', () => {
  it('fall back to English one list at a time, then to the exercise itself', () => {
    core._setLangState('uk', {}, null, null, true, false)
    core._setDetails({}, {}, {}, 'uk', { 9999: { mistakes: ['Rounding.'], tips: ['Brace.'] } }, { 9999: { mistakes: ['Округлення.'] } })
    expect(core.mistakesFor(ex)).toEqual(['Округлення.'])
    expect(core.tipsFor(ex)).toEqual(['Brace.'])
    expect(core.tipsFor({ id: 'c1', tips: ['Own tip.'] })).toEqual(['Own tip.'])
    expect(core.mistakesFor({ id: 'c2' })).toEqual([])
  })
})
