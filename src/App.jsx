import { useState, useEffect, useCallback } from "react";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL  = "https://rvhkydzjuqagztgaihsx.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aGt5ZHpqdXFhZ3p0Z2FpaHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Mjc1OTIsImV4cCI6MjA5MzEwMzU5Mn0.eRuOkB6QFRt6ejYYj59c4k709E1vaW_P9GGrJ1YFEWg";   

const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ─── CONSTANTS ───────────────────────────────────────────────────
const SRC_LABELS = {
  notion:"Notion", github:"GitHub", figma:"Figma", drive:"Drive",
  server:"Server", confluence:"Confluence", sharepoint:"SharePoint",
  jira:"Jira", other:"Other",
};
const PANEL_META = {
  b2b:      { label:"B2B Portal",       color:"#2563eb", light:"#eff4ff", border:"#bfdbfe", text:"#1e40af" },
  d2c:      { label:"D2C App",          color:"#7c3aed", light:"#f5f3ff", border:"#ddd6fe", text:"#5b21b6" },
  merchant: { label:"Merchant Panel",   color:"#059669", light:"#ecfdf5", border:"#a7f3d0", text:"#065f46" },
  other:    { label:"Other / General",  color:"#d97706", light:"#fffbeb", border:"#fde68a", text:"#92400e" },
};
const TYPE_OPTS = ["BRD","FRD","SRS","Flow","Design","API","Manual","Contract","SLA","MOM","Proposal","Other"];
const TYPE_COLORS = {
  BRD:{bg:"#eff4ff",color:"#1e40af"}, FRD:{bg:"#f5f3ff",color:"#5b21b6"},
  SRS:{bg:"#ecfdf5",color:"#065f46"}, Flow:{bg:"#fffbeb",color:"#92400e"},
  Design:{bg:"#fff5f2",color:"#c2410c"}, API:{bg:"#ecfdf5",color:"#065f46"},
  Manual:{bg:"#f4f6f9",color:"#374151"}, Contract:{bg:"#fff7ed",color:"#c2410c"},
  SLA:{bg:"#f5f3ff",color:"#5b21b6"}, MOM:{bg:"#ecfdf5",color:"#065f46"},
  Proposal:{bg:"#fffbeb",color:"#92400e"}, Other:{bg:"#f4f6f9",color:"#374151"},
};
const STATUS_COLOR = { live:"#059669", draft:"#d97706", review:"#7c3aed", closed:"#9ca3af" };

