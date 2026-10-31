package com.masterx.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.masterx.app.BuildConfig
import com.masterx.app.R

@Composable
fun AboutScreen() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.about_title), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.about_version, BuildConfig.VERSION_NAME),
            color = MaterialTheme.colorScheme.secondary,
        )
        Text(stringResource(R.string.about_text), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
