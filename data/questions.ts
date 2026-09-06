export type ChoiceQuestion = {
  id: number;
  kind: "choice";
  prompt: string;
  choices: string[];
  correctIndex: number;
  answer: string;
  media: { type: "image"; src: string } | { type: "emoji"; clues: string; displayClues?: string };
  timeSeconds: number;
};

export type BonusEntry = { id: string; prompt: string; answer: string };

export type BonusQuestion = {
  id: number;
  kind: "bonus";
  prompt: string;
  intro: string;
  timeSeconds: number;
  bonusEntries: BonusEntry[];
};

export type QuizQuestion = ChoiceQuestion | BonusQuestion;

const image = (id: number, extension = "jpg") => ({ type: "image" as const, src: `/assets/questions/question-${String(id).padStart(2, "0")}.${extension}` });
const emoji = (clues: string, displayClues?: string) => ({ type: "emoji" as const, clues, displayClues });

export const sampleQuestions: QuizQuestion[] = [
  { id: 1, kind: "choice", prompt: "จิ๊กโก๋เกิดวันที่เท่าไหร่", choices: ["24 พย.", "22 พย.", "26 พย.", "28 พย."], correctIndex: 3, answer: "28 พย.", media: image(1), timeSeconds: 15 },
  { id: 2, kind: "choice", prompt: "จิ๊กโก๋เกิดราศีอะไร", choices: ["ราศีธนู", "ราศีเมษ", "ราศีพิจิก", "ราศีพิจิกกา"], correctIndex: 2, answer: "ราศีพิจิก", media: image(2), timeSeconds: 15 },
  { id: 3, kind: "choice", prompt: "บ้านเกิดจิ๊กโก๋อยู่จังหวัดไหน", choices: ["ย่าโม", "พิษณุโลก", "เชียงใหม่", "เขาใหญ่"], correctIndex: 1, answer: "พิษณุโลก", media: image(3), timeSeconds: 15 },
  { id: 4, kind: "choice", prompt: "จิ๊กโก๋มีชื่อเล่นจริงๆ ว่าอะไร", choices: ["จิ๋ว", "จิ๊กโก๋", "ครีม", "จิ๊กกี๋"], correctIndex: 2, answer: "ครีม", media: image(4), timeSeconds: 15 },
  { id: 5, kind: "choice", prompt: "จิ๊กโก๋กรุ๊ปเลือดอะไร", choices: ["A", "B", "AB", "O"], correctIndex: 1, answer: "B", media: image(5), timeSeconds: 15 },
  { id: 6, kind: "choice", prompt: "เพลงแรกที่ร้อง 3 คน เพลงอะไร", choices: ["โต๊ะหมู่", "โต๊ะริม", "โต๊ะริมทาง", "โต๊ะพึมๆ"], correctIndex: 1, answer: "โต๊ะริม", media: image(6), timeSeconds: 15 },
  { id: 7, kind: "choice", prompt: "ปีนี้จิ๊กโก๋อายุเท่าไหร่?", choices: ["20", "24", "19", "22"], correctIndex: 1, answer: "24", media: image(7), timeSeconds: 15 },
  { id: 8, kind: "choice", prompt: "เพลง ใจฟูทุกครั้งที่มองหน้าเธอ จิ๊กโก๋ใส่เสื้อสีอะไร", choices: ["ขาว", "ชมพู", "น้ำเงิน", "ดำ"], correctIndex: 1, answer: "ชมพู", media: image(8), timeSeconds: 15 },
  { id: 9, kind: "choice", prompt: "จิ๊กโก๋มีหมาชื่ออะไร", choices: ["โบโบ้", "บับว่า", "ชัพปุย", "บับเบิ้ล"], correctIndex: 3, answer: "บับเบิ้ล", media: image(9), timeSeconds: 15 },
  { id: 10, kind: "choice", prompt: "ประเทศที่จิ๊กโก๋เคยไปศึกษาต่อคือประเทศอะไร", choices: ["Scottland", "New Zealand", "Australia", "Canada"], correctIndex: 1, answer: "New Zealand", media: image(10), timeSeconds: 15 },
  { id: 11, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["ทนทำไม", "ออกมาได้แล้ว", "Toxic", "ทนไม่ไหวก็ต้องทน"], correctIndex: 0, answer: "ทนทำไม", media: image(11), timeSeconds: 15 },
  { id: 12, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["กลับไปหาคนในใจเลยไป", "อย่ากลับมาทำร้ายฉันคนนี้อีกเลย", "กลับไปหาคนในใจของเธอเลยไป", "กลัวฉันเสียเธอ"], correctIndex: 2, answer: "กลับไปหาคนในใจของเธอเลยไป", media: image(12), timeSeconds: 15 },
  { id: 13, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["จมอยู่กับความเสียใจ", "Cheat", "นอกใจกันมานานแค่ไหน", "การนอกใจไม่ใช่ความผิดพลาดไง"], correctIndex: 1, answer: "Cheat", media: image(13), timeSeconds: 15 },
  { id: 14, kind: "choice", prompt: "จากภาพนี้คือเพลงอะไร?", choices: ["ขอบคุณที่เกิดมาให้รัก", "อย่าแตกสลายเพราะใครเลย", "รักที่ปลอดภัย", "เพราะใจ"], correctIndex: 2, answer: "รักที่ปลอดภัย", media: image(14), timeSeconds: 15 },
  { id: 15, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["Raya and the Last Dragon", "Mulan", "Pocahontas", "Frozen"], correctIndex: 1, answer: "Mulan", media: emoji("🇨🇳⚔️🐉🏹🌸", "🏮⚔️🐉🏹🌸"), timeSeconds: 15 },
  { id: 16, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["Tangled", "Cinderella", "Frozen", "Coco"], correctIndex: 1, answer: "Cinderella", media: emoji("🕛👠🎃🐭🏰"), timeSeconds: 15 },
  { id: 17, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["WALL-E", "Cars", "Zootopia", "Toy Story"], correctIndex: 3, answer: "Toy Story", media: emoji("🤠👨‍🚀🦖🐷🚀"), timeSeconds: 15 },
  { id: 18, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["Peter Pan", "Pirates of the Caribbean", "The Little Mermaid", "Alice in Wonderland"], correctIndex: 0, answer: "Peter Pan", media: emoji("👦🏻🧚🏼‍♀️🌙🪟🐊🏴‍☠️"), timeSeconds: 15 },
  { id: 19, kind: "choice", prompt: "เรื่องนี้คือภาพยนตร์เรื่องอะไร?", choices: ["The Nightmare Before Christmas", "Monsters, Inc.", "Lilo & Stitch", "Inside Out"], correctIndex: 1, answer: "Monsters, Inc.", media: emoji("👁️👹👧🏾🚪🏢"), timeSeconds: 15 },
  { id: 20, kind: "bonus", prompt: "Bonus Magic Time", intro: "เติมชื่อเพลงให้ครบทุกตัวอักษร แล้วส่งคำตอบทั้ง 10 เพลงภายใน 60 วินาที", timeSeconds: 60, bonusEntries: [
    { id: "20.1", prompt: "ฮ _ ล ใ จ", answer: "ฮีลใจ" },
    { id: "20.2", prompt: "ร _ บ _ ย ม _", answer: "ระบายมา" },
    { id: "20.3", prompt: "_ธ _ ช่ ว ย ท _ง เ ร _ ได_ ไห_", answer: "เธอช่วยทิ้งเราได้ไหม" },
    { id: "20.4", prompt: "_จ ฟ _ ทุ ก ค รั้ ง ที่ ม _ ง _น้ _ เ ธ _", answer: "ใจฟูทุกครั้งที่มองหน้าเธอ" },
    { id: "20.5", prompt: "ป _ ป น ก _ บ น้ _ ต _", answer: "ปะปนกับน้ำตา" },
    { id: "20.6", prompt: "ค ว _ ม ร _ ก ห น้ _ ต _ แ บ บ เ ธ _", answer: "ความรักหน้าตาแบบเธอ" },
    { id: "20.7", prompt: "C h _ _ t", answer: "Cheat" },
    { id: "20.8", prompt: "ก ล _ บ ไ _ ห _ ค น ใ น ใ _ ข อ ง เ ธ _ เ ล ย ไ ป", answer: "กลับไปหาคนในใจของเธอเลยไป" },
    { id: "20.9", prompt: "ท _ ท _ ไ ม", answer: "ทนทำไม" },
    { id: "20.10", prompt: "แ _ มา ก", answer: "แพ้มาก" },
  ] },
];

export function bonusPoints(correctCount: number) {
  if (correctCount === 10) return 500;
  if (correctCount >= 8) return 450;
  if (correctCount >= 5) return 300;
  if (correctCount >= 2) return 200;
  if (correctCount === 1) return 100;
  return 0;
}
import "server-only";
