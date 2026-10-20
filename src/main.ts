import './style.css'
import * as THREE from 'three'
import { Stage } from './stage'
import { loadModel } from './load'

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
const loader = document.querySelector<HTMLElement>('#loader')!
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function normalise(model: THREE.Object3D) {
  const wrap = new THREE.Group()
  wrap.add(model)
  wrap.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(wrap)
  let size = box.getSize(new THREE.Vector3())
  if (size.z > size.x) {
    wrap.rotation.y = Math.PI / 2
    wrap.updateMatrixWorld(true)
    box.setFromObject(wrap)
    size = box.getSize(new THREE.Vector3())
  }
  wrap.scale.setScalar(2 / size.x)
  wrap.updateMatrixWorld(true)
  box.setFromObject(wrap)
  wrap.position.sub(box.getCenter(new THREE.Vector3()))
  return wrap
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

  const bike = normalise(model)
  stage.root.add(bike)
  const sphere = new THREE.Box3().setFromObject(bike).getBoundingSphere(new THREE.Sphere())

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
