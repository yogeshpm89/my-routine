package com.antigravity.myroutine;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RoutineWidget")
public class RoutineWidgetPlugin extends Plugin {
    public static final String PREFS_NAME = "RoutineWidgetPrefs";

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        String routineTitle = call.getString("routineTitle", "My Routine");
        String currentActivityTitle = call.getString("currentActivityTitle", "No active activity");
        String currentActivityTime = call.getString("currentActivityTime", "");
        Integer completedCount = call.getInt("completedCount", 0);
        Integer totalCount = call.getInt("totalCount", 0);
        Integer progressPercent = call.getInt("progressPercent", 0);
        String statusText = call.getString("statusText", "");
        Boolean isAllCompleted = call.getBoolean("isAllCompleted", false);
        Boolean isSkipped = call.getBoolean("isSkipped", false);

        editor.putString("routineTitle", routineTitle);
        editor.putString("currentActivityTitle", currentActivityTitle);
        editor.putString("currentActivityTime", currentActivityTime);
        editor.putInt("completedCount", completedCount != null ? completedCount : 0);
        editor.putInt("totalCount", totalCount != null ? totalCount : 0);
        editor.putInt("progressPercent", progressPercent != null ? progressPercent : 0);
        editor.putString("statusText", statusText != null ? statusText : "");
        editor.putBoolean("isAllCompleted", isAllCompleted != null && isAllCompleted);
        editor.putBoolean("isSkipped", isSkipped != null && isSkipped);
        editor.putLong("lastUpdated", System.currentTimeMillis());
        editor.apply();

        // Refresh all widget instances on the user's home screen immediately
        RoutineWidgetProvider.updateAllWidgets(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWidgetData(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        JSObject ret = new JSObject();
        ret.put("routineTitle", prefs.getString("routineTitle", "My Routine"));
        ret.put("currentActivityTitle", prefs.getString("currentActivityTitle", "No active activity"));
        ret.put("currentActivityTime", prefs.getString("currentActivityTime", ""));
        ret.put("completedCount", prefs.getInt("completedCount", 0));
        ret.put("totalCount", prefs.getInt("totalCount", 0));
        ret.put("progressPercent", prefs.getInt("progressPercent", 0));
        ret.put("statusText", prefs.getString("statusText", ""));
        ret.put("isAllCompleted", prefs.getBoolean("isAllCompleted", false));
        ret.put("isSkipped", prefs.getBoolean("isSkipped", false));
        ret.put("lastUpdated", prefs.getLong("lastUpdated", 0));

        call.resolve(ret);
    }
}
