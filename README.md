# project mt

a scroll-driven exploded view of an MT09. as you scroll the bike comes apart with every part moving straight out from the engine, then everything settles into orbits around the engine like an atom. hover any part (or tap on a phone) to see what it is.

built with three.js, typescript and vite. live at https://ryzee34.github.io/project-mt/

## running it

```
npm install
npm run dev
```

## the model

[Three Cylinder Naked Street Bike](https://sketchfab.com/3d-models/three-cylinder-naked-street-bike-0897a975845647919728095d117a6255) by [Jamie Hamel-Smith](https://sketchfab.com/jamie3d), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). i split it into parts and rearranged it for this page.

`public/models/bike.glb` is the sketchfab glb run through meshopt so its 3.5 MB instead of 20 MB

```
npx @gltf-transform/cli meshopt three_cylinder_naked_street_bike.glb public/models/bike.glb
```

`src/bike-map.ts` groups the models ~1,000 named nodes into 49 parts and puts each one on a ring of the atom.
