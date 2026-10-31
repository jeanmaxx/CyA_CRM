package com.alvasd.cya.crm;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executor;

@CapacitorPlugin(
    name = "CyaMobile",
    permissions = {
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
    }
)
public class CyaMobilePlugin extends Plugin {
    private static final String PREFS = "cya_mobile";
    private static final String PREF_ALARM_IDS = "scheduled_alarm_ids";

    @PluginMethod
    public void getPlatformInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("platform", "android");
        result.put("sdk", Build.VERSION.SDK_INT);
        result.put("appVersion", "1.2.1");
        call.resolve(result);
    }

    @PluginMethod
    public void copyText(PluginCall call) {
        String text = call.getString("text", "");
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("C&A CRM", text));
        JSObject result = new JSObject();
        result.put("copied", true);
        call.resolve(result);
    }

    @PluginMethod
    public void isBiometricAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int status = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK);
        JSObject result = new JSObject();
        result.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
        result.put("status", status);
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!(getActivity() instanceof FragmentActivity)) {
                call.reject("La actividad no admite autenticación biométrica");
                return;
            }
            BiometricManager manager = BiometricManager.from(getContext());
            int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK;
            if (manager.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
                call.reject("Biometría no disponible");
                return;
            }
            Executor executor = ContextCompat.getMainExecutor(getContext());
            BiometricPrompt prompt = new BiometricPrompt((FragmentActivity) getActivity(), executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        JSObject data = new JSObject();
                        data.put("authenticated", true);
                        call.resolve(data);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        JSObject data = new JSObject();
                        data.put("authenticated", false);
                        data.put("cancelled", errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON || errorCode == BiometricPrompt.ERROR_USER_CANCELED || errorCode == BiometricPrompt.ERROR_CANCELED);
                        data.put("message", String.valueOf(errString));
                        call.resolve(data);
                    }
                });
            String subtitle = call.getString("subtitle", "Confirma tu identidad para abrir C&A CRM");
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Acceso a C&A CRM")
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(authenticators)
                .setNegativeButtonText("Usar contraseña")
                .build();
            prompt.authenticate(info);
        });
    }

    @PluginMethod
    public void openRenapo(PluginCall call) {
        String curp = call.getString("curp", "").trim().toUpperCase();
        if (curp.length() != 18) {
            call.reject("La CURP debe tener 18 caracteres");
            return;
        }
        ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("CURP", curp));
        Intent intent = new Intent(getContext(), RenapoActivity.class);
        intent.putExtra("curp", curp);
        startActivityForResult(call, intent, "renapoResult");
    }

    @ActivityCallback
    private void renapoResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        JSObject payload = new JSObject();
        if (result.getResultCode() == android.app.Activity.RESULT_OK && data != null) {
            payload.put("verified", true);
            payload.put("name", data.getStringExtra("verified_name"));
            payload.put("curp", data.getStringExtra("curp"));
        } else {
            payload.put("verified", false);
            payload.put("cancelled", true);
        }
        call.resolve(payload);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        if (getPermissionState("notifications") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("notifications") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void scheduleNotifications(PluginCall call) {
        JSArray list = call.getArray("notifications", new JSArray());
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> oldIds = prefs.getStringSet(PREF_ALARM_IDS, new HashSet<>());
        for (String value : new HashSet<>(oldIds)) {
            try {
                int id = Integer.parseInt(value);
                Intent intent = new Intent(getContext(), NotificationReceiver.class);
                PendingIntent pending = PendingIntent.getBroadcast(getContext(), id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                alarmManager.cancel(pending);
            } catch (Exception ignored) {}
        }

        Set<String> newIds = new HashSet<>();
        int scheduled = 0;
        for (int i = 0; i < list.length(); i++) {
            try {
                JSONObject item = list.getJSONObject(i);
                int id = item.optInt("id", 10000 + i);
                long at = item.optLong("at", 0L);
                if (at <= System.currentTimeMillis() + 5000L) continue;
                Intent intent = new Intent(getContext(), NotificationReceiver.class);
                intent.putExtra("notification_id", id);
                intent.putExtra("title", item.optString("title", "C&A CRM"));
                intent.putExtra("body", item.optString("body", "Tienes una actividad pendiente"));
                intent.putExtra("deep_link", item.optString("deepLink", "dashboard"));
                intent.putExtra("channel", item.optString("channel", "agenda"));
                PendingIntent pending = PendingIntent.getBroadcast(getContext(), id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
                newIds.add(String.valueOf(id));
                scheduled++;
            } catch (Exception ignored) {}
        }
        prefs.edit().putStringSet(PREF_ALARM_IDS, newIds).apply();
        JSObject result = new JSObject();
        result.put("scheduled", scheduled);
        call.resolve(result);
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        int id = call.getInt("id", (int) (System.currentTimeMillis() % 100000));
        NotificationReceiver.show(
            getContext(),
            id,
            call.getString("title", "C&A CRM"),
            call.getString("body", "Tienes una actualización"),
            call.getString("deepLink", "dashboard"),
            call.getString("channel", "general")
        );
        call.resolve();
    }

    @PluginMethod
    public void getPendingAction(PluginCall call) {
        String deepLink = getActivity().getIntent().getStringExtra("cya_deep_link");
        JSObject result = new JSObject();
        result.put("deepLink", deepLink == null ? "" : deepLink);
        if (deepLink != null) getActivity().getIntent().removeExtra("cya_deep_link");
        call.resolve(result);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        String deepLink = intent == null ? null : intent.getStringExtra("cya_deep_link");
        if (deepLink != null && !deepLink.isEmpty()) {
            JSObject data = new JSObject();
            data.put("deepLink", deepLink);
            notifyListeners("notificationAction", data, true);
        }
    }

    @PluginMethod
    public void saveBase64File(PluginCall call) {
        String dataUrl = call.getString("dataUrl", "");
        String fileName = call.getString("fileName", "documento.pdf").replaceAll("[^a-zA-Z0-9._ -]", "_");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (dataUrl.isEmpty() || !dataUrl.contains(",")) {
            call.reject("El archivo no contiene datos válidos");
            return;
        }
        try {
            String base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            JSObject result = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/CyA CRM");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("Android no pudo crear el archivo");
                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("Android no pudo abrir el archivo");
                    out.write(bytes);
                }
                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);
                result.put("uri", uri.toString());
                result.put("location", "Downloads/CyA CRM/" + fileName);
            } else {
                File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) dir = getContext().getFilesDir();
                File file = new File(dir, fileName);
                try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
                result.put("uri", Uri.fromFile(file).toString());
                result.put("location", file.getAbsolutePath());
            }
            result.put("saved", true);
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo guardar el archivo: " + error.getMessage());
        }
    }

    @PluginMethod
    public void shareWhatsApp(PluginCall call) {
        String text = call.getString("text", "");
        String phone = call.getString("phone", "").replaceAll("\\D", "");
        String dataUrl = call.getString("dataUrl", "");
        try {
            if (!dataUrl.isEmpty() && dataUrl.contains(",")) {
                String base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                File dir = new File(getContext().getCacheDir(), "share");
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, call.getString("fileName", "cya-crm.png"));
                try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".files", file);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("image/png");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.putExtra(Intent.EXTRA_TEXT, text);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                String pkg = installedWhatsAppPackage();
                if (pkg != null) send.setPackage(pkg);
                getActivity().startActivity(Intent.createChooser(send, "Compartir por WhatsApp"));
            } else {
                String number = phone.length() == 10 ? "52" + phone : phone;
                Uri uri = Uri.parse("https://wa.me/" + number + (text.isEmpty() ? "" : "?text=" + Uri.encode(text)));
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                String pkg = installedWhatsAppPackage();
                if (pkg != null) intent.setPackage(pkg);
                getActivity().startActivity(intent);
            }
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("manualSend", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo abrir WhatsApp: " + error.getMessage());
        }
    }

    private String installedWhatsAppPackage() {
        String[] packages = {"com.whatsapp.w4b", "com.whatsapp"};
        for (String pkg : packages) {
            try {
                getContext().getPackageManager().getPackageInfo(pkg, 0);
                return pkg;
            } catch (Exception ignored) {}
        }
        return null;
    }

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (url == null) return null;
        String host = url.getHost() == null ? "" : url.getHost().toLowerCase();
        String scheme = url.getScheme() == null ? "" : url.getScheme().toLowerCase();
        if ("whatsapp".equals(scheme) || host.equals("wa.me") || host.endsWith("whatsapp.com")) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, url);
                String pkg = installedWhatsAppPackage();
                if (pkg != null) intent.setPackage(pkg);
                getActivity().startActivity(intent);
                return true;
            } catch (Exception ignored) { return false; }
        }
        return null;
    }
}