// ─── VALIDATION ──────────────────────────────────────────────────
const V = {
  req:    v => (!v||!String(v).trim()) ? "Required." : null,
  email:  v => (!v||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) ? "Enter a valid email." : null,
  min8:   v => (!v||v.length<8) ? "Minimum 8 characters." : null,
  min6:   v => (!v||v.length<6) ? "Minimum 6 characters." : null,
  url:    v => { if(!v||!v.trim()) return null; try{new URL(v);return null;}catch{return "Enter a valid URL.";} },
  phone:  v => { if(!v||!v.trim()) return null; return !/^[\d\s\+\-\(\)]{7,20}$/.test(v) ? "Invalid phone." : null; },
  optEmail: v => { if(!v||!v.trim()) return null; return V.email(v); },
};
function validate(rules, data) {
  const errs = {};
  for (const [f, fns] of Object.entries(rules)) {
    for (const fn of [].concat(fns)) { const e=fn(data[f]); if(e){errs[f]=e;break;} }
  }
  return errs;
}
function sanitize(s) {
  if(typeof s!=="string") return s;
  return s.replace(/[<>"']/g,c=>({"<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function cleanObj(obj) {
  const o={};
  for(const[k,v] of Object.entries(obj)) o[k]=typeof v==="string"?sanitize(v.trim()):v;
  return o;
}

// rate-limit login attempts (client-side guard)
const _attempts = {};
function rateOk(email) {
  const k=email.toLowerCase(); const now=Date.now();
  _attempts[k]=(_attempts[k]||[]).filter(t=>now-t<60000);
  if(_attempts[k].length>=5) return false;
  _attempts[k].push(now); return true;
}

function ini(name) {
  return String(name||"?").trim().split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase();
}

// ─── STYLES ──────────────────────────────────────────────────────
const G = {
  wrap:   {display:"flex",minHeight:"600px",maxHeight:"700px",background:"#f4f6f9",fontFamily:"'Inter',system-ui,sans-serif",fontSize:"13px",color:"#1a1d23"},
  sb:     {width:"205px",background:"#fff",borderRight:"1px solid #e2e6ec",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"},
  main:   {flex:1,minWidth:0,padding:"16px",overflowY:"auto"},
  topbar: {display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"14px",gap:"8px"},
  card:   {background:"#fff",border:"1px solid #e2e6ec",borderRadius:"9px",overflow:"hidden",marginBottom:"12px"},
  stats:  {display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"14px"},
  stat:   {background:"#fff",border:"1px solid #e2e6ec",borderRadius:"9px",padding:"11px 13px"},
  cg:     {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"},
  ov:     {position:"fixed",inset:0,background:"rgba(10,14,24,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px"},
  mo:     {background:"#fff",borderRadius:"13px",border:"1px solid #e2e6ec",width:"100%",maxWidth:"500px",maxHeight:"90vh",display:"flex",flexDirection:"column"},
  mH:     {display:"flex",alignItems:"center",padding:"14px 17px",borderBottom:"1px solid #f0f2f5",flexShrink:0},
  mB:     {padding:"17px",overflowY:"auto",flex:1},
  mF:     {display:"flex",gap:"8px",justifyContent:"flex-end",padding:"12px 17px",borderTop:"1px solid #f0f2f5",flexShrink:0},
  fld:    {marginBottom:"12px"},
  lbl:    {display:"block",fontSize:"11px",fontWeight:600,color:"#374151",marginBottom:"5px",textTransform:"uppercase",letterSpacing:".04em"},
  inp:    {width:"100%",border:"1px solid #e2e6ec",borderRadius:"7px",padding:"8px 11px",fontFamily:"inherit",fontSize:"13px",color:"#1a1d23",background:"#fafbfc",outline:"none",boxSizing:"border-box"},
  inpE:  {borderColor:"#f87171",background:"#fff"},
  sel:    {width:"100%",border:"1px solid #e2e6ec",borderRadius:"7px",padding:"8px 11px",fontFamily:"inherit",fontSize:"13px",color:"#1a1d23",background:"#fafbfc",outline:"none",boxSizing:"border-box"},
  ta:     {width:"100%",border:"1px solid #e2e6ec",borderRadius:"7px",padding:"8px 11px",fontFamily:"inherit",fontSize:"13px",color:"#1a1d23",background:"#fafbfc",outline:"none",boxSizing:"border-box",resize:"vertical",minHeight:"60px"},
  r2:     {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"0"},
  etxt:   {fontSize:"10px",color:"#dc2626",marginTop:"3px"},
  dr:     {display:"flex",alignItems:"center",gap:"9px",padding:"9px 13px",borderBottom:"1px solid #f4f6f9",transition:"background .1s"},
};

// ─── ATOMS ───────────────────────────────────────────────────────
function Spinner({size=16,color="#2563eb"}) {
  return <div style={{width:size,height:size,border:`2px solid #e2e6ec`,borderTopColor:color,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>;
}
function Btn({children,onClick,v="def",size="md",disabled=false,loading=false,sx={}}) {
  const base={border:"1px solid #e2e6ec",borderRadius:"7px",fontFamily:"inherit",cursor:disabled||loading?"not-allowed":"pointer",fontWeight:600,display:"inline-flex",alignItems:"center",gap:"5px",opacity:disabled||loading?.65:1,transition:"opacity .15s"};
  const sz={sm:{padding:"4px 9px",fontSize:"10px"},md:{padding:"7px 13px",fontSize:"12px"},lg:{padding:"10px 18px",fontSize:"13px"}};
  const vs={def:{background:"#fff",color:"#374151"},pri:{background:"#2563eb",border:"1px solid #2563eb",color:"#fff"},dan:{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626"},ghost:{background:"transparent",border:"1px solid transparent",color:"#6b7280"}};
  return <button onClick={disabled||loading?undefined:onClick} style={{...base,...sz[size],...vs[v],...sx}}>{loading&&<Spinner size={13} color={v==="pri"?"#fff":"#2563eb"}/>}{children}</button>;
}
function Inp({value,onChange,type="text",placeholder="",error,onKeyDown,maxLength,autoFocus}) {
  return <>
    <input style={{...G.inp,...(error?G.inpE:{})}} type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} maxLength={maxLength} autoFocus={autoFocus}/>
    {error&&<div style={G.etxt}>{error}</div>}
  </>;
}
function Sel({value,onChange,opts,error}) {
  return <>
    <select style={{...G.sel,...(error?G.inpE:{})}} value={value} onChange={e=>onChange(e.target.value)}>
      {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
    </select>
    {error&&<div style={G.etxt}>{error}</div>}
  </>;
}
function Ta({value,onChange,placeholder,error}) {
  return <>
    <textarea style={{...G.ta,...(error?G.inpE:{})}} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    {error&&<div style={G.etxt}>{error}</div>}
  </>;
}
function Fld({label,req,children}) {
  return <div style={G.fld}><label style={G.lbl}>{label}{req&&<span style={{color:"#dc2626",marginLeft:"2px"}}>*</span>}</label>{children}</div>;
}
function Av({name,role,size=27}) {
  const c={admin:{bg:"#eff4ff",cl:"#2563eb"},editor:{bg:"#f5f3ff",cl:"#7c3aed"},viewer:{bg:"#ecfdf5",cl:"#059669"}}[role]||{bg:"#f4f6f9",cl:"#374151"};
  return <div style={{width:size,height:size,borderRadius:"50%",background:c.bg,color:c.cl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.37,fontWeight:700,flexShrink:0}}>{ini(name)}</div>;
}
function RolePill({role}) {
  const s={admin:{bg:"#eff4ff",cl:"#1e40af",br:"#bfdbfe"},editor:{bg:"#f5f3ff",cl:"#5b21b6",br:"#ddd6fe"},viewer:{bg:"#ecfdf5",cl:"#065f46",br:"#a7f3d0"}}[role]||{bg:"#f4f6f9",cl:"#374151",br:"#e2e6ec"};
  return <span style={{background:s.bg,color:s.cl,border:`1px solid ${s.br}`,borderRadius:"20px",padding:"2px 9px",fontSize:"10px",fontWeight:600}}>{role}</span>;
}
function TBadge({type}) {
  const c=TYPE_COLORS[type]||TYPE_COLORS.Other;
  return <span style={{background:c.bg,color:c.color,fontSize:"9px",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",padding:"3px 7px",borderRadius:"5px",whiteSpace:"nowrap",flexShrink:0}}>{type}</span>;
}
function SDot({status}) {
  return <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
    <div style={{width:5,height:5,borderRadius:"50%",background:STATUS_COLOR[status]||"#9ca3af"}}/>
    <span style={{fontSize:"10px",color:"#9ca3af"}}>{status}</span>
  </div>;
}
function SrcTag({src}) {
  return <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"5px",background:"#f4f6f9",color:"#6b7280",border:"1px solid #e2e6ec"}}>{SRC_LABELS[src]||src}</span>;
}
function Divider() { return <div style={{height:1,background:"#f0f2f5",margin:"6px 0"}}/>; }

// ─── TOAST SYSTEM ────────────────────────────────────────────────
function ToastItem({msg,ok,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,4500);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",bottom:"18px",right:"18px",zIndex:2000,background:ok?"#ecfdf5":"#fef2f2",border:`1px solid ${ok?"#a7f3d0":"#fecaca"}`,color:ok?"#065f46":"#991b1b",borderRadius:"9px",padding:"10px 15px",fontSize:"12px",fontWeight:500,display:"flex",alignItems:"center",gap:"9px",boxShadow:"0 4px 16px rgba(0,0,0,.12)",maxWidth:"360px",lineHeight:1.5}}>
    <span style={{fontSize:"15px"}}>{ok?"✓":"⚠"}</span>
    <span style={{flex:1}}>{msg}</span>
    <span onClick={onClose} style={{cursor:"pointer",color:"#9ca3af",fontSize:"17px",lineHeight:1}}>×</span>
  </div>;
}

// ─── MODAL WRAPPER ───────────────────────────────────────────────
function Modal({title,onClose,children,footer,wide=false}) {
  return <div style={G.ov} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{...G.mo,maxWidth:wide?"700px":"500px"}}>
      <div style={G.mH}>
        <span style={{fontSize:"14px",fontWeight:700,flex:1}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:"21px",color:"#9ca3af",cursor:"pointer",lineHeight:1}}>×</button>
      </div>
      <div style={G.mB}>{children}</div>
      {footer&&<div style={G.mF}>{footer}</div>}
    </div>
  </div>;
}

// ─── SIDEBAR ITEM ────────────────────────────────────────────────
function SbItem({icon,label,badge,badgeBg,badgeColor,active,onClick}) {
  return <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 13px",cursor:"pointer",background:active?"#eff4ff":"transparent",borderLeft:`3px solid ${active?"#2563eb":"transparent"}`,transition:"background .1s"}}>
    <svg style={{width:14,height:14,color:active?"#2563eb":"#9ca3af",flexShrink:0}} viewBox="0 0 24 24" fill="currentColor">{icon}</svg>
    <span style={{fontSize:"12px",color:active?"#1e40af":"#4b5563",fontWeight:active?600:500,flex:1}}>{label}</span>
    {badge!==undefined&&<span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"9px",fontWeight:600,background:badgeBg||"#f4f6f9",color:badgeColor||"#374151"}}>{badge}</span>}
  </div>;
}

// ─── LOGIN SCREEN ────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [errs,setErrs]=useState({}); const [loading,setLoading]=useState(false);
  const [sErr,setSErr]=useState("");

  async function attempt() {
    setSErr("");
    const e=validate({email:[V.req,V.email],pass:[V.req,V.min6]},{email,pass});
    if(Object.keys(e).length){setErrs(e);return;}
    if(!rateOk(email)){setSErr("Too many attempts. Wait 1 minute.");return;}
    setLoading(true);
    try {
      const {data,error}=await sb.auth.signInWithPassword({email:email.trim().toLowerCase(),password:pass});
      if(error){setSErr(error.message||"Invalid credentials.");setLoading(false);return;}
      const {data:p,error:pe}=await sb.from("profiles").select("*").eq("id",data.user.id).single();
      if(pe||!p){setSErr("Profile not found. Contact admin.");await sb.auth.signOut();setLoading(false);return;}
      if(!p.active){setSErr("Account is inactive. Contact admin.");await sb.auth.signOut();setLoading(false);return;}
      onLogin({...p,email:data.user.email}); // email from auth (always accurate)
    } catch(err){setSErr("Connection error. Check Supabase config.");}
    finally{setLoading(false);}
  }

  const setF=(k,v)=>{setErrs(p=>({...p,[k]:undefined}));k==="email"?setEmail(v):setPass(v);};

  return <>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{minHeight:"540px",display:"flex",alignItems:"center",justifyContent:"center",background:"#f4f6f9"}}>
      <div style={{background:"#fff",border:"1px solid #e2e6ec",borderRadius:"14px",padding:"32px",width:"380px",boxShadow:"0 4px 24px rgba(0,0,0,.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",justifyContent:"center",marginBottom:"22px"}}>
          <div style={{width:36,height:36,background:"#2564eb00",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img style={{width:50,height:55,fill:"#fff"}} viewBox="0 0 24 24" src="/public/favicon.png"></img>
          </div>
          <div><div style={{fontSize:"17px",fontWeight:700}}>DocsHub</div><div style={{fontSize:"10px",color:"#9ca3af"}}>Centralized Documentation Portal</div></div>
        </div>
        {/* <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:"8px",padding:"11px 13px",marginBottom:"18px",fontSize:"11px",color:"#0369a1",lineHeight:1.7}}>
          <strong>Powered by Supabase Auth.</strong><br/>Sign in with your registered email and password.<br/>
          <span style={{color:"#0284c7"}}>Default: admin@docs.com / Admin@123456</span>
        </div> */}
        <Fld label="Email" req><Inp value={email} onChange={v=>setF("email",v)} type="email" placeholder="you@company.com" error={errs.email} onKeyDown={e=>e.key==="Enter"&&attempt()} autoFocus/></Fld>
        <Fld label="Password" req><Inp value={pass} onChange={v=>setF("pass",v)} type="password" placeholder="Min 8 characters" error={errs.pass} onKeyDown={e=>e.key==="Enter"&&attempt()}/></Fld>
        {sErr&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"7px",padding:"9px 12px",fontSize:"12px",color:"#991b1b",marginBottom:"12px"}}>{sErr}</div>}
        <button onClick={attempt} disabled={loading} style={{width:"100%",background:"#2563eb",color:"#fff",border:"none",borderRadius:"8px",padding:"11px",fontFamily:"inherit",fontSize:"13px",fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?.75:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
          {loading&&<Spinner size={14} color="#fff"/>}{loading?"Signing in…":"Sign in to DocsHub"}
        </button>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",fontSize:"10px",color:"#9ca3af",marginTop:"14px"}}>
          <svg style={{width:11,height:11,fill:"#9ca3af"}} viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          Supabase Auth · RLS · Rate-limited
        </div>
      </div>
    </div>
  </>;
}

// ─── DOC ROW ─────────────────────────────────────────────────────
function DocRow({doc,canAccess,isAdmin,isEditor,onEdit,onDelete}) {
  const [hov,setHov]=useState(false);
  const locked=!canAccess(doc);
  return <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{...G.dr,background:hov?"#f8faff":"#fff",opacity:locked?.5:1,cursor:locked?"not-allowed":"default"}}>
    <TBadge type={doc.type}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:"12px",fontWeight:500,color:"#1a1d23",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</div>
      <div style={{fontSize:"10px",color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.sub}</div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
      <SDot status={doc.status}/><SrcTag src={doc.src}/>
      {locked
        ? <span style={{fontSize:"10px",color:"#9ca3af",display:"flex",alignItems:"center",gap:"3px"}}>
            <svg style={{width:11,height:11,fill:"#9ca3af"}} viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>Restricted
          </span>
        : doc.url
          ? <a href={doc.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
              style={{fontSize:"10px",color:"#2563eb",fontWeight:600,padding:"3px 9px",border:"1px solid #bfdbfe",borderRadius:"6px",background:"#eff4ff",textDecoration:"none",whiteSpace:"nowrap"}}>Open →</a>
          : <span style={{fontSize:"10px",color:"#c4c9d4"}}>No link</span>
      }
      {(isAdmin||(isEditor&&doc.access!=="admin"))&&<Btn size="sm" onClick={e=>{e.stopPropagation();onEdit(doc);}}>Edit</Btn>}
      {isAdmin&&<Btn size="sm" v="dan" onClick={e=>{e.stopPropagation();onDelete(doc);}}>Del</Btn>}
    </div>
  </div>;
}

// ─── PANEL SECTION ───────────────────────────────────────────────
function Panel({panel,docs,canAccess,isAdmin,isEditor,onAdd,onEdit,onDelete,loading}) {
  const m=PANEL_META[panel];
  const pd=docs.filter(d=>d.panel===panel);
  return <div style={G.card}>
    <div style={{display:"flex",alignItems:"center",gap:"9px",padding:"9px 13px",background:m.light,borderBottom:`1px solid ${m.border}`}}>
      <div style={{width:9,height:9,borderRadius:"50%",background:m.color,flexShrink:0}}/>
      <span style={{fontSize:"12px",fontWeight:700,color:m.text,flex:1}}>{m.label}</span>
      {loading?<Spinner size={13}/>:<span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"9px",fontWeight:600,background:m.border,color:m.text}}>{pd.length} docs</span>}
      {(isAdmin||isEditor)&&<Btn size="sm" v="pri" sx={{marginLeft:"8px"}} onClick={()=>onAdd(panel)}>+ Doc</Btn>}
    </div>
    {loading
      ? <div style={{padding:"16px",display:"flex",justifyContent:"center"}}><Spinner/></div>
      : pd.length===0
        ? <div style={{padding:"14px 13px",color:"#9ca3af",fontSize:"12px"}}>No documents yet.{(isAdmin||isEditor)?" Click + Doc to add.":""}</div>
        : pd.map(d=><DocRow key={d.id} doc={d} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} onEdit={onEdit} onDelete={onDelete}/>)
    }
  </div>;
}

// ─── DOC MODAL ───────────────────────────────────────────────────
function DocModal({initial,defPanel,onSave,onClose}) {
  const [f,setF]=useState(initial||{panel:defPanel||"b2b",type:"BRD",name:"",sub:"",description:"",status:"live",access:"all",src:"notion",url:""});
  const [errs,setErrs]=useState({}); const [loading,setLoading]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:undefined}));};
  async function save(){
    const e=validate({name:[V.req],url:[V.url]},f);
    if(Object.keys(e).length){setErrs(e);return;}
    setLoading(true);
    await onSave(cleanObj({...f,updated_at:new Date().toISOString()}));
    setLoading(false);onClose();
  }
  const pOpts=Object.entries(PANEL_META).map(([v,m])=>({v,l:m.label}));
  const sOpts=Object.entries(SRC_LABELS).map(([v,l])=>({v,l}));
  return <Modal title={initial?"Edit Document":"Add Document"} onClose={onClose}
    footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="pri" onClick={save} loading={loading}>{initial?"Save Changes":"Add Document"}</Btn></>}>
    <div style={G.r2}>
      <Fld label="Panel" req><Sel value={f.panel} onChange={v=>set("panel",v)} opts={pOpts} error={errs.panel}/></Fld>
      <Fld label="Type" req><Sel value={f.type} onChange={v=>set("type",v)} opts={TYPE_OPTS} error={errs.type}/></Fld>
    </div>
    <Fld label="Document Name" req><Inp value={f.name} onChange={v=>set("name",v)} placeholder="e.g. B2B Portal — Functional Requirements" error={errs.name}/></Fld>
    <Fld label="Short Description"><Inp value={f.sub} onChange={v=>set("sub",v)} placeholder="Brief subtitle shown in the list" error={errs.sub}/></Fld>
    <Fld label="Full Description / Notes"><Ta value={f.description} onChange={v=>set("description",v)} placeholder="Detailed notes, scope, context…"/></Fld>
    <div style={G.r2}>
      <Fld label="Status"><Sel value={f.status} onChange={v=>set("status",v)} opts={["live","draft","review","closed"].map(s=>({v:s,l:s.charAt(0).toUpperCase()+s.slice(1)}))}/></Fld>
      <Fld label="Access Level"><Sel value={f.access} onChange={v=>set("access",v)} opts={[{v:"all",l:"Everyone"},{v:"editor",l:"Editor+"},{v:"admin",l:"Admin only"}]}/></Fld>
    </div>
    <div style={G.r2}>
      <Fld label="Source Space"><Sel value={f.src} onChange={v=>set("src",v)} opts={sOpts}/></Fld>
      <Fld label="URL / Link"><Inp value={f.url} onChange={v=>set("url",v)} placeholder="https://…" error={errs.url}/></Fld>
    </div>
  </Modal>;
}

