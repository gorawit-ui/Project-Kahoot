export type QuizQuestion = {
  id: number;
  prompt: string;
  choices: Array<string | number>;
  correctIndex: number;
  answer: string | number;
  imageUrl: string;
};

export const sampleQuestions: QuizQuestion[] = [
  { id: 1, prompt: "จิ๊กโก๋เกิดวันที่เท่าไหร่", choices: ["24 พย.", "22 พย.", "26 พย.", "28 พย."], correctIndex: 3, answer: "28 พย.", imageUrl: "https://drive.google.com/file/d/1_UGUIhbn6QFZe-Hqn61TFONz7OwO997n/view?usp=drive_link" },
  { id: 2, prompt: "จิ๊กโก๋เกิดราศีอะไร", choices: ["ราศีธนู", "ราศีเมษ", "ราศีพิจิก", "ราศีพิจิกกา"], correctIndex: 2, answer: "ราศีพิจิก", imageUrl: "https://drive.google.com/file/d/1IooNKCGpn1ZK5g6Gi8dUjXr3w0gp9PNM/view?usp=drive_link" },
  { id: 3, prompt: "บ้านเกิดจิ๊กโก๋อยู่จังหวัดไหน", choices: ["ย่าโม", "พิษณุโลก", "เชียงใหม่", "เขาใหญ่"], correctIndex: 1, answer: "พิษณุโลก", imageUrl: "https://drive.google.com/file/d/1S9q8WuayCFBtvy_3953WMcUQdO5SchVA/view?usp=drive_link" },
  { id: 4, prompt: "จิ๊กโก๋มีชื่อเล่นจริงๆ ว่าอะไร", choices: ["จิ๋ว", "จิ๊กโก๋", "ครีม", "จิ๊กกี๋"], correctIndex: 2, answer: "ครีม", imageUrl: "https://drive.google.com/file/d/1Y5SdhRCSCLmNjiH1D9XAio54Es75irlk/view?usp=drive_link" },
  { id: 5, prompt: "จิ๊กโก๋กรุ๊ปเลือดอะไร", choices: ["A", "B", "AB", "O"], correctIndex: 1, answer: "B", imageUrl: "https://drive.google.com/file/d/1XjuUpEWxehhoXQqUD932X0O3QIoO0BeI/view?usp=drive_link" },
  { id: 6, prompt: "เพลงแรกที่ร้อง 3 คน เพลงอะไร", choices: ["โต๊ะหมู่", "โต๊ะริม", "โต๊ะริมทาง", "โต๊ะพึมๆ"], correctIndex: 1, answer: "โต๊ะริม", imageUrl: "https://drive.google.com/file/d/1_z7X1PXvm7Qr87LgphowXHsLpUQuEeP-/view?usp=drive_link" },
  { id: 7, prompt: "ปีนี้จิ๊กโก๋อายุเท่าไหร่?", choices: [20, 24, 19, 22], correctIndex: 1, answer: 24, imageUrl: "https://drive.google.com/file/d/1-0vOzPGEW_TD_pt-oyzoMdjUkpZUK1pQ/view?usp=drive_link" },
  { id: 8, prompt: "เพลง ใจฟูทุกครั้งที่มองหน้าเธอ จิ๋วใส่เสื้อสีอะไร", choices: ["ขาว", "ชมพู", "น้ำเงิน", "ดำ"], correctIndex: 1, answer: "ชมพู", imageUrl: "https://drive.google.com/file/d/1xr4qmKwFlfJMOSyPGzyLcQ4VrZxJKn3x/view?usp=drive_link" },
  { id: 9, prompt: "จิ๊กโก๋มีหมาชื่ออะไร", choices: ["โบโบ้", "บับว่า", "ชัพปุย", "บับเบิ้ล"], correctIndex: 3, answer: "บับเบิ้ล", imageUrl: "https://drive.google.com/file/d/1m11IPsR7UZOuQSN5fF15Dwp1EzRHkfqi/view?usp=drive_link" }
];

export function driveImageUrl(url: string) {
  const match = url.match(/\/d\/([^/]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}
