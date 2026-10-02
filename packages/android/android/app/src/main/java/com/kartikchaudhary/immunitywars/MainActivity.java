package com.kartikchaudhary.immunitywars;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * THE BACK GESTURE GOES TO THE GAME FIRST (docs/LOOK_PLAN.md section 26).
     *
     * The game's screens are steps in the page's own history: opening one adds a step, and the
     * browser's back takes it away (packages/ui/src/nav). Left as Capacitor has it, Android's back
     * gesture never reaches the page: measured on the S25 on 2 October 2026, back inside How to
     * play put the phone on its home screen.
     *
     * So: while the page has a step to go back, back is the page's. When it has none, which is
     * the title, the app steps aside as Home would, and is not closed: a game in hand is still
     * there when the player comes back.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        WebView page = getBridge().getWebView();
                        if (page.canGoBack()) {
                            page.goBack();
                        } else {
                            moveTaskToBack(true);
                        }
                    }
                }
            );
    }
}
