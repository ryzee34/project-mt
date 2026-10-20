import * as THREE from 'three'
import type { Stage } from './stage'
import { smooth } from './explode'
import { ATOM_VIEW, viewDirection } from './rig'

const ORBIT_AXIS_ANGLE = THREE.MathUtils.degToRad(18)
const BEZEL_SPIN_SPEED = 0.018
const BEZEL_SCALE = 1.12
const BEZEL_DEPTH = 0.05

const vertexShader = `
varying vec2 vPlane;
void main() {
  vPlane = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform float uCell;
uniform float uFade;
uniform float uPolar;
uniform float uRuler;
uniform float uBezel;
uniform float uBezelSpin;
uniform float uAxisAngle;
uniform vec4 uOrbits;
uniform float uOuter;
uniform float uBezelScale;
uniform float uBezelDepth;
uniform float uStrength;
uniform float uPixelRatio;
uniform vec3 uInk;
uniform vec3 uGold;
varying vec2 vPlane;

const float TAU = 6.28318530718;

float stroke(float dist, float px, float widthPx) {
  float width = widthPx * uPixelRatio;
  return clamp(width * 0.5 + 0.5 - dist / max(px, 1e-6), 0.0, 1.0);
}

float density(float spacing, float px) {
  return smoothstep(3.0 * uPixelRatio, 9.0 * uPixelRatio, spacing / max(px, 1e-6));
}

float nearest(float coord, float spacing) {
  return abs(fract(coord / spacing - 0.5) - 0.5) * spacing;
}

float gridLines(vec2 p, vec2 px, float spacing, float widthPx) {
  float lx = stroke(nearest(p.x, spacing), px.x, widthPx) * density(spacing, px.x);
  float ly = stroke(nearest(p.y, spacing), px.y, widthPx) * density(spacing, px.y);
  return max(lx, ly);
}

float circle(float r, float radius, float pxR, float widthPx) {
  return radius > 0.0 ? stroke(abs(r - radius), pxR, widthPx) : 0.0;
}

void main() {
  vec2 p = vPlane;
  vec2 dpx = dFdx(p);
  vec2 dpy = dFdy(p);
  vec2 px = abs(dpx) + abs(dpy);
  float r = length(p);
  float pxR = fwidth(r);
  float pxT = (abs(p.x * dpx.y - p.y * dpx.x) + abs(p.x * dpy.y - p.y * dpy.x)) / max(r, 1e-4);

  float gridFade = 1.0 - smoothstep(uFade * 0.15, uFade, r);
  float cart = 1.0 - uPolar;

  float minor = gridLines(p, px, uCell, 1.0);
  float major = gridLines(p, px, uCell * 4.0, 1.0);

  float majorStep = uCell * 4.0;
  vec2 toMajor = (fract(p / majorStep - 0.5) - 0.5) * majorStep;
  float arm = uCell * 0.32;
  float crossH = stroke(abs(toMajor.y), px.y, 1.4) * step(abs(toMajor.x), arm);
  float crossV = stroke(abs(toMajor.x), px.x, 1.4) * step(abs(toMajor.y), arm);
  float plusMark = max(crossH, crossV) * density(majorStep, max(px.x, px.y));

  float axisX = stroke(abs(p.y), px.y, 1.0);
  float axisY = stroke(abs(p.x), px.x, 1.0);
  float tickMinorX = stroke(nearest(p.x, uCell * 0.5), px.x, 1.0) * step(abs(p.y), uCell * 0.12) * density(uCell * 0.5, px.x);
  float tickMajorX = stroke(nearest(p.x, uCell * 2.0), px.x, 1.0) * step(abs(p.y), uCell * 0.3);
  float tickMinorY = stroke(nearest(p.y, uCell * 0.5), px.y, 1.0) * step(abs(p.x), uCell * 0.12) * density(uCell * 0.5, px.y);
  float tickMajorY = stroke(nearest(p.y, uCell * 2.0), px.y, 1.0) * step(abs(p.x), uCell * 0.3);
  float ruler = max(max(axisX, axisY), max(max(tickMinorX, tickMajorX), max(tickMinorY, tickMajorY)));

  float theta = atan(p.y, p.x) - uAxisAngle;
  float spokeStep = TAU / 24.0;
  float spokes = stroke(nearest(theta, spokeStep) * r, pxT, 1.0) * density(spokeStep * r, pxT);
  float ringStep = uOuter / 6.0;
  float rings = stroke(nearest(r, ringStep), pxR, 1.0) * density(ringStep, pxR);
  float polarFade = smoothstep(uOuter * 0.12, uOuter * 0.3, r) * (1.0 - smoothstep(uOuter * 0.7, uOuter * 1.35, r));

  float axisStep = TAU / 8.0;
  float dashLength = uOuter * 0.035;
  float dashOn = smoothstep(0.0, 0.08, fract(r / dashLength)) * (1.0 - smoothstep(0.55, 0.63, fract(r / dashLength)));
  float construction = stroke(nearest(theta, axisStep) * r, pxT, 1.0) * dashOn;
  float constructionFade = smoothstep(uOuter * 0.1, uOuter * 0.25, r) * (1.0 - smoothstep(uOuter * 1.02, uOuter * 1.2, r));

  float orbitCircles = max(max(circle(r, uOrbits.x, pxR, 1.0), circle(r, uOrbits.y, pxR, 1.0)), max(circle(r, uOrbits.z, pxR, 1.0), circle(r, uOrbits.w, pxR, 1.0)));

  float bezelRadius = uOuter * uBezelScale;
  float bezelTheta = theta + uBezelSpin;
  float fineStep = TAU / 144.0;
  float coarseStep = TAU / 24.0;
  float band = r - bezelRadius;
  float fineTicks = stroke(nearest(bezelTheta, fineStep) * r, pxT, 1.0) * step(0.0, band) * step(band, uOuter * 0.022) * density(fineStep * r, pxT);
  float coarseTicks = stroke(nearest(bezelTheta, coarseStep) * r, pxT, 1.2) * step(0.0, band) * step(band, uOuter * uBezelDepth);
  float bezelRing = circle(r, bezelRadius, pxR, 1.0);
  float bezel = max(bezelRing, max(fineTicks, coarseTicks));

  float ink = 0.0;
  ink = max(ink, minor * 0.032 * gridFade * cart);
  ink = max(ink, major * 0.05 * gridFade * cart);
  ink = max(ink, plusMark * 0.11 * gridFade * cart);
  ink = max(ink, ruler * 0.085 * uRuler * gridFade * cart);
  ink = max(ink, spokes * 0.03 * polarFade * uPolar);
  ink = max(ink, rings * 0.03 * polarFade * uPolar);
  ink = max(ink, construction * 0.06 * constructionFade * uPolar);

  float gold = max(orbitCircles * 0.07 * uPolar, bezel * 0.09 * uBezel);

  float alpha = max(ink, gold) * uStrength;
  if (alpha < 0.001) discard;
  vec3 color = mix(uInk, uGold, gold / max(max(ink, gold), 1e-5));
  gl_FragColor = vec4(color, alpha);
}
`

