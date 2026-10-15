'use strict';
// Raster A4 PDF: browser fonts preserve accents and circled digits without downloads.
// Each page is rendered separately to bound canvas memory on phones.
async function createInventoryPDF(data){
 await document.fonts.ready;
 const width=794,height=1123,margin=46,gutter=30,col=(width-2*margin-gutter)/2;
 const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);
 const font='"Avenir Next Condensed", "Arial Narrow", Arial, sans-serif';
 const images=[];let y=0;
 function lines(text,maxWidth){
  const result=[];let line='';
  for(const char of String(text)){
   if(char==='\n'||(line&&ctx.measureText(line+char).width>maxWidth)){result.push(line);line=char==='\n'?'':char}
   else line+=char;
  }
  result.push(line);return result;
 }
 function textLines(rows,x,top,step=20){rows.forEach((line,i)=>ctx.fillText(line,x,top+i*step))}
 function begin(){
  ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.fillStyle='#17232b';ctx.textBaseline='top';
  ctx.font=`26px ${font}`;
  const title=lines(data.title,width-2*margin);title.forEach((line,i)=>ctx.fillText(line,(width-ctx.measureText(line).width)/2,margin+i*30));
  y=margin+title.length*30+24;
 }
 async function finish(){
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.95));
  if(!blob)throw Error('Não foi possível criar o PDF.');
  images.push(new Uint8Array(await blob.arrayBuffer()));
 }
 begin();
 for(let index=0;index<data.categories.length;index+=2){
  const pair=data.categories.slice(index,index+2);
  ctx.font=`bold 19px ${font}`;
  const headers=pair.map(c=>lines(c.name,col));
  const headHeight=Math.max(...headers.map(h=>h.length))*23+12;
  const drawHeaders=()=>{
   ctx.font=`bold 19px ${font}`;
   headers.forEach((h,i)=>textLines(h,margin+i*(col+gutter),y,23));y+=headHeight;
  };
  if(y+headHeight+36>height-margin){await finish();begin()}
  drawHeaders();
  for(let row=0;row<Math.max(...pair.map(c=>c.items.length));row++){
   ctx.font=`16px ${font}`;
   const items=pair.map(c=>c.items[row]);
   const labels=items.map(item=>item?lines(item.name,col-128):[]);
   const rowHeight=Math.max(34,...labels.map(label=>label.length*20+10));
   if(y+rowHeight>height-margin){await finish();begin();drawHeaders()}
   items.forEach((item,i)=>{
    if(!item)return;
    const x=margin+i*(col+gutter);
    ctx.font=`16px ${font}`;textLines(labels[i],x,y+5);
    ctx.font='bold 13px Arial';
    for(let n=1;n<=9;n++)if(item.quantity>=n)ctx.fillText('①②③④⑤⑥⑦⑧⑨'[n-1],x+col-108+(n-1)*12,y+7);
    if(item.half&&item.quantity%1)ctx.fillText('½',x+col-124,y+7);
   });y+=rowHeight;
  }
  y+=22;
 }
 await finish();canvas.width=canvas.height=0;
 return encodeImagePDF(images,width*2,height*2);
}
function encodeImagePDF(images,pixelWidth,pixelHeight){
 const encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
 const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length};
 const object=(id,body)=>{offsets[id]=length;append(`${id} 0 obj\n`);append(body);append('\nendobj\n')};
 append('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
 images.forEach((bytes,i)=>{
  const id=3+i*3;
  object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Image ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
  offsets[id+1]=length;append(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);append(bytes);append('\nendstream\nendobj\n');
  const content='q 595.276 0 0 841.89 0 0 cm /Image Do Q';
  object(id+2,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
 });
 const xref=length;append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
 for(const offset of offsets.slice(1))append(`${String(offset).padStart(10,'0')} 00000 n \n`);
 append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 return new Blob(parts,{type:'application/pdf'});
}
