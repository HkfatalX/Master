package com.masterx.app.ui

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.masterx.app.R
import com.masterx.app.data.Minecraft

@Composable
fun HomeScreen(refreshKey: Int) {
    val context = LocalContext.current
    val version = remember(refreshKey) { Minecraft.versionName(context) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(stringResource(R.string.home_title), style = MaterialTheme.typography.headlineMedium)
        Text(
            stringResource(R.string.home_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(4.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (version != null) {
                    Text(stringResource(R.string.mc_installed), style = MaterialTheme.typography.titleLarge)
                    Text(
                        stringResource(R.string.mc_version, version),
                        color = MaterialTheme.colorScheme.secondary,
                    )
                    Button(
                        onClick = {
                            if (!Minecraft.launch(context)) {
                                Toast.makeText(context, R.string.play_error, Toast.LENGTH_SHORT).show()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null)
                        Text(stringResource(R.string.btn_play), modifier = Modifier.padding(start = 8.dp))
                    }
                } else {
                    Text(stringResource(R.string.mc_missing), style = MaterialTheme.typography.titleLarge)
                    Text(
                        stringResource(R.string.mc_missing_desc),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(
                        onClick = { Minecraft.openStore(context) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(R.string.btn_store))
                    }
                }
            }
        }
    }
}
