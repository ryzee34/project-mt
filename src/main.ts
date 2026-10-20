import './style.css'
import { Stage } from './stage'

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
const loader = document.querySelector<HTMLElement>('#loader')!

const stage = new Stage(canvas)
stage.camera.position.set(0, 0.5, 4)
stage.camera.lookAt(0, 0, 0)

const frame = () => {
  stage.render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

loader.classList.add('is-done')
