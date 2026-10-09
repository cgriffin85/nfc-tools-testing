// FJ-010: "Load a filled-in example" redraws the lead's home right away; the example is in the list straight after the tap.
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const where=()=>T.stored().jsas.slice(-1)[0].basics.location;

  ck("fresh phone: no JSAs listed", [T.rows().length, !!document.querySelector(".card.empty")], [0,true]);
  await T.tap("sample");
  ck("the example is listed straight after the tap", T.rows().length, 1);
  ck("it's the example that was saved", T.rows()[0].querySelector(".v").textContent, where());
  ck("the 'No JSAs yet' card is gone", !!document.querySelector(".card.empty"), false);
  ck("it says so", T.text("#toast"), "Example loaded");
  ck("Start a new JSA is offered above the list", T.before(T.acts("new")[0], T.rows()[0]), true);

  await T.tap("sample");
  ck("loading it again lists a second one straight away", T.rows().length, 2);
  await T.tap("open", T.rows()[0].getAttribute("data-id"));
  ck("tapping it opens the signed example", /Signed by/.test(T.text(".banner.ok")||""), true);
});
