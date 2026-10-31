package com.masterx.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.masterx.app.store.LibraryRepo
import com.masterx.app.ui.AboutScreen
import com.masterx.app.ui.HomeScreen
import com.masterx.app.ui.LibraryScreen
import com.masterx.app.ui.MasterXTheme
import com.masterx.app.ui.WorldsScreen

class MainActivity : ComponentActivity() {

    private var resumeTick by mutableIntStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MasterXTheme {
                MasterXApp(resumeTick)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumeTick++
    }
}

private enum class Tab(val titleRes: Int, val icon: ImageVector) {
    HOME(R.string.tab_home, Icons.Filled.Home),
    LIBRARY(R.string.tab_library, Icons.Filled.Menu),
    WORLDS(R.string.tab_worlds, Icons.Filled.Favorite),
    ABOUT(R.string.tab_about, Icons.Filled.Info),
}

@Composable
private fun MasterXApp(resumeTick: Int) {
    val context = LocalContext.current
    val repo = remember { LibraryRepo(context) }
    var tab by rememberSaveable { mutableStateOf(Tab.HOME.ordinal) }
    var libraryVersion by remember { mutableIntStateOf(0) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.values().forEach { t ->
                    NavigationBarItem(
                        selected = tab == t.ordinal,
                        onClick = { tab = t.ordinal },
                        icon = { Icon(t.icon, contentDescription = null) },
                        label = { Text(stringResource(t.titleRes)) },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (Tab.values()[tab]) {
                Tab.HOME -> HomeScreen(resumeTick)
                Tab.LIBRARY -> LibraryScreen(repo, libraryVersion) { libraryVersion++ }
                Tab.WORLDS -> WorldsScreen(repo) { libraryVersion++ }
                Tab.ABOUT -> AboutScreen()
            }
        }
    }
}
