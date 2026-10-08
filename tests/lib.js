/* Field JSA test helpers, loaded before each suite (run.py). Made-up data only: this repo is public. */
window.__e=[]; addEventListener("error",e=>__e.push(String(e.message)+" @"+e.lineno));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(f,ms){ for(let i=0;i<(ms||5000)/50;i++){ if(f()) return true; await sleep(50); } return false; }
const R={checks:[]};
const ck=(n,g,w)=>{ g=g===undefined?null:g; R.step=n; R.checks.push({name:n,got:g,want:w,ok:JSON.stringify(g)===JSON.stringify(w)}); };
function done(){ if(document.getElementById("T")) return; R.errs=__e; R.view=[innerWidth,innerHeight]; R.want=WANT_VIEW;
  const p=document.createElement("pre"); p.id="T"; p.textContent=JSON.stringify(R); document.body.appendChild(p);
  fetch(RESULT_URL,{method:"POST",body:JSON.stringify(R)}); }
/* run the suite after the page settles; report even if it throws or hangs */
function suite(fn,wait){ setTimeout(async()=>{ try{ await fn(); }catch(x){ R.fatal=String(x.stack||x); } done(); },wait||400);
  setTimeout(()=>{ if(!document.getElementById("T")){ R.fatal="TIMEOUT after step: "+R.step; done(); } },90000); }

const T={
  app:()=>document.getElementById("app"),
  /* every element with data-act=act (and data-id=id, if given) */
  acts:(act,id)=>[...document.querySelectorAll(`[data-act="${act}"]`+(id!=null?`[data-id="${id}"]`:""))],
  /* tap the first (or nth) data-act button, the way a finger does; throws if it isn't on screen */
  async tap(act,id,nth){ const b=T.acts(act,id)[nth||0]; if(!b) throw new Error(`no [data-act="${act}"]`+(id!=null?` [data-id="${id}"]`:"")+` on ${T.title()}`);
    b.click(); await sleep(60); return b; },
  /* a field by its data-bind (saved on the JSA) or data-ui (screen state) key */
  field:k=>document.querySelector(`[data-bind="${k}"],[data-ui="${k}"]`),
  async fill(k,v){ const i=T.field(k); if(!i) throw new Error(`no field ${k} on ${T.title()}`); i.focus(); i.value=v;
    i.dispatchEvent(new Event("input",{bubbles:true})); i.dispatchEvent(new Event("change",{bubbles:true})); await sleep(40); },
  /* the wizard's Next button: its words say what's blocking, or what tapping it does */
  next:()=>{ const b=document.querySelector('[data-act="wiz-next"]'); return b?b.textContent.trim():null; },
  title:()=>{ const h=document.querySelector(".hdr .h1"); return h?h.textContent.trim():"(no header)"; },
  text:sel=>{ const e=document.querySelector(sel); return e?e.textContent.replace(/\s+/g," ").trim():null; },
  /* rows in the lead's list of saved JSAs */
  rows:()=>T.acts("open"),
  before:(a,b)=>!!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)),
  tall:el=>Math.round(el.getBoundingClientRect().height),
  noSideScroll:()=>document.documentElement.scrollWidth<=innerWidth,
};
