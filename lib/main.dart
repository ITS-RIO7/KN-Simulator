import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/start_screen.dart';

/// KN City — a 3D city you can walk through, or fly over in drone view.
///
/// The 3D world itself lives in a WebView (Three.js + Cannon.js, bundled under
/// `assets/game/`); Flutter owns the shell, the menu and the HUD.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const KnCityApp());
}

class KnCityApp extends StatelessWidget {
  const KnCityApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KN City',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorSchemeSeed: const Color(0xFF00E5FF),
        scaffoldBackgroundColor: const Color(0xFF06070B),
      ),
      home: const StartScreen(),
    );
  }
}
