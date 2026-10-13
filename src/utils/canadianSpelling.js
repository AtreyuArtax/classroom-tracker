/**
 * src/utils/canadianSpelling.js
 *
 * Canadian English spelling normalization & Subject Name casing utilities
 * compliant with Simcoe County District School Board (SCDSB) APM A1460
 * (Assessment, Evaluation and Reporting) Appendix E-1 and E-2.
 *
 * Rules:
 *  - Standard Canadian spelling (colour, behaviour, centre, modelling, etc.)
 *  - Subject names are written in lowercase (mathematics, science and technology,
 *    health and physical education, history, geography, the arts), with the exception
 *    of proper nouns such as French.
 */

/**
 * Normalizes a subject name for report card comments according to SCDSB APM A1460 Appendix E-1:
 * "Subject names are written in lowercase (e.g., mathematics, science and technology,
 * health and physical education), with the exception of proper nouns such as French."
 *
 * @param {string} rawName - Raw subject name or title
 * @returns {string} Normalized subject name
 */
export function formatSubjectNameForComment(rawName = '') {
  const trimmed = String(rawName || '').trim()
  if (!trimmed) return 'the curriculum'

  // Proper noun languages: French, Français
  if (/\bfrench\b/i.test(trimmed) || /\bfrançais\b/i.test(trimmed)) {
    return trimmed
      .replace(/\b(core|extended|immersion)\b/gi, m => m.toLowerCase())
      .replace(/\bfrench\b/gi, 'French')
      .replace(/\bfrançais\b/gi, 'Français')
  }

  // Indigenous languages (proper nouns)
  const indigenousLanguages = ['ojibwe', 'cree', 'anishinaabemowin', 'mohawk', 'haida', 'inuktitut', 'cayuga', 'oneida']
  for (const lang of indigenousLanguages) {
    if (new RegExp(`\\b${lang}\\b`, 'i').test(trimmed)) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    }
  }

  // All other subjects: strictly lowercase per SCDSB APM A1460 Appendix E-1
  return trimmed.toLowerCase()
}

/**
 * Enforces standard Canadian English spelling on a text string, converting
 * common American spelling variants into standard Canadian school board forms.
 *
 * Preserves initial capitalization (e.g. Color -> Colour, color -> colour).
 *
 * @param {string} text - Input text
 * @returns {string} Text with standard Canadian spelling
 */
