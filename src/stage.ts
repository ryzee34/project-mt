import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200)
  readonly root = new THREE.Group()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.85
    pmrem.dispose()

    const key = new THREE.DirectionalLight(0xfff1e0, 2.4)
    key.position.set(2.5, 4, 3)
    const rim = new THREE.DirectionalLight(0x8fa8ff, 1.4)
    rim.position.set(-3, 1.5, -2.5)
    this.scene.add(key, rim, this.root)

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, w * h > 1_200_000 ? 1.5 : 2))
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  fitDistance(radius: number) {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect)
    return radius / Math.sin(Math.min(vfov, hfov) / 2)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
