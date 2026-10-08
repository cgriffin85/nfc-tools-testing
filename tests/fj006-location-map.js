// FJ-006: step 7 location map. Markers on a pad with a turnable north arrow; musters lettered A Primary, B Secondary,
// then Extra, each with its side of the pad and Upwind / Crosswind / Downwind from today's wind. Saved per location,
// shown read-only to crew, visitors and the field supervisor, and listed in the shared text.
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const rows=()=>T.acts("muster").map(r=>[r.querySelector(".v").textContent, r.querySelector(".sub").textContent, (r.querySelector(".st")||{}).textContent||""]);
  const picked=()=>T.acts("muster").filter(r=>r.querySelector(".radio.on")).map(r=>r.querySelector(".v").textContent);
  const sel=async id=>{ document.querySelector(`g[data-act="map-sel"][data-id="${id}"]`).dispatchEvent(new MouseEvent("click",{bubbles:true})); await sleep(60); };
  const del=async id=>{ await T.tap("map-del",id); await T.tap("map-del",id); };   /* removing needs a second tap */
  const toast=()=>T.text("#toast");
  const note=()=>T.text("[data-mapnote]");
  const readOnly=()=>[!!document.querySelector("svg.padmap"), !document.querySelector('[data-act="map-tap"],[data-act="map-sel"]')];

  if(T.phase==="1"){
    await T.tap("new"); await T.wizTo(1);
    await T.tap("crew-add"); await T.fill(document.querySelector('[data-bind^="crew."][data-bind$=".name"]').getAttribute("data-bind"),"Crew A");
    await T.wizTo(6);
    ck("a pad drawing with a compass", [!!document.querySelector('svg.padmap[data-act="map-tap"] rect'), !!document.querySelector("svg.padmap g.north")], [true,true]);
    ck("the marker tools", T.acts("map-tool").map(b=>b.textContent), ["+ Muster point","+ Entrance / exit","+ Wellhead","+ Tanks","+ Our equipment"]);
    ck("first time at this location", note(), "Set this up on the first JSA for a location. It’s saved for the next one.");
    ck("no muster yet", T.acts("muster").length, 0);
    await T.tap("wind-dir","W");
    ck("with wind, Next asks for a muster on the map", T.next(), "Put a muster point on the map");

    await T.padTap(50,50);
    ck("tapping the pad with no tool picked says what to do", toast(), "Pick a marker below first, then tap the pad");
    ck("and places nothing", T.marks().length, 0);
    await T.tap("map-tool","muster");
    ck("a picked tool shows as picked", T.acts("map-tool","muster")[0].classList.contains("on"), true);
    ck("and says where to tap", /Tap the pad where the muster point is\./.test(T.app().textContent), true);
    await T.padTap(-5,50);
    ck("a tap off the pad is refused", [toast(), T.marks().length], ["Tap inside the pad",0]);

    const a=await T.place("muster",5,50);
    ck("a muster goes on the pad", T.marks().length, 1);
    ck("the new marker is selected with its name field focused", document.activeElement.getAttribute("data-bind"), `site.map.marks.${a}.label`);
    ck("the tool is put down after placing", T.acts("map-tool").some(b=>b.classList.contains("on")), false);
    await T.fill(`site.map.marks.${a}.label`,"Test muster west");
    ck("its name is drawn on the map", /Test muster west/.test(document.querySelector("svg.padmap").textContent), true);
    ck("first muster: A Primary, west side, upwind of a west wind", rows(), [["A · Primary · Test muster west","W side","Upwind"]]);
    ck("the first muster placed is today's", picked(), ["A · Primary · Test muster west"]);
    ck("with wind and today's muster, Next is ready", T.next(), "Next");
    const b=await T.place("muster",95,50), c=await T.place("muster",50,0);
    ck("B Secondary on the east side is downwind; C Extra on the north is crosswind", rows().slice(1), [["B · Secondary","E side","Downwind"],["C · Extra","N side","Crosswind"]]);
    ck("markers are lettered A B C on the map", T.marks().map(g=>g.querySelector("text").textContent), ["A","B","C"]);
    ck("the wind is drawn across the pad", /WIND/.test(T.text("svg.padmap g.wind")||""), true);

    await T.tap("map-rot");
    ck("Turn north turns the arrow 45°", document.querySelector("svg.padmap g.north").getAttribute("transform"), "translate(303 58) rotate(45)");
    ck("sides and wind follow the arrow", rows().map(r=>[r[1],r[2]]), [["SW side","Upwind"],["NE side","Downwind"],["NW side","Upwind"]]);
    for(let i=0;i<7;i++) await T.tap("map-rot");
    ck("eight turns is all the way round", [document.querySelector("svg.padmap g.north").getAttribute("transform"), rows().map(r=>r[1])], ["translate(303 58) rotate(0)",["W side","E side","N side"]]);

    await T.tap("muster",b);
    ck("the lead can pick another muster for today", picked(), ["B · Secondary"]);
    const e=await T.place("entrance",20,95), w=await T.place("wellhead",50,50), t=await T.place("tanks",80,80), q=await T.place("equipment",60,30);
    ck("other markers go on the map with their letters", T.marks().map(g=>[g.getAttribute("data-type"), g.querySelector("text").textContent]).slice(3),
       [["entrance","E"],["wellhead","W"],["tanks","T"],["equipment","Q"]]);
    ck("only musters are in today's muster list", T.acts("muster").length, 3);
    await T.fill(`site.map.marks.${q}.label`,"<b>Test pump</b>");
    ck("marker names are shown as text, not code", [!!document.querySelector("svg.padmap b"), /<b>Test pump<\/b>/.test(document.querySelector("svg.padmap").textContent)], [false,true]);
    await sel(w);
    ck("tapping a marker selects it for naming", T.text(`label[for="mk-${w}"]`), "Wellhead name");
    await T.fill(`site.map.marks.${w}.label`,"Test well");
    await sel(c); await T.tap("map-del",c);
    ck("Remove needs a second tap", T.acts("muster").length, 3);
    await T.tap("map-del",c);
    ck("then the muster is gone", rows().map(r=>r[0]), ["A · Primary · Test muster west","B · Secondary"]);
    await sel(b); await del(b);
    ck("removing today's muster leaves none picked", [picked(), T.next()], [[], "Pick today’s muster point"]);
    await T.tap("muster",a);
    ck("picking one makes Next ready again", T.next(), "Next");
    await T.place("muster",95,50);
    ck("a new muster after removals is lettered B again", rows().map(r=>r[0]), ["A · Primary · Test muster west","B · Secondary"]);

    ck("markers are 44px or larger to tap", T.marks().every(g=>{ const r=g.getBoundingClientRect(); return r.width>=44&&r.height>=44; }), true);
    ck("tools and Turn north 44px or taller", T.acts("map-tool").concat(T.acts("map-rot")).every(x=>T.tall(x)>=44), true);
    ck("16px or larger on every field", [...document.querySelectorAll("#app input,#app select,#app textarea")].every(x=>parseFloat(getComputedStyle(x).fontSize)>=16), true);
    ck("no side scroll on the site step", T.noSideScroll(), true);

    await T.wizTo(7);
    ck("review shows today's muster with side and wind", /A · Primary · Test muster west · W side · upwind/.test(T.app().textContent), true);
    await T.tap("wiz-next");
    let shared=""; Object.defineProperty(navigator,"share",{configurable:true,value:o=>{ shared=o.text; return Promise.resolve(); }});
    await T.tap("share-one");
    ck("shared text: today's muster with side and wind", shared.includes("Muster point today: A · Primary · Test muster west · W side · upwind"), true);
    ck("shared text: the other musters too", shared.includes("  Other muster: B · Secondary · E side · downwind"), true);

    await T.tap("vis-open");
    ck("visitor sees the map, read-only", readOnly(), [true,true]);
    ck("visitor sees the muster's side and wind", T.text("[data-muster-card]"), "Muster pointA · Test muster westW side · upwind");
    await T.home(); await T.tap("role","crew"); await T.tap("crew-open");
    ck("crew sees the map, read-only", readOnly(), [true,true]);
    ck("crew sees the muster's side and wind", T.text("[data-muster-card]"), "Muster pointA · Test muster westW side · upwind");
    await T.home(); await T.tap("role","sup"); await T.tap("review-open");
    ck("field supervisor sees the map, read-only", readOnly(), [true,true]);
    ck("field supervisor sees the muster's side and wind", T.text("[data-muster-card]"), "Muster pointA · Test muster westW side · upwind");
    await T.home(); await T.tap("role","lead");

    // the next JSA at the same location loads the map; the wind is today's
    await T.tap("new"); await T.wizTo(6);
    ck("next JSA here: the map is loaded", [note(), T.marks().length], ["Loaded from this location’s earlier JSA. Change it only if something on location changed.",6]);
    ck("today's muster defaults to the first one", picked(), ["A · Primary · Test muster west"]);
    ck("wind isn't carried over", T.next(), "Pick the wind direction");
    await T.tap("wind-dir","E");
    ck("with an east wind the west muster is downwind", rows()[0], ["A · Primary · Test muster west","W side","Downwind"]);
    const draft=T.stored().jsas.slice(-1)[0].id;

    // a different location starts blank
    await T.home(); await T.tap("new"); await T.fill("basics.location","Test pad two"); await T.wizTo(6);
    ck("a new location starts with an empty map", [note(), T.marks().length], ["Set this up on the first JSA for a location. It’s saved for the next one.",0]);

    // old saved data: muster points were a typed list
    const m=T.stored(), signed=m.jsas.find(j=>j.signedAt), d=m.jsas.find(j=>j.id===draft);
    [signed,d].forEach(j=>{ delete j.site.map; delete j.site.mapLoaded; delete j.site.mapFromSaved; j.site.musters=[{id:"m1",name:"Old typed muster"}]; j.site.muster="m1"; });
    d.site.windDir="E"; delete m.sites; T.store(m);
    sessionStorage.setItem("fjOld",JSON.stringify([signed.id,d.id]));
    return T.reload("2");
  }

  const [signed,draft]=JSON.parse(sessionStorage.getItem("fjOld"));
  ck("old data loads: every JSA still listed", T.rows().length, 3);
  await T.tap("role","crew"); await T.tap("crew-open",signed);
  ck("an old signed JSA shows an empty map and no muster", [T.marks().length, document.querySelectorAll("svg.padmap g.mark").length, T.text("[data-muster-card]")], [0,0,"Muster point—"]);
  await T.home(); await T.tap("role","lead"); await T.tap("open",draft); await T.wizTo(6);
  ck("an old draft: empty map, old list dropped", [T.marks().length, T.acts("muster").length], [0,0]);
  ck("and Next asks for a muster on the map", T.next(), "Put a muster point on the map");
  const saved=T.stored().jsas.find(j=>j.id===draft).site;
  ck("saved again without the old list", [!!saved.map, "musters" in saved], [true,false]);
});
