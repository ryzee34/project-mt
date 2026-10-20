import * as THREE from 'three'
import { RING_NAMES, type Part } from './parts'

const HIGHLIGHT = new THREE.Color(0xd9a35b)

export class Hover {
  private raycaster = new THREE.Raycaster()
  private ndc = new THREE.Vector2()
  private client = { x: 0, y: 0 }
  private dirty = false
  private inside = false
  private current = -1
  private meshes: THREE.Mesh[]

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: THREE.Camera,
    private parts: Part[],
    private tip: HTMLElement,
  ) {
    this.meshes = parts.flatMap((p) => p.meshes)
    window.addEventListener('pointermove', (e) => this.move(e), { passive: true })
    window.addEventListener('pointerdown', (e) => this.move(e), { passive: true })
    document.addEventListener('pointerleave', () => {
      this.inside = false
      this.dirty = true
    })
    window.addEventListener('scroll', () => (this.dirty = true), { passive: true })
  }

  private move(e: PointerEvent) {
    const target = e.target as HTMLElement | null
    this.inside = !target?.closest('a, .copy p, h1, h2')
    this.client.x = e.clientX
    this.client.y = e.clientY
    const rect = this.canvas.getBoundingClientRect()
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.dirty = true
  }

  update(force = false) {
    if (!this.dirty && !force) return
    this.dirty = false
    let hit = -1
    if (this.inside) {
      this.raycaster.setFromCamera(this.ndc, this.camera)
      const first = this.raycaster.intersectObjects(this.meshes, false)[0]
      if (first) hit = first.object.userData.part as number
    }
    if (hit !== this.current) {
      this.paint(this.current, false)
      this.paint(hit, true)
      this.current = hit
    }
    const part = this.parts[hit]
    if (part) {
      this.tip.innerHTML = `${part.label}<small>${RING_NAMES[part.ring]}</small>`
      this.tip.style.left = `${this.client.x}px`
      this.tip.style.top = `${this.client.y}px`
      this.tip.hidden = false
      this.canvas.style.cursor = 'pointer'
    } else {
      this.tip.hidden = true
      this.canvas.style.cursor = ''
    }
  }

  private paint(index: number, on: boolean) {
    const part = this.parts[index]
    if (!part) return
    for (const m of part.materials) {
      m.emissive.copy(on ? HIGHLIGHT : new THREE.Color(0x000000))
      m.emissiveIntensity = on ? 0.35 : 1
    }
  }
}
