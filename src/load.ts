import type * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export async function loadModel(url: string, onProgress: (p: number) => void): Promise<THREE.Object3D | null> {
  try {
    const head = await fetch(url, { method: 'HEAD' })
    const type = head.headers.get('content-type') ?? ''
    if (!head.ok || type.includes('text/html')) return null
  } catch {
    return null
  }

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(url, (e) => {
    if (e.total) onProgress(e.loaded / e.total)
  })
  return gltf.scene
}
