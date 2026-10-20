import * as THREE from 'three'
import type { Stage } from './stage'

interface Key {
  s: number
  az: number
  el: number
  fit: 'assembled' | 'exploded' | 'atom'
}

const KEYS: Key[] = [
  { s: 0, az: 38, el: 9, fit: 'assembled' },
  { s: 0.1, az: 30, el: 10, fit: 'assembled' },
  { s: 0.44, az: -24, el: 17, fit: 'exploded' },
  { s: 0.86, az: 22, el: 24, fit: 'atom' },
  { s: 1, az: 22, el: 24, fit: 'atom' },
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
    const az = THREE.MathUtils.lerp(a.az, b.az, t) + (sway ? Math.sin(time * 0.21) * 3 : 0)
    const el = THREE.MathUtils.lerp(a.el, b.el, t) + (sway ? Math.sin(time * 0.17) * 1.5 : 0)
    const dist = THREE.MathUtils.lerp(this.stage.fitDistance(this.radii[a.fit]), this.stage.fitDistance(this.radii[b.fit]), t)
    const cam = this.stage.camera
    cam.position.copy(this.center).addScaledVector(viewDirection(az, el).negate(), dist)
    cam.lookAt(this.center)
  }
}