// ─── CLIENT MODAL ────────────────────────────────────────────────
function ClientModal({initial,onSave,onClose}) {
  const [f,setF]=useState(initial||{type:"b2b",name:"",kind:"",contact:"",email:"",phone:"",website:"",notes:"",status:"live"});
  const [errs,setErrs]=useState({}); const [loading,setLoading]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:undefined}));};
  async function save(){
    const e={};
    if(!f.name?.trim()) e.name="Required.";
    if(f.email?.trim()){const r=V.email(f.email);if(r)e.email=r;}
    if(f.phone?.trim()){const r=V.phone(f.phone);if(r)e.phone=r;}
    if(f.website?.trim()){const r=V.url(f.website);if(r)e.website=r;}
    if(Object.keys(e).length){setErrs(e);return;}
    setLoading(true);
    await onSave(cleanObj({...f,updated_at:new Date().toISOString()}));
    setLoading(false);onClose();
  }
  return <Modal title={initial?"Edit Client":"Add Client"} onClose={onClose}
    footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="pri" onClick={save} loading={loading}>{initial?"Save Changes":"Add Client"}</Btn></>}>
    <div style={G.r2}>
      <Fld label="Client Name" req><Inp value={f.name} onChange={v=>set("name",v)} placeholder="e.g. Flipkart India" error={errs.name}/></Fld>
      <Fld label="Type"><Sel value={f.type} onChange={v=>set("type",v)} opts={[{v:"b2b",l:"B2B"},{v:"d2c",l:"D2C"},{v:"merchant",l:"Merchant"}]}/></Fld>
    </div>
    <div style={G.r2}>
      <Fld label="Business Kind"><Inp value={f.kind} onChange={v=>set("kind",v)} placeholder="B2B Enterprise, D2C Consumer…"/></Fld>
      <Fld label="Status"><Sel value={f.status} onChange={v=>set("status",v)} opts={[{v:"live",l:"Live"},{v:"closed",l:"Closed"},{v:"prospect",l:"Prospect"}]}/></Fld>
    </div>
    <div style={G.r2}>
      <Fld label="Contact Person"><Inp value={f.contact} onChange={v=>set("contact",v)} placeholder="Rahul Verma"/></Fld>
      <Fld label="Contact Email"><Inp value={f.email} onChange={v=>set("email",v)} type="email" placeholder="rahul@client.com" error={errs.email}/></Fld>
    </div>
    <div style={G.r2}>
      <Fld label="Phone"><Inp value={f.phone} onChange={v=>set("phone",v)} placeholder="+91 9876543210" error={errs.phone}/></Fld>
      <Fld label="Website"><Inp value={f.website} onChange={v=>set("website",v)} placeholder="https://client.com" error={errs.website}/></Fld>
    </div>
    <Fld label="Notes"><Ta value={f.notes} onChange={v=>set("notes",v)} placeholder="Any additional notes about this client…"/></Fld>
  </Modal>;
}

