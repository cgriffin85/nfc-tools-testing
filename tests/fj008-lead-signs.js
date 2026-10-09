// FJ-008: the lead signs on purpose. Step 8 has a "Your signature" box; Sign stays blocked until it's ticked. The tick
// resets whenever step 8 is entered and after "Stop work and revise", which also clears the PPE tick (Chris, FJ-007).
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const ok=()=>!!document.querySelector('[data-act="sign-ok"] .box.on');
  const ppeOk=()=>!!document.querySelector('[data-act="ppe-ok"] .box.on');
  const blocked="Tick your signature box above";
  const words="I’m Lead <b>L</b>, shift lead and supervisor of this crew. I’ve walked the crew through this JSA and I approve it.";

  await T.tap("new"); await T.fill("basics.lead","Lead <b>L</b>"); await T.wizTo(7);
  ck("on the review step", T.title(), "Review & sign");
  ck("a 'Your signature' box", [...document.querySelectorAll(".label")].some(l=>l.textContent==="Your signature"), true);
  ck("its words, with the lead's name", T.text('[data-act="sign-ok"] span:last-child'), words);
  ck("the lead's name is shown as text, not code", document.querySelectorAll('[data-act="sign-ok"] b').length, 1);
  ck("it sits above the Sign button", T.before(T.acts("sign-ok")[0], T.acts("wiz-next")[0]), true);
  ck("it starts unticked", [ok(), T.acts("sign-ok")[0].getAttribute("aria-pressed")], [false,"false"]);
  ck("Sign is blocked until it's ticked", T.next(), blocked);
  await T.tap("wiz-next");
  ck("tapping Sign without it doesn't sign", [T.wizStep(), T.stored().jsas[0].signedAt], [7,null]);
  await T.tap("sign-ok");
  ck("tick it: ticked, and Sign is ready", [ok(), T.acts("sign-ok")[0].getAttribute("aria-pressed"), T.next()], [true,"true","Sign and send to crew"]);
  await T.tap("sign-ok");
  ck("tap again: unticked", [ok(), T.next()], [false,blocked]);
  ck("the box is 44px or taller", T.tall(T.acts("sign-ok")[0])>=44, true);
  ck("no side scroll on the review step", T.noSideScroll(), true);

  await T.tap("sign-ok"); await T.tap("wiz-back"); await T.tap("wiz-next");
  ck("coming back to step 8 resets it", [ok(), T.next()], [false,blocked]);
  await T.tap("sign-ok"); await T.home(); await T.tap("open",T.stored().jsas[0].id); await T.wizTo(7);
  ck("reopening the draft resets it", ok(), false);

  await T.tap("sign-ok"); await T.tap("wiz-next");
  ck("ticked, Sign signs", [T.wizStep(), !!T.stored().jsas[0].signedAt], [-1,true]);

  // stop work and revise: PPE and the signature are confirmed again
  await T.tap("revise-open"); await T.fill("reviseWhy","Test wind picked up"); await T.tap("revise-go");
  ck("revise reopens the JSA", T.wizStep(), 3);
  ck("revise clears the saved PPE tick", T.stored().jsas[0].site.ppeOk, false);
  await T.wizTo(6);
  ck("the PPE has to be confirmed again", [ppeOk(), T.next()], [false,"Confirm the PPE"]);
  await T.tap("ppe-ok"); await T.tap("wiz-next");
  ck("and the signature box is unticked", [ok(), T.next()], [false,blocked]);
  await T.sign();
  ck("signed again as revision 1", [!!T.stored().jsas[0].signedAt, T.stored().jsas[0].rev], [true,1]);
});
