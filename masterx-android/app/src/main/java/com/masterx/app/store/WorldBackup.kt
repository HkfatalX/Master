package com.masterx.app.store

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

data class WorldEntry(val dir: DocumentFile, val name: String)

class WorldBackup(private val context: Context, private val repo: LibraryRepo) {

    fun listWorlds(tree: Uri): List<WorldEntry> {
        var root = DocumentFile.fromTreeUri(context, tree) ?: return emptyList()
        // Accepts the games/com.mojang folder too.
        root.findFile("minecraftWorlds")?.takeIf { it.isDirectory }?.let { root = it }
        return root.listFiles()
            .filter { it.isDirectory }
            .map { dir -> WorldEntry(dir, readName(dir) ?: dir.name ?: "world") }
            .sortedBy { it.name.lowercase() }
    }

    private fun readName(dir: DocumentFile): String? =
        try {
            dir.findFile("levelname.txt")?.let { f ->
                context.contentResolver.openInputStream(f.uri)?.bufferedReader()?.use { it.readText().trim() }
            }?.takeIf { it.isNotEmpty() }
        } catch (e: Exception) {
            null
        }

    /** Zips the world as a .mcworld (files at the zip root) inside the library. */
    fun export(world: WorldEntry): File {
        val out = repo.uniqueFile(ContentType.WORLD, world.name + ".mcworld")
        try {
            ZipOutputStream(out.outputStream().buffered()).use { zip ->
                addDir(zip, world.dir, "")
            }
        } catch (e: Exception) {
            out.delete()
            throw e
        }
        return out
    }

    private fun addDir(zip: ZipOutputStream, dir: DocumentFile, prefix: String) {
        for (child in dir.listFiles()) {
            val name = child.name ?: continue
            if (child.isDirectory) {
                addDir(zip, child, "$prefix$name/")
            } else {
                zip.putNextEntry(ZipEntry(prefix + name))
                context.contentResolver.openInputStream(child.uri)?.use { it.copyTo(zip) }
                zip.closeEntry()
            }
        }
    }
}