// ─── CLIENT DOC MODAL ────────────────────────────────────────────
function ClientDocModal({initial,clientId,onSave,onClose}) {
  const [f,setF]=useState(initial||{client_id:clientId,title:"",type:"Contract",url:"",src:"drive",notes:"",status:"live"});
  const [errs,setErrs]=useState({}); const [loading,setLoading]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:undefined}));};
  async function save(){
    const e=validate({title:[V.req],url:[V.url]},f);
    if(Object.keys(e).length){setErrs(e);return;}
    setLoading(true);
    await onSave(cleanObj({...f,updated_at:new Date().toISOString()}));
    setLoading(false);onClose();
  }
  const sOpts=Object.entries(SRC_LABELS).map(([v,l])=>({v,l}));
  return <Modal title={initial?"Edit Document":"Add Document to Client"} onClose={onClose}
    footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="pri" onClick={save} loading={loading}>{initial?"Save":"Add Document"}</Btn></>}>
    <div style={G.r2}>
      <Fld label="Document Title" req><Inp value={f.title} onChange={v=>set("title",v)} placeholder="e.g. TechCorp SLA 2025" error={errs.title}/></Fld>
      <Fld label="Type"><Sel value={f.type} onChange={v=>set("type",v)} opts={TYPE_OPTS}/></Fld>
    </div>
    <div style={G.r2}>
      <Fld label="Source"><Sel value={f.src} onChange={v=>set("src",v)} opts={sOpts}/></Fld>
      <Fld label="Status"><Sel value={f.status} onChange={v=>set("status",v)} opts={["live","draft","review","closed"].map(s=>({v:s,l:s.charAt(0).toUpperCase()+s.slice(1)}))}/></Fld>
    </div>
    <Fld label="URL / Link"><Inp value={f.url} onChange={v=>set("url",v)} placeholder="https://drive.google.com/…" error={errs.url}/></Fld>
    <Fld label="Notes"><Ta value={f.notes} onChange={v=>set("notes",v)} placeholder="Any notes about this document…"/></Fld>
  </Modal>;
}

// ─── CLIENT DETAIL MODAL ─────────────────────────────────────────
function ClientDetailModal({client,clientDocs,isAdmin,isEditor,onAddDoc,onEditDoc,onDeleteDoc,onClose}) {
  const docs=clientDocs.filter(d=>d.client_id===client.id);
  const tc={b2b:{bg:"#eff4ff",cl:"#2563eb"},d2c:{bg:"#f5f3ff",cl:"#7c3aed"},merchant:{bg:"#ecfdf5",cl:"#059669"}}[client.type]||{bg:"#f4f6f9",cl:"#374151"};
  return <Modal title={`${client.name} — Client Documents`} onClose={onClose} wide
    footer={<><Btn onClick={onClose}>Close</Btn>{(isAdmin||isEditor)&&<Btn v="pri" onClick={()=>onAddDoc(client.id)}>+ Add Document</Btn>}</>}>
    {/* Client info strip */}
    <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 13px",background:"#f8faff",borderRadius:"8px",marginBottom:"16px",border:"1px solid #e2e6ec"}}>
      <div style={{width:34,height:34,borderRadius:"9px",background:tc.bg,color:tc.cl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,flexShrink:0}}>{ini(client.name)}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"13px",fontWeight:700}}>{client.name}</div>
        <div style={{fontSize:"10px",color:"#9ca3af"}}>{client.kind}{client.contact&&" · "+client.contact}{client.email&&" · "+client.email}</div>
      </div>
      <span style={{fontSize:"9px",padding:"3px 8px",borderRadius:"9px",fontWeight:600,background:client.status==="live"?"#ecfdf5":"#f4f6f9",color:client.status==="live"?"#065f46":"#6b7280",flexShrink:0}}>{client.status}</span>
    </div>
    {/* Doc list */}
    <div style={{fontSize:"11px",fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:".06em",marginBottom:"8px"}}>Linked Documents ({docs.length})</div>
    {docs.length===0
      ? <div style={{padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:"12px",background:"#f8fafc",borderRadius:"8px",border:"1px solid #e2e6ec"}}>
          No documents linked.{(isAdmin||isEditor)?" Click + Add Document above.":""}
        </div>
      : <div style={{border:"1px solid #e2e6ec",borderRadius:"8px",overflow:"hidden"}}>
          {docs.map((d,i)=>
            <div key={d.id} style={{display:"flex",alignItems:"center",gap:"9px",padding:"9px 13px",borderBottom:i<docs.length-1?"1px solid #f4f6f9":"none",background:"#fff"}}>
              <TBadge type={d.type}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"12px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                {d.notes&&<div style={{fontSize:"10px",color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.notes}</div>}
              </div>
              <SDot status={d.status}/><SrcTag src={d.src}/>
              {d.url&&<a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:"10px",color:"#2563eb",fontWeight:600,padding:"3px 9px",border:"1px solid #bfdbfe",borderRadius:"6px",background:"#eff4ff",textDecoration:"none"}}>Open →</a>}
              {(isAdmin||isEditor)&&<Btn size="sm" onClick={()=>onEditDoc(d)}>Edit</Btn>}
              {isAdmin&&<Btn size="sm" v="dan" onClick={()=>onDeleteDoc(d)}>Del</Btn>}
            </div>
          )}
        </div>
    }
  </Modal>;
}

