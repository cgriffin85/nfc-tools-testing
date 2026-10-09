// FJ-004: hazards sit under their task step; every step needs at least one; the starting list adds to whole location.
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const heads=()=>[...document.querySelectorAll(".stephead")].map(h=>h.getAttribute("data-step"));
  /* hazard name inputs under one header ("1".."n" or "all"), up to the next header */
  const under=key=>{ const out=[]; const h=document.querySelector(`.stephead[data-step="${key}"]`);
    for(let e=h&&h.nextElementSibling;e&&!e.classList.contains("stephead");e=e.nextElementSibling){ const i=e.querySelector('[data-bind^="hazards."][data-bind$=".name"]'); if(i) out.push(i); } return out; };
  const names=key=>under(key).map(i=>i.value);
  const idOf=i=>i.getAttribute("data-bind").split(".")[1];
  const addTo=async n=>{ T.acts("hz-add")[n-1].click(); await sleep(60); };
  const del=async id=>{ await T.tap("hz-del",id); await T.tap("hz-del",id); };   /* deletes need a second tap */
  const write=async(name,control)=>{ const k=document.activeElement.getAttribute("data-bind"); await T.fill(k,name); await T.fill(k.replace(/\.name$/,".control"),control); };

  await T.tap("new"); await T.wizTo(5);
  ck("on the hazards step", T.title(), "Hazards & controls");
  ck("no 'applies to' dropdown on any hazard", document.querySelectorAll('select[data-bind$=".step"]').length, 0);
  ck("a header per task step, then whole location", heads(), ["1","2","3","4","5","all"]);
  ck("step headers show the step text", T.text('.stephead[data-step="1"]'), "1Shift change: walk the location with the outgoing lead");
  ck("whole-location header", T.text('.stephead[data-step="all"]'), "✱Whole location · applies to every step");
  ck("seeded under step 1", names("1"), ["Missed information at shift change"]);
  ck("seeded under step 2", names("2"), ["High-pressure release at a connection"]);
  ck("seeded under step 3", names("3"), ["Erosion / washout of iron or chokes from sand"]);
  ck("seeded under step 4", names("4"), ["H2S exposure"]);
  ck("seeded under step 5", names("5"), ["Fall from stairs, catwalk or tank top","Vapors at the thief hatch"]);
  ck("nothing seeded to whole location", names("all"), []);
  ck("an add button per step and for whole location", T.acts("hz-add").map(b=>b.textContent.trim()),
     ["+ Add a hazard to step 1","+ Add a hazard to step 2","+ Add a hazard to step 3","+ Add a hazard to step 4","+ Add a hazard to step 5","+ Add a whole-location hazard"]);
  ck("starting-list chips are the whole-location ones", T.acts("hz-lib").map(b=>b.getAttribute("data-id")), ["Vehicle traffic on the pad","Heat or cold stress","Slips and trips on the pad"]);
  ck("chips say where they add", [...document.querySelectorAll(".label")].some(l=>l.textContent==="Starting list · adds to whole location"), true);
  ck("Next before any risk is set", T.next(), "Set the risk on 6 hazards");

  // Chris's game: delete the hazards under a step
  await del(idOf(under("3")[0]));
  ck("step 3 hazard deleted", names("3"), []);
  ck("step 3 header flagged", [document.querySelector('.stephead[data-step="3"]').classList.contains("none"), /No hazard yet/.test(T.text('.stephead[data-step="3"]'))], [true,true]);
  ck("Next says which step", T.next(), "Step 3 has no hazard yet");
  ck("the intro counts it", /1 step with no hazard\./.test(T.text(".lead")), true);
  await del(idOf(under("1")[0]));
  ck("with steps 1 and 3 bare, Next names the first", T.next(), "Step 1 has no hazard yet");
  await T.tap("wiz-next");
  ck("tapping Next doesn't move on", T.wizStep(), 5);

  await addTo(3);
  ck("+ Add a hazard to step 3 puts a new one under step 3", names("3"), [""]);
  ck("and puts the cursor in it", document.activeElement===under("3")[0], true);
  await write("Test trap pressure","Test bleed off with the needle valve");
  ck("step 3 covered: Next moves to step 1", T.next(), "Step 1 has no hazard yet");
  await T.tap("hz-lib","Vehicle traffic on the pad");
  ck("a starting-list chip adds to whole location", names("all"), ["Vehicle traffic on the pad"]);
  ck("a whole-location hazard doesn't cover step 1", T.next(), "Step 1 has no hazard yet");
  await addTo(1);
  await write("Test step-one hazard","Test control one");
  ck("every step covered: on to risks", T.next(), "Set the risk on 7 hazards");
  await addTo(6);
  ck("+ Add a whole-location hazard adds there", names("all").length, 2);
  await del(idOf(under("all")[1]));

  // a change picked today shows up under whole location, marked New today
  await T.tap("wiz-back"); await T.tap("wiz-back");
  await T.tap("change","wx"); await T.wizTo(5);
  ck("change hazard goes to whole location", names("all"), ["Wind or weather change","Vehicle traffic on the pad"]);
  ck("marked New today", /New today/.test(under("all")[0].closest(".card").textContent), true);

  ck("16px or larger on every field", [...document.querySelectorAll("#app input,#app select,#app textarea")].every(e=>parseFloat(getComputedStyle(e).fontSize)>=16), true);
  ck("add buttons 44px or taller", T.acts("hz-add").every(b=>T.tall(b)>=44), true);
  ck("no side scroll on the hazards step", T.noSideScroll(), true);

  await T.sign();
  ck("signed", T.wizStep(), -1);

  // next JSA on the same work type: hazards carry forward under the step with the same text
  await T.tap("home"); await T.tap("new"); await T.wizTo(4);
  const s3=document.querySelectorAll('[data-bind^="steps."][data-bind$=".text"]')[2];
  await T.fill(s3.getAttribute("data-bind"),"Test changed step three");
  await T.wizTo(5);
  ck("carried: step 1 keeps its hazard", names("1"), ["Test step-one hazard"]);
  ck("carried: step 2 keeps its hazard", names("2"), ["High-pressure release at a connection"]);
  ck("carried: a step whose text changed has none", names("3"), []);
  ck("carried: its hazard moves to whole location; change hazards don't carry", names("all").sort(), ["Test trap pressure","Vehicle traffic on the pad"]);
  ck("carried: Next names the bare step", T.next(), "Step 3 has no hazard yet");
});
