import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { PartRule } from './bike-map'

export type Ring = 0 | 1 | 2 | 3 | 4

export const RING_NAMES: Record<Ring, string> = {
  0: 'Engine core',
  1: 'Engine',
  2: 'Chassis',
  3: 'Wheels and steering',
  4: 'Bodywork and controls',
}

export interface Part {
  label: string
  ring: Ring
  pivot: THREE.Group
  center: THREE.Vector3
  size: number
  meshes: THREE.Mesh[]
  materials: THREE.MeshStandardMaterial[]
}

interface Piece {
  words: string
  parentWords: string
  meshes: THREE.Mesh[]
  center: THREE.Vector3
}

const GENERIC = /^(object|mesh|group|node|root ?node|scene|sketchfab model|gltf scene root node|default|model|)$/

function words(name: string) {
  return name
    .replace(/\.(fbx|obj|glb|gltf|3ds|blend)$/i, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function namedAncestor(node: THREE.Object3D | null) {
  for (let n = node; n; n = n.parent) {
    const w = words(n.name)
    if (!GENERIC.test(w)) return w
  }
  return ''
}

function isLeafMesh(o: THREE.Object3D): o is THREE.Mesh {
  return (o as THREE.Mesh).isMesh === true && o.children.length === 0
}

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
  wrap.updateMatrixWorld(true)
  return wrap
}

function collectPieces(wrap: THREE.Object3D) {
  const pieces: Piece[] = []
  const visit = (node: THREE.Object3D) => {
    const own: THREE.Mesh[] = []
    if ((node as THREE.Mesh).isMesh) own.push(node as THREE.Mesh)
    for (const c of node.children) {
      if (isLeafMesh(c)) own.push(c)
      else visit(c)
    }
    if (!own.length) return
    const box = new THREE.Box3()
    for (const m of own) box.expandByObject(m)
    pieces.push({
      words: namedAncestor(node),
      parentWords: namedAncestor(node.parent),
      meshes: own,
      center: box.getCenter(new THREE.Vector3()),
    })
  }
  visit(wrap)
  return pieces
}

function floatAttr(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const out = new Float32Array(attr.count * attr.itemSize)
  for (let i = 0; i < attr.count; i++) {
    out[i * attr.itemSize] = attr.getX(i)
    if (attr.itemSize > 1) out[i * attr.itemSize + 1] = attr.getY(i)
    if (attr.itemSize > 2) out[i * attr.itemSize + 2] = attr.getZ(i)
  }
  return new THREE.BufferAttribute(out, attr.itemSize)
}

function bakeGeometry(mesh: THREE.Mesh) {
  const src = mesh.geometry
  const g = new THREE.BufferGeometry()
  const pos = src.getAttribute('position')
  const nor = src.getAttribute('normal')
  g.setAttribute('position', floatAttr(pos))
  if (nor) g.setAttribute('normal', floatAttr(nor))
  if (src.index) g.setIndex(src.index.clone())
  mesh.updateWorldMatrix(true, false)
  g.applyMatrix4(mesh.matrixWorld)
  if (!nor) g.computeVertexNormals()
  return g
}

function upgrade(material: THREE.Material) {
  const m = material.clone() as THREE.MeshStandardMaterial
  if (!('emissive' in m)) {
    return new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.5 })
  }
  return m
}

function buildMeshes(members: Piece[]) {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
  for (const piece of members) {
    for (const mesh of piece.meshes) {
      if (Array.isArray(mesh.material)) continue
      const list = byMat.get(mesh.material) ?? []
      list.push(bakeGeometry(mesh))
      byMat.set(mesh.material, list)
    }
  }
  const meshes: THREE.Mesh[] = []
  const materials: THREE.MeshStandardMaterial[] = []
  for (const [mat, geos] of byMat) {
    const indexed = geos.every((g) => g.index)
    const ready = indexed ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g))
    const merged = ready.length === 1 ? ready[0]! : mergeGeometries(ready, false)
    const material = upgrade(mat)
    materials.push(material)
    if (merged) {
      merged.computeBoundingBox()
      merged.computeBoundingSphere()
      meshes.push(new THREE.Mesh(merged, material))
    } else {
      for (const g of ready) meshes.push(new THREE.Mesh(g, material))
    }
  }
  return { meshes, materials }
}

export function buildParts(model: THREE.Object3D, root: THREE.Object3D, rules: PartRule[]): Part[] {
  const wrap = normalise(model)
  root.add(wrap)
  root.updateMatrixWorld(true)

  const pieces = collectPieces(wrap)
  const groups = new Map<PartRule, Piece[]>()
  const loose: Piece[] = []
  for (const p of pieces) {
    const rule = rules.find((r) => r.match.test(p.words) && (!r.parent || r.parent.test(p.parentWords)))
    if (!rule) {
      loose.push(p)
      continue
    }
    const list = groups.get(rule) ?? []
    list.push(p)
    groups.set(rule, list)
  }

  const boxes = new Map<PartRule, THREE.Box3>()
  for (const [rule, members] of groups) {
    const box = new THREE.Box3()
    for (const p of members) for (const m of p.meshes) box.expandByObject(m)
    boxes.set(rule, box)
  }
  for (const p of loose) {
    let best: PartRule | null = null
    let bestDist = Infinity
    for (const [rule, box] of boxes) {
      const d = box.distanceToPoint(p.center)
      if (d < bestDist) {
        best = rule
        bestDist = d
      }
    }
    if (best) groups.get(best)!.push(p)
  }

  const parts: Part[] = []
  for (const rule of rules) {
    const members = groups.get(rule)
    if (!members) continue
    const { meshes, materials } = buildMeshes(members)
    if (!meshes.length) continue
    const box = new THREE.Box3()
    for (const m of meshes) box.union(m.geometry.boundingBox!)
    const center = box.getCenter(new THREE.Vector3())
    for (const m of meshes) {
      m.geometry.translate(-center.x, -center.y, -center.z)
      m.geometry.computeBoundingBox()
      m.geometry.computeBoundingSphere()
    }
    const pivot = new THREE.Group()
    pivot.name = rule.label
    pivot.position.copy(center)
    pivot.add(...meshes)
    root.add(pivot)
    parts.push({
      label: rule.label,
      ring: rule.ring,
      pivot,
      center,
      size: box.getSize(new THREE.Vector3()).length(),
      meshes,
      materials,
    })
  }

  root.remove(wrap)
  wrap.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose()
  })

  parts.forEach((p, i) => {
    for (const m of p.meshes) m.userData.part = i
  })
  return parts
}
