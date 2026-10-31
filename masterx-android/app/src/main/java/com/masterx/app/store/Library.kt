package com.masterx.app.store

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import com.masterx.app.R
import java.io.File

enum class ContentType(val folder: String, val labelRes: Int) {
    WORLD("worlds", R.string.type_world),
    PACK("packs", R.string.type_pack),
    ADDON("addons", R.string.type_addon),
    TEMPLATE("templates", R.string.type_template),
    OTHER("other", R.string.type_other);

    companion object {
        fun fromName(name: String): ContentType =
            when (name.substringAfterLast('.', "").lowercase()) {
                "mcworld" -> WORLD
                "mcpack" -> PACK
                "mcaddon" -> ADDON
                "mctemplate" -> TEMPLATE
                else -> OTHER
            }
    }
}

data class LibraryItem(
    val file: File,
    val type: ContentType,
    val sizeBytes: Long,
)

class LibraryRepo(private val context: Context) {

    private val root: File
        get() = File(context.filesDir, "library").apply { mkdirs() }

    fun dirFor(type: ContentType): File = File(root, type.folder).apply { mkdirs() }

    fun list(): List<LibraryItem> =
        ContentType.values().flatMap { type ->
            (dirFor(type).listFiles() ?: emptyArray())
                .filter { it.isFile }
                .sortedByDescending { it.lastModified() }
                .map { LibraryItem(it, type, it.length()) }
        }

    fun uniqueFile(type: ContentType, rawName: String): File {
        val safe = rawName.replace(Regex("[\\\\/:*?\"<>|]"), "_").ifBlank { "arquivo" }
        val base = safe.substringBeforeLast('.', safe)
        val ext = safe.substringAfterLast('.', "")
        val dir = dirFor(type)
        var candidate = File(dir, safe)
        var n = 1
        while (candidate.exists()) {
            val suffix = " ($n)"
            candidate = File(dir, if (ext.isEmpty()) base + suffix else "$base$suffix.$ext")
            n++
        }
        return candidate
    }

    /** Copies a file chosen by the user into the organized library folders. */
    fun importUri(uri: Uri): File? {
        return try {
            val name = displayName(uri) ?: "arquivo"
            val out = uniqueFile(ContentType.fromName(name), name)
            context.contentResolver.openInputStream(uri)?.use { input ->
                out.outputStream().use { input.copyTo(it) }
            } ?: return null
            out
        } catch (e: Exception) {
            null
        }
    }

    fun delete(file: File): Boolean = file.delete()

    fun uriFor(file: File): Uri =
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)

    private fun displayName(uri: Uri): String? =
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
}
