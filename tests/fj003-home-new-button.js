// FJ-003: the lead's home always offers "Start a new JSA", above the list once any JSA is saved.
// @variant window=390x844
// @variant window=360x800
suite(async()=>{
  const news=()=>T.acts("new");
  ck("fresh phone: lead's home offers one Start a new JSA", news().map(b=>b.textContent.trim()), ["Start a new JSA"]);

  await T.tap("new");
  ck("tapping it opens the wizard on step 1", !!T.next() && /Step 1 of/.test(T.text(".hdr .eyebrow")), true);
  await T.tap("wiz-back");
  ck("back on home, the started JSA is in the list", T.rows().length, 1);

  const b=news();
  ck("with a JSA saved: one Start a new JSA", b.length, 1);
  ck("its words", b[0]&&b[0].textContent.trim(), "Start a new JSA");
  ck("it sits above the list", T.before(b[0], T.rows()[0]), true);
  ck("it is the full-size dark button", b[0]&&b[0].className, "btn btn-dark");
  ck("tap target 44px or taller", b[0]&&T.tall(b[0])>=44, true);
  ck("no side scroll on home", T.noSideScroll(), true);

  await T.tap("new");
  ck("tapping it with a JSA saved opens a new wizard", /Step 1 of/.test(T.text(".hdr .eyebrow")||""), true);
  await T.tap("wiz-back");
  ck("a second JSA is now in the list", T.rows().length, 2);

  await T.tap("sample");
  ck("after loading the example: still one Start a new JSA", news().length, 1);
  ck("and still above the list", T.before(news()[0], T.rows()[0]), true);

  await T.tap("role","crew");
  ck("crew's home has no Start a new JSA", news().length, 0);
  await T.tap("role","sup");
  ck("supervisor's home has no Start a new JSA", news().length, 0);
  await T.tap("role","lead");
  ck("back to the lead: it is there again", news().length, 1);
});
