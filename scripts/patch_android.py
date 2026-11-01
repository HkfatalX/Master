#!/usr/bin/env python3
"""Ajusta o AndroidManifest.xml gerado por `flutter create`.

- Permissões: INTERNET e VIBRATE (o manifesto principal do Flutter não traz INTERNET).
- <queries>: pacotes de jogos/emuladores que o app pode abrir.
- Nome do app: NEXUS CLOUD.

Uso: python3 scripts/patch_android.py app/android/app/src/main/AndroidManifest.xml
"""
import re
import sys
from pathlib import Path

PERMISSIONS = [
    "android.permission.INTERNET",
    "android.permission.VIBRATE",
]

# Mantenha em sincronia com app/lib/data/catalog.dart
PACKAGES = [
    "org.supertuxkart.stk",
    "io.anuke.mindustry",
    "org.openttd.openttd",
    "org.ppsspp.ppsspp",
    "com.github.stenzek.duckstation",
    "org.dolphinemu.dolphinemu",
    "com.retroarch",
    "com.valvesoftware.android.steam.community",
    "com.microsoft.xboxone.smartglass",
    "com.scee.psxandroid",
    "com.epicgames.portal",
    "com.roblox.client",
    "com.nvidia.geforcenow",
]


def main() -> int:
    path = Path(sys.argv[1])
    text = path.read_text(encoding="utf-8")
    if "<application" not in text:
        print("AndroidManifest.xml sem <application>; nada feito", file=sys.stderr)
        return 1

    add = ""
    for perm in PERMISSIONS:
        if perm not in text:
            add += f'    <uses-permission android:name="{perm}"/>\n'

    if "org.ppsspp.ppsspp" not in text:
        add += "    <queries>\n"
        for pkg in PACKAGES:
            add += f'        <package android:name="{pkg}"/>\n'
        add += "    </queries>\n"

    text = text.replace("<application", add + "    <application", 1)
    text = re.sub(r'android:label="[^"]*"', 'android:label="NEXUS CLOUD"', text, count=1)
    # Emulador embutido: servidor local em 127.0.0.1 usa http; libera só esse endereço.
    if "networkSecurityConfig" not in text:
        text = text.replace(
            "<application",
            '<application android:networkSecurityConfig="@xml/network_security_config"',
            1,
        )
    xml_dir = path.parent / "res" / "xml"
    xml_dir.mkdir(parents=True, exist_ok=True)
    (xml_dir / "network_security_config.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<network-security-config>\n"
        '    <domain-config cleartextTrafficPermitted="true">\n'
        '        <domain includeSubdomains="false">127.0.0.1</domain>\n'
        "    </domain-config>\n"
        "</network-security-config>\n",
        encoding="utf-8",
    )
    path.write_text(text, encoding="utf-8")
    print("Manifesto ajustado:", path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
