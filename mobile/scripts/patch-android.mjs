import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const mobile=path.resolve(here,'..');
const android=path.join(mobile,'android');
const app=path.join(android,'app');
const javaDir=path.join(app,'src','main','java','com','alvasd','cya','crm');
const resDir=path.join(app,'src','main','res');
const nativeDir=path.join(mobile,'native','android');

function ensure(condition,message){if(!condition)throw new Error(message);}
function read(file){return fs.readFileSync(file,'utf8');}
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}

ensure(fs.existsSync(android),'No existe mobile/android. Ejecuta npx cap add android primero.');
fs.mkdirSync(javaDir,{recursive:true});
for(const name of ['CyaMobilePlugin.java','RenapoActivity.java','NotificationReceiver.java','CyaDownloadHandler.java']){
  fs.copyFileSync(path.join(nativeDir,name),path.join(javaDir,name));
}
fs.mkdirSync(path.join(resDir,'xml'),{recursive:true});
fs.copyFileSync(path.join(nativeDir,'file_paths.xml'),path.join(resDir,'xml','cya_file_paths.xml'));

const mainActivity=path.join(javaDir,'MainActivity.java');
write(mainActivity,`package com.alvasd.cya.crm;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CyaMobilePlugin.class);
    super.onCreate(savedInstanceState);
    EdgeToEdge.enable(this);
    NotificationReceiver.createChannels(this);
    CyaDownloadHandler.install(getBridge().getWebView());
  }
}
`);

const manifest=path.join(app,'src','main','AndroidManifest.xml');
let manifestText=read(manifest);
if(!manifestText.includes('android.permission.POST_NOTIFICATIONS')){
  manifestText=manifestText.replace(/(<manifest[^>]*>)/,`$1\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`);
}
if(!manifestText.includes('RenapoActivity')){
  manifestText=manifestText.replace('</application>',`        <activity
            android:name=".RenapoActivity"
            android:exported="false"
            android:theme="@style/AppTheme.NoActionBar" />
        <receiver
            android:name=".NotificationReceiver"
            android:exported="false" />
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.files"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/cya_file_paths" />
        </provider>
    </application>`);
}
write(manifest,manifestText);

const gradle=path.join(app,'build.gradle');
let gradleText=read(gradle);
if(!gradleText.includes('androidx.biometric:biometric:1.1.0')){
  gradleText=gradleText.replace(/dependencies\s*\{/,`dependencies {\n    implementation "androidx.biometric:biometric:1.1.0"`);
}
gradleText=gradleText.replace(/versionCode\s+\d+/, 'versionCode 2');
gradleText=gradleText.replace(/versionName\s+["'][^"']+["']/, 'versionName "1.1.0"');
write(gradle,gradleText);

console.log('Android V2 native patch applied');
