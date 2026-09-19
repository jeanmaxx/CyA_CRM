const fs=require('fs'),assert=require('node:assert/strict');
const adapter=fs.readFileSync('cloud-adapter.js','utf8');
const sync=fs.readFileSync('cloud-sync-safe.js','utf8');
const admin=fs.readFileSync('supabase/functions/platform-admin/index.ts','utf8');
const ui=fs.readFileSync('platform/admin/app.js','utf8');
const config=fs.readFileSync('cloud-config.js','utf8');
const branding=fs.readFileSync('supabase/functions/platform-branding/index.ts','utf8');
const backup=fs.readFileSync('supabase/functions/crm-backup/index.ts','utf8');

assert.match(adapter,/let\s+CA_ORG_ID\s*=\s*window\.CA_CLOUD_CONFIG\.organizationId/);
assert.doesNotMatch(adapter,/const\s+CA_ORG_ID\s*=/);
assert.match(adapter,/rpc\('get_my_tenant_access'\)/);
assert.match(adapter,/CA_ORG_ID=String\(access\.organization_id\)/);
assert.match(adapter,/organization_id:CA_ORG_ID/);
assert.match(sync,/syncPrefix\(\).*CA_ORG_ID/);

assert.match(admin,/platform_apply_billing_rules/);
assert.match(admin,/billing_overview/);
assert.match(admin,/create_platform_admin/);
assert.match(admin,/defaultServices/);
assert.match(admin,/company_address/);
assert.match(admin,/empresa_representante/);
assert.match(admin,/recovery_records/);
assert.match(admin,/backups_overview/);
assert.match(admin,/backup_download/);
assert.match(admin,/platform_trigger_backup/);
assert.match(admin,/converted_organization_id/);
assert.match(admin,/sales_lead_converted/);
assert.match(admin,/crm_url/);
assert.match(admin,/suspension_reason/);
assert.match(admin,/agreed_price_cents/);

assert.doesNotThrow(()=>new Function(ui));
assert.match(ui,/loadBilling/);
assert.match(ui,/loadPlatformAdmins/);
assert.match(ui,/loadBackups/);
assert.match(ui,/convertLeadToClient/);
assert.match(ui,/sales_lead_id/);
assert.match(ui,/auto_suspend_on_overdue/);
assert.match(ui,/company_representative/);
assert.match(ui,/loadPlatformAdmins/);
assert.match(ui,/\?tenant=/);

assert.match(config,/tenantSlug/);
assert.match(config,/platform-branding/);
assert.match(config,/crm-alvasd\.pages\.dev/);
assert.match(branding,/organizations/);
assert.match(branding,/companyName:String\(org\.name/);
assert.match(backup,/target_org/);
assert.match(backup,/requested_by/);

console.log('PASS: multi-tenant organization binding, billing/suspension backend and Control Center syntax are protected.');
