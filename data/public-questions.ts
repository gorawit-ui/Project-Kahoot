export type PublicPreviewQuestion = {
  id: number;
  kind: "choice" | "bonus";
  prompt: string;
  choices?: string[];
  media?: { type: "image" | "emoji"; src?: string; fit?: "contain"; clues?: string; displayClues?: string };
  timeSeconds: number;
  bonusPrompts?: string[];
};

const image = (id: number) => ({ type: "image" as const, src: `/assets/questions/question-${String(id).padStart(2, "0")}.jpg` });
const emoji = (clues: string, displayClues?: string) => ({ type: "emoji" as const, clues, displayClues });

export const publicPreviewQuestions: PublicPreviewQuestion[] = [
  { id: 1, kind: "choice", prompt: "จิ๊กโก๋เกิดวันที่เท่าไหร่", choices: ["24 พย.", "22 พย.", "26 พย.", "28 พย."], media: image(1), timeSeconds: 15 },
  { id: 2, kind: "choice", prompt: "จิ๊กโก๋เกิดราศีอะไร", choices: ["ราศีธนู", "ราศีเมษ", "ราศีพิจิก", "ราศีพิจิกกา"], media: image(2), timeSeconds: 15 },
  { id: 3, kind: "choice", prompt: "บ้านเกิดจิ๊กโก๋อยู่จังหวัดไหน", choices: ["พิษณุโลก", "พิดโลก", "เชียงใหม่", "กรุงเทพ"], media: image(3), timeSeconds: 15 },
  { id: 4, kind: "choice", prompt: "จิ๊กโก๋มีชื่อเล่นจริงๆว่าอะไร", choices: ["จิ๋ว", "จิ๊กโก๋", "ครีม", "จิ๊กกี๋"], media: image(4), timeSeconds: 15 },
  { id: 5, kind: "choice", prompt: "จิ๊กโก๋กรุ๊ปเลือดอะไร", choices: ["A", "B", "AB", "O"], media: image(5), timeSeconds: 15 },
  { id: 6, kind: "choice", prompt: "เพลงแรกที่ร้อง 3 คน เพลงอะไร", choices: ["โต๊ะหมู่", "โต๊ะพึมๆ", "โต๊ะริมทาง", "โต๊ะริม"], media: image(6), timeSeconds: 15 },
  { id: 7, kind: "choice", prompt: "ปี 2569 นี้จิ๊กโก๋อายุเท่าไหร่?", choices: ["24", "20", "19", "22"], media: image(7), timeSeconds: 15 },
  { id: 8, kind: "choice", prompt: "เพลง ใจฟูทุกครั้งที่มองหน้าเธอ จิ๊กโก๋ ใส่เสื้อสีอะไร", choices: ["ขาว", "ดำ", "น้ำเงิน", "ชมพู"], media: image(8), timeSeconds: 15 },
  { id: 9, kind: "choice", prompt: "จิ๊กโก๋มีหมา-แมว ชื่ออะไร", choices: ["บับเบิ้ล/ชับปุย", "บับว่า/แฮรรี่", "บับเบิ้ล/เท้าปุย", "ชัพปุย/เบิ้ล"], media: { type: "image", src: "/assets/questions/question-09-20261028.jpg", fit: "contain" }, timeSeconds: 15 },
  { id: 10, kind: "choice", prompt: "ประเทศที่จิ๊กโก๋เคยไปศึกษาต่อคือประเทศอะไร", choices: ["Scotland", "New Zealand", "Australia", "Canada"], media: image(10), timeSeconds: 15 },
  { id: 11, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["ทนทำไม", "ออกมาได้แล้ว", "Toxic", "ทนไม่ไหวก็ต้องทน"], media: image(11), timeSeconds: 15 },
  { id: 12, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["กลับไปหาคนในใจเลยไป", "ไม่รักกันแล้ว", "กลับไปหาคนในใจของเธอเลยไป", "เธอช่วยทิ้งเราได้ไหม"], media: { type: "image", src: "/assets/questions/question-12-20261028.jpg", fit: "contain" }, timeSeconds: 15 },
  { id: 13, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["จมอยู่กับความเสียใจ", "Cheat", "นอกใจกันมานานแค่ไหน", "การนอกใจไม่ใช่ความผิดพลาดไง"], media: image(13), timeSeconds: 15 },
  { id: 14, kind: "choice", prompt: " จากภาพนี้คือเพลงอะไร?", choices: ["ขอบคุณที่เกิดมาให้รัก", "อย่าแตกสลายเพราะใครเลย", "รักที่ปลอดภัย", "เพราะใจ"], media: image(14), timeSeconds: 15 },
  { id: 15, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["Mulan", "Raya and the Last Dragon", "Pocahontas", "Frozen"], media: emoji("🇨🇳⚔️🐉🏹🌸"), timeSeconds: 15 },
  { id: 16, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["Tangled", "Cinderella", "Frozen", "Coco"], media: emoji("🕛👠🎃🐭🏰"), timeSeconds: 15 },
  { id: 17, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["WALL-E", "Cars", "Zootopia", "Toy Story"], media: emoji("🤠👨‍🚀🦖🐷🚀"), timeSeconds: 15 },
  { id: 18, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["Peter Pan", "Pirates of the Caribbean", "The Little Mermaid", "Alice in Wonderland"], media: emoji("👦🏻🧚🏼‍♀️🌙🪟🐊🏴‍☠️"), timeSeconds: 15 },
  { id: 19, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["The Nightmare Before Christmas", "Monsters, Inc.", "Lilo & Stitch", "Inside Out"], media: emoji("👁️👹👧🏾🚪🏢"), timeSeconds: 15 },
  { id: 20, kind: "bonus", prompt: "Bonus Magic Time", timeSeconds: 120, bonusPrompts: ["ฮ _ ล ใ จ", "ร _ บ _ ย ม _", "_ธ _ ช่ ว ย ท _ง เ ร _ ได_ ไห_", "_จ ฟ _ ทุ ก ค รั้ ง ที่ ม _ ง _น้ _ เ ธ _", "ป _ ป น ก _ บ น้ _ ต _", "ค ว _ ม ร _ ก ห น้ _ ต _ แ บ บ เ ธ _", "C h _ _ t", "ก ล _ บ ไ _ ห _ ค น ใ น ใ _ ข อ ง เ ธ _ เ ล ย ไ ป", "ท _ ท _ ไ ม", "แ_มา ก"] },
];
