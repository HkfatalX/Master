package org.levimc.launcher.ui.activities

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.TextView
import androidx.core.content.FileProvider
import org.levimc.launcher.R
import org.levimc.launcher.core.crash.CrashReporter
import org.levimc.launcher.ui.animation.DynamicAnim
import java.io.File
import java.util.concurrent.Executors

class CrashActivity : BaseActivity() {

    private var executor = Executors.newSingleThreadExecutor()
    private var logPath: String? = null
    private var condensedText: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_crash)

        logPath = intent.getStringExtra("LOG_PATH")
        val summary = intent.getStringExtra("SUMMARY")
            ?: intent.getStringExtra("EMERGENCY")
        val crashType = intent.getStringExtra("CRASH_TYPE")
        CrashReporter.sendUnsentReports()

        val tvTitle = findViewById<TextView>(R.id.crash_title)
        val tvDetails = findViewById<TextView>(R.id.crash_details)
        val btnBack = findViewById<Button>(R.id.btn_back_to_main)
        val btnShare = findViewById<Button>(R.id.btn_share_log)
        DynamicAnim.applyPressScale(btnBack)
        DynamicAnim.applyPressScale(btnShare)

        tvTitle.text = getString(R.string.crash_title)

        tvDetails.text = buildString {
            appendHeader(crashType, summary)
            if (!logPath.isNullOrBlank()) {
                append(getString(R.string.crash_log_file_label)).append("\n")
                append(logPath).append("\n\n")
            }
            append(getString(R.string.crash_loading_details))
        }

        btnBack.setOnClickListener {
            navigateToMain()
        }
        
        findViewById<Button>(R.id.btn_copy_log).apply {
            DynamicAnim.applyPressScale(this)
            setOnClickListener {
                val text = condensedText.ifBlank { tvDetails.text.toString() }
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("MasterX log", text.take(20000)))
                Toast.makeText(this@CrashActivity, R.string.mx_log_copied, Toast.LENGTH_SHORT).show()
            }
        }

        btnShare.setOnClickListener {
            shareLogFile()
        }

        Handler(Looper.getMainLooper()).postDelayed({
            loadCrashDetails(tvDetails, crashType, summary)
        }, 100)
        Handler(Looper.getMainLooper()).postDelayed({
            CrashReporter.sendUnsentReports()
        }, 2000)
    }

    override fun shouldSkipNavBar(): Boolean = true

    private fun loadCrashDetails(tvDetails: TextView, crashType: String?, summary: String?) {
        if (isFinishing || isDestroyed) return

        executor.execute {
            val detailsText = buildString {
                appendHeader(crashType, summary)

                if (!logPath.isNullOrEmpty()) {
                    append(getString(R.string.crash_log_file_label)).append("\n")
                    append(logPath).append("\n\n")
                    append(getString(R.string.crash_stack_label)).append("\n")
                    try {
                        val f = File(logPath!!)
                        if (f.exists() && f.isFile) {
                            val content = condense(f.readText())
                            val maxLength = 12000
                            if (content.length > maxLength) {
                                append(content.substring(0, maxLength))
                                append("\n\n... [truncated, full log in file] ...")
                            } else {
                                append(content)
                            }
                        } else {
                            append(getString(R.string.crash_log_file_missing)).append("\n")
                        }
                    } catch (e: Exception) {
                        append(getString(R.string.crash_read_failed, e.message)).append("\n")
                    }
                }
                if (isEmpty()) {
                    append(getString(R.string.crash_no_details))
                }
            }

            if (!isFinishing && !isDestroyed) {
                condensedText = detailsText
                runOnUiThread {
                    tvDetails.text = detailsText
                }
            }
        }
    }

    // Drops the huge /proc/self/maps dump (lines like "7627e9f000-7627eef000 r-- ...")
    // so the useful part (signal, abort message, backtrace, launch steps) stays short.
    private fun condense(raw: String): String {
        val map = Regex("^\\s*[0-9a-f]{8,}-[0-9a-f]{8,}\\s+[r-][w-][x-][ps-]\\s.*$")
        val kept = raw.lineSequence().filterNot { map.matches(it) }.toList()
        val dropped = raw.lineSequence().count() - kept.size
        return kept.joinToString("\n") + if (dropped > 0) "\n\n[$dropped linhas de mapa de memoria omitidas]" else ""
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun StringBuilder.appendHeader(crashType: String?, summary: String?) {
        if (!crashType.isNullOrBlank()) {
            append(getString(R.string.crash_type_label)).append("\n")
            append(crashType).append("\n\n")
        }
        if (!summary.isNullOrBlank()) {
            append(getString(R.string.crash_summary_label)).append("\n")
            append(summary).append("\n\n")
        }
    }

    private fun navigateToMain() {
        try {
            val intent = Intent(this, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            startActivity(intent)
            finish()
        } catch (ignored: Exception) {
            finish()
        }
    }

    private fun shareLogFile() {
        val path = logPath ?: return
        try {
            val logFile = File(path)
            if (logFile.exists()) {
                val shareFile = copyLogToShareCache(logFile)
                val logFileUri = FileProvider.getUriForFile(
                    this,
                    packageName + ".fileprovider",
                    shareFile
                )
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_STREAM, logFileUri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(shareIntent, shareFile.name))
            }
        } catch (e: Exception) {
        }
    }

    private fun copyLogToShareCache(logFile: File): File {
        val shareDir = File(cacheDir, "crash_logs_share")
        if (!shareDir.exists()) shareDir.mkdirs()
        val shareFile = File(shareDir, logFile.name)
        logFile.copyTo(shareFile, overwrite = true)
        return shareFile
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            executor.shutdownNow()
        } catch (ignored: Exception) {}
    }
}