// ─── USER MODAL ──────────────────────────────────────────────────
function UserModal({initial,existingEmails,onSave,onClose}) {
  const [f,setF]=useState(initial||{name:"",email:"",pass:"",role:"viewer",active:true});
  const [pass2,setPass2]=useState(""); const [errs,setErrs]=useState({}); const [loading,setLoading]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:undefined}));};
  async function save(){
    const e={};
    if(!f.name?.trim()) e.name="Required.";
    const emailVal=V.email(f.email); if(emailVal) e.email=emailVal;
    if(existingEmails.map(x=>x.toLowerCase()).includes(f.email?.trim().toLowerCase())&&f.email?.trim().toLowerCase()!==initial?.email?.toLowerCase()) e.email="Email already registered.";
    if(!initial){
      if(!f.pass||f.pass.length<8) e.pass="Min 8 characters.";
      if(f.pass!==pass2) e.pass2="Passwords do not match.";
    } else if(f.pass&&f.pass.length<8) e.pass="Min 8 characters.";
    if(Object.keys(e).length){setErrs(e);return;}
    setLoading(true);
    await onSave(cleanObj({...f,email:f.email.trim().toLowerCase()}));
    setLoading(false);onClose();
  }
  return <Modal title={initial?`Edit User — ${initial.name}`:"Add New User"} onClose={onClose}
    footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="pri" onClick={save} loading={loading}>{initial?"Save Changes":"Add User"}</Btn></>}>
    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:"7px",padding:"9px 12px",fontSize:"11px",color:"#92400e",marginBottom:"14px",lineHeight:1.6}}>
      {initial
        ? "Updating name/role changes immediately. Password is only updated if you enter a new one."
        : "A new Supabase Auth account is created via the create_docshub_user() RPC. The user can log in immediately."
      }
    </div>
    <div style={G.r2}>
      <Fld label="Full Name" req><Inp value={f.name} onChange={v=>set("name",v)} placeholder="Riya Sharma" error={errs.name}/></Fld>
      <Fld label="Role"><Sel value={f.role} onChange={v=>set("role",v)} opts={[{v:"viewer",l:"Viewer"},{v:"editor",l:"Editor"},{v:"admin",l:"Admin"}]}/></Fld>
    </div>
    <Fld label="Email" req><Inp value={f.email} onChange={v=>set("email",v)} type="email" placeholder="riya@company.com" error={errs.email}/></Fld>
    <div style={G.r2}>
      <Fld label={initial?"New Password (leave blank to keep)":"Password"} req={!initial}>
        <Inp value={f.pass} onChange={v=>set("pass",v)} type="password" placeholder={initial?"Leave blank to keep current":"Min 8 characters"} error={errs.pass}/>
      </Fld>
      {!initial
        ? <Fld label="Confirm Password" req><Inp value={pass2} onChange={setPass2} type="password" placeholder="Repeat password" error={errs.pass2}/></Fld>
        : <Fld label="Status"><Sel value={f.active?"true":"false"} onChange={v=>set("active",v==="true")} opts={[{v:"true",l:"Active"},{v:"false",l:"Inactive"}]}/></Fld>
      }
    </div>
  </Modal>;
}

// ─── SPACE MODAL ─────────────────────────────────────────────────
function SpaceModal({onSave,onClose}) {
  const [f,setF]=useState({name:"",ic:"",bg:"#374151",fg:"#ffffff",sub:"",url:""});
  const [errs,setErrs]=useState({}); const [loading,setLoading]=useState(false);
  const set=(k,v)=>{setF(p=>({...p,[k]:v}));setErrs(p=>({...p,[k]:undefined}));};
  async function save(){
    const e=validate({name:[V.req],url:[V.url]},f);
    if(Object.keys(e).length){setErrs(e);return;}
    setLoading(true); await onSave(cleanObj({...f})); setLoading(false); onClose();
  }
  return <Modal title="Add Connected Space" onClose={onClose}
    footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="pri" onClick={save} loading={loading}>Add Space</Btn></>}>
    <div style={G.r2}>
      <Fld label="Space Name" req><Inp value={f.name} onChange={v=>set("name",v)} placeholder="e.g. Jira" error={errs.name}/></Fld>
      <Fld label="Icon (1-2 letters)"><Inp value={f.ic} onChange={v=>set("ic",v.slice(0,2).toUpperCase())} placeholder="J" maxLength={2}/></Fld>
    </div>
    <div style={G.r2}>
      <Fld label="Background Color"><Inp value={f.bg} onChange={v=>set("bg",v)} placeholder="#0052cc"/></Fld>
      <Fld label="Description"><Inp value={f.sub} onChange={v=>set("sub",v)} placeholder="Issue tracking"/></Fld>
    </div>
    <Fld label="URL"><Inp value={f.url} onChange={v=>set("url",v)} placeholder="https://jira.atlassian.com" error={errs.url}/></Fld>
  </Modal>;
}

// ─── DELETE CONFIRM ──────────────────────────────────────────────
function DelModal({msg,onConfirm,onClose}) {
  const [loading,setLoading]=useState(false);
  return <Modal title="Confirm Delete" onClose={onClose}
    footer={<><Btn onClick={onClose}>Cancel</Btn><Btn v="dan" loading={loading} onClick={async()=>{setLoading(true);await onConfirm();setLoading(false);onClose();}}>Yes, Delete</Btn></>}>
    <div style={{background:"#fff5f5",border:"1px solid #fecaca",borderRadius:"8px",padding:"13px",fontSize:"12px",color:"#374151",lineHeight:1.7}}>{msg}</div>
  </Modal>;
}

// ─── PAGES ───────────────────────────────────────────────────────
function PageOverview({docs,clients,users,canAccess,isAdmin,isEditor,dA,loading}) {
  return <>
    <div style={G.topbar}><div><div style={{fontSize:"16px",fontWeight:700}}>Overview</div><div style={{fontSize:"11px",color:"#9ca3af"}}>All documentation at a glance</div></div></div>
    <div style={G.stats}>
      {[["Total Docs",docs.length,"#2563eb"],["Live",docs.filter(d=>d.status==="live").length,"#059669"],["Clients",clients.length,"#7c3aed"],["Active Users",users.filter(u=>u.active).length,"#d97706"]].map(([l,n,c])=>
        <div key={l} style={G.stat}><div style={{fontSize:"20px",fontWeight:700,color:c}}>{n}</div><div style={{fontSize:"10px",color:"#9ca3af",textTransform:"uppercase",letterSpacing:".05em"}}>{l}</div></div>
      )}
    </div>
    {["b2b","d2c","merchant","other"].map(p=><Panel key={p} panel={p} docs={docs} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} loading={loading} {...dA}/>)}
  </>;
}

function PageDocs({panel,docs,canAccess,isAdmin,isEditor,dA,loading}) {
  const m=PANEL_META[panel];
  return <>
    <div style={G.topbar}><div><div style={{fontSize:"16px",fontWeight:700}}>{m.label}</div><div style={{fontSize:"11px",color:"#9ca3af"}}>All documentation for this panel</div></div></div>
    <Panel panel={panel} docs={docs} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} loading={loading} {...dA}/>
  </>;
}

