// Minimal synthetic DOCX built from plain XML. No uploaded document or legal text.
const JSZip=require('jszip');
module.exports=async function(){
 const z=new JSZip();const w='http://schemas.openxmlformats.org/wordprocessingml/2006/main';const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>');
 z.file('_rels/.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${rel}/officeDocument" Target="word/document.xml"/></Relationships>`);
 z.file('word/_rels/document.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="h1" Type="${rel}/header" Target="header1.xml"/><Relationship Id="f1" Type="${rel}/footer" Target="footer1.xml"/></Relationships>`);
 const pages=['CLIENTE_NOMBRE','CLIENTE_DOMICILIO','HONORARIOS','PAGARE_MONTO'].map((key,i)=>(i?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':'')+`<w:p><w:r><w:t>Documento de prueba: {{${key}}}</w:t></w:r></w:p>`).join('');
 z.file('word/document.xml',`<w:document xmlns:w="${w}" xmlns:r="${rel}"><w:body>${pages}<w:sectPr><w:headerReference w:type="default" r:id="h1"/><w:footerReference w:type="default" r:id="f1"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/></w:sectPr></w:body></w:document>`);
 z.file('word/header1.xml',`<w:hdr xmlns:w="${w}"><w:p><w:r><w:t>ENCABEZADO DE PRUEBA</w:t></w:r></w:p></w:hdr>`);
 z.file('word/footer1.xml',`<w:ftr xmlns:w="${w}"><w:p><w:r><w:t>{{EMPRESA_DOMICILIO}}</w:t></w:r></w:p></w:ftr>`);
 return z.generateAsync({type:'nodebuffer'});
};