export interface BlueprintOptions {
  stage: Stage
  center: THREE.Vector3
  floorY: number
  orbitRadii: number[]
  radius: { assembled: number; exploded: number; atom: number }
}

function basisQuaternion(u: THREE.Vector3, v: THREE.Vector3, n: THREE.Vector3) {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, n))
}

export function createBlueprint({ stage, center, floorY, orbitRadii, radius }: BlueprintOptions) {
  const radii = [...orbitRadii].sort((a, b) => a - b).slice(-4)
  const outer = radii[radii.length - 1] ?? radius.atom * 0.85
  const reach = outer * (BEZEL_SCALE + BEZEL_DEPTH + 0.05)

  const floorOrigin = new THREE.Vector3(center.x, floorY, center.z)
  const floorQuaternion = basisQuaternion(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0))

  const view = viewDirection(ATOM_VIEW.az, ATOM_VIEW.el).normalize()
  const right = new THREE.Vector3().crossVectors(view, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, view).normalize()
  const faceQuaternion = basisQuaternion(right, up, view.clone().negate())

  const extent = Math.max(reach * 1.3, radius.exploded * 2, radius.assembled * 3)

  const uniforms = {
    uCell: { value: radius.assembled / 8 },
    uFade: { value: radius.assembled * 2.6 },
    uPolar: { value: 0 },
    uRuler: { value: 0 },
    uBezel: { value: 0 },
    uBezelSpin: { value: 0 },
    uAxisAngle: { value: ORBIT_AXIS_ANGLE },
    uOrbits: { value: new THREE.Vector4(radii[0] ?? 0, radii[1] ?? 0, radii[2] ?? 0, radii[3] ?? 0) },
    uOuter: { value: outer },
    uBezelScale: { value: BEZEL_SCALE },
    uBezelDepth: { value: BEZEL_DEPTH },
    uStrength: { value: 1 },
    uPixelRatio: { value: stage.renderer.getPixelRatio() },
    uInk: { value: new THREE.Color(0.8, 0.86, 0.95) },
    uGold: { value: new THREE.Color(0.85, 0.64, 0.36) },
  }

  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(extent * 2, extent * 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    }),
  )
  sheet.renderOrder = -10
  sheet.frustumCulled = false
  stage.scene.add(sheet)

  let bezelSpin = 0

  return {
    reach,
    update(s: number, dt: number, motion: boolean) {
      uniforms.uPixelRatio.value = stage.renderer.getPixelRatio()
      const exploding = smooth(0.06, 0.46, s)
      const polar = smooth(0.5, 0.74, s)
      const lift = smooth(0.52, 0.84, s)

      sheet.quaternion.slerpQuaternions(floorQuaternion, faceQuaternion, lift)
      sheet.position.lerpVectors(floorOrigin, center, lift)

      const floorFade = THREE.MathUtils.lerp(radius.assembled * 2.6, radius.exploded * 1.5, exploding)
      uniforms.uFade.value = THREE.MathUtils.lerp(floorFade, outer * 1.4, polar)
      uniforms.uPolar.value = polar
      uniforms.uRuler.value = smooth(0.1, 0.38, s)
      uniforms.uBezel.value = smooth(0.66, 0.9, s)

      if (motion) bezelSpin = (bezelSpin + dt * BEZEL_SPIN_SPEED * smooth(0.86, 0.97, s)) % (Math.PI * 2)
      uniforms.uBezelSpin.value = bezelSpin
    },
  }
}
