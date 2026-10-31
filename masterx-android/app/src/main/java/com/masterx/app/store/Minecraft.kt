package com.masterx.app.store

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import java.io.File

object Minecraft {
    const val PACKAGE = "com.mojang.minecraftpe"

    fun versionName(context: Context): String? =
        try {
            context.packageManager.getPackageInfo(PACKAGE, 0).versionName
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }

    fun launch(context: Context): Boolean {
        val intent = context.packageManager.getLaunchIntentForPackage(PACKAGE) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun openStore(context: Context) {
        val market = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$PACKAGE"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(market)
        } catch (e: ActivityNotFoundException) {
            context.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$PACKAGE"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }
    }

    /** Sends a pack/world/addon to Minecraft, which imports it by itself. */
    fun openFile(context: Context, repo: LibraryRepo, file: File): Boolean {
        val uri = repo.uriFor(file)
        val base = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/octet-stream")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(Intent(base).setPackage(PACKAGE))
            true
        } catch (e: Exception) {
            try {
                context.startActivity(
                    Intent.createChooser(base, null)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                )
                true
            } catch (e2: Exception) {
                false
            }
        }
    }

    fun share(context: Context, repo: LibraryRepo, file: File) {
        val send = Intent(Intent.ACTION_SEND)
            .setType("application/octet-stream")
            .putExtra(Intent.EXTRA_STREAM, repo.uriFor(file))
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(
            Intent.createChooser(send, null)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        )
    }
}
