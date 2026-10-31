package org.levimc.launcher.util

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import java.io.File
import java.security.MessageDigest

/**
 * MasterX only runs a genuine Minecraft: the package must come from Google Play and any extra
 * APK must be signed with the same certificate as the installed official game.
 */
object GenuineMinecraft {
    private const val PKG = "com.mojang.minecraftpe"
    private const val PLAY_STORE = "com.android.vending"

    private fun signers(info: PackageInfo?): Set<String> {
        val signing = info?.signingInfo ?: return emptySet()
        val list = signing.apkContentsSigners ?: return emptySet()
        return list.map { sig ->
            MessageDigest.getInstance("SHA-256").digest(sig.toByteArray())
                .joinToString("") { "%02x".format(it) }
        }.toSet()
    }

    /** Returns null when everything is fine, or a readable reason when the copy is not accepted. */
    @Suppress("DEPRECATION")
    fun verify(context: Context, apkFiles: List<File>, importedApk: Boolean): String? {
        val pm = context.packageManager
        val installed = try {
            pm.getPackageInfo(PKG, PackageManager.GET_SIGNING_CERTIFICATES)
        } catch (e: Exception) {
            null
        } ?: return "Minecraft oficial nao esta instalado. Instale pela Google Play."

        val installer = try {
            if (Build.VERSION.SDK_INT >= 30) pm.getInstallSourceInfo(PKG).installingPackageName
            else pm.getInstallerPackageName(PKG)
        } catch (e: Exception) {
            null
        }
        if (installer != PLAY_STORE) {
            return "O Minecraft precisa estar instalado pela Google Play (origem: ${installer ?: "desconhecida"})."
        }

        val trusted = signers(installed)
        if (trusted.isEmpty()) return "Nao foi possivel ler a assinatura do Minecraft instalado."

        if (importedApk) {
            val base = apkFiles.firstOrNull { it.name.contains("base") } ?: apkFiles.firstOrNull()
                ?: return "APK importado nao encontrado."
            val info = pm.getPackageArchiveInfo(base.absolutePath, PackageManager.GET_SIGNING_CERTIFICATES)
                ?: return "Nao foi possivel ler o APK importado (${base.name})."
            if (signers(info) != trusted) {
                return "A assinatura do APK importado nao confere com a do Minecraft oficial."
            }
        }
        return null
    }
}
