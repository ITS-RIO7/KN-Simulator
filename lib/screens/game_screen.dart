import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Hosts the 3D city (Three.js + Cannon.js inside a WebView) and draws the
/// Flutter HUD on top of it.
///
/// Flutter -> JS : `window.KN.setMode('walk'|'drone')`, `window.KN.reset()`
/// JS -> Flutter : `{type: 'ready'}`, `{type: 'mode', mode: ...}`
class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  static const Color _accent = Color(0xFF00E5FF);

  late final WebViewController _controller;
  bool _ready = false;
  bool _failed = false;
  String _mode = 'walk';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF06090D))
      ..addJavaScriptChannel('KNBridge', onMessageReceived: _onBridgeMessage)
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (WebResourceError error) {
            // Only a failed main document is fatal; sub-resource errors
            // (favicon and friends) are harmless.
            if (error.isForMainFrame != true) return;
            if (!mounted) return;
            setState(() => _failed = true);
          },
        ),
      )
      ..loadFlutterAsset('assets/game/index.html');
  }

  void _onBridgeMessage(JavaScriptMessage message) {
    Map<String, dynamic> data;
    try {
      data = jsonDecode(message.message) as Map<String, dynamic>;
    } catch (_) {
      return;
    }

    final type = data['type'];
    if (type == 'ready') {
      if (mounted) setState(() => _ready = true);
    } else if (type == 'mode') {
      final mode = data['mode'] as String? ?? 'walk';
      if (mounted) setState(() => _mode = mode);
    } else if (type == 'error') {
      if (mounted) setState(() => _failed = true);
    }
  }

  void _setMode(String mode) {
    _controller.runJavaScript("window.KN && window.KN.setMode('$mode');");
    setState(() => _mode = mode);
  }

  void _toggleMode() {
    _setMode(_mode == 'walk' ? 'drone' : 'walk');
  }

  void _reset() {
    _controller.runJavaScript('window.KN && window.KN.reset();');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF06090D),
      body: Stack(
        children: [
          Positioned.fill(
            child: WebViewWidget(controller: _controller),
          ),

          // HUD
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      _ModeChip(mode: _mode),
                      const Spacer(),
                      _HudButton(
                        icon: _mode == 'walk'
                            ? Icons.videocam_outlined
                            : Icons.directions_walk,
                        tooltip: _mode == 'walk' ? 'Drone view' : 'Walk',
                        onTap: _toggleMode,
                      ),
                      const SizedBox(width: 8),
                      _HudButton(
                        icon: Icons.restart_alt,
                        tooltip: 'Reset',
                        onTap: _reset,
                      ),
                      const SizedBox(width: 8),
                      _HudButton(
                        icon: Icons.close,
                        tooltip: 'Exit',
                        onTap: () => Navigator.of(context).maybePop(),
                      ),
                    ],
                  ),
                  const Spacer(),
                ],
              ),
            ),
          ),

          // loading / error
          if (!_ready)
            Positioned.fill(
              child: IgnorePointer(
                child: Center(
                  child: _failed
                      ? const Text(
                          'The 3D view could not start on this device.',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        )
                      : const SizedBox(
                          width: 26,
                          height: 26,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            color: _accent,
                          ),
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({required this.mode});

  final String mode;

  @override
  Widget build(BuildContext context) {
    final isDrone = mode == 'drone';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xCC060C12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x5500E5FF)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isDrone ? Icons.videocam : Icons.directions_walk,
            size: 16,
            color: const Color(0xFF00E5FF),
          ),
          const SizedBox(width: 8),
          Text(
            isDrone ? 'DRONE VIEW' : 'WALKING',
            style: const TextStyle(
              color: Color(0xFFD6F7FF),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }
}

class _HudButton extends StatelessWidget {
  const _HudButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: const Color(0xCC060C12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0x5500E5FF)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: SizedBox(
            width: 46,
            height: 46,
            child: Icon(icon, size: 21, color: const Color(0xFFD6F7FF)),
          ),
        ),
      ),
    );
  }
}
