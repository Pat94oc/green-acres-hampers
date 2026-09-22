import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
function toBase64(bytes: Uint8Array) { let binary=''; const chunk=0x8000; for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length))); return btoa(binary) }
function cleanJson(text:string){const trimmed=text.trim();const fenced=trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);return fenced?fenced[1].trim():trimmed}
function safeFileName(name:string){return name.replace(/[^a-zA-Z0-9._ -]+/g,'-').replace(/\s+/g,' ').trim().slice(0,140)||'scan'}

async function extractOrderNumber(bytes:Uint8Array,mediaType:string,apiKey:string){
  const base64=toBase64(bytes)
  const prompt=`Read this signed Green Acres hamper delivery docket.\nReturn ONLY valid JSON:\n{"order_number":"H0000000","confidence":0.0}\n\nRules:\n- Extract the GREEN ACRES HAMPER ORDER NUMBER printed prominently near the top.\n- The order format is the letter H followed by exactly 7 digits, for example H2600184.\n- Do not return customer references, phone numbers, docket numbers or dates.\n- If the hamper order number is not clearly visible, return an empty order_number and lower confidence.\n- confidence must be between 0 and 1.\n- Do not infer missing digits.`
  const content=mediaType==='application/pdf'?[{type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},{type:'text',text:prompt}]:[{type:'image',source:{type:'base64',media_type:mediaType,data:base64}},{type:'text',text:prompt}]
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:300,messages:[{role:'user',content}]})})
  const body=await response.json(); if(!response.ok) throw new Error(body?.error?.message??`Claude request failed (${response.status})`)
  const text=Array.isArray(body.content)?body.content.filter((x:any)=>x?.type==='text').map((x:any)=>x.text).join('\n'):''
  if(!text)return{orderNumber:'',confidence:0};const parsed=JSON.parse(cleanJson(text));const raw=String(parsed.order_number??'').trim().toUpperCase();return{orderNumber:/^H\d{7}$/.test(raw)?raw:'',confidence:Math.max(0,Math.min(1,Number(parsed.confidence??0)))}
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(req.method!=='POST')return json({error:'POST required'},405)
  try{
    const authHeader=req.headers.get('Authorization');if(!authHeader)return json({error:'Not authenticated'},401)
    const publishableKeys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??'{}');const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');const url=Deno.env.get('SUPABASE_URL')!
    const userClient=createClient(url,publishableKeys.default,{global:{headers:{Authorization:authHeader}}});const token=authHeader.replace('Bearer ','');const{data:userData,error:userError}=await userClient.auth.getUser(token);const user=userData.user;if(userError||!user)return json({error:'Not authenticated'},401)
    const admin=createClient(url,secretKeys.default);const{data:member}=await admin.from('hamper_app_users').select('user_id').eq('user_id',user.id).eq('active',true).maybeSingle();if(!member)return json({error:'Not authorised for hamper application'},403)
    const apiKey=Deno.env.get('ANTHROPIC_API_KEY');if(!apiKey)throw new Error('ANTHROPIC_API_KEY is not configured')
    const form=await req.formData();const file=form.get('file');if(!(file instanceof File))return json({error:'A scanned file is required'},400);if(file.size<=0)return json({error:'The scanned file is empty'},400);if(file.size>18*1024*1024)return json({error:'Each file must be 18 MB or smaller'},400)
    const allowed=new Set(['application/pdf','image/jpeg','image/png']);if(!allowed.has(file.type))return json({error:'Use PDF, JPG or PNG files'},400)
    const bucketName='hamper-pods';const{data:buckets}=await admin.storage.listBuckets();if(!(buckets??[]).some((b:any)=>b.name===bucketName)){const{error:bucketError}=await admin.storage.createBucket(bucketName,{public:false});if(bucketError&&!String(bucketError.message).toLowerCase().includes('already'))throw bucketError}
    const batchId=crypto.randomUUID();const sourceName=safeFileName(file.name);const sourceExt=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';const sourcePath=`source/${batchId}/${sourceName}`;const sourceBytes=new Uint8Array(await file.arrayBuffer());const{error:sourceUploadError}=await admin.storage.from(bucketName).upload(sourcePath,sourceBytes,{contentType:file.type,upsert:false});if(sourceUploadError)throw sourceUploadError
    const pages:{bytes:Uint8Array;mediaType:string;pageNumber:number;ext:string}[]=[];if(file.type==='application/pdf'){const sourcePdf=await PDFDocument.load(sourceBytes);const pageCount=sourcePdf.getPageCount();if(pageCount<1)throw new Error('PDF contains no pages');for(let i=0;i<pageCount;i++){const output=await PDFDocument.create();const[page]=await output.copyPages(sourcePdf,[i]);output.addPage(page);pages.push({bytes:new Uint8Array(await output.save()),mediaType:'application/pdf',pageNumber:i+1,ext:'pdf'})}}else pages.push({bytes:sourceBytes,mediaType:file.type,pageNumber:1,ext:sourceExt})
    const results:any[]=[];let matched=0;let needsReview=0
    for(const page of pages){let orderNumber='';let confidence=0;let extractionError='';try{const extracted=await extractOrderNumber(page.bytes,page.mediaType,apiKey);orderNumber=extracted.orderNumber;confidence=extracted.confidence}catch(error){extractionError=error instanceof Error?error.message:String(error)}const highConfidence=Boolean(orderNumber&&confidence>=0.90);let order:any=null;if(highConfidence){const{data}=await admin.from('hamper_orders').select('id,order_number,status,fulfilment_method,delivered_at').eq('order_number',orderNumber).maybeSingle();order=data}
      if(order&&order.status!=='cancelled'){const podPath=`matched/${order.id}/${crypto.randomUUID()}.${page.ext}`;const displayFilename=`${order.order_number} - Signed POD - ${sourceName}${pages.length>1?` - Page ${page.pageNumber}`:''}.${page.ext}`;const{error:uploadError}=await admin.storage.from(bucketName).upload(podPath,page.bytes,{contentType:page.mediaType,upsert:false});if(uploadError)throw uploadError;const{data:pod,error:podError}=await admin.from('hamper_pods').insert({order_id:order.id,storage_path:podPath,display_filename:displayFilename,uploaded_by_user_id:user.id,pod_date:new Date().toISOString().slice(0,10)}).select('id').single();if(podError)throw podError;if(order.status!=='completed'){const now=new Date().toISOString();const patch:Record<string,string>={status:'completed',completed_at:now};if(order.fulfilment_method==='green_acres'&&!order.delivered_at)patch.delivered_at=now;const{error:orderError}=await admin.from('hamper_orders').update(patch).eq('id',order.id);if(orderError)throw orderError}await admin.from('hamper_order_events').insert({order_id:order.id,event_type:'pod_auto_matched',event_data:{pod_id:pod.id,source_filename:sourceName,page_number:page.pageNumber,confidence},created_by_user_id:user.id});matched++;results.push({page:page.pageNumber,status:'matched',order_number:order.order_number,confidence})}
      else{const reviewPath=`review/${batchId}/page-${String(page.pageNumber).padStart(3,'0')}.${page.ext}`;const{error:uploadError}=await admin.storage.from(bucketName).upload(reviewPath,page.bytes,{contentType:page.mediaType,upsert:false});if(uploadError)throw uploadError;const{error:reviewError}=await admin.from('hamper_pod_review').insert({source_filename:sourceName,storage_path:reviewPath,page_number:page.pageNumber,extracted_order_number:orderNumber||null,confidence,status:'needs_review',uploaded_by_user_id:user.id});if(reviewError)throw reviewError;needsReview++;results.push({page:page.pageNumber,status:'needs_review',order_number:orderNumber||null,confidence,error:extractionError||null})}
    }
    return json({ok:true,source_filename:sourceName,pages:pages.length,matched,needs_review:needsReview,results})
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:'Unexpected error'},400)}
})
