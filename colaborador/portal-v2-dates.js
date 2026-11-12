/* Fechas de captura del portal en formato mexicano dd/mm/aaaa.
   El API sigue recibiendo ISO yyyy-mm-dd, sin alterar la base de datos. */
(function collaboratorMexicanDates(){
 'use strict';
 const pad=n=>String(n).padStart(2,'0');
 function valid(y,m,d){
  if(y<1900||y>2100||m<1||m>12||d<1||d>31)return false;
  const x=new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;
 }
 function toISO(value){
  const s=String(value||'').trim();
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if(!m)return '';
  const d=+m[1],month=+m[2],year=+m[3];
  return valid(year,month,d)?year+'-'+pad(month)+'-'+pad(d):'';
 }
 function toMX(value){
  const s=String(value||'').trim();
  if(!s)return '';
  const digits=/^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if(digits)return toMX(digits[1]+'/'+digits[2]+'/'+digits[3]);
  if(toISO(s))return s;
  const m=/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(s);
  if(!m)return '';
  const y=+m[1],mo=+m[2],day=+m[3];
  return valid(y,mo,day)?pad(day)+'/'+pad(mo)+'/'+y:'';
 }
 function today(){
  const n=new Date();return pad(n.getDate())+'/'+pad(n.getMonth()+1)+'/'+n.getFullYear();
 }
 function bind(root){
  (root||document).querySelectorAll('input[data-mx-date]').forEach(el=>{
   if(el.dataset.mxBound)return;
   el.dataset.mxBound='1';
   el.addEventListener('blur',()=>{const value=toMX(el.value);if(value)el.value=value;});
  });
 }
 window.caV2Dates={toISO,toMX,today,bind};
})();
