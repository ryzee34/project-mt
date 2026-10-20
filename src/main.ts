import './style.css'
import * as THREE from 'three'
import { Stage } from './stage'
import { loadModel } from './load'
import { buildParts } from './parts'
import { BIKE_PARTS } from './bike-map'

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
const loader = document.querySelector<HTMLElement>('#loader')!
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

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
  const box = new THREE.Box3()
  for (const p of parts) box.expandByObject(p.pivot)
  const sphere = box.getBoundingSphere(new THREE.Sphere())

  let last = performance.now()
  let time = 0

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    time += dt
    const sway = reduceMotion.matches ? 0 : Math.sin(time * 0.21) * 3
    const az = THREE.MathUtils.degToRad(35 + sway)
    const el = THREE.MathUtils.degToRad(10)
    const cam = stage.camera
    cam.position
      .set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      .multiplyScalar(stage.fitDistance(sphere.radius))
      .add(sphere.center)
    cam.lookAt(sphere.center)
    stage.render()
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  loader.classList.add('is-done')
}

boot()
