package com.alvasd.cya.crm;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import org.json.JSONTokener;

public class RenapoActivity extends AppCompatActivity {
    private static final String RENAPO_URL = "https://www.gob.mx/curp/";
    private WebView webView;
    private String curp = "";
    private TextView status;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        curp = getIntent().getStringExtra("curp");
        if (curp == null) curp = "";
        copyCurp();
        buildUi();
        webView.loadUrl(RENAPO_URL);
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(12, 17, 27));
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets safe = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars()
                    | WindowInsetsCompat.Type.navigationBars()
                    | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            return windowInsets;
        });

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), dp(8), dp(8), dp(8));
        bar.setBackgroundColor(Color.rgb(15, 31, 53));

        Button close = button("Cerrar");
        close.setOnClickListener(v -> finish());
        Button paste = button("Pegar CURP");
        paste.setOnClickListener(v -> { copyCurp(); injectCurp(); });
        Button use = button("Usar nombre verificado");
        use.setOnClickListener(v -> extractVerifiedName());

        bar.addView(close, new LinearLayout.LayoutParams(0, dp(44), 0.8f));
        bar.addView(paste, new LinearLayout.LayoutParams(0, dp(44), 1f));
        bar.addView(use, new LinearLayout.LayoutParams(0, dp(44), 1.5f));

        status = new TextView(this);
        status.setText("CURP copiada. Realiza la consulta y pulsa ‘Usar nombre verificado’.");
        status.setTextColor(Color.rgb(210, 220, 235));
        status.setTextSize(12);
        status.setPadding(dp(12), dp(7), dp(12), dp(7));
        status.setBackgroundColor(Color.rgb(24, 34, 51));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " CYA-CRM-Android/1.2");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                status.setText("RENAPO abierto dentro de C&A CRM · CURP disponible para pegar.");
                injectCurp();
            }
        });

        root.addView(bar, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(status, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        root.addView(webView, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
        ViewCompat.requestApplyInsets(root);
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(11);
        button.setAllCaps(false);
        return button;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void copyCurp() {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("CURP", curp));
    }

    private void injectCurp() {
        if (webView == null || curp.isEmpty()) return;
        String escaped = curp.replace("\\", "\\\\").replace("'", "\\'");
        String script = "(function(){" +
            "var c='" + escaped + "';" +
            "var all=[].slice.call(document.querySelectorAll('input'));" +
            "var el=all.find(function(x){var s=((x.id||'')+' '+(x.name||'')+' '+(x.placeholder||'')+' '+(x.getAttribute('aria-label')||'')).toLowerCase();return s.indexOf('curp')>=0;});" +
            "if(!el)return false;" +
            "el.focus();el.value=c;" +
            "el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));" +
            "return true;" +
            "})()";
        webView.evaluateJavascript(script, value -> {
            if ("true".equals(value)) status.setText("CURP cargada en RENAPO. Pulsa Buscar y después ‘Usar nombre verificado’.");
        });
    }

    private void extractVerifiedName() {
        if (webView == null) return;
        String script = "(function(){" +
            "function clean(s){return (s||'').replace(/\\s+/g,' ').trim();}" +
            "function norm(s){return clean(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}" +
            "function byLabel(words){" +
              "var labels=[].slice.call(document.querySelectorAll('label,dt,th,.control-label,.form-label,strong'));" +
              "for(var i=0;i<labels.length;i++){var t=norm(labels[i].innerText||labels[i].textContent);if(words.some(function(w){return t.indexOf(w)>=0;})){" +
                "var f=labels[i].htmlFor&&document.getElementById(labels[i].htmlFor);" +
                "if(f&&clean(f.value))return clean(f.value);" +
                "var p=labels[i].parentElement;if(p){var e=p.querySelector('input,textarea,dd,[data-value],span,strong');var v=e&&(e.value||e.getAttribute('data-value')||e.innerText||e.textContent);if(clean(v)&&e!==labels[i])return clean(v);}" +
                "var n=labels[i].nextElementSibling;if(n){var v2=n.value||n.getAttribute&&n.getAttribute('data-value')||n.innerText||n.textContent;if(clean(v2))return clean(v2);}" +
              "}}return '';" +
            "}" +
            "var nombres=byLabel(['nombre(s)','nombres','nombre']);" +
            "var paterno=byLabel(['primer apellido','apellido paterno']);" +
            "var materno=byLabel(['segundo apellido','apellido materno']);" +
            "var text=clean(document.body&&document.body.innerText);" +
            "function rx(re){var m=text.match(re);return m?clean(m[1]):'';}" +
            "if(!nombres)nombres=rx(/Nombre\\(s\\)\\s*:?\\s*([A-ZÁÉÍÓÚÜÑ ]{2,})(?=Primer apellido|Apellido paterno|Fecha de nacimiento|Sexo|$)/i);" +
            "if(!paterno)paterno=rx(/(?:Primer apellido|Apellido paterno)\\s*:?\\s*([A-ZÁÉÍÓÚÜÑ ]{2,})(?=Segundo apellido|Apellido materno|Fecha de nacimiento|Sexo|$)/i);" +
            "if(!materno)materno=rx(/(?:Segundo apellido|Apellido materno)\\s*:?\\s*([A-ZÁÉÍÓÚÜÑ ]{2,})(?=Fecha de nacimiento|Sexo|Entidad|$)/i);" +
            "var result=clean([nombres,paterno,materno].filter(Boolean).join(' '));" +
            "if(result.length<3||result.length>120)return '';return result.toUpperCase();" +
            "})()";
        webView.evaluateJavascript(script, raw -> {
            try {
                Object parsed = new JSONTokener(raw == null ? "\"\"" : raw).nextValue();
                String name = parsed == null ? "" : String.valueOf(parsed).trim();
                if (name.isEmpty() || "null".equals(name)) {
                    Toast.makeText(this, "Aún no se detecta el nombre. Completa la búsqueda en RENAPO y vuelve a pulsar.", Toast.LENGTH_LONG).show();
                    return;
                }
                Intent result = new Intent();
                result.putExtra("verified_name", name);
                result.putExtra("curp", curp);
                setResult(Activity.RESULT_OK, result);
                finish();
            } catch (Exception error) {
                Toast.makeText(this, "No se pudo leer el nombre verificado.", Toast.LENGTH_LONG).show();
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
