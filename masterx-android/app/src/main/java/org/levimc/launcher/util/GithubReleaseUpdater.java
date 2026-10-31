package org.levimc.launcher.util;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;
import org.levimc.launcher.R;
import org.levimc.launcher.ui.dialogs.CustomAlertDialog;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class GithubReleaseUpdater {
    private static final String TAG = "GithubReleaseUpdater";
    private static final String GITHUB_LATEST_API = "https://api.github.com/repos/%s/%s/releases/latest";
    private static final String APK_ASSET_KEYWORD = ".apk";
    private static final String PREF_IGNORED_VERSION = "update_ignored_version";
    private final Activity activity;
    private final String owner;
    private final String repo;
    private final OkHttpClient client = new OkHttpClient();
    private ActivityResultLauncher<Intent> permissionResultLauncher;

    public GithubReleaseUpdater(Activity activity, String owner, String repo,
                                ActivityResultLauncher<Intent> permissionResultLauncher) {
        this.activity = activity;
        this.owner = owner;
        this.repo = repo;
        this.permissionResultLauncher = permissionResultLauncher;
    }

    public static int compareVersion(String a, String b) {
        a = a.startsWith("v") ? a.substring(1) : a;
        b = b.startsWith("v") ? b.substring(1) : b;
        String[] x = a.split("\\.");
        String[] y = b.split("\\.");
        int len = Math.max(x.length, y.length);
        for (int i = 0; i < len; i++) {
            int vi = i < x.length ? Integer.parseInt(x[i]) : 0;
            int vj = i < y.length ? Integer.parseInt(y[i]) : 0;
            if (vi > vj) return 1;
            if (vi < vj) return -1;
        }
        return 0;
    }

    // One update dialog / download per process: the launcher can be created twice (restart after
    // first draw), which used to stack a second identical dialog under the first one.
    private static final Object LOCK = new Object();
    private static CustomAlertDialog shownDialog;
    private static CustomAlertDialog progressDialog;
    private static boolean launchCheckDone;
    private static boolean downloading;
    private static Call activeCall;

    private static final class Release {
        String tag;
        String apkUrl;
        String notes;
    }

    private Release parseRelease(String body) throws Exception {
        JSONObject json = new JSONObject(body);
        Release r = new Release();
        r.tag = json.getString("tag_name");
        r.notes = json.optString("body", "").trim();
        JSONArray assets = json.getJSONArray("assets");
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.getJSONObject(i);
            if (asset.getString("name").endsWith(APK_ASSET_KEYWORD)) {
                r.apkUrl = asset.getString("browser_download_url");
                break;
            }
        }
        return r;
    }

    private void fetchLatest(boolean manual) {
        String url = String.format(GITHUB_LATEST_API, owner, repo);
        Request request = new Request.Builder().url(url).build();
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Request failed: " + e.getMessage());
                if (manual) toast(activity.getString(R.string.update_failed, String.valueOf(e.getMessage())), true);
            }

            @Override
            public void onResponse(Call call, Response response) {
                try (Response r = response) {
                    if (!r.isSuccessful() || r.body() == null) {
                        if (manual) toast(activity.getString(R.string.update_failed, "HTTP " + r.code()), true);
                        return;
                    }
                    Release rel = parseRelease(r.body().string());
                    if (rel.apkUrl == null) {
                        Log.e(TAG, "No APK asset found in release.");
                        return;
                    }
                    String local = activity.getPackageManager()
                            .getPackageInfo(activity.getPackageName(), 0).versionName;
                    boolean newer = compareVersion(rel.tag, local) > 0;
                    if (!newer) {
                        if (manual) toast(activity.getString(R.string.already_latest_version, local), false);
                        return;
                    }
                    if (!manual) {
                        SharedPreferences prefs = activity.getSharedPreferences("no_update_version", Context.MODE_PRIVATE);
                        if (prefs.getString(PREF_IGNORED_VERSION, "").equals(rel.tag)) return;
                    }
                    showUpdateDialog(rel, !manual);
                } catch (Exception e) {
                    Log.e(TAG, "Parse error: " + e.getMessage());
                }
            }
        });
    }

    public void checkUpdate() {
        fetchLatest(true);
    }

    public void checkUpdateOnLaunch() {
        synchronized (LOCK) {
            if (launchCheckDone) return;
            launchCheckDone = true;
        }
        fetchLatest(false);
    }

    private void toast(String msg, boolean longer) {
        activity.runOnUiThread(() ->
                Toast.makeText(activity, msg, longer ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT).show());
    }

    private String notesText(Release rel) {
        String n = rel.notes == null ? "" : rel.notes.replace("\r", "");
        if (n.length() > 900) n = n.substring(0, 900) + "…";
        return n;
    }

    private void showUpdateDialog(Release rel, boolean withIgnore) {
        activity.runOnUiThread(() -> {
            if (activity.isFinishing() || activity.isDestroyed()) return;
            synchronized (LOCK) {
                if (downloading) return;
                if (shownDialog != null && shownDialog.isShowing()) return;
            }
            CustomAlertDialog dialog = new CustomAlertDialog(activity);
            dialog.setTitleText(activity.getString(R.string.new_version_found, rel.tag));
            String notes = notesText(rel);
            String msg = activity.getString(R.string.update_question);
            if (!notes.isEmpty()) msg = msg + "\n\n" + notes;
            dialog.setMessage(msg);
            dialog.setPositiveButton(activity.getString(R.string.download_update), (d) -> downloadApk(rel.apkUrl));
            dialog.setNegativeButton(activity.getString(R.string.cancel), null);
            if (withIgnore) {
                dialog.setNeutralButton(activity.getString(R.string.ignore_this_version), (d) -> ignoreThisVersion(rel.tag));
            }
            dialog.setOnDismissListener(x -> {
                synchronized (LOCK) {
                    if (shownDialog == dialog) shownDialog = null;
                }
            });
            synchronized (LOCK) {
                shownDialog = dialog;
            }
            dialog.show();
        });
    }

    private void ignoreThisVersion(String version) {
        SharedPreferences prefs = activity.getSharedPreferences("no_update_version", Context.MODE_PRIVATE);
        prefs.edit().putString(PREF_IGNORED_VERSION, version).apply();
        toast(activity.getString(R.string.version_ignored), false);
    }

    private void showProgressDialog() {
        activity.runOnUiThread(() -> {
            synchronized (LOCK) {
                if (shownDialog != null) {
                    try { shownDialog.dismissImmediately(); } catch (Exception ignored) { }
                    shownDialog = null;
                }
            }
            android.widget.LinearLayout box = new android.widget.LinearLayout(activity);
            box.setOrientation(android.widget.LinearLayout.VERTICAL);
            int pad = (int) (20 * activity.getResources().getDisplayMetrics().density);
            box.setPadding(pad, pad / 2, pad, pad / 2);

            android.widget.TextView label = new android.widget.TextView(activity);
            label.setId(android.R.id.text1);
            label.setText(activity.getString(R.string.downloading_update));
            label.setTextColor(activity.getColor(R.color.on_surface));
            label.setTextSize(14);

            android.widget.ProgressBar bar = new android.widget.ProgressBar(activity, null,
                    android.R.attr.progressBarStyleHorizontal);
            bar.setId(android.R.id.progress);
            bar.setIndeterminate(true);
            bar.setMax(100);
            bar.setProgressTintList(android.content.res.ColorStateList.valueOf(activity.getColor(R.color.primary)));
            bar.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(activity.getColor(R.color.primary)));
            android.widget.LinearLayout.LayoutParams lp = new android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.topMargin = pad / 2;
            box.addView(label);
            box.addView(bar, lp);

            CustomAlertDialog dialog = new CustomAlertDialog(activity);
            dialog.setTitleText(activity.getString(R.string.mx_update_downloading_title));
            dialog.setCustomView(box);
            dialog.setNegativeButton(activity.getString(R.string.cancel), (d) -> {
                Call c;
                synchronized (LOCK) { c = activeCall; }
                if (c != null) c.cancel();
            });
            synchronized (LOCK) {
                progressDialog = dialog;
            }
            dialog.show();
        });
    }

    private void updateProgress(int percent, long done, long total) {
        activity.runOnUiThread(() -> {
            CustomAlertDialog d;
            synchronized (LOCK) { d = progressDialog; }
            if (d == null) return;
            android.widget.ProgressBar bar = d.findViewById(android.R.id.progress);
            android.widget.TextView label = d.findViewById(android.R.id.text1);
            if (bar != null) {
                bar.setIndeterminate(false);
                bar.setProgress(percent);
            }
            if (label != null) {
                label.setText(String.format(java.util.Locale.getDefault(), "%d%%  (%.1f / %.1f MB)",
                        percent, done / 1048576f, total / 1048576f));
            }
        });
    }

    private void closeProgress() {
        activity.runOnUiThread(() -> {
            synchronized (LOCK) {
                if (progressDialog != null) {
                    try { progressDialog.dismissImmediately(); } catch (Exception ignored) { }
                    progressDialog = null;
                }
            }
        });
    }

    private void downloadApk(String url) {
        synchronized (LOCK) {
            if (downloading) return;
            downloading = true;
        }
        showProgressDialog();
        Request request = new Request.Builder().url(url).build();
        Call call = client.newCall(request);
        synchronized (LOCK) { activeCall = call; }
        call.enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                finishDownload();
                if (!call.isCanceled()) {
                    toast(activity.getString(R.string.update_failed, String.valueOf(e.getMessage())), true);
                }
            }

            @Override
            public void onResponse(Call call, Response response) {
                File dir = activity.getExternalCacheDir() != null ? activity.getExternalCacheDir() : activity.getCacheDir();
                File part = new File(dir, "update_apk.apk.part");
                File apkFile = new File(dir, "update_apk.apk");
                boolean ok = false;
                try (Response r = response;
                     InputStream is = r.body().byteStream();
                     FileOutputStream fos = new FileOutputStream(part)) {
                    if (!r.isSuccessful()) throw new IOException("HTTP " + r.code());
                    long total = r.body().contentLength();
                    byte[] buf = new byte[16384];
                    int len;
                    long downloaded = 0;
                    long last = 0;
                    int lastPercent = -1;
                    while ((len = is.read(buf)) > 0) {
                        fos.write(buf, 0, len);
                        downloaded += len;
                        long now = System.currentTimeMillis();
                        if (total > 0 && now - last > 120) {
                            int percent = (int) Math.min(100, downloaded * 100 / total);
                            if (percent != lastPercent) {
                                updateProgress(percent, downloaded, total);
                                lastPercent = percent;
                            }
                            last = now;
                        }
                    }
                    fos.flush();
                    if (total > 0 && downloaded != total) throw new IOException("incomplete download");
                    if (total > 0) updateProgress(100, downloaded, total);
                    ok = true;
                } catch (Exception e) {
                    part.delete();
                    if (!call.isCanceled()) {
                        toast(activity.getString(R.string.update_failed, String.valueOf(e.getMessage())), true);
                    }
                }
                finishDownload();
                if (ok) {
                    if (apkFile.exists()) apkFile.delete();
                    if (part.renameTo(apkFile)) {
                        installApk(apkFile);
                    } else {
                        toast(activity.getString(R.string.update_failed, "rename"), true);
                    }
                }
            }
        });
    }

    private void finishDownload() {
        synchronized (LOCK) {
            downloading = false;
            activeCall = null;
        }
        closeProgress();
    }

    private void installApk(File apkFile) {
        PermissionsHandler handler = PermissionsHandler.getInstance();
        handler.setActivity(activity, permissionResultLauncher);
        handler.requestPermission(PermissionsHandler.PermissionType.UNKNOWN_SOURCES,
                new PermissionsHandler.PermissionResultCallback() {
                    @Override
                    public void onPermissionGranted(PermissionsHandler.PermissionType type) {
                        activity.runOnUiThread(() -> {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW);
                                Uri apkUri;
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                    apkUri = FileProvider.getUriForFile(
                                            activity,
                                            activity.getPackageName() + ".fileprovider",
                                            apkFile
                                    );
                                    intent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                                } else {
                                    apkUri = Uri.fromFile(apkFile);
                                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                }
                                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                activity.startActivity(intent);
                            } catch (Exception e) {
                                Toast.makeText(activity, activity.getString(R.string.install_failed, e.getMessage()), Toast.LENGTH_LONG).show();
                            }
                        });
                    }

                    @Override
                    public void onPermissionDenied(PermissionsHandler.PermissionType type, boolean permanentlyDenied) {
                        activity.runOnUiThread(() ->
                                Toast.makeText(activity, activity.getString(R.string.unknown_sources_permission_message), Toast.LENGTH_LONG).show()
                        );
                    }
                }
        );
    }
}