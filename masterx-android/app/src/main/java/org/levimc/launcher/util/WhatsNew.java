package org.levimc.launcher.util;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;

import org.levimc.launcher.R;
import org.levimc.launcher.ui.dialogs.CustomAlertDialog;

/** Shows the "what's new" sheet once after the launcher was updated to a different version. */
public final class WhatsNew {
    private static final String PREFS = "masterx_prefs";
    private static final String KEY_SEEN = "last_seen_version";
    private static boolean shownThisProcess;

    private WhatsNew() {}

    public static void showIfUpdated(Activity activity) {
        if (shownThisProcess || activity.isFinishing() || activity.isDestroyed()) return;
        String current;
        try {
            current = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return;
        }
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String seen = prefs.getString(KEY_SEEN, null);
        if (current == null || current.equals(seen)) return;
        shownThisProcess = true;
        // No stored version: a fresh install gets no sheet; an in-place update (older builds
        // never stored the version) does.
        if (seen == null && !wasUpdated(activity)) {
            prefs.edit().putString(KEY_SEEN, current).apply();
            return;
        }
        show(activity, current, prefs);
    }

    private static boolean wasUpdated(Activity a) {
        try {
            android.content.pm.PackageInfo pi = a.getPackageManager().getPackageInfo(a.getPackageName(), 0);
            return pi.lastUpdateTime - pi.firstInstallTime > 60_000L;
        } catch (Exception e) {
            return false;
        }
    }

    public static void show(Activity activity, String version, SharedPreferences prefs) {
        CustomAlertDialog dialog = new CustomAlertDialog(activity);
        dialog.setTitleText(activity.getString(R.string.mx_whats_new_title, version));
        dialog.setMessage(activity.getString(R.string.mx_whats_new_body));
        dialog.setPositiveButton(activity.getString(R.string.mx_whats_new_ok), (d) -> { });
        dialog.setOnDismissListener(x -> prefs.edit().putString(KEY_SEEN, version).apply());
        dialog.show();
    }
}
