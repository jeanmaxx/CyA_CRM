(function(){
  const SUPABASE_URL='https://ibhgisndtaclvwznqugu.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_grQYYOgYg0WR9gmn3QBHpg_UyieIrZ8';
  const BRANDING_ENDPOINT=SUPABASE_URL+'/functions/v1/platform-branding';
  const LOGIN_CYA='https://crm-alvasd.pages.dev/assets/brand/cya-logo-dark.svg?v=20260919-brand-clean1';
  const FALLBACK_CYA='https://crm-alvasd.pages.dev/assets/brand/cya-logo-light.jpg?v=20260919-brand-clean1';
  const DARK_SIDEBAR_CYA=LOGIN_CYA;
  const LIGHT_SIDEBAR_CYA=FALLBACK_CYA;

  const route=window.ALVA_TENANT_ROUTE||null;
  const slug=String(route?.tenantSlug||'').trim().toLowerCase();
  const defaultBrand={
    companyName:slug==='casillas-asociados'?'Casillas & Asociados':'ALVA CRM',
    logoUrl:slug==='casillas-asociados'?FALLBACK_CYA:'',
  };

  let currentCompany=defaultBrand.companyName;

  function applySidebarThemeLogo(company){
    const theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
    const src=theme==='light'?LIGHT_SIDEBAR_CYA:DARK_SIDEBAR_CYA;
    document.querySelectorAll('.sidebar-brand .cya-logo-shared').forEach(img=>{
      img.onerror=()=>{img.onerror=null;img.src=FALLBACK_CYA;};
      img.src=src;
      img.alt=company||currentCompany;
    });
  }

  function applyBrand(brand){
    const company=String(brand?.companyName||defaultBrand.companyName||'ALVA CRM').trim();
    const logo=String(brand?.logoUrl||defaultBrand.logoUrl||FALLBACK_CYA).trim();
    currentCompany=company;

    document.title='Portal de Colaboradores · '+company;

    document.querySelectorAll('.login-brand .cya-logo-shared').forEach(img=>{
      img.onerror=null;
      img.src=LOGIN_CYA;
      img.alt=company;
    });
    applySidebarThemeLogo(company);

    const foot=document.querySelector('.login-foot');
    if(foot)foot.textContent='El acceso es habilitado por tu asesor o por la administración de '+company+'.';

    document.documentElement.dataset.tenantSlug=slug||'unknown';
    document.documentElement.dataset.tenantName=company;
    window.ALVA_COLLABORATOR_BRAND=Object.freeze({companyName:company,logoUrl:logo,slug});
  }

  window.alvaApplyCollaboratorBrand=applyBrand;
  applyBrand(defaultBrand);

  const themeObserver=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.attributeName==='data-theme'))applySidebarThemeLogo(currentCompany);
  });
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  if(!slug)return;

  fetch(BRANDING_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY},
    body:JSON.stringify({slug})
  }).then(async response=>{
    const data=await response.json().catch(()=>({}));
    if(response.ok&&data?.brand)applyBrand(data.brand);
  }).catch(()=>{});
})();