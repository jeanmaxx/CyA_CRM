/* Compact visual refinement for the approved Stage 2 client profile. */
(function installClientProfileCompact(){
  if(window.__cyaClientProfileCompactInstalled)return;
  window.__cyaClientProfileCompactInstalled=true;

  const style=document.createElement('style');
  style.id='cya-client-profile-compact-styles';
  style.textContent=`
    @media(min-width:761px){
      #modal-perfil .client-profile-modal{
        width:min(1100px,88vw)!important;
        max-width:1100px!important;
      }
      #cya2-pending{
        padding:9px 10px!important;
      }
      #cya2-pending .cya2-head{
        margin-bottom:7px!important;
      }
      #cya2-pending-list{
        display:flex!important;
        flex-wrap:wrap!important;
        align-items:center!important;
        gap:6px!important;
      }
      #cya2-pending .alerta-firma,
      #cya2-pending .alerta-afore-urgente,
      #cya2-pending .alerta-afore-proxima{
        flex:0 0 auto!important;
        width:auto!important;
        max-width:100%!important;
        min-height:30px!important;
        padding:6px 9px!important;
        margin:0!important;
        border-radius:7px!important;
        font-size:10.5px!important;
        line-height:1.25!important;
        white-space:nowrap!important;
      }
      #cya2-pending .cya2-ok{
        padding:2px 0!important;
      }
    }

    @media(min-width:761px) and (max-width:1180px){
      #modal-perfil .client-profile-modal{
        width:min(1040px,92vw)!important;
      }
      #modal-perfil .profile-header{
        grid-template-columns:minmax(210px,1fr) auto!important;
        gap:12px!important;
      }
      #modal-perfil .profile-header-actions{
        gap:5px!important;
      }
      #modal-perfil .profile-header-actions .btn{
        padding-left:9px!important;
        padding-right:9px!important;
        font-size:11px!important;
      }
    }

    @media(max-width:760px){
      #cya2-pending-list{
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        gap:7px!important;
      }
      #cya2-pending .alerta-firma,
      #cya2-pending .alerta-afore-urgente,
      #cya2-pending .alerta-afore-proxima{
        width:100%!important;
        white-space:normal!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
