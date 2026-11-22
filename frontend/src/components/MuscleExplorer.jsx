import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { allExercises, equipmentOf, searchExercises } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum, exCount } from '../lib/format.js'
import { MUSCLE_NAME, ZONES, musclesOf, zoneOf } from '../lib/muscles.js'
import { t, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import BodyMap from './BodyMap.jsx'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'
import ExerciseViewToggle from './ExerciseViewToggle.jsx'
import { Button } from './ui.jsx'
import { tappable, useRevealActiveChip } from '../lib/use-sheet-keyboard.js'
import { useAutoMore } from '../lib/use-auto-more.js'
import { favIds, isFav, sortFavouritesFirst } from '../lib/favourites.js'

const FAV = '☆'
const ZONE_MUSCLES = Object.values(ZONES).flat()

// One explorer for the Library and every catalogue picker. Supplying `onPick` turns
// a result into a selection; without it the explorer behaves like the normal Library.
export default function MuscleExplorer({ onPick, onDetail, onPlan, pickIcon = 'plus', initial = null }) {
  const S = useStore(s => s.S)
  const [selected, setSelected] = useState(initial)
  // The zone (a catalogue body part) narrows the muscle chips to its own; on its own, with no
  // muscle picked, it lists the zone's exercises the way the Library's body-part chips do.
  const [zone, setZone] = useState(() => zoneOf(initial))
  const [q, setQ] = useState('')
  // '' (both), 'primary', 'secondary' for the picked muscle, or FAV.
  const [role, setRole] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(40)
  const [showAll, setShowAll] = useState(false)   // ignore the active equipment profile for this session
  const moreRef = useAutoMore(() => setShown(s => s + 40))
  // A muscle tapped on the map picks its zone and its chip, either of which can be off the strip.
  const zoneRow = useRef(null), muscleRow = useRef(null)
  useRevealActiveChip(zoneRow, zone)
  useRevealActiveChip(muscleRow, selected)
  // Same rule as the Library and the picker: the active equipment profile narrows the catalogue
  // (and the per-muscle counts) unless the user asks for everything.
  const profile = activeProfile(S)
  const catalog = useMemo(() => {
    const all = allExercises(S)
    return (profile && !showAll) ? all.filter(e => exAvailable(S, e)) : all
  }, [S.customEx, S.equipFilterOn, S.activeEquipId, S.equipProfiles, showAll])
  const counts = useMemo(() => Object.fromEntries(ZONE_MUSCLES.map(m => [m,
    catalog.filter(e => musclesOf(e)[m]).length
  ])), [catalog])
  // A picked muscle shows its zone, so the muscle row keeps only the muscles next to it.
  const pick = muscle => {
    const next = muscle === selected ? null : muscle
    if (next) setZone(zoneOf(next))
    setSelected(next); setEq(''); setShown(40)
  }
  // A zone with one muscle (Shoulders, Lower arms) picks it: the chip row would offer nothing else.
  const pickZone = z => {
    setZone(z); setEq(''); setShown(40)
    const own = ZONES[z] || ZONE_MUSCLES
    if (own.length === 1) setSelected(own[0])
    else if (selected && !own.includes(selected)) setSelected(null)
  }
  const targeted = selected ? catalog.filter(e => musclesOf(e)[selected])
    : zone ? catalog.filter(e => e.bp === zone) : []
  const isPrimary = e => musclesOf(e)[selected] === 1
  const primaries = selected ? targeted.filter(isPrimary).length : 0
  // The picker's Favourites chip (#669), here for the chosen muscle or zone.
  const favOn = role === FAV
  const roleOn = selected || favOn ? role : ''
  const favHere = targeted.filter(e => isFav(S, e.id)).length
  const base = searchExercises(targeted.filter(e => favOn ? isFav(S, e.id)
    : roleOn === 'primary' ? isPrimary(e) : roleOn === 'secondary' ? !isPrimary(e) : true), q)
  const eqOpts = equipmentOf(base)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  // Favourites float to the top of whatever the filters left (issue #6), the rest keeps its order.
  const exercises = sortFavouritesFirst(eqOn ? base.filter(e => e.eq === eqOn) : base, S)
  const choose = ex => onPick ? onPick(ex) : onDetail(ex)
  // What the row says before the equipment: the exercise's target, and once a muscle is picked,
  // the part that muscle plays in it. A helper row names the target as the main muscle: on its
  // own, after the picked muscle's heading, it read as one more muscle the exercise trains.
  const rowRole = e => {
    const target = t(MUSCLE_NAME[e.tg] || e.tg || e.bp)
    if (!selected) return <><span className="capitalize">{target}</span> · </>
    if (isPrimary(e)) return t('Main muscle') + ' · '
    return `${t('Helper muscle')} · ${t('Main: {0}', target.charAt(0).toLocaleUpperCase() + target.slice(1))} · `
  }
  // The live count and the × of the Library's search (#338): the count while a search or a
  // filter narrows the muscle's list, the × while there is text.
  const narrowed = !!(q.trim() || roleOn || eqOn)
  const roleChip = (value, label, n) => <button className={'chip nocap' + (roleOn === value ? ' on' : '')}
    onClick={() => { setRole(value); if (!value) setEq(''); setShown(40) }}>{label}{n != null && <> <span className="dim">{fmtNum(n)}</span></>}</button>

  return <>
    {profile && <div className="small dim row" style={{ margin: '-4px 2px 10px', gap: 6, alignItems: 'center' }}>
      <Icon name="kettlebell" style={{ fontSize: 13 }} />
      {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
      <button className="chip nocap" style={{ marginInlineStart: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => { setShowAll(v => !v); setEq(''); setShown(40) }}>
        {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
      </button>
    </div>}
    <div className="card">
      <BodyMap className="tappable" body={S.body} selected={selected} onMuscle={pick} />
      <div ref={zoneRow} className="chips tabs" style={{ marginTop: 10 }}>
        <button className={'chip nocap' + (!zone ? ' on' : '')} onClick={() => pickZone('')}>{t('All')}</button>
        {Object.keys(ZONES).map(z => <button key={z} className={'chip' + (zone === z ? ' on' : '')} onClick={() => pickZone(z)}>{t(z)}</button>)}
      </div>
      <div ref={muscleRow} className="chips" style={{ marginTop: 8 }}>
        {(ZONES[zone] || ZONE_MUSCLES).map(m => <button key={m} className={'chip' + (selected === m ? ' on' : '')}
          aria-pressed={selected === m} onClick={() => pick(m)}>
          {t(MUSCLE_NAME[m])} <span className="dim">{counts[m]}</span>
        </button>)}
      </div>
    </div>

    {!selected && !zone && onPick && <div className="empty"><div className="ico"><Icon name="figureStrength" /></div>{t('Choose a muscle to see exercises that train it.')}</div>}

    {(selected || zone) && <>
      <div className="row between" style={{ margin: '2px 0 10px' }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Exercises for {0}', selected ? t(MUSCLE_NAME[selected]) : t(zone))}</h4>
        <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setZone(''); setEq(''); setShown(40) }}>{t('Clear selection')}</Button>
      </div>
      <div className="search-row" style={{ marginBottom: 10 }}><div className={'search' + (narrowed ? ' has-count' : '') + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} />
        {narrowed && <span className="search-count" role="status" aria-label={exCount(exercises.length)}>{fmtNum(exercises.length)}</span>}
        {q && <button className="clear" onClick={() => { setQ(''); setShown(40) }} aria-label={t('Clear')}><Icon name="xmark" /></button>}
      </div><ExerciseViewToggle /></div>
      {/* Changing the role keeps the equipment filter (issue #71, same rule as Library): the
          eqOn fallback above drops it only for this view if the role has nothing under it,
          without forgetting the choice. "All" clears it, since it spans both roles. */}
      {(selected || favIds(S).length > 0) && <div className="chips" style={{ marginBottom: eqOpts.length > 1 ? 8 : 12 }}>
        {favIds(S).length > 0 && <button className={'chip' + (favOn ? ' on' : '')} onClick={() => { setRole(FAV); setEq(''); setShown(40) }}><Icon name="starFill" className="fav-star" />{t('Favourites')} ({favHere})</button>}
        {roleChip('', t('All'))}
        {selected && roleChip('primary', t('Main muscle'), primaries)}
        {selected && roleChip('secondary', t('Helper muscle'), targeted.length - primaries)}
      </div>}
      {eqOpts.length > 1 && <div className="chips" style={{ marginBottom: 12 }}>
        <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
        {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
      </div>}
      <div className={'list' + (S.exerciseView === 'cards' ? ' ex-grid' : '')}>
        {exercises.slice(0, shown).map(e => {
          const best = bestWeightFor(S, e.id)
          return <div key={e.id} className="item" {...tappable(() => choose(e))}>
            <Thumb ex={e} />
            <div className="grow"><div className={`tt ${exerciseNameClass(e)}`}>{isFav(S, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div><div className="ss">{rowRole(e)}<span className="capitalize">{t(e.eq)}</span></div></div>
            {onPick ? <Icon name={pickIcon} className="chev" /> : <>
              {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
              <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); onPlan(e) }}>{t('Plan')}</Button>
            </>}
          </div>
        })}
        {exercises.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
      </div>
      {exercises.length > shown && <><div style={{ height: 10 }} /><Button ref={moreRef} onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
    </>}
  </>
}
