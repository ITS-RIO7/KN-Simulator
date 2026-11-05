import 'package:flutter/material.dart';

import 'game_screen.dart';

class StartScreen extends StatelessWidget {
  const StartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF06070B), Color(0xFF0C1A24), Color(0xFF06070B)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 18),
            child: Row(
              children: [
                Expanded(
                  flex: 5,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'KN CITY',
                        style: TextStyle(
                          color: accent,
                          fontSize: 46,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 8,
                          height: 1.0,
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'A 3D city you can walk through —\nthen take the drone up and fly over it.',
                        style: TextStyle(
                          color: Color(0xFF9FC6D6),
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 26),
                      SizedBox(
                        height: 52,
                        width: 210,
                        child: FilledButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const GameScreen(),
                              ),
                            );
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: accent,
                            foregroundColor: const Color(0xFF04121A),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            'START EXPLORING',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      _ControlRow(icon: Icons.gamepad, text: 'Left stick — walk / fly'),
                      _ControlRow(icon: Icons.swap_horiz, text: '◀ ▶ buttons — turn left / right'),
                      _ControlRow(icon: Icons.swipe, text: 'Drag the screen — look around'),
                      _ControlRow(icon: Icons.arrow_upward, text: 'Jump — hop over the kerb'),
                      _ControlRow(icon: Icons.videocam, text: 'Walk / Drone — switch view'),
                      _ControlRow(icon: Icons.restart_alt, text: 'Reset — back to the start'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ControlRow extends StatelessWidget {
  const _ControlRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF00E5FF)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Color(0xFFB7CFDB), fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
