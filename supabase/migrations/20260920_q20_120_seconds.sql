-- Q20 is a ten-answer final round. Give existing seeded rooms the same 120-second
-- limit as new rooms seeded from data/questions.ts.
update public.questions as question
set time_limit_seconds = 120
from public.quizzes as quiz
where question.quiz_id = quiz.id
  and quiz.title = 'JIXGO Magical 24'
  and question.position = 20
  and question.kind = 'bonus';
