import * as THREE from 'three'
import type { Part, Ring } from './parts'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const EXPLODE_REACH: Record<Ring, number> = { 0: 0.16, 1: 0.42, 2: 0.62, 3: 0.82, 4: 1.0 }

interface Track {
  part: Part
  offA: THREE.Vector3
}

export class Explode {
  readonly center = new THREE.Vector3()
  readonly assembledRadius: number
  readonly explodedRadius: number
  private tracks: Track[] = []

  constructor(parts: Part[]) {
    const core = parts.filter((p) => p.ring === 0)
    const coreBox = new THREE.Box3()
    for (const p of core.length ? core : parts) coreBox.expandByPoint(p.center)
    coreBox.getCenter(this.center)

    this.assembledRadius = Math.max(...parts.map((p) => p.center.distanceTo(this.center) + p.size / 2))
    const reach = this.assembledRadius

    this.tracks = parts.map((part, i) => {
      const dir = part.center.clone().sub(this.center)
      if (dir.length() < reach * 0.03) {
        const y = 1 - ((i + 0.5) / parts.length) * 2
        const r = Math.sqrt(1 - y * y)
        const phi = i * 2.399963
        dir.set(Math.cos(phi) * r, y, Math.sin(phi) * r)
      }
      dir.normalize()
      return { part, offA: dir.multiplyScalar(EXPLODE_REACH[part.ring] * reach) }
    })

    this.explodedRadius = Math.max(
      ...this.tracks.map((t) => t.part.center.clone().add(t.offA).distanceTo(this.center) + t.part.size / 2),
    )
  }

  update(s: number) {
    for (const t of this.tracks) {
      const eA = ease(clamp01((s - (0.08 + (4 - t.part.ring) * 0.045)) / 0.24))
      t.part.pivot.position.copy(t.part.center).addScaledVector(t.offA, eA)
    }
  }
}
