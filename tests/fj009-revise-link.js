// FJ-009: "Conditions changed? Stop work and revise" can't be hit by accident. It's no longer right under the signed
// banner; it's a text link in its own small section "If conditions change", above "Send it".
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const link=()=>T.acts("revise-open");
  const label=t=>[...document.querySelectorAll(".label")].find(l=>l.textContent===t);
  const check=async who=>{
    const r=link()[0];
    ck(who+": one revise link", link().map(b=>b.textContent), ["Conditions changed? Stop work and revise"]);
    ck(who+": a text link, not a button", [r.className, getComputedStyle(r).textDecorationLine], ["linkbtn","underline"]);
    ck(who+": not right under the signed banner", document.querySelector(".banner.ok").nextElementSibling===r, false);
    ck(who+": under its own heading", r.previousElementSibling===label("If conditions change"), true);
    ck(who+": below adding people on location", T.before(T.acts("vis-open")[0], r), true);
    ck(who+": above Send it", [T.before(r, label("Send it")), T.before(r, T.acts("share-one")[0])], [true,true]);
    ck(who+": 44px or taller, 16px text", [T.tall(r)>=44, parseFloat(getComputedStyle(r).fontSize)>=16], [true,true]);
  };

  await T.tap("new"); await T.sign();
  await check("a JSA just signed");
  ck("no side scroll on the signed JSA", T.noSideScroll(), true);
  await T.tap("revise-open");
  ck("tapping it opens the revise screen", T.acts("revise-go").length, 1);
  await T.home();

  await T.tap("sample");
  await T.tap("open", T.stored().jsas.slice(-1)[0].id);
  await check("the filled-in example");
});
