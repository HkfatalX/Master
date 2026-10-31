package com.masterx.app.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.masterx.app.R
import com.masterx.app.data.LibraryRepo
import com.masterx.app.data.WorldBackup
import com.masterx.app.data.WorldEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val PREFS = "masterx"
private const val KEY_TREE = "worlds_tree"

private fun savedTree(context: Context): Uri? =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TREE, null)?.let { Uri.parse(it) }

@Composable
fun WorldsScreen(repo: LibraryRepo, onChanged: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val backup = remember { WorldBackup(context, repo) }

    var tree by remember { mutableStateOf(savedTree(context)) }
    var worlds by remember { mutableStateOf<List<WorldEntry>?>(null) }
    var busyName by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(tree) {
        val t = tree
        worlds = if (t == null) null else withContext(Dispatchers.IO) {
            try {
                backup.listWorlds(t)
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    val folderPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            try {
                context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            } catch (e: Exception) {
                // permission may already be persisted
            }
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TREE, uri.toString()).apply()
            tree = uri
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(stringResource(R.string.worlds_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.worlds_intro),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(
            stringResource(R.string.worlds_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp, bottom = 12.dp),
        )

        if (tree == null) {
            Button(onClick = { folderPicker.launch(null) }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.btn_pick_folder))
            }
        } else {
            OutlinedButton(onClick = { folderPicker.launch(null) }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.btn_change_folder))
            }
            val list = worlds
            if (list != null && list.isEmpty()) {
                Text(
                    stringResource(R.string.worlds_none),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 16.dp),
                )
            }
            if (!list.isNullOrEmpty()) {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(top = 12.dp),
                ) {
                    items(list, key = { it.dir.uri.toString() }) { world ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(14.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    world.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f).padding(end = 8.dp),
                                )
                                Button(
                                    enabled = busyName == null,
                                    onClick = {
                                        busyName = world.name
                                        Toast.makeText(
                                            context,
                                            context.getString(R.string.backup_working, world.name),
                                            Toast.LENGTH_SHORT,
                                        ).show()
                                        scope.launch {
                                            val result = withContext(Dispatchers.IO) {
                                                try {
                                                    backup.export(world).name
                                                } catch (e: Exception) {
                                                    null
                                                }
                                            }
                                            busyName = null
                                            val msg = if (result != null) context.getString(R.string.backup_done, result)
                                            else context.getString(R.string.backup_error)
                                            Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                            onChanged()
                                        }
                                    },
                                ) { Text(stringResource(R.string.btn_backup)) }
                            }
                        }
                    }
                }
            }
        }
    }
}
