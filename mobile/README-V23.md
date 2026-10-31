# C&A CRM Android 1.2.0 (V2.3)

- Firebase Android client linked to `com.alvasd.cya.crm`.
- FCM only activates for the V2.3 APK, identified by the app URL query `firebase=1&native=android-v23`.
- Older APKs remain protected from PushNotifications registration.
- Biometric unlock is enabled again for an existing session.
- Any biometric cancel, failure, timeout, or unavailable sensor falls back to the saved-account password screen.
- Local agenda/birthday notifications remain independent from Firebase.
- Remote push reception can register an FCM token once Firebase initialization succeeds.
