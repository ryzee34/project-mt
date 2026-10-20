import * as THREE from 'three'
import type { Stage } from './stage'
import { smooth } from './explode'
import { ATOM_VIEW, viewDirection } from './rig'

const DUST = new THREE.Color(1.0, 0.86, 0.68)
const HAZE = new THREE.Color(0.06, 0.036, 0.016)
const KEY_LIGHT = new THREE.Vector3(2.5, 4, 3).normalize()

const HAZE_VERTEX = `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const HAZE_FRAGMENT = `
uniform vec2 uSubject;
uniform float uAspect;
uniform float uBreath;
uniform float uGain;
uniform vec3 uTone;
varying vec2 vNdc;
float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
void main() {
  vec2 squash = vec2(uAspect, 1.0);
  vec2 p = (vNdc - uSubject) * squash;
  float r2 = dot(p, p);
  vec3 glow = uTone * (exp(-r2 * 1.8 / uBreath) * 0.85 + exp(-r2 * 0.5) * 0.22) * uGain;
  float shade = smoothstep(0.6, 1.55, length(vNdc * vec2(0.82, 1.0))) * 0.45;
  glow *= 1.0 - shade;
  vec3 color = glow + dither(gl_FragCoord.xy) * 1.5 / 255.0;
  gl_FragColor = vec4(color, max(shade, max(color.r, max(color.g, color.b))));
}
`

const MOTE_VERTEX = `
attribute vec4 aSeed;
attribute vec3 aDrift;
uniform float uTime;
uniform float uMotion;
uniform vec3 uCenter;
uniform vec3 uAxis;
uniform vec3 uKey;
uniform float uSwirl;
uniform float uPush;
uniform float uScale;
uniform float uDriftAmp;
uniform float uPixel;
uniform float uMaxPoint;
uniform float uFocus;
uniform float uSizeBoost;
uniform float uGain;
uniform vec2 uSize;
varying float vAlpha;
varying float vSoft;
vec3 rotateAbout(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
void main() {
  float phase = aSeed.y * 6.2831853;
  vec3 rel = position - uCenter;
  float r = length(rel) / uScale;
  vec3 drift = vec3(
    sin(uTime * aDrift.x + phase),
    sin(uTime * aDrift.y + phase * 1.7),
    cos(uTime * aDrift.z + phase * 2.3)
  );
  rel += drift * uDriftAmp * uMotion;
  rel *= 1.0 + uPush * 0.45 / (0.6 + r);
  rel = rotateAbout(rel, uAxis, uSwirl * 1.4 / (0.45 + r));

  vec4 mv = modelViewMatrix * vec4(uCenter + rel, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;

  float blur = clamp(abs(depth - uFocus) / uFocus, 0.0, 2.0);
  float size = mix(uSize.x, uSize.y, aSeed.x * aSeed.x) * (1.0 + blur * 1.4) * uSizeBoost;
  float pixels = size * uPixel / max(depth, 0.001);
  gl_PointSize = clamp(pixels, 1.0, uMaxPoint);

  float alpha = 0.3 / (1.0 + blur * blur * 2.5);
  alpha *= smoothstep(0.18 * uFocus, 0.5 * uFocus, depth);
  alpha *= min(1.0, pixels / 1.5);
  alpha *= 0.55 + 0.6 * max(0.0, dot(normalize(rel), uKey));
  float twinkle = 0.72 + 0.28 * sin(uTime * (0.35 + aSeed.w * 0.9) + phase * 3.0);
  alpha *= mix(1.0, twinkle, uMotion);
  vAlpha = alpha * uGain;
  vSoft = clamp(blur * 0.9, 0.0, 1.0);
}
`

const MOTE_FRAGMENT = `
uniform vec3 uColor;
varying float vAlpha;
varying float vSoft;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  if (d > 1.0) discard;
  float shape = mix(exp(-d * d * 7.0), smoothstep(1.0, 0.72, d), vSoft);
  float strength = shape * vAlpha;
  gl_FragColor = vec4(uColor * strength, max(uColor.r, max(uColor.g, uColor.b)) * strength);
}
`

export interface DustOptions {
  stage: Stage
  center: THREE.Vector3
  radius: { assembled: number; exploded: number; atom: number }
}

export function createDust({ stage, center, radius }: DustOptions) {
  const camera = stage.camera
  const compact = window.innerWidth * window.innerHeight < 600_000
  const count = compact ? 180 : 320
  const span = radius.atom
  const bikeScale = radius.assembled

  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count * 4)
  const drifts = new Float32Array(count * 3)
  const direction = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    direction.randomDirection()
    const distance = span * (0.35 + 1.8 * Math.pow(Math.random(), 0.9))
    positions[i * 3] = center.x + direction.x * distance
    positions[i * 3 + 1] = center.y + direction.y * distance * 0.8
    positions[i * 3 + 2] = center.z + direction.z * distance
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = Math.random()
    drifts[i * 3] = 0.05 + Math.random() * 0.12
    drifts[i * 3 + 1] = 0.04 + Math.random() * 0.1
    drifts[i * 3 + 2] = 0.05 + Math.random() * 0.12
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  geometry.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 3))

  const moteUniforms = {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uCenter: { value: center.clone() },
    uAxis: { value: viewDirection(ATOM_VIEW.az, ATOM_VIEW.el).negate().normalize() },
    uKey: { value: KEY_LIGHT },
    uSwirl: { value: 0 },
    uPush: { value: 0 },
    uScale: { value: span },
    uDriftAmp: { value: bikeScale * 0.09 },
    uPixel: { value: 1000 },
    uMaxPoint: { value: 32 },
    uFocus: { value: 5 },
    uSizeBoost: { value: 1 },
    uGain: { value: 1 },
    uSize: { value: new THREE.Vector2(bikeScale * 0.011, bikeScale * 0.03) },
    uColor: { value: DUST },
  }
  const motes = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: moteUniforms,
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
    }),
  )
  motes.frustumCulled = false
  motes.renderOrder = 2

  const subject = new THREE.Vector2()
  const hazeUniforms = {
    uSubject: { value: subject },
    uAspect: { value: camera.aspect },
    uBreath: { value: 1 },
    uGain: { value: 1 },
    uTone: { value: HAZE },
  }
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: hazeUniforms,
      vertexShader: HAZE_VERTEX,
      fragmentShader: HAZE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    }),
  )
  haze.frustumCulled = false
  haze.renderOrder = -1000

  stage.scene.add(haze, motes)

  const projected = new THREE.Vector3()
  const buffer = new THREE.Vector2()
  let swirl = 0
  let clock = 0

  return {
    update(s: number, dt: number, motion: boolean) {
      if (motion) clock += dt
      camera.updateMatrixWorld()
      projected.copy(center).project(camera)
      subject.set(projected.x, projected.y)

      stage.renderer.getDrawingBufferSize(buffer)
      const kicked = smooth(0.1, 0.36, s) * (1 - smooth(0.5, 0.82, s))
      const swirlWeight = smooth(0.55, 0.92, s)
      if (motion) swirl += dt * 0.055 * swirlWeight
      const focus = camera.position.distanceTo(center)

      moteUniforms.uTime.value = clock
      moteUniforms.uMotion.value = motion ? 1 : 0
      moteUniforms.uSwirl.value = swirl
      moteUniforms.uPush.value = smooth(0.08, 0.45, s) * (1 - 0.4 * swirlWeight)
      moteUniforms.uPixel.value = buffer.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
      moteUniforms.uMaxPoint.value = 32 * stage.renderer.getPixelRatio()
      moteUniforms.uFocus.value = focus
      moteUniforms.uSizeBoost.value = Math.sqrt(Math.max(1, focus / stage.fitDistance(bikeScale)))
      moteUniforms.uGain.value = 1 + 0.45 * kicked

      hazeUniforms.uAspect.value = camera.aspect
      hazeUniforms.uBreath.value = 1 + (motion ? 0.06 * Math.sin(clock * 0.32) : 0)
      hazeUniforms.uGain.value = (1 + 0.18 * kicked) * (1 - 0.5 * smooth(0.5, 0.86, s)) * (camera.aspect < 1 ? 0.75 : 1)
    },
  }
}
