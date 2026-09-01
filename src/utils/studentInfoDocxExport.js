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

4. Where in the classroom do you learn best?
a. Front near the board / screen
b. Middle of the room
c. Near a window / natural light
d. Away from high-traffic doors
e. In a quiet corner
f. No preference

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

7. What sports, school clubs, arts, or hobbies do you enjoy inside or outside of school?

8. Is there anything else you want me to know about you to help you have a great year? (Confidential note for your teacher)`

/**
 * Generates a .docx Blob containing the 8-question Student Intake template.
 * @returns {Promise<Blob>}
 */
export async function generateStudentInfoDocx() {
  const lines = STUDENT_INFO_QUESTIONS_TEXT.split('\n')
  return await createDocxBlobFromLines(lines)
}
