/* Field JSA test helpers, loaded before each suite (run.py). Made-up data only: this repo is public. */
window.__e=[]; addEventListener("error",e=>__e.push(String(e.message)+" @"+e.lineno));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(f,ms){ for(let i=0;i<(ms||5000)/50;i++){ if(f()) return true; await sleep(50); } return false; }
/* a suite can reload the page partway (T.reload) and carry on: its checks so far and its phase ride in sessionStorage */
const R=(()=>{ try{ return JSON.parse(sessionStorage.getItem("fjR"))||{checks:[]}; }catch(x){ return {checks:[]}; } })();
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
  /* back to home from anywhere: the header back button, or back through the wizard */
  async home(){ for(let i=0;i<10&&(T.acts("home").length||T.wizStep()>=0);i++) await T.tap(T.acts("home").length?"home":"wiz-back"); },
  /* which part of a reloading suite this page load is ("1" first) */
  phase:(()=>{ try{ return sessionStorage.getItem("fjPhase")||"1"; }catch(x){ return "1"; } })(),
  /* reload the page (e.g. after writing old-format data to localStorage) and run the suite again as phase `next` */
  reload(next){ sessionStorage.setItem("fjR",JSON.stringify(R)); sessionStorage.setItem("fjPhase",next); location.reload(); return new Promise(()=>{}); },
  /* the app's saved data, read and written the way the phone holds it */
  stored:()=>JSON.parse(localStorage.getItem("fieldjsa-test-v1")||"{}"),
  store:o=>localStorage.setItem("fieldjsa-test-v1",JSON.stringify(o)),
  /* the wizard step on screen, 0-based (from "Step n of 8" in the header), or -1 off the wizard */
  wizStep:()=>{ const m=/Step (\d+) of/.exec(T.text(".hdr .eyebrow")||""); return m?+m[1]-1:-1; },
  /* tap Next until the wizard is on step n (0-based), doing the least each step needs with made-up answers:
     lead "Lead L", "Nothing changed", every task step ticked, every hazard Low and confirmed, wind from N, the first muster */
  async wizTo(n){
    for(let guard=0;T.wizStep()<n&&guard<12;guard++){
      const s=T.wizStep();
      if(s===0&&!T.field("basics.lead").value.trim()) await T.fill("basics.lead","Lead L");
      if(s===3&&!document.querySelector('[data-act="change"].on')) await T.tap("change","none");
      if(s===4) for(const id of T.acts("step-ok").filter(b=>!b.querySelector(".box.on")).map(b=>b.getAttribute("data-id"))) await T.tap("step-ok",id);
      if(s===5){ for(const id of T.acts("hz-ok").map(b=>b.getAttribute("data-id"))){
          const low=document.querySelector(`[data-act="hz-risk"][data-id="${id}"][data-r="low"]`); low.click(); await sleep(30);
          const ok=document.querySelector(`[data-act="hz-ok"][data-id="${id}"]`); if(ok.textContent.trim()!=="Confirmed"){ ok.click(); await sleep(30); } } }
      if(s===6&&!document.querySelector('[data-act="wind-dir"].on')) await T.tap("wind-dir","N");
      if(s===6&&!document.querySelector('[data-act="muster"] .radio.on')) await T.tap("muster");
      if(s<0) throw new Error("wizTo: not on the wizard ("+T.title()+")");
      await T.tap("wiz-next");
      if(T.wizStep()===s) throw new Error(`wizTo: stuck on step ${s+1}: ${T.next()}`);
    }
  },
};
