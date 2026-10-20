package com.antigravity.myroutine;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RoutineWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
