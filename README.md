# KN Simulator

Flutter project. Empty scaffold in place — screens and features are built from
the spec.

## Project state (as of 2026-11-04)

- Repo: `ITS-RIO7/KN-Simulator`, branch `main`
- Scaffold pushed: `pubspec.yaml`, `lib/main.dart` (placeholder), `analysis_options.yaml`, this README
- APK pipeline: `.github/workflows/build-apk.yml`
  - Flutter pinned to **3.47.7** (3.47.9 cannot resolve its Kotlin build deps)
  - `applicationId` **must stay `com.example.kn_simulator`** to match the generated
    `MainActivity` package. A mismatch crashes the app on launch.
  - Pushing a `v*` tag publishes the APK to a GitHub Release.

## What is still needed before building

The feature spec. Specifically:

1. App or game?
2. One-line purpose
3. Platforms (Android APK only, or iOS too?)
4. Must-have features (2-3)
5. If a game: 2D or 3D, and orientation (landscape / portrait / both)

## Notes carried over from the previous project

- There is no Flutter SDK in the agent sandbox, so nothing can be compiled or run
  locally. The APK is built by GitHub Actions. Physics and layout changes should
  be verified numerically or by simulation before shipping.
- Keep `applicationId`, `namespace` and the generated MainActivity package
  aligned in the workflow.
