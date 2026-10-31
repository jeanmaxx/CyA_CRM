-- C&A CRM Android 1.3.0
-- Enable production dispatch only after Firebase server credentials and a controlled FCM delivery have been validated.
alter table public.leads enable trigger cya_new_lead_mobile_push;
