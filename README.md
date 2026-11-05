# KN City (KN-Simulator)

A 3D city in Flutter. Walk the streets as a character, then switch to drone view
and fly over the whole city. Landscape only.

- **Flutter** owns the shell: menu, HUD, mode switch, orientation lock.
- **The 3D world** is Three.js + Cannon.js running inside a `WebView`, bundled
  locally in `assets/game/` (no CDN at runtime).
- Physics is real rigid-body physics (Cannon.js): the walker collides with every
  building and the ground.

## Controls

| Input | Walk mode | Drone mode |
|---|---|---|
| Left stick | Move | Fly forward / strafe |
| ◀ / ▶ (bottom right) | Turn left / right | Turn left / right |
| Drag the screen | Orbit the camera | Look around |
| JUMP | Hop | — |
| ▲ / ▼ | — | Gain / lose altitude |
| Walk / Drone button (top right) | Switch to drone | Switch to walking |
| Reset (top right) | Back to spawn | Back to spawn |

## Project layout

```
lib/main.dart                  orientation lock + app
lib/screens/start_screen.dart  title screen and controls help
lib/screens/game_screen.dart   WebView host + Flutter HUD
assets/game/index.html         canvas + touch HUD (stick, fly buttons)
assets/game/main.js            the game: city, player, cameras, input
assets/game/three.min.js       Three.js r155 (bundled)
assets/game/cannon.min.js      Cannon.js 0.6.2 (bundled)
```

## The city

Generated procedurally from a fixed seed (`20261104`) — 7 × 7 blocks, roads
14 units wide, buildings 7–57 units tall, parks with trees, dashed lane
markings, a rooftop antenna on the tall ones. Same seed always gives the same
city, so the layout is stable between runs.

The drone starts 48 units above the walker, looking down over the streets.

## Bridge between Flutter and the 3D scene

- Flutter → JS: `window.KN.setMode('walk' | 'drone')`, `window.KN.reset()`
- JS → Flutter: `{type: 'ready'}`, `{type: 'mode', mode}`, `{type: 'error'}`

## Build

There is no Flutter SDK in the agent sandbox, so nothing here was compiled or
run locally. The APK is built by GitHub Actions:

- Push to `main` → `.github/workflows/build-apk.yml` builds the release APK and
  uploads it as an artifact.
- Push a `v*` tag (or run the workflow manually) → the APK is published to a
  GitHub Release as a downloadable file.

`applicationId` must stay `com.example.kn_simulator` to match the generated
`MainActivity` package — a mismatch crashes the app on launch.