export function enforceCanadianSpelling(text = '') {
  if (!text || typeof text !== 'string') return text

  return text
    // -our words (colour, behaviour, favourite, honour, neighbour, flavour)
    .replace(/\b([Cc])olor(-coded|-coding)?\b/g, (m, p1, p2) => (p1 === 'C' ? 'Colour' : 'colour') + (p2 || ''))
    .replace(/\b([Cc])olors\b/g, (m, p1) => (p1 === 'C' ? 'Colours' : 'colours'))
    .replace(/\b([Cc])olored\b/g, (m, p1) => (p1 === 'C' ? 'Coloured' : 'coloured'))
    .replace(/\b([Cc])oloring\b/g, (m, p1) => (p1 === 'C' ? 'Colouring' : 'colouring'))
    .replace(/\b([Bb])ehavior\b/g, (m, p1) => (p1 === 'B' ? 'Behaviour' : 'behaviour'))
    .replace(/\b([Bb])ehaviors\b/g, (m, p1) => (p1 === 'B' ? 'Behaviours' : 'behaviours'))
    .replace(/\b([Bb])ehavioral\b/g, (m, p1) => (p1 === 'B' ? 'Behavioural' : 'behavioural'))
    .replace(/\b([Ff])avorite\b/g, (m, p1) => (p1 === 'F' ? 'Favourite' : 'favourite'))
    .replace(/\b([Ff])avorites\b/g, (m, p1) => (p1 === 'F' ? 'Favourites' : 'favourites'))
    .replace(/\b([Hh])onor\b/g, (m, p1) => (p1 === 'H' ? 'Honour' : 'honour'))
    .replace(/\b([Hh])onors\b/g, (m, p1) => (p1 === 'H' ? 'Honours' : 'honours'))
    .replace(/\b([Hh])onorable\b/g, (m, p1) => (p1 === 'H' ? 'Honourable' : 'honourable'))
    .replace(/\b([Nn])eighbor\b/g, (m, p1) => (p1 === 'N' ? 'Neighbour' : 'neighbour'))
    .replace(/\b([Nn])eighbors\b/g, (m, p1) => (p1 === 'N' ? 'Neighbours' : 'neighbours'))
    .replace(/\b([Nn])eighborhood\b/g, (m, p1) => (p1 === 'N' ? 'Neighbourhood' : 'neighbourhood'))
    .replace(/\b([Ff])lavor\b/g, (m, p1) => (p1 === 'F' ? 'Flavour' : 'flavour'))
    .replace(/\b([Ff])lavors\b/g, (m, p1) => (p1 === 'F' ? 'Flavours' : 'flavours'))

    // -re words (centre, theatre)
    .replace(/\b([Cc])enter\b/g, (m, p1) => (p1 === 'C' ? 'Centre' : 'centre'))
    .replace(/\b([Cc])enters\b/g, (m, p1) => (p1 === 'C' ? 'Centres' : 'centres'))
    .replace(/\b([Cc])entered\b/g, (m, p1) => (p1 === 'C' ? 'Centred' : 'centred'))
    .replace(/\b([Cc])entering\b/g, (m, p1) => (p1 === 'C' ? 'Centring' : 'centring'))
    .replace(/\b([Tt])heater\b/g, (m, p1) => (p1 === 'T' ? 'Theatre' : 'theatre'))
    .replace(/\b([Tt])heaters\b/g, (m, p1) => (p1 === 'T' ? 'Theatres' : 'theatres'))

    // Metric units (-re; exclude measuring instruments like voltmeter, thermometer, ammeter)
    .replace(/\b([Mm])eters\b/g, (m, p1) => (p1 === 'M' ? 'Metres' : 'metres'))
    .replace(/\b([Mm])eter\b/g, (m, p1) => (p1 === 'M' ? 'Metre' : 'metre'))
    .replace(/\b([Cc])entimeters\b/g, (m, p1) => (p1 === 'C' ? 'Centimetres' : 'centimetres'))
    .replace(/\b([Cc])entimeter\b/g, (m, p1) => (p1 === 'C' ? 'Centimetre' : 'centimetre'))
    .replace(/\b([Mm])illimeters\b/g, (m, p1) => (p1 === 'M' ? 'Millimetres' : 'millimetres'))
    .replace(/\b([Mm])illimeter\b/g, (m, p1) => (p1 === 'M' ? 'Millimetre' : 'millimetre'))
    .replace(/\b([Kk])ilometers\b/g, (m, p1) => (p1 === 'K' ? 'Kilometres' : 'kilometres'))
    .replace(/\b([Kk])ilometer\b/g, (m, p1) => (p1 === 'K' ? 'Kilometre' : 'kilometre'))
    .replace(/\b([Ll])iters\b/g, (m, p1) => (p1 === 'L' ? 'Litres' : 'litres'))
    .replace(/\b([Ll])iter\b/g, (m, p1) => (p1 === 'L' ? 'Litre' : 'litre'))
    .replace(/\b([Mm])illiliters\b/g, (m, p1) => (p1 === 'M' ? 'Millilitres' : 'millilitres'))
    .replace(/\b([Mm])illiliter\b/g, (m, p1) => (p1 === 'M' ? 'Millilitre' : 'millilitre'))

    // Doubled consonants in Canadian English (modelling, labelled, cancelled, travelled)
    .replace(/\b([Mm])odeling\b/g, (m, p1) => (p1 === 'M' ? 'Modelling' : 'modelling'))
    .replace(/\b([Mm])odeled\b/g, (m, p1) => (p1 === 'M' ? 'Modelled' : 'modelled'))
    .replace(/\b([Ll])abeling\b/g, (m, p1) => (p1 === 'L' ? 'Labelling' : 'labelling'))
    .replace(/\b([Ll])abeled\b/g, (m, p1) => (p1 === 'L' ? 'Labelled' : 'labelled'))
    .replace(/\b([Cc])anceling\b/g, (m, p1) => (p1 === 'C' ? 'Cancelling' : 'cancelling'))
    .replace(/\b([Cc])anceled\b/g, (m, p1) => (p1 === 'C' ? 'Cancelled' : 'cancelled'))
    .replace(/\b([Tt])raveling\b/g, (m, p1) => (p1 === 'T' ? 'Travelling' : 'travelling'))
    .replace(/\b([Tt])raveled\b/g, (m, p1) => (p1 === 'T' ? 'Travelled' : 'travelled'))
}
