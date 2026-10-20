package com.antigravity.myroutine;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

public class RoutineWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(RoutineWidgetPlugin.PREFS_NAME, Context.MODE_PRIVATE);

        String routineTitle = prefs.getString("routineTitle", "My Routine");
        String currentActivityTitle = prefs.getString("currentActivityTitle", "No active activity");
        String currentActivityTime = prefs.getString("currentActivityTime", "");
        int completedCount = prefs.getInt("completedCount", 0);
        int totalCount = prefs.getInt("totalCount", 0);
        int progressPercent = prefs.getInt("progressPercent", 0);
        String statusText = prefs.getString("statusText", "");
        boolean isAllCompleted = prefs.getBoolean("isAllCompleted", false);
        boolean isSkipped = prefs.getBoolean("isSkipped", false);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.routine_widget_layout);

        // Header Title & Progress Text
        views.setTextViewText(R.id.widget_routine_title, routineTitle);

        if (totalCount > 0) {
            views.setTextViewText(R.id.widget_progress_text, completedCount + "/" + totalCount + " (" + progressPercent + "%)");
            views.setProgressBar(R.id.widget_progress_bar, 100, Math.min(100, Math.max(0, progressPercent)), false);
            views.setViewVisibility(R.id.widget_progress_container, View.VISIBLE);
        } else {
            views.setTextViewText(R.id.widget_progress_text, "");
            views.setViewVisibility(R.id.widget_progress_container, View.GONE);
        }

        // Current Activity display state
        if (isSkipped) {
            views.setTextViewText(R.id.widget_activity_title, "🌴 Routine Skipped Today");
            views.setTextViewText(R.id.widget_activity_time, "Enjoy your holiday/weekend rest!");
            views.setViewVisibility(R.id.widget_status_badge, View.VISIBLE);
            views.setTextViewText(R.id.widget_status_badge, "Skipped");
        } else if (isAllCompleted) {
            views.setTextViewText(R.id.widget_activity_title, "🎉 All Routines Completed!");
            views.setTextViewText(R.id.widget_activity_time, "Great job! Keep the momentum going.");
            views.setViewVisibility(R.id.widget_status_badge, View.VISIBLE);
            views.setTextViewText(R.id.widget_status_badge, "100% Done");
        } else {
            views.setTextViewText(R.id.widget_activity_title, currentActivityTitle);
            views.setTextViewText(R.id.widget_activity_time, currentActivityTime.isEmpty() ? "Tap to open routines" : currentActivityTime);
            if (!statusText.isEmpty()) {
                views.setViewVisibility(R.id.widget_status_badge, View.VISIBLE);
                views.setTextViewText(R.id.widget_status_badge, statusText);
            } else {
                views.setViewVisibility(R.id.widget_status_badge, View.GONE);
            }
        }

        // Click on widget to launch MainActivity
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, RoutineWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
        }
    }
}
