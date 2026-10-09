// FJ-005: wind is a compass picker (eight directions) plus speed; a direction is required before Next on step 7.
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const dirs=()=>T.acts("wind-dir");
  const on=()=>dirs().filter(b=>b.classList.contains("on")).map(b=>b.getAttribute("data-id"));
  const at=d=>T.acts("wind-dir",d)[0].getBoundingClientRect();

  if(T.phase==="1"){
    await T.tap("new"); await T.wizTo(1);
    await T.tap("crew-add"); await T.fill(document.querySelector('[data-bind^="crew."][data-bind$=".name"]').getAttribute("data-bind"),"Crew A");
    await T.wizTo(6);
    ck("on the site step", T.title(), "Site, wind & PPE");
    ck("eight direction buttons, in compass order", dirs().map(b=>b.getAttribute("data-id")), ["NW","N","NE","W","E","SW","S","SE"]);
    ck("laid out as a compass: N above W above S", [at("N").top<at("W").top, at("W").top<at("S").top], [true,true]);
    ck("laid out as a compass: W left of N left of E", [at("W").left<at("N").left, at("N").left<at("E").left], [true,true]);
    ck("no typed wind direction field any more", T.field("site.windDir"), null);
    ck("asks 'blowing from'", T.text("#wind-lbl"), "Wind is blowing from");
    ck("nothing picked yet", on(), []);
    ck("the middle says what to do", document.querySelector(".compass .mid").innerText.replace(/\s+/g," "), "Tap where it’s coming from");
    ck("Next asks for the wind first", T.next(), "Pick the wind direction");
    await T.place("muster",10,50); await T.tap("ppe-ok");   /* PPE confirmed (FJ-007), so only the wind is missing */
    ck("a muster alone isn't enough", T.next(), "Pick the wind direction");
    await T.tap("wiz-next");
    ck("tapping Next without wind doesn't move on", T.wizStep(), 6);

    await T.tap("wind-dir","SW");
    ck("SW picked", on(), ["SW"]);
    ck("SW shows as pressed", T.acts("wind-dir","SW")[0].getAttribute("aria-pressed"), "true");
    ck("the middle shows it", T.text(".compass .mid"), "FromSW");
    ck("with wind and a muster, Next is ready", T.next(), "Next");
    await T.tap("wind-dir","NE");
    ck("picking another moves the pick", on(), ["NE"]);
    await T.tap("wind-dir","NE");
    ck("tapping the picked one again keeps it", on(), ["NE"]);

    const mph=T.field("site.windMph");
    ck("speed field is a number field", mph&&mph.type, "number");
    await T.fill("site.windMph","15");
    ck("each direction 44px or larger both ways", dirs().every(b=>T.tall(b)>=44&&Math.round(b.getBoundingClientRect().width)>=44), true);
    ck("16px or larger on every field", [...document.querySelectorAll("#app input,#app select,#app textarea")].every(e=>parseFloat(getComputedStyle(e).fontSize)>=16), true);
    ck("no side scroll on the site step", T.noSideScroll(), true);

    await T.tap("wiz-next"); await T.tap("wiz-back");
    ck("the pick is kept when coming back", on(), ["NE"]);
    await T.sign();
    await T.tap("home"); await T.tap("role","crew"); await T.tap("crew-open");
    ck("crew sees where it's from and how fast", /From NE · 15 mph/.test(T.app().textContent), true);
    await T.tap("home"); await T.tap("role","lead");

    // old saved data: wind was typed as text
    await T.tap("new"); await T.tap("wiz-back"); await T.tap("new"); await T.tap("wiz-back");
    const m=T.stored(), drafts=m.jsas.filter(j=>!j.signedAt);
    drafts[0].site.windDir=" sw "; drafts[1].site.windDir="toward the road";
    /* as saved before FJ-006 too: a typed muster list, no map, no saved locations */
    drafts.forEach(j=>{ delete j.site.map; delete j.site.mapLoaded; j.site.musters=[{id:"m1",name:"Test muster"}]; j.site.muster=""; }); delete m.sites;
    T.store(m); sessionStorage.setItem("fjOld",JSON.stringify(drafts.map(j=>j.id)));
    return T.reload("2");
  }

  const [typedSW, typedOther]=JSON.parse(sessionStorage.getItem("fjOld"));
  ck("old data loads: every JSA still listed", T.rows().length, 3);
  await T.tap("open",typedSW); await T.wizTo(6);
  ck("old typed ' sw ' becomes SW", on(), ["SW"]);
  ck("with old wind kept, Next asks only for the muster", T.next(), "Put a muster point on the map");
  await T.home(); await T.tap("open",typedOther); await T.wizTo(6);
  ck("old text that isn't a direction: nothing picked", on(), []);
  ck("and Next asks for the wind", T.next(), "Pick the wind direction");
});
