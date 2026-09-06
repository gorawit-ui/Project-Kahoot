# Jixgo Fairytale Host — future GLB hand-off

Place the production model at `public/models/jixgo-magical-24.glb`. Keep `JixgoMascot` and its `mode` API (`idle`, `greeting`, `countdown`, `celebrate`) unchanged.

The GLB should be glTF 2.0, Y-up, meter-scale, original, humanoid-rigged, with separate apple mesh and animation clips named exactly `idle`, `greeting`, `celebrate`, and `countdown`. Target under 60k triangles and 8 MB (12 MB maximum); use 1024px compressed textures where possible.

To swap V1, replace `FairytaleHost` in `components/jixgo-3d/jixgo-mascot.tsx` with `useGLTF("/models/jixgo-magical-24.glb")` and cross-fade those clips. Keep the parent API intact.

The component uses a local transparent SVG fallback when WebGL is unavailable, reduced-motion is enabled, or the device is low-power. It can be replaced by a transparent PNG later without changing its behaviour. V1 uses low-segment primitives, one transparent Canvas, DPR 1–1.5, no shadows, and pointer-events disabled.
