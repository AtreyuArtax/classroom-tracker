/**
 * src/utils/studentInfoDocxExport.js
 *
 * Generates a clean Microsoft Word (.docx) template specifically formatted
 * for Microsoft Forms Quick Import (.docx / .pdf).
 */

import { createDocxBlobFromLines } from './docxExport.js'

export const STUDENT_INFO_QUESTIONS_TEXT = `Student Information & Getting to Know You Survey

1. What name do you prefer to be called in class?

2. What pronouns do you want me to use?
a. He / Him
b. She / Her
c. They / Them
d. Prefer to share privately
e. Other

3. Can I use your preferred name and pronouns when contacting home / parents?
a. Yes, in class and when contacting home
b. Only in the classroom (Please use my official roster name/pronouns when contacting home)
c. Let's talk about it privately first

4. When I set up the seating chart, what location helps you focus best?
a. Near the front (easier to see the board, hear clearly, and stay locked in)
b. Middle of the room
c. Towards the back or outer edge (I focus better when I'm not surrounded on all sides)
d. Away from the door / high-traffic walkways (I get easily distracted by movement)
e. No preference — I can focus well anywhere

5. What grade range or goal are you aiming for in this course?
a. 90% – 100% (Level 4+ / Aiming for top marks)
b. 80% – 89% (Level 4 / Strong mastery)
c. 70% – 79% (Level 3 / Solid provincial standard)
d. 60% – 69% (Level 2 / Basic understanding)
e. 50% – 59% (Level 1 / Passing & earning the credit)
f. Just looking to build confidence and improve from last year

6. On a scale of 1 to 5, how confident do you feel about this course?
a. 1 - Very nervous / Need a lot of support
b. 2 - A bit unsure / Struggled in past years
c. 3 - Okay / In the middle
d. 4 - Fairly confident / Ready to learn
e. 5 - Very confident / Love this subject

7. When you get stuck on a task or don't understand something in class, what do you usually do first?
a. I raise my hand or ask the teacher right away
b. I re-read the notes, examples, or instructions to try to figure it out myself
c. I ask a classmate sitting near me
d. I tend to wait and hope it gets explained later / I hesitate to ask out loud

8. What sports, school clubs, creative arts, or hobbies do you enjoy inside or outside of school?

9. What real-world topics, fields, or technologies are you curious about right now? (e.g., athletics/biomechanics, gaming/coding, medicine/health, space exploration, mechanics/cars, climate/energy, social issues, music/media)

10. Is there anything else you want me to know about you to help you have a successful semester? (Confidential note for your teacher)`

/**
 * Generates a .docx Blob containing the 10-question Student Intake template.
 * @returns {Promise<Blob>}
 */
export async function generateStudentInfoDocx() {
  const lines = STUDENT_INFO_QUESTIONS_TEXT.split('\n')
  return await createDocxBlobFromLines(lines)
}
