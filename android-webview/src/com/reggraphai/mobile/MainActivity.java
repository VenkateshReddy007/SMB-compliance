package com.reggraphai.mobile;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String PREFS = "reggraph_ai";
    private static final String URL_KEY = "web_url";

    private WebView webView;
    private LinearLayout setupPanel;
    private EditText urlInput;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 6, 0));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setupPanel = buildSetupPanel();
        root.addView(setupPanel, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setContentView(root);
        configureWebView();

        String savedUrl = prefs.getString(URL_KEY, getString(R.string.default_web_url));
        urlInput.setText(savedUrl);
        loadUrl(savedUrl);
    }

    private LinearLayout buildSetupPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(24), dp(64), dp(24), dp(24));
        panel.setBackgroundColor(Color.rgb(8, 6, 0));

        TextView title = new TextView(this);
        title.setText("RegGraph AI");
        title.setTextColor(Color.rgb(251, 146, 60));
        title.setTextSize(28);
        title.setPadding(0, 0, 0, dp(8));
        panel.addView(title);

        TextView body = new TextView(this);
        body.setText("Enter the hosted web app URL. For the Android emulator, run the Next.js app on this computer and use http://10.0.2.2:3000.");
        body.setTextColor(Color.rgb(229, 231, 235));
        body.setTextSize(15);
        body.setPadding(0, 0, 0, dp(20));
        panel.addView(body);

        urlInput = new EditText(this);
        urlInput.setSingleLine(true);
        urlInput.setTextColor(Color.WHITE);
        urlInput.setHintTextColor(Color.rgb(156, 163, 175));
        urlInput.setHint("https://your-deployed-app.example");
        urlInput.setSelectAllOnFocus(false);
        panel.addView(urlInput, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        Button loadButton = new Button(this);
        loadButton.setText("Open App");
        loadButton.setAllCaps(false);
        loadButton.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View view) {
                loadUrl(urlInput.getText().toString());
            }
        });
        panel.addView(loadButton, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        Button reloadButton = new Button(this);
        reloadButton.setText("Reload Last URL");
        reloadButton.setAllCaps(false);
        reloadButton.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View view) {
                webView.reload();
            }
        });
        panel.addView(reloadButton, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        return panel;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
                    return false;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                setupPanel.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    setupPanel.setVisibility(View.VISIBLE);
                }
            }
        });
    }

    private void loadUrl(String rawUrl) {
        String url = normalizeUrl(rawUrl);
        if (url.length() == 0) {
            setupPanel.setVisibility(View.VISIBLE);
            return;
        }
        prefs.edit().putString(URL_KEY, url).apply();
        urlInput.setText(url);
        hideKeyboard();
        webView.loadUrl(url);
    }

    private String normalizeUrl(String rawUrl) {
        String url = rawUrl == null ? "" : rawUrl.trim();
        if (url.length() == 0) {
            return "";
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        return url;
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.hideSoftInputFromWindow(urlInput.getWindowToken(), 0);
        }
    }

    @Override
    public void onBackPressed() {
        if (setupPanel.getVisibility() == View.VISIBLE) {
            super.onBackPressed();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            setupPanel.setVisibility(View.VISIBLE);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
