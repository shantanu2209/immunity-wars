package com.kartikchaudhary.immunitywars;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        keepTheGamesOwnTextSize();
        giveBackToTheGameFirst();
    }

    /**
     * THE GAME'S TEXT IS THE SIZE THE GAME SETS, NOT THE PHONE'S (ruled by Shantanu, 2 October
     * 2026; docs/LOOK_PLAN.md section 26).
     *
     * An Android web view scales every word by the phone's own font-size setting. Measured on the
     * S25, whose setting is 0.8: one rem was 12.8 px inside the app and 16 px in the browser, so
     * the app was a fifth smaller than the web version of the same screens. The game has a
     * text-size setting of its own, in Settings, and the screens are measured at its sizes, to
     * 200%. The two would multiply, past anything that has been measured.
     *
     * So the web view is told 100: the app looks as the web version does, and the game's own
     * setting is the one control.
     */
    private void keepTheGamesOwnTextSize() {
        getBridge().getWebView().getSettings().setTextZoom(100);
    }

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
    private void giveBackToTheGameFirst() {
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