function PageClients({clients,clientDocs,isAdmin,isEditor,loading,onAdd,onEdit,onDelete,onView}) {
  const [search,setSearch]=useState(""); const [filt,setFilt]=useState("all");
  const tc={b2b:{bg:"#eff4ff",cl:"#2563eb"},d2c:{bg:"#f5f3ff",cl:"#7c3aed"},merchant:{bg:"#ecfdf5",cl:"#059669"}};
  const list=clients.filter(c=>{
    if(filt!=="all"&&c.type!==filt) return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.kind?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  return <>
    <div style={G.topbar}>
      <div><div style={{fontSize:"16px",fontWeight:700}}>Clients</div><div style={{fontSize:"11px",color:"#9ca3af"}}>All client profiles and linked documents</div></div>
      {(isAdmin||isEditor)&&<Btn v="pri" onClick={onAdd}>+ Add Client</Btn>}
    </div>
    <div style={{display:"flex",gap:"7px",marginBottom:"12px",flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…" style={{...G.inp,maxWidth:"210px"}}/>
      {["all","b2b","d2c","merchant"].map(f=><button key={f} onClick={()=>setFilt(f)} style={{padding:"6px 12px",borderRadius:"6px",border:`1px solid ${filt===f?"#2563eb":"#e2e6ec"}`,background:filt===f?"#eff4ff":"#fff",color:filt===f?"#1e40af":"#374151",fontFamily:"inherit",fontSize:"11px",fontWeight:600,cursor:"pointer"}}>{f==="all"?"All":f.toUpperCase()}</button>)}
    </div>
    {loading?<div style={{display:"flex",justifyContent:"center",padding:"30px"}}><Spinner/></div>:
    <div style={G.cg}>
      {list.map(c=>{
        const col=tc[c.type]||tc.b2b;
        const cd=clientDocs.filter(d=>d.client_id===c.id);
        return <div key={c.id} style={G.cc}>
          <div style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"8px"}}>
            <div style={{width:32,height:32,borderRadius:"9px",background:col.bg,color:col.cl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,flexShrink:0}}>{ini(c.name)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"12px",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
              <div style={{fontSize:"10px",color:"#9ca3af"}}>{c.kind}</div>
            </div>
            <span style={{fontSize:"9px",padding:"2px 7px",borderRadius:"9px",fontWeight:600,background:c.status==="live"?"#ecfdf5":c.status==="prospect"?"#fffbeb":"#f4f6f9",color:c.status==="live"?"#065f46":c.status==="prospect"?"#92400e":"#6b7280",flexShrink:0}}>{c.status}</span>
          </div>
          {c.contact&&<div style={{fontSize:"10px",color:"#6b7280",marginBottom:"5px"}}>{c.contact}{c.email&&" · "+c.email}</div>}
          {c.notes&&<div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"7px",padding:"5px 8px",background:"#f8fafc",borderRadius:"6px",border:"1px solid #f0f2f5",lineHeight:1.5}}>{c.notes}</div>}
          <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"10px",flexWrap:"wrap"}}>
            <span style={{fontSize:"10px",color:"#9ca3af"}}>{cd.length} doc{cd.length!==1?"s":""}</span>
            {cd.slice(0,3).map(d=><TBadge key={d.id} type={d.type}/>)}
            {cd.length>3&&<span style={{fontSize:"10px",color:"#9ca3af"}}>+{cd.length-3}</span>}
          </div>
          <div style={{display:"flex",gap:"5px",paddingTop:"9px",borderTop:"1px solid #f4f6f9",flexWrap:"wrap"}}>
            <Btn size="sm" v="pri" onClick={()=>onView(c)}>View Docs</Btn>
            {(isAdmin||isEditor)&&<Btn size="sm" onClick={()=>onEdit(c)}>Edit</Btn>}
            {isAdmin&&<Btn size="sm" v="dan" onClick={()=>onDelete(c)}>Delete</Btn>}
          </div>
        </div>;
      })}
      {list.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"30px",color:"#9ca3af",fontSize:"12px"}}>No clients found.</div>}
    </div>}
  </>;
}

function PageSpaces({spaces,isAdmin,loading,onAdd,onDelete}) {
  return <>
    <div style={G.topbar}>
      <div><div style={{fontSize:"16px",fontWeight:700}}>Connected Spaces</div><div style={{fontSize:"11px",color:"#9ca3af"}}>All linked documentation sources</div></div>
      {isAdmin&&<Btn v="pri" onClick={onAdd}>+ Add Space</Btn>}
    </div>
    {loading?<div style={{display:"flex",justifyContent:"center",padding:"30px"}}><Spinner/></div>:
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
      {spaces.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:"9px",padding:"11px 13px",border:"1px solid #e2e6ec",borderRadius:"9px",background:"#fff"}}>
        <div style={{width:30,height:30,borderRadius:"8px",background:s.bg,color:s.fg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:700,flexShrink:0}}>{s.ic}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:"12px",fontWeight:600}}>{s.name}</div><div style={{fontSize:"10px",color:"#9ca3af"}}>{s.sub}</div></div>
        {s.url&&s.url!=="#"&&<a href={s.url} target="_blank" rel="noreferrer" style={{fontSize:"11px",color:"#2563eb",fontWeight:600,textDecoration:"none",flexShrink:0}}>Open →</a>}
        {isAdmin&&<Btn size="sm" v="dan" onClick={()=>onDelete(s.id)}>Del</Btn>}
      </div>)}
      {spaces.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"30px",color:"#9ca3af",fontSize:"12px"}}>No spaces yet.</div>}
    </div>}
  </>;
}

