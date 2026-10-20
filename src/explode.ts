import * as THREE from 'three'
import type { Part, Ring } from './parts'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

const EXPLODE_REACH: Record<Ring, number> = { 0: 0.16, 1: 0.42, 2: 0.62, 3: 0.82, 4: 1.0 }
const ORBIT_SCREEN_ANGLE = [18, 63, 108, 153]
const ORBIT_TILT = THREE.MathUtils.degToRad(68)
const ORBIT_SPEED = [0.2, 0.15, 0.11, 0.08]

interface Orbit {
  radius: number
  u: THREE.Vector3
  v: THREE.Vector3
  speed: number
  phase: number
  line: THREE.Mesh
}

interface Track {
  part: Part
  offA: THREE.Vector3
  offCore: THREE.Vector3
  orbit: Orbit | null
  theta: number
  atomScale: number
}

export class Explode {
  readonly center = new THREE.Vector3()
  readonly assembledRadius: number
  readonly explodedRadius: number
  readonly atomRadius: number
  readonly orbitGroup = new THREE.Group()
  readonly orbitRadii: number[] = []
  private tracks: Track[] = []
  private orbits: Orbit[] = []
  private target = new THREE.Vector3()
  private offB = new THREE.Vector3()

  constructor(parts: Part[], atomViewDir: THREE.Vector3) {
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
      return {
        part,
        offA: dir.clone().multiplyScalar(EXPLODE_REACH[part.ring] * reach),
        offCore: dir.clone().multiplyScalar(0.1 * reach),
        orbit: null,
        theta: 0,
        atomScale: 1,
      }
    })

    this.explodedRadius = Math.max(
      ...this.tracks.map((t) => t.part.center.clone().add(t.offA).distanceTo(this.center) + t.part.size / 2),
    )

    const coreReach = Math.max(
      ...this.tracks.filter((t) => t.part.ring === 0).map((t) => t.part.center.clone().add(t.offCore).distanceTo(this.center) + t.part.size / 2),
      reach * 0.2,
    )

    const view = atomViewDir.clone().normalize()
    const right = new THREE.Vector3().crossVectors(view, new THREE.Vector3(0, 1, 0)).normalize()
    const up = new THREE.Vector3().crossVectors(right, view).normalize()

    let atomRadius = coreReach
    const rings = ([1, 2, 3, 4] as Ring[]).filter((r) => this.tracks.some((t) => t.part.ring === r))
    rings.forEach((ring, k) => {
      const members = this.tracks.filter((t) => t.part.ring === ring)
      const alpha = THREE.MathUtils.degToRad(ORBIT_SCREEN_ANGLE[k % 4]!)
      const minor = right.clone().multiplyScalar(-Math.sin(alpha)).addScaledVector(up, Math.cos(alpha))
      const normal = view.clone().multiplyScalar(-Math.cos(ORBIT_TILT)).addScaledVector(minor, Math.sin(ORBIT_TILT)).normalize()
      const u = new THREE.Vector3().crossVectors(normal, view).normalize()
      const v = new THREE.Vector3().crossVectors(normal, u).normalize()

      const largest = Math.max(...members.map((t) => t.part.size))
      const circumference = members.reduce((s, t) => s + t.part.size * 0.7, 0)
      const radius = Math.max(coreReach + reach * (0.55 + k * 0.26), circumference / (Math.PI * 2))

      const natural = members.map((t) => {
        const d = t.part.center.clone().sub(this.center)
        return Math.atan2(d.dot(v), d.dot(u))
      })
      const order = members.map((_, i) => i).sort((a, b) => natural[a]! - natural[b]!)
      const n = members.length
      let sx = 0
      let sy = 0
      order.forEach((idx, slot) => {
        const delta = natural[idx]! - (slot / n) * Math.PI * 2
        sx += Math.cos(delta)
        sy += Math.sin(delta)
      })
      const offset = Math.atan2(sy, sx)

      const points: THREE.Vector3[] = []
      for (let i = 0; i < 128; i++) {
        const a = (i / 128) * Math.PI * 2
        points.push(this.center.clone().addScaledVector(u, Math.cos(a) * radius).addScaledVector(v, Math.sin(a) * radius))
      }
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 256, reach * 0.0035, 6, true),
        new THREE.MeshBasicMaterial({
          color: 0xd9a35b,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      this.orbitGroup.add(line)

      const orbit: Orbit = { radius, u, v, speed: ORBIT_SPEED[k % 4]!, phase: 0, line }
      this.orbitRadii.push(radius)
      this.orbits.push(orbit)
      order.forEach((idx, slot) => {
        const t = members[idx]!
        t.orbit = orbit
        t.theta = offset + (slot / n) * Math.PI * 2
      })
      atomRadius = Math.max(atomRadius, radius + largest / 2)
    })
    this.atomRadius = atomRadius

    const sizes = parts.map((p) => p.size).sort((a, b) => a - b)
    const median = sizes[Math.floor(sizes.length / 2)] ?? 1
    for (const t of this.tracks) {
      t.atomScale = t.orbit ? Math.min(1.2, Math.max(0.6, Math.sqrt(median / t.part.size))) : 1.3
    }
  }

  update(s: number, dt: number, spin: boolean) {
    const w = smooth(0.86, 0.97, s)
    for (const o of this.orbits) {
      if (spin) o.phase += dt * o.speed * w
      if (w < 1) o.phase = wrapAngle(o.phase) * Math.exp(-dt * 2.5 * (1 - w))
      ;(o.line.material as THREE.MeshBasicMaterial).opacity = 0.55 * smooth(0.6, 0.86, s)
      o.line.visible = s > 0.58
    }

    for (const t of this.tracks) {
      const ring = t.part.ring
      const eA = ease(clamp01((s - (0.08 + (4 - ring) * 0.045)) / 0.24))
      const eB = ease(clamp01((s - (0.5 + ring * 0.035)) / 0.22))
      if (t.orbit) {
        const a = t.theta + t.orbit.phase
        this.target
          .copy(this.center)
          .addScaledVector(t.orbit.u, Math.cos(a) * t.orbit.radius)
          .addScaledVector(t.orbit.v, Math.sin(a) * t.orbit.radius)
        this.offB.copy(this.target).sub(t.part.center)
      } else {
        this.offB.copy(t.offCore)
      }
      t.part.pivot.position.copy(t.part.center).addScaledVector(t.offA, eA * (1 - eB)).addScaledVector(this.offB, eB)
      t.part.pivot.scale.setScalar(1 + (t.atomScale - 1) * eB)
    }
  }
}
