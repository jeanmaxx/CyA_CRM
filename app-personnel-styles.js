/* Personnel workspace styles. */
(function(){
 if(document.getElementById('cya-personnel-workspace-styles'))return;
 const style=document.createElement('style');
 style.id='cya-personnel-workspace-styles';
 style.textContent=`
    .cya-personnel-page,.cya-advisors-page{max-width:1400px;margin:0 auto;}
    .cya-personnel-toolbar{margin-bottom:16px;}
    .cya-fold-card{overflow:hidden;margin-bottom:16px;}
    .cya-fold-head{width:100%;border:0;background:transparent;color:inherit;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;cursor:pointer;border-bottom:0;}
    .cya-fold-head>span:first-child{display:flex;align-items:center;gap:10px;min-width:0;}
    .cya-fold-head b{font-size:13px;color:var(--text-muted);width:12px;}
    .cya-fold-head strong{display:block;font-size:13px;color:var(--text-primary);}
    .cya-fold-head small{display:block;font-size:10px;color:var(--text-muted);font-weight:400;margin-top:2px;}
    .cya-fold-hint{font-size:10px;color:var(--text-muted);white-space:nowrap;}
    .cya-fold-body{border-top:1px solid var(--border);padding:12px 16px 16px;}
    .cya-fold-body.no-pad{padding:0;}
    .cya-person-list{padding:0!important;}
    .cya-person-row{border-bottom:1px solid var(--border);background:var(--bg-card);}
    .cya-person-row:last-child{border-bottom:0;}
    .cya-person-main{min-height:70px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
    .cya-person-identity{display:flex;align-items:center;gap:12px;min-width:0;}
    .cya-person-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--text-primary);}
    .cya-person-avatar.is-small{width:30px;height:30px;flex-basis:30px;font-size:9px;}
    .cya-person-avatar img{width:100%;height:100%;object-fit:cover;}
    .cya-person-copy{min-width:0;}
    .cya-person-name-line{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
    .cya-person-name-line strong{font-size:13px;color:var(--text-primary);}
    .cya-role-chip,.cya-status-dot{font-size:9px;padding:2px 7px;border-radius:999px;line-height:1.35;white-space:nowrap;}
    .cya-role-chip{background:var(--bg-secondary);color:var(--text-muted);}
    .cya-role-chip.is-admin{background:rgba(139,92,246,.12);color:#a78bfa;}
    .cya-role-chip.is-tech{background:rgba(59,130,246,.12);color:#60a5fa;}
    .cya-status-dot.is-active{background:rgba(16,185,129,.10);color:var(--success);}
    .cya-status-dot.is-inactive{background:rgba(239,68,68,.10);color:var(--danger);}
    .cya-person-meta{font-size:10px;color:var(--text-muted);margin-top:3px;white-space:normal;}
    .cya-person-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto;}
    .cya-person-actions .btn{font-size:10px;}
    .cya-action-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;margin-left:4px;border-radius:9px;background:var(--bg-secondary);font-size:9px;}
    .cya-person-collaborators{padding:0 14px 14px 70px;background:var(--bg-secondary);border-top:1px solid var(--border);}
    .cya-person-collab-head{padding:12px 0 10px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
    .cya-person-collab-head strong{display:block;font-size:11px;color:var(--text-primary);}
    .cya-person-collab-head span{display:block;font-size:9px;color:var(--text-muted);margin-top:2px;}
    .cya-person-collab-head .btn{font-size:10px;}
    .cya-person-collab-table-wrap,.cya-advisor-table-wrap{overflow:auto;}
    .cya-person-collab-table,.cya-advisor-table{width:100%;border-collapse:collapse;min-width:720px;}
    .cya-person-collab-table th,.cya-advisor-table th{font-size:9px;text-transform:uppercase;letter-spacing:.65px;color:var(--text-muted);text-align:left;padding:9px 10px;border-bottom:1px solid var(--border);font-weight:500;}
    .cya-person-collab-table td,.cya-advisor-table td{font-size:11px;color:var(--text-primary);padding:10px;border-bottom:1px solid var(--border);}
    .cya-person-collab-table tbody tr:last-child td,.cya-advisor-table tbody tr:last-child td{border-bottom:0;}
    .cya-person-collab-table td strong{display:block;font-size:11px;}
    .cya-person-collab-table td small{display:block;font-size:9px;color:var(--text-muted);margin-top:2px;}
    .money-collected{color:var(--success)!important;}
    .cya-person-empty{padding:16px;font-size:10px;color:var(--text-muted);text-align:center;}
    .cya-report-placeholder{display:flex;align-items:center;justify-content:space-between;gap:20px;}
    .cya-report-placeholder strong{font-size:12px;color:var(--text-primary);}
    .cya-report-placeholder p{font-size:10px;color:var(--text-muted);margin:4px 0 0;max-width:720px;line-height:1.5;}
    .cya-report-periods{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;}
    .cya-report-periods span{font-size:9px;color:var(--text-muted);border:1px solid var(--border);padding:5px 8px;border-radius:999px;background:var(--bg-secondary);}
    .cya-advisor-table th:not(:first-child),.cya-advisor-table td:not(:first-child){text-align:center;}
    .cya-advisor-name{display:flex;align-items:center;gap:8px;min-width:160px;text-align:left;}
    .cya-advisor-name>span strong{display:block;font-size:11px;}
    .cya-advisor-name>span small{display:block;font-size:8px;color:var(--danger);margin-top:1px;}
    .cya-effectiveness{display:flex;align-items:center;justify-content:center;gap:7px;min-width:90px;}
    .cya-effectiveness-track{width:54px;height:6px;border-radius:4px;background:var(--bg-secondary);overflow:hidden;display:block;}
    .cya-effectiveness-track i{height:100%;display:block;background:var(--accent-blue);border-radius:inherit;}
    .cya-effectiveness strong{font-size:10px;min-width:32px;text-align:right;}
    .cya-collab-filter{max-width:1400px;margin:0 auto 12px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card);display:flex;align-items:center;justify-content:space-between;gap:12px;}
    .cya-collab-filter strong{display:block;font-size:11px;color:var(--text-primary);}
    .cya-collab-filter span{display:block;font-size:9px;color:var(--text-muted);margin-top:2px;}
    .cya-collab-filter .btn{font-size:10px;}
    @media(max-width:760px){
      .cya-person-main{align-items:flex-start;flex-direction:column;}
      .cya-person-actions{width:100%;justify-content:flex-end;}
      .cya-person-collaborators{padding-left:14px;}
      .cya-report-placeholder{align-items:flex-start;flex-direction:column;}
      .cya-report-periods{justify-content:flex-start;}
      .cya-fold-head{padding:12px;}
    }
  `;
 document.head.appendChild(style);
})();
