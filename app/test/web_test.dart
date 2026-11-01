import 'package:flutter_test/flutter_test.dart';
import 'package:nexus_cloud/data/providers.dart';
import 'package:nexus_cloud/player/web_guard.dart';

void main() {
  group('isAllowedNavigation', () {
    test('aceita o mesmo site e subdomínios, com ou sem www', () {
      expect(isAllowedNavigation('https://lichess.org/abc', 'lichess.org'), isTrue);
      expect(isAllowedNavigation('https://www.lichess.org/', 'lichess.org'), isTrue);
      expect(isAllowedNavigation('https://cdn.lichess.org/x', 'lichess.org'), isTrue);
      expect(isAllowedNavigation('https://lichess.org/', 'www.lichess.org'), isTrue);
    });

    test('bloqueia outros sites, http e esquemas estranhos', () {
      expect(isAllowedNavigation('https://evil.com/', 'lichess.org'), isFalse);
      expect(isAllowedNavigation('https://lichess.org.evil.com/', 'lichess.org'), isFalse);
      expect(isAllowedNavigation('https://notlichess.org/', 'lichess.org'), isFalse);
      expect(isAllowedNavigation('http://lichess.org/', 'lichess.org'), isFalse);
      expect(isAllowedNavigation('intent://x#Intent;end', 'lichess.org'), isFalse);
      expect(isAllowedNavigation('javascript:alert(1)', 'lichess.org'), isFalse);
      expect(isAllowedNavigation('', 'lichess.org'), isFalse);
    });

    test('about:blank é permitido', () {
      expect(isAllowedNavigation('about:blank', 'lichess.org'), isTrue);
    });
  });

  test('provedores: endereços https e nenhum custo escondido', () {
    for (final p in kProviders) {
      expect(p.site.startsWith('https://'), isTrue, reason: p.name);
      expect(p.costNote, isNotEmpty);
      expect(p.limits, isNotEmpty);
    }
    expect(kProviders.where((p) => p.cost == ProviderCost.paid), isNotEmpty);
  });
}
