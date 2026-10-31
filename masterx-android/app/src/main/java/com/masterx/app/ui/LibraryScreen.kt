package com.masterx.app.ui

import android.text.format.Formatter
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.masterx.app.R
import com.masterx.app.data.LibraryItem
import com.masterx.app.data.LibraryRepo
import com.masterx.app.data.Minecraft
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LibraryScreen(repo: LibraryRepo, version: Int, onChanged: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var toDelete by remember { mutableStateOf<LibraryItem?>(null) }
    val items = remember(version) { repo.list() }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        scope.launch {
            val count = withContext(Dispatchers.IO) { uris.count { repo.importUri(it) != null } }
            val msg = if (count > 0) context.getString(R.string.lib_imported, count)
            else context.getString(R.string.lib_import_none)
            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
            onChanged()
        }
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                stringResource(R.string.lib_title),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(top = 8.dp),
            )
            Button(onClick = { picker.launch(arrayOf("*/*")) }) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text(stringResource(R.string.btn_import), modifier = Modifier.padding(start = 6.dp))
            }
        }

        if (items.isEmpty()) {
            Text(
                stringResource(R.string.lib_empty),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 24.dp),
            )
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(top = 12.dp),
            ) {
                items(items, key = { it.file.absolutePath }) { item ->
                    ItemCard(
                        item = item,
                        onOpen = {
                            if (!Minecraft.openFile(context, repo, item.file)) {
                                Toast.makeText(context, R.string.open_error, Toast.LENGTH_SHORT).show()
                            }
                        },
                        onShare = { Minecraft.share(context, repo, item.file) },
                        onDelete = { toDelete = item },
                    )
                }
            }
        }
    }

    toDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { toDelete = null },
            title = { Text(stringResource(R.string.delete_title)) },
            text = { Text(stringResource(R.string.delete_text, item.file.name)) },
            confirmButton = {
                TextButton(onClick = {
                    repo.delete(item.file)
                    toDelete = null
                    onChanged()
                }) { Text(stringResource(R.string.confirm)) }
            },
            dismissButton = {
                TextButton(onClick = { toDelete = null }) { Text(stringResource(R.string.cancel)) }
            },
        )
    }
}

@Composable
private fun ItemCard(
    item: LibraryItem,
    onOpen: () -> Unit,
    onShare: () -> Unit,
    onDelete: () -> Unit,
) {
    val context = LocalContext.current
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(
                item.file.name,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                stringResource(item.type.labelRes) + " • " + Formatter.formatShortFileSize(context, item.sizeBytes),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.secondary,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 6.dp)) {
                TextButton(onClick = onOpen) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null)
                    Text(stringResource(R.string.btn_open_mc), modifier = Modifier.padding(start = 4.dp))
                }
                IconButton(onClick = onShare) {
                    Icon(Icons.Filled.Share, contentDescription = stringResource(R.string.btn_share))
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Filled.Delete, contentDescription = stringResource(R.string.btn_delete))
                }
            }
        }
    }
}
