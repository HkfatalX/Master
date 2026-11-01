import 'package:flutter/material.dart';

import 'cloud/cloud.dart';
import 'screens/shell.dart';
import 'state/app_state.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState();
  await state.load();
  final cloud = CloudService();
  await cloud.init(state);
  runApp(NexusApp(state: state, cloud: cloud));
}

class NexusApp extends StatelessWidget {
  const NexusApp({super.key, required this.state, this.cloud});

  final AppState state;

  /// Null em testes: o login fica indisponível e o resto do app funciona igual.
  final CloudService? cloud;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: state,
      child: CloudScope(
        cloud: cloud,
        child: MaterialApp(
          title: 'NEXUS CLOUD',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(),
          home: const Shell(),
        ),
      ),
    );
  }
}
