package com.alvasd.cya.crm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class NotificationReceiver extends BroadcastReceiver {
    private static final String CHANNEL_AGENDA = "cya_agenda";
    private static final String CHANNEL_BIRTHDAY = "cya_birthdays";
    private static final String CHANNEL_GENERAL = "cya_general";

    @Override
    public void onReceive(Context context, Intent intent) {
        show(
            context,
            intent.getIntExtra("notification_id", (int) (System.currentTimeMillis() % 100000)),
            intent.getStringExtra("title"),
            intent.getStringExtra("body"),
            intent.getStringExtra("deep_link"),
            intent.getStringExtra("channel")
        );
    }

    public static void show(Context context, int id, String title, String body, String deepLink, String channelType) {
        createChannels(context);
        String channel = "birthday".equals(channelType) ? CHANNEL_BIRTHDAY : "agenda".equals(channelType) ? CHANNEL_AGENDA : CHANNEL_GENERAL;
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("cya_deep_link", deepLink == null ? "dashboard" : deepLink);
        PendingIntent pending = PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channel)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(title == null || title.isEmpty() ? "C&A CRM" : title)
            .setContentText(body == null ? "" : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pending);
        try { NotificationManagerCompat.from(context).notify(id, builder.build()); } catch (SecurityException ignored) {}
    }

    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel agenda = new NotificationChannel(CHANNEL_AGENDA, "Agenda y citas", NotificationManager.IMPORTANCE_HIGH);
        agenda.setDescription("Recordatorios de citas y actividades del CRM");
        agenda.enableVibration(true);
        NotificationChannel birthdays = new NotificationChannel(CHANNEL_BIRTHDAY, "Cumpleaños", NotificationManager.IMPORTANCE_DEFAULT);
        birthdays.setDescription("Avisos de cumpleaños de clientes");
        NotificationChannel general = new NotificationChannel(CHANNEL_GENERAL, "Nuevos leads y avisos", NotificationManager.IMPORTANCE_HIGH);
        general.setDescription("Nuevos prospectos y avisos importantes del CRM");
        manager.createNotificationChannel(agenda);
        manager.createNotificationChannel(birthdays);
        manager.createNotificationChannel(general);
    }
}
