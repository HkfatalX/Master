import 'package:flutter/material.dart';

/// Paleta do NEXUS CLOUD: preto profundo, roxo neon e azul elétrico.
class NX {
  static const Color bg = Color(0xFF07060F);
  static const Color surface = Color(0xFF120F24);
  static const Color surface2 = Color(0xFF1B1736);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color blue = Color(0xFF3B82F6);
  static const Color neon = Color(0xFFA855F7);
  static const Color text = Color(0xFFEDE9FE);
  static const Color muted = Color(0xFF9A93B8);
  static const Color ok = Color(0xFF22C55E);
  static const Color warn = Color(0xFFF59E0B);
  static const Color bad = Color(0xFFEF4444);

  static const LinearGradient gradient = LinearGradient(
    colors: [purple, blue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

ThemeData buildTheme() {
  const scheme = ColorScheme.dark(
    primary: NX.purple,
    secondary: NX.blue,
    surface: NX.surface,
    onSurface: NX.text,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: NX.bg,
    appBarTheme: const AppBarTheme(
      backgroundColor: NX.bg,
      foregroundColor: NX.text,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: NX.surface,
      indicatorColor: NX.purple.withAlpha(70),
      labelTextStyle: const WidgetStatePropertyAll(
        TextStyle(fontSize: 12, color: NX.text),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
