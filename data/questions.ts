export type QuizQuestion = {
  id: number;
  prompt: string;
  choices: Array<string | number>;
  correctIndex: number;
  answer: string | number;
  imageUrl: string;
  imageFrame: "portrait" | "square" | "tall";
};

export const sampleQuestions: QuizQuestion[] = [
  { id: 1, prompt: "จิ๊กโก๋เกิดวันที่เท่าไหร่", choices: ["24 พย.", "22 พย.", "26 พย.", "28 พย."], correctIndex: 3, answer: "28 พย.", imageUrl: "/assets/questions/question-01.jpg", imageFrame: "portrait" },
  { id: 2, prompt: "จิ๊กโก๋เกิดราศีอะไร", choices: ["ราศีธนู", "ราศีเมษ", "ราศีพิจิก", "ราศีพิจิกกา"], correctIndex: 2, answer: "ราศีพิจิก", imageUrl: "/assets/questions/question-02.jpg", imageFrame: "square" },
  { id: 3, prompt: "บ้านเกิดจิ๊กโก๋อยู่จังหวัดไหน", choices: ["ย่าโม", "พิษณุโลก", "เชียงใหม่", "เขาใหญ่"], correctIndex: 1, answer: "พิษณุโลก", imageUrl: "/assets/questions/question-03.png", imageFrame: "portrait" },
  { id: 4, prompt: "จิ๊กโก๋มีชื่อเล่นจริงๆ ว่าอะไร", choices: ["จิ๋ว", "จิ๊กโก๋", "ครีม", "จิ๊กกี๋"], correctIndex: 2, answer: "ครีม", imageUrl: "/assets/questions/question-04.jpg", imageFrame: "portrait" },
  { id: 5, prompt: "จิ๊กโก๋กรุ๊ปเลือดอะไร", choices: ["A", "B", "AB", "O"], correctIndex: 1, answer: "B", imageUrl: "/assets/questions/question-05.jpg", imageFrame: "portrait" },
  { id: 6, prompt: "เพลงแรกที่ร้อง 3 คน เพลงอะไร", choices: ["โต๊ะหมู่", "โต๊ะริม", "โต๊ะริมทาง", "โต๊ะพึมๆ"], correctIndex: 1, answer: "โต๊ะริม", imageUrl: "/assets/questions/question-06.jpg", imageFrame: "tall" },
  { id: 7, prompt: "ปีนี้จิ๊กโก๋อายุเท่าไหร่?", choices: [20, 24, 19, 22], correctIndex: 1, answer: 24, imageUrl: "/assets/questions/question-07.jpg", imageFrame: "portrait" },
  { id: 8, prompt: "เพลง ใจฟูทุกครั้งที่มองหน้าเธอ จิ๋วใส่เสื้อสีอะไร", choices: ["ขาว", "ชมพู", "น้ำเงิน", "ดำ"], correctIndex: 1, answer: "ชมพู", imageUrl: "/assets/questions/question-08.jpg", imageFrame: "portrait" },
  { id: 9, prompt: "จิ๊กโก๋มีหมาชื่ออะไร", choices: ["โบโบ้", "บับว่า", "ชัพปุย", "บับเบิ้ล"], correctIndex: 3, answer: "บับเบิ้ล", imageUrl: "/assets/questions/question-09.jpg", imageFrame: "portrait" }
];

export function driveImageUrl(url: string) {
  const match = url.match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}