function PageUsers({users,cu,isAdmin,loading,onAdd,onEdit,onDelete}) {
  return <>
    <div style={G.topbar}>
      <div><div style={{fontSize:"16px",fontWeight:700}}>Users</div><div style={{fontSize:"11px",color:"#9ca3af"}}>Manage team access, roles & passwords</div></div>
      {/* {isAdmin&&<Btn v="pri" onClick={onAdd}>+ Add User</Btn>} */}
    </div>
    <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:"8px",padding:"10px 13px",fontSize:"11px",color:"#0369a1",marginBottom:"12px",lineHeight:1.6}}>
      <strong>Note:</strong> New users are created directly in Supabase Auth via the <code>create_docshub_user()</code> RPC. They can log in immediately — no email confirmation needed if you disabled it in Supabase Auth settings.
    </div>
    {loading?<div style={{display:"flex",justifyContent:"center",padding:"30px"}}><Spinner/></div>:
    <div style={{background:"#fff",border:"1px solid #e2e6ec",borderRadius:"9px",overflow:"hidden"}}>
      {users.map((u,i)=><div key={u.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 13px",borderBottom:i<users.length-1?"1px solid #f4f6f9":"none"}}>
        <Av name={u.name} role={u.role} size={30}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"12px",fontWeight:600}}>{u.name}{u.id===cu.id&&<span style={{fontSize:"9px",marginLeft:"6px",color:"#9ca3af"}}>(you)</span>}</div>
          <div style={{fontSize:"10px",color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
        </div>
        <RolePill role={u.role}/>
        <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:u.active?"#059669":"#9ca3af"}}/>
          <span style={{fontSize:"10px",color:"#9ca3af"}}>{u.active?"Active":"Inactive"}</span>
        </div>
        {isAdmin&&<div style={{display:"flex",gap:"5px"}}>
          <Btn size="sm" onClick={()=>onEdit(u)}>Edit</Btn>
          {u.id!==cu.id&&<Btn size="sm" v="dan" onClick={()=>onDelete(u)}>Remove</Btn>}
        </div>}
      </div>)}
      {users.length===0&&<div style={{padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:"12px"}}>No users found.</div>}
    </div>}
  </>;
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const [cu,setCu]           = useState(null);
  const [appLoad,setAppLoad] = useState(true);
  const [docs,setDocs]       = useState([]);
  const [clients,setClients] = useState([]);
  const [cdocs,setCdocs]     = useState([]);   // client_docs
  const [spaces,setSpaces]   = useState([]);
  const [users,setUsers]     = useState([]);
  const [page,setPage]       = useState("overview");
  const [modal,setModal]     = useState(null);
  const [toasts,setToasts]   = useState([]);
  const [dLoad,setDLoad]     = useState(false);

  const isAdmin  = cu?.role==="admin";
  const isEditor = cu?.role==="editor"||isAdmin;

  const toast = useCallback((msg,ok=true)=>{
    const id=Date.now(); setToasts(t=>[...t,{id,msg,ok}]);
  },[]);
  const rmToast = id => setToasts(t=>t.filter(x=>x.id!==id));

  // ── AUTH STATE ──────────────────────────────────────────────────
  useEffect(()=>{
    sb.auth.getSession().then(async({data:{session}})=>{
      if(session){
        const {data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
        if(p?.active) setCu({...p,email:session.user.email});
        else await sb.auth.signOut();
      }
      setAppLoad(false);
    });
    const {data:{subscription}}=sb.auth.onAuthStateChange(async(ev,session)=>{
      if(ev==="SIGNED_OUT"){setCu(null);setPage("overview");}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── LOAD ALL DATA ───────────────────────────────────────────────
  const loadAll=useCallback(async()=>{
    if(!cu) return;
    setDLoad(true);
    const [dr,cr,cdr,sr,ur]=await Promise.all([
      sb.from("docs").select("*").order("created_at",{ascending:false}),
      sb.from("clients").select("*").order("name"),
      sb.from("client_docs").select("*").order("created_at",{ascending:false}),
      sb.from("spaces").select("*").order("name"),
      isAdmin ? sb.from("profiles").select("*").order("name") : {data:[]},
    ]);
    if(dr.data) setDocs(dr.data);
    if(cr.data) setClients(cr.data);
    if(cdr.data) setCdocs(cdr.data);
    if(sr.data) setSpaces(sr.data);
    if(ur.data) setUsers(ur.data);
    setDLoad(false);
  },[cu,isAdmin]);

  useEffect(()=>{if(cu) loadAll();},[cu]);

  function canAccess(doc) {
    if(!cu) return false;
    if(doc.access==="all") return true;
    if(doc.access==="editor") return isEditor;
    return isAdmin;
  }

  // async function logout(){await sb.auth.signOut();setCu(null);}
  async function logout() {
  const confirmLogout = window.confirm("Are you sure you want to sign out?");
  if (!confirmLogout) return;

  await sb.auth.signOut();
  setCu(null);
}

  // ── DOC CRUD ────────────────────────────────────────────────────
  async function saveDoc(data){
    if(data.id){
      const {error}=await sb.from("docs").update(data).eq("id",data.id);
      if(error){toast(error.message,false);return;}
      setDocs(d=>d.map(x=>x.id===data.id?{...x,...data}:x)); toast("Document updated!");
    } else {
      const {data:nd,error}=await sb.from("docs").insert({...data,created_by:cu.id}).select().single();
      if(error){toast(error.message,false);return;}
      setDocs(d=>[nd,...d]); toast("Document added!");
    }
  }
  async function delDoc(doc){
    const {error}=await sb.from("docs").delete().eq("id",doc.id);
    if(error){toast(error.message,false);return;}
    setDocs(d=>d.filter(x=>x.id!==doc.id)); toast("Document deleted.");
  }

  // ── CLIENT CRUD ─────────────────────────────────────────────────
  async function saveClient(data){
    if(data.id){
      const {error}=await sb.from("clients").update(data).eq("id",data.id);
      if(error){toast(error.message,false);return;}
      setClients(c=>c.map(x=>x.id===data.id?{...x,...data}:x)); toast("Client updated!");
    } else {
      const {data:nc,error}=await sb.from("clients").insert({...data,created_by:cu.id}).select().single();
      if(error){toast(error.message,false);return;}
      setClients(c=>[...c,nc]); toast("Client added!");
    }
  }
  async function delClient(client){
    const {error}=await sb.from("clients").delete().eq("id",client.id);
    if(error){toast(error.message,false);return;}
    setClients(c=>c.filter(x=>x.id!==client.id));
    setCdocs(d=>d.filter(x=>x.client_id!==client.id));
    toast("Client deleted.");
  }

  // ── CLIENT DOC CRUD ─────────────────────────────────────────────
  async function saveCdoc(data){
    if(data.id){
      const {error}=await sb.from("client_docs").update(data).eq("id",data.id);
      if(error){toast(error.message,false);return;}
      setCdocs(d=>d.map(x=>x.id===data.id?{...x,...data}:x)); toast("Document updated!");
    } else {
      const {data:nd,error}=await sb.from("client_docs").insert({...data,created_by:cu.id}).select().single();
      if(error){toast(error.message,false);return;}
      setCdocs(d=>[nd,...d]); toast("Document added to client!");
    }
  }
  async function delCdoc(doc){
    const {error}=await sb.from("client_docs").delete().eq("id",doc.id);
    if(error){toast(error.message,false);return;}
    setCdocs(d=>d.filter(x=>x.id!==doc.id)); toast("Document removed.");
  }

  // ── SPACE CRUD ──────────────────────────────────────────────────
  async function saveSpace(data){
    const {data:ns,error}=await sb.from("spaces").insert({...data,created_by:cu.id}).select().single();
    if(error){toast(error.message,false);return;}
    setSpaces(s=>[...s,ns]); toast("Space added!");
  }
  async function delSpace(id){
    const {error}=await sb.from("spaces").delete().eq("id",id);
    if(error){toast(error.message,false);return;}
    setSpaces(s=>s.filter(x=>x.id!==id)); toast("Space removed.");
  }

  // ── USER CRUD — via Supabase RPC (create_docshub_user) ──────────
  async function saveUser(data){
    if(data.id){
      // Edit existing user — call update_docshub_user RPC
      const {data:res,error}=await sb.rpc("update_docshub_user",{
        p_user_id:data.id, p_name:data.name, p_role:data.role,
        p_active:data.active, p_password:data.pass||null,
      });
      if(error||res?.success===false){toast((error?.message||res?.error||"Update failed."),false);return;}
      setUsers(u=>u.map(x=>x.id===data.id?{...x,name:data.name,role:data.role,active:data.active}:x));
      toast("User updated!");
    } else {
      // Create new user — calls create_docshub_user(email, password, name, role)
      const {data:res,error}=await sb.rpc("create_docshub_user",{
        p_email:data.email, p_password:data.pass, p_name:data.name, p_role:data.role,
      });
      if(error||res?.success===false){toast((error?.message||res?.error||"Failed to create user."),false);return;}
      // Reload user list
      const {data:ul}=await sb.from("profiles").select("*").order("name");
      if(ul) setUsers(ul);
      toast(`User ${data.name} created! They can log in immediately.`);
    }
  }
  async function delUser(user){
    const {data:res,error}=await sb.rpc("deactivate_docshub_user",{p_user_id:user.id});
    if(error||res?.success===false){toast((error?.message||res?.error||"Failed."),false);return;}
    setUsers(u=>u.map(x=>x.id===user.id?{...x,active:false}:x));
    toast("User deactivated.");
  }

  // ── NAV ─────────────────────────────────────────────────────────
  const navTop=[
    {key:"overview",label:"Overview",icon:<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>},
    {key:"b2b",label:"B2B Portal",badge:docs.filter(d=>d.panel==="b2b").length,badgeBg:"#eff4ff",badgeColor:"#1e40af",icon:<path d="M20 6h-2.18c.07-.44.18-.88.18-1.35C18 2.53 15.94.5 13.5.5c-1.3 0-2.4.56-3.2 1.44L10 2.27l-.3-.33C8.9 1.06 7.8.5 6.5.5 4.06.5 2 2.53 2 4.65c0 .47.11.91.18 1.35H0v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8l-2-2z"/>},
    {key:"d2c",label:"D2C App",badge:docs.filter(d=>d.panel==="d2c").length,badgeBg:"#f5f3ff",badgeColor:"#5b21b6",icon:<path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>},
    {key:"merchant",label:"Merchant Panel",badge:docs.filter(d=>d.panel==="merchant").length,badgeBg:"#ecfdf5",badgeColor:"#065f46",icon:<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>},
    {key:"other",label:"Other / General",badge:docs.filter(d=>d.panel==="other").length,badgeBg:"#fffbeb",badgeColor:"#92400e",icon:<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>},
  ];
  const navBot=[
    {key:"clients",label:"Clients",badge:clients.length,icon:<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>},
    {key:"spaces",label:"Spaces",icon:<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>},
    ...(isAdmin?[{key:"users",label:"Users",badge:users.length,icon:<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>}]:[]),
  ];

  const dA={
    onAdd:   panel=>setModal({type:"addDoc",panel}),
    onEdit:  doc  =>setModal({type:"editDoc",doc}),
    onDelete:doc  =>setModal({type:"delDoc",doc}),
  };

  function renderPage(){
    switch(page){
      case "overview":  return <PageOverview docs={docs} clients={clients} users={users} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} dA={dA} loading={dLoad}/>;
      case "b2b":       return <PageDocs panel="b2b"      docs={docs} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} dA={dA} loading={dLoad}/>;
      case "d2c":       return <PageDocs panel="d2c"      docs={docs} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} dA={dA} loading={dLoad}/>;
      case "merchant":  return <PageDocs panel="merchant"  docs={docs} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} dA={dA} loading={dLoad}/>;
      case "other":     return <PageDocs panel="other"     docs={docs} canAccess={canAccess} isAdmin={isAdmin} isEditor={isEditor} dA={dA} loading={dLoad}/>;
      case "clients":   return <PageClients clients={clients} clientDocs={cdocs} isAdmin={isAdmin} isEditor={isEditor} loading={dLoad}
          onAdd={()=>setModal({type:"addClient"})} onEdit={c=>setModal({type:"editClient",client:c})} onDelete={c=>setModal({type:"delClient",client:c})}
          onView={c=>setModal({type:"viewClient",client:c})}/>;
      case "spaces":    return <PageSpaces spaces={spaces} isAdmin={isAdmin} loading={dLoad} onAdd={()=>setModal({type:"addSpace"})} onDelete={async id=>{await delSpace(id);}}/>;
      case "users":     return <PageUsers users={users} cu={cu} isAdmin={isAdmin} loading={dLoad} onAdd={()=>setModal({type:"addUser"})} onEdit={u=>setModal({type:"editUser",user:u})} onDelete={u=>setModal({type:"delUser",user:u})}/>;
      default: return null;
    }
  }

  if(appLoad) return <div style={{minHeight:"400px",display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",background:"#f4f6f9"}}><Spinner size={22}/><span style={{fontSize:"13px",color:"#9ca3af"}}>Connecting to Supabase…</span></div>;
  if(!cu) return <LoginScreen onLogin={u=>{setCu(u);setPage("overview");}}/>;

  return <>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    <div style={G.wrap}>
      {/* ── SIDEBAR ── */}
      <div style={G.sb}>
        <div style={{padding:"13px 13px 11px",borderBottom:"1px solid #f0f2f5",marginBottom:"6px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:27,height:27,background:"#2564eb00",borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <img style={{width:45,height:50,fill:"#fff"}} viewBox="0 0 24 24" src="./favicon.png"></img>
            </div>
            <span style={{fontSize:"13px",fontWeight:700}}>DocsHub</span>
          </div>
        </div>
        <div style={{fontSize:"9px",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"#c4c9d4",padding:"10px 13px 4px"}}>Workspace</div>
        {navTop.map(n=><SbItem key={n.key} {...n} active={page===n.key} onClick={()=>setPage(n.key)}/>)}
        <Divider/>
        <div style={{fontSize:"9px",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"#c4c9d4",padding:"10px 13px 4px"}}>Manage</div>
        {navBot.map(n=><SbItem key={n.key} {...n} active={page===n.key} onClick={()=>setPage(n.key)}/>)}
        <div style={{marginTop:"auto",padding:"11px 13px",borderTop:"1px solid #f0f2f5"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
            <Av name={cu.name} role={cu.role} size={27}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:"11px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cu.name}</div>
              <div style={{fontSize:"9px",color:"#9ca3af"}}>{cu.role} · {cu.email}</div>
            </div>
          </div>
          {/* <div onClick={logout} style={{fontSize:"10px",color:"#9ca3af",cursor:"pointer"}}>Sign out</div> */}
          <button
  onClick={logout}
  style={{fontSize: "11px",fontWeight: 500 ,color: "#ef4444",background: "#fef2f2",border: "1px solid #fecaca",borderRadius: "6px",padding: "6px 10px",cursor: "pointer",display: "flex",alignItems: "center",gap: "6px"}}>Sign Out</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={G.main}>{renderPage()}</div>
    </div>

    {/* ── MODALS ── */}
    {modal?.type==="addDoc"       && <DocModal defPanel={modal.panel} onSave={saveDoc} onClose={()=>setModal(null)}/>}
    {modal?.type==="editDoc"      && <DocModal initial={modal.doc} onSave={saveDoc} onClose={()=>setModal(null)}/>}
    {modal?.type==="delDoc"       && <DelModal msg={`Delete "${modal.doc.name}"? This cannot be undone.`} onConfirm={()=>delDoc(modal.doc)} onClose={()=>setModal(null)}/>}
    {modal?.type==="addClient"    && <ClientModal onSave={saveClient} onClose={()=>setModal(null)}/>}
    {modal?.type==="editClient"   && <ClientModal initial={modal.client} onSave={saveClient} onClose={()=>setModal(null)}/>}
    {modal?.type==="delClient"    && <DelModal msg={`Delete client "${modal.client.name}"? All linked documents will also be permanently removed.`} onConfirm={()=>delClient(modal.client)} onClose={()=>setModal(null)}/>}
    {modal?.type==="viewClient"   && <ClientDetailModal client={modal.client} clientDocs={cdocs} isAdmin={isAdmin} isEditor={isEditor}
        onAddDoc={cid=>setModal({type:"addCdoc",clientId:cid,_prev:modal})}
        onEditDoc={d =>setModal({type:"editCdoc",doc:d,_prev:modal})}
        onDeleteDoc={d=>setModal({type:"delCdoc",doc:d,_prev:modal})}
        onClose={()=>setModal(null)}/>}
    {modal?.type==="addCdoc"      && <ClientDocModal clientId={modal.clientId} onSave={saveCdoc} onClose={()=>setModal(modal._prev||null)}/>}
    {modal?.type==="editCdoc"     && <ClientDocModal initial={modal.doc} clientId={modal.doc?.client_id} onSave={saveCdoc} onClose={()=>setModal(modal._prev||null)}/>}
    {modal?.type==="delCdoc"      && <DelModal msg={`Remove document "${modal.doc?.title}"?`} onConfirm={()=>delCdoc(modal.doc)} onClose={()=>setModal(modal._prev||null)}/>}
    {modal?.type==="addSpace"     && <SpaceModal onSave={saveSpace} onClose={()=>setModal(null)}/>}
    {modal?.type==="addUser"      && <UserModal existingEmails={users.map(u=>u.email)} onSave={saveUser} onClose={()=>setModal(null)}/>}
    {modal?.type==="editUser"     && <UserModal initial={modal.user} existingEmails={users.map(u=>u.email)} onSave={saveUser} onClose={()=>setModal(null)}/>}
    {modal?.type==="delUser"      && <DelModal msg={`Deactivate "${modal.user?.name}"? They will immediately lose access. Their data is preserved.`} onConfirm={()=>delUser(modal.user)} onClose={()=>setModal(null)}/>}

    {/* ── TOASTS ── */}
    {toasts.map(t=><ToastItem key={t.id} msg={t.msg} ok={t.ok} onClose={()=>rmToast(t.id)}/>)}
  </>;
}