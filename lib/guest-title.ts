const titles = [
  "ผู้ตามหาแสงดาว",
  "ผู้พิทักษ์ความทรงจำ",
  "นักเดินทางแห่งเวทมนตร์",
  "แขกคนพิเศษของ Jixgo",
];

export function guestTitle(name: string) {
  const total = Array.from(name).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return titles[total % titles.length];
}
