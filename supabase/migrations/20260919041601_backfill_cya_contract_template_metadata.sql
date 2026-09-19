update public.contract_templates
set
  filename = coalesce(filename,'cya-retiro-contrato-pagare-v3.docx'),
  file_bytes = octet_length(decode(content_base64,'base64')),
  file_sha256 = encode(extensions.digest(decode(content_base64,'base64'),'sha256'),'hex'),
  updated_at = now()
where organization_id='ca000000-0000-4000-8000-000000000001'
  and version='retiro-contrato-pagare-v3';
