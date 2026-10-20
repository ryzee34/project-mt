import './style.css'
import { Stage } from './stage'
import { loadModel } from './load'
import { buildParts } from './parts'
import { BIKE_PARTS } from './bike-map'
import { Explode } from './explode'
import { ATOM_VIEW, CameraRig, viewDirection } from './rig'
import { Hover } from './hover'

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
const loader = document.querySelector<HTMLElement>('#loader')!
const tip = document.querySelector<HTMLElement>('#tip')!
const railItems = [...document.querySelectorAll<HTMLElement>('#rail [data-stage]')]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
}

async function boot() {
  const stage = new Stage(canvas)
  const model = await loadModel(`${import.meta.env.BASE_URL}models/bike.glb`, (p) => {
    loader.textContent = `Loading ${Math.round(p * 100)}%`
  })
  if (!model) {
    loader.textContent = 'Model not found'
    return
  }

  loader.textContent = 'Taking it apart'
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const parts = buildParts(model, stage.root, BIKE_PARTS)
  const explode = new Explode(parts, viewDirection(ATOM_VIEW.az, ATOM_VIEW.el))
  stage.root.add(explode.orbitGroup)
  const rig = new CameraRig(stage, explode.center, {
    assembled: explode.assembledRadius * 0.92,
    exploded: explode.explodedRadius * 0.95,
    atom: explode.atomRadius * 1.02,
  })
  const hover = new Hover(canvas, stage.camera, parts, tip)

  document.querySelectorAll('[data-count]').forEach((el) => (el.textContent = String(parts.length)))

  let shown = scrollProgress()
  let last = performance.now()
  let time = 0
  let lastHover = 0

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    time += dt
    const target = scrollProgress()
    shown += (target - shown) * (1 - Math.exp(-dt * 7))
    if (Math.abs(target - shown) < 1e-4) shown = target

    const motion = !reduceMotion.matches
    explode.update(shown, dt, motion)
    rig.update(shown, time, motion)
    const moving = Math.abs(target - shown) > 1e-4 || (motion && shown > 0.86)
    hover.update(moving && now - lastHover > 120)
    if (moving && now - lastHover > 120) lastHover = now
    stage.render()

    const stageIndex = shown < 0.28 ? 0 : shown < 0.66 ? 1 : 2
    railItems.forEach((el, i) => el.classList.toggle('is-on', i === stageIndex))
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  loader.classList.add('is-done')
}

boot()
