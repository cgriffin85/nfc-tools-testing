// FJ-007: PPE defaults stay picked; one tick box "Everyone on location has this PPE on" is required before Next on
// step 7, and any change to the PPE list unticks it.
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const ok=()=>!!document.querySelector('[data-act="ppe-ok"] .box.on');
  const picked=()=>T.acts("ppe").filter(b=>b.classList.contains("on")).map(b=>b.getAttribute("data-id"));
  const add=async v=>{ await T.fill("ppeNew",v); await T.tap("ppe-add"); };

  if(T.phase==="1"){
    await T.tap("new"); await T.wizTo(6);
    await T.tap("wind-dir","N"); await T.place("muster",10,50);
    ck("defaults are still picked", picked(), ["FR clothing","Hard hat","Safety glasses","Personal H2S monitor","Gloves","Steel-toe boots"]);
    ck("one confirmation under the list", T.acts("ppe-ok").map(b=>b.textContent.trim()), ["Everyone on location has this PPE on."]);
    ck("it starts unticked", [ok(), T.acts("ppe-ok")[0].getAttribute("aria-pressed")], [false,"false"]);
    ck("Next asks for it", T.next(), "Confirm the PPE");
    await T.tap("wiz-next");
    ck("tapping Next without it doesn't move on", T.wizStep(), 6);
    await T.tap("ppe-ok");
    ck("tick it: ticked", [ok(), T.acts("ppe-ok")[0].getAttribute("aria-pressed")], [true,"true"]);
    ck("and Next is ready", T.next(), "Next");
    await T.tap("ppe-ok");
    ck("tap again: unticked", [ok(), T.next()], [false,"Confirm the PPE"]);

    await T.tap("ppe-ok"); await T.tap("ppe","Gloves");
    ck("taking an item off unticks it", [ok(), T.next()], [false,"Confirm the PPE"]);
    ck("and says why", T.text("#toast"), "PPE changed. Confirm it again.");
    await T.tap("ppe-ok"); await T.tap("ppe","Face shield");
    ck("adding a listed item unticks it", ok(), false);
    await T.tap("ppe-ok"); await add("Test respirator");
    ck("adding other PPE unticks it", [ok(), picked().includes("Test respirator")], [false,true]);
    await T.tap("ppe-ok"); await add("Test respirator"); await add("");
    ck("adding nothing new keeps it ticked", ok(), true);

    ck("the tick box is 44px or taller", T.tall(T.acts("ppe-ok")[0])>=44, true);
    ck("16px or larger on every field", [...document.querySelectorAll("#app input,#app select,#app textarea")].every(e=>parseFloat(getComputedStyle(e).fontSize)>=16), true);
    ck("no side scroll on the site step", T.noSideScroll(), true);
    await T.tap("wiz-next"); await T.tap("wiz-back");
    ck("still ticked after going on and coming back", ok(), true);

    await T.wizTo(7); await T.tap("wiz-next"); await T.home();
    await T.tap("new"); await T.wizTo(6);
    ck("every new JSA starts unticked", ok(), false);

    // old saved data had no PPE confirmation
    const m=T.stored(), signed=m.jsas.find(j=>j.signedAt), draft=m.jsas.find(j=>!j.signedAt);
    delete signed.site.ppeOk; delete draft.site.ppeOk; draft.site.ppe=["Hard hat"]; draft.site.windDir="N"; T.store(m);
    sessionStorage.setItem("fjOld",JSON.stringify([signed.id,draft.id]));
    return T.reload("2");
  }

  const [signed,draft]=JSON.parse(sessionStorage.getItem("fjOld"));
  ck("old data loads: every JSA still listed", T.rows().length, 2);
  await T.tap("open",draft); await T.wizTo(6);
  ck("an old draft keeps its PPE list", picked(), ["Hard hat"]);
  ck("and must be confirmed", [ok(), T.next()], [false,"Confirm the PPE"]);
  ck("an old signed JSA counts as confirmed", T.stored().jsas.find(j=>j.id===signed).site.ppeOk, true);
});
