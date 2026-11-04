import 'package:flutter/material.dart';

/// KN Simulator — empty scaffold.
///
/// The project structure, theme and APK pipeline are in place; the screens and
/// features get built from the spec.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const KnSimulatorApp());
}

class KnSimulatorApp extends StatelessWidget {
  const KnSimulatorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KN Simulator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorSchemeSeed: const Color(0xFF00E5FF),
        scaffoldBackgroundColor: const Color(0xFF06070B),
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            'KN SIMULATOR',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: 4,
            ),
          ),
        ),
      ),
    );
  }
}
