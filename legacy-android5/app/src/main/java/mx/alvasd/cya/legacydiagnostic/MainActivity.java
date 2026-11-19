package mx.alvasd.cya.legacydiagnostic;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(24, 24, 24, 24);
        layout.setBackgroundColor(Color.rgb(11, 24, 45));
        TextView heading = new TextView(this);
        heading.setText("Casillas & Asociados — Diagnóstico Android 5");
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(20);
        layout.addView(heading);
        TextView status = new TextView(this);
        status.setText("Android API: " + Build.VERSION.SDK_INT + "\\nMotor WebView: comprobación local, sin conexión ni credenciales.");
        status.setTextColor(Color.WHITE);
        status.setPadding(0, 18, 0, 18);
        layout.addView(status);
        WebView web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(false);
        web.setWebViewClient(new WebViewClient());
        web.loadDataWithBaseURL(null, "<html><meta name='viewport' content='width=device-width'><body style='font-family:sans-serif;background:#f4f6fa;color:#162c4c;padding:18px'><h2>Prueba de presentación</h2><p>Si lees este texto, el motor WebView muestra HTML local.</p><p>Sin inicio de sesión, sin datos reales y sin acceso a Internet.</p></body></html>", "text/html", "UTF-8", null);
        layout.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(layout);
    }
}
