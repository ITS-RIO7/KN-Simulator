import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:kn_simulator/main.dart';

void main() {
  testWidgets('start screen shows the title and the start button',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1600, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const KnCityApp());

    expect(find.text('KN CITY'), findsOneWidget);
    expect(find.text('START EXPLORING'), findsOneWidget);
  });
}
