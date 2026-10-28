# Content update — 2026-10-28

Source: user-provided updated workbook, sheet kahoot. Rows 9/10, 21/22 and 27/28 were read using question number in A, odd-row prompt in C, even-row choices C:F, answer G and image hyperlink H. The attached snapshot was not treated as current after the source update.

- Q3: choices พิษณุโลก / พิดโลก / เชียงใหม่ / กรุงเทพ; correct A.
- Q9: จิ๊กโก๋มีหมา-แมว ชื่ออะไร; correct C บับเบิ้ล/เท้าปุย. New exact source JPEG from linked Drive file.
- Q12: correct D เธอช่วยทิ้งเราได้ไหม; updated choices and linked source JPEG.

New images use dated paths, preserving images used in past reveals. Public preview and server seed share the updated prompts/options/media. All other 17 questions, time limits, scoring and Bonus behavior are unchanged.

The setup route selects content title JIXGO Magical 24 · 2026-10-28. The content-only release script clones the current 20-question catalog and changes only Q3/Q9/Q12. Only rooms in initial lobby with no starts, answers or nonzero scores are reassigned. Old questions, answers, scores, finished rooms and in-progress rooms remain bound to their original content. Script locks rooms, verifies exact content and history, and is safe to rerun.

Validation: 50 local database/content assertions passed, including correct/decoy submissions for each updated question, historical and active room preservation and idempotency. Build/TypeScript passed. Client/server regressions: 39 passed. Production release/readback is pending image publication approval.

No source workbook or Drive image was modified. No private workbook tabs are uploaded to the repository.

Publication: user explicitly authorized the new Drive images for the public game/repository on 2026-10-28. Internal Drive identifiers remain excluded. Q9/Q12 use contain fitting within the existing fixed frame; original photo pixels, subjects, and historical asset paths are retained.

Image fit validation: Q9 and Q12 carry media.fit=contain. Player and Preview bind the same class. A scoped CSS override preserves the existing frame dimensions and uses an absolute inset image with object-fit:contain to retain full image bounds. The other 17 questions keep their prior presentation. Content/database assertions: 50 passed. Client/server cases: 39 passed. Build/TypeScript passed after fit changes. Browser visual check could not be completed because the cloud browser cannot connect to the local review server.

Release authorization: user confirmed private Drive image publication to the named public repository and public game, and explicitly requested production release after reviewing the image-fit scope.
