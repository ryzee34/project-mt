import * as THREE from 'three'
import type { Stage } from './stage'

interface Frame {
  x: number
  y: number
  zoom: number
}

interface Key {
  s: number
  az: number
  el: number
  fit: 'assembled' | 'exploded' | 'atom'
  wide: Frame
  narrow: Frame
}

const KEYS: Key[] = [
  { s: 0, az: 38, el: 9, fit: 'assembled', wide: { x: 0.17, y: 0, zoom: 1.12 }, narrow: { x: 0, y: 0.13, zoom: 1.0 } },
  { s: 0.1, az: 30, el: 10, fit: 'assembled', wide: { x: 0.17, y: 0, zoom: 1.12 }, narrow: { x: 0, y: 0.13, zoom: 1.0 } },
  { s: 0.44, az: -24, el: 17, fit: 'exploded', wide: { x: 0.16, y: 0, zoom: 1.08 }, narrow: { x: 0, y: 0.04, zoom: 1.0 } },
  { s: 0.86, az: 22, el: 24, fit: 'atom', wide: { x: -0.08, y: 0, zoom: 1.0 }, narrow: { x: 0, y: -0.1, zoom: 1.05 } },
  { s: 1, az: 22, el: 24, fit: 'atom', wide: { x: 0, y: 0.1, zoom: 1.1 }, narrow: { x: 0, y: 0.1, zoom: 1.0 } },
]

export const ATOM_VIEW = { az: 22, el: 24 }

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export function viewDirection(azDeg: number, elDeg: number) {
  const az = THREE.MathUtils.degToRad(azDeg)
  const el = THREE.MathUtils.degToRad(elDeg)
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).negate()
}

export class CameraRig {
  constructor(
    private stage: Stage,
    private center: THREE.Vector3,
    private radii: Record<Key['fit'], number>,
  ) {}

  update(s: number, time: number, sway: boolean) {
    let i = 0
    while (i < KEYS.length - 2 && s > KEYS[i + 1]!.s) i++
    const a = KEYS[i]!
    const b = KEYS[i + 1]!
    const t = ease(Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s))))
    const cam = this.stage.camera
    const layout = cam.aspect > 1.1 ? 'wide' : 'narrow'
    const fa = a[layout]
    const fb = b[layout]
    const az = THREE.MathUtils.lerp(a.az, b.az, t) + (sway ? Math.sin(time * 0.21) * 3 : 0)
    const el = THREE.MathUtils.lerp(a.el, b.el, t) + (sway ? Math.sin(time * 0.17) * 1.5 : 0)
    const dist = THREE.MathUtils.lerp(
      this.stage.fitDistance(this.radii[a.fit]) * fa.zoom,
      this.stage.fitDistance(this.radii[b.fit]) * fb.zoom,
      t,
    )
    const dir = viewDirection(az, el).negate()
    cam.position.copy(this.center).addScaledVector(dir, dist)
    cam.lookAt(this.center)

    const w = window.innerWidth
    const h = window.innerHeight
    const x = THREE.MathUtils.lerp(fa.x, fb.x, t)
    const y = THREE.MathUtils.lerp(fa.y, fb.y, t)
    cam.setViewOffset(w, h, -x * w, y * h, w, h)
  }
}
