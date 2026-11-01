import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexus_cloud/data/catalog.dart';
import 'package:nexus_cloud/main.dart';
import 'package:nexus_cloud/player/pad.dart';
import 'package:nexus_cloud/state/app_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('PadController só reporta quando algo mudou', () {
    final c = PadController();
    expect(c.takeIfDirty(), isNull);
    c.setButton(PadButton.south, true);
    final snap = c.takeIfDirty();
    expect(snap, isNotNull);
    expect(snap!['b'], contains('south'));
    expect(c.takeIfDirty(), isNull);
    c.setStick(true, 0.5, -0.25);
    expect(c.takeIfDirty()!['ls'], [0.5, -0.25]);
    c.setDpad(true, false, false, true);
    final d = c.takeIfDirty()!['b'] as List;
    expect(d, containsAll(['up', 'right']));
    c.releaseAll();
    expect((c.takeIfDirty()!['b'] as List), isEmpty);
  });

  test('URL do servidor só aceita wss://', () {
    expect(AppState.validateServerUrl(''), isNull);
    expect(AppState.validateServerUrl('wss://exemplo.com/sessao'), isNull);
    expect(AppState.validateServerUrl('ws://exemplo.com'), isNotNull);
    expect(AppState.validateServerUrl('http://exemplo.com'), isNotNull);
    expect(AppState.validateServerUrl('lixo'), isNotNull);
  });

  test('catálogo tem ids únicos', () {
    final ids = kCatalog.map((g) => g.id).toSet();
    expect(ids.length, kCatalog.length);
  });

  testWidgets('app abre na tela inicial', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState();
    await state.load();
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 2.6;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(NexusApp(state: state));
    await tester.pump();
    expect(find.text('NEXUS CLOUD'), findsOneWidget);
    expect(find.text('Biblioteca'), findsWidgets);
  });
}
