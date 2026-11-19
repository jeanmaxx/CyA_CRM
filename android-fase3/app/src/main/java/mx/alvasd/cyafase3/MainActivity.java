package mx.alvasd.cyafase3;
import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
public class MainActivity extends Activity {
  private WebView web;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setAllowContentAccess(false);
    web.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
    web.setWebChromeClient(new WebChromeClient());
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return !url.startsWith("file:///android_asset/");
      }
    });
    web.addJavascriptInterface(new Bridge(), "NativeInfo");
    setContentView(web);
    web.loadUrl("file:///android_asset/index.html");
  }
  public class Bridge {
    @JavascriptInterface public String getDeviceInfo() {
      String pkg = "No disponible";
      try {
        if (Build.VERSION.SDK_INT >= 26) {
          PackageInfo p = WebView.getCurrentWebViewPackage();
          if (p != null) pkg = p.packageName + " " + p.versionName;
        } else {
          PackageManager pm = getPackageManager();
          String[] names = {"com.google.android.webview", "com.android.webview", "com.android.chrome"};
          for (String name : names) {
            try { PackageInfo p = pm.getPackageInfo(name, 0); pkg = name + " " + p.versionName; break; }
            catch (Exception ignored) {}
          }
        }
      } catch (Exception ignored) {}
      return "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ") | WebView: " + pkg;
    }
  }
  @Override public void onBackPressed() {
    if (web.canGoBack()) web.goBack(); else super.onBackPressed();
  }
  @Override protected void onDestroy() {
    web.removeJavascriptInterface("NativeInfo"); web.destroy(); super.onDestroy();
  }
}