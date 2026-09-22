'use client';
import { DragEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Result={file:string;pages:number;matched:number;needs_review:number;error?:string};

async function authHeaders(){const supabase=createClient();const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Your login session has expired. Please sign in again.');return {Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!};}

export function SignedDocketUploader(){
  const [files,setFiles]=useState<File[]>([]);const [dragging,setDragging]=useState(false);const [running,setRunning]=useState(false);const [current,setCurrent]=useState(0);const [results,setResults]=useState<Result[]>([]);const [error,setError]=useState('');const inputRef=useRef<HTMLInputElement>(null);const router=useRouter();
  function accept(list:FileList|File[]){const valid=Array.from(list).filter(f=>['application/pdf','image/jpeg','image/png'].includes(f.type));setFiles(prev=>[...prev,...valid]);setResults([]);setError('');}
  function onDrop(e:DragEvent<HTMLDivElement>){e.preventDefault();setDragging(false);accept(e.dataTransfer.files);}
  async function processAll(){if(!files.length)return;setRunning(true);setResults([]);setError('');const headers=await authHeaders();const next:Result[]=[];for(let i=0;i<files.length;i++){setCurrent(i+1);const file=files[i];try{const form=new FormData();form.set('file',file);const res=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hamper-pod-batch`,{method:'POST',headers,body:form});const json=await res.json();if(!res.ok)throw new Error(json.error||'Could not process scan');next.push({file:file.name,pages:json.pages??0,matched:json.matched??0,needs_review:json.needs_review??0});}catch(e){next.push({file:file.name,pages:0,matched:0,needs_review:0,error:e instanceof Error?e.message:'Could not process scan'});}setResults([...next]);}setRunning(false);setFiles([]);router.refresh();}
  const matched=results.reduce((s,r)=>s+r.matched,0);const review=results.reduce((s,r)=>s+r.needs_review,0);const pages=results.reduce((s,r)=>s+r.pages,0);
  return <div className="card bulk-upload-card">
    <div className="section-row"><div><h2>Upload Signed Delivery Dockets</h2><p className="muted">Drop one or many PDF/JPG/PNG scans. Multi-page PDFs are split and each page is matched independently.</p></div></div>
    <div className={`drop-zone ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop} onClick={()=>inputRef.current?.click()}><strong>{dragging?'Drop scans here':'Drag & drop signed dockets here'}</strong><span>or click to browse</span><input ref={inputRef} type="file" multiple accept="application/pdf,image/jpeg,image/png" hidden onChange={e=>e.target.files&&accept(e.target.files)}/></div>
    {files.length>0&&<div className="selected-files"><strong>{files.length} file{files.length===1?'':'s'} selected</strong>{files.map((f,i)=><span key={`${f.name}-${i}`}>{f.name}</span>)}<button className="button" disabled={running} onClick={processAll}>{running?`Processing file ${current} of ${files.length}…`:'Process Signed Dockets'}</button></div>}
    {results.length>0&&<div className="upload-summary"><div><strong>{pages}</strong><span>pages processed</span></div><div><strong>{matched}</strong><span>matched & filed</span></div><div><strong>{review}</strong><span>need review</span></div></div>}
    {results.some(r=>r.error)&&<div className="error-box">{results.filter(r=>r.error).map(r=><div key={r.file}>{r.file}: {r.error}</div>)}</div>}
    {error&&<div className="error-box">{error}</div>}
  </div>
}
