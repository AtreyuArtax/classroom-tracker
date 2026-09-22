/**
 * src/test_powerschool_bookmarklet.js
 *
 * Verifies that the PowerSchool bookmarklet and helper module are syntactically valid,
 * properly exported, and include ZIP bundling and Cancel capabilities.
 */

import { POWERSCHOOL_PHOTO_SCRIPT, POWERSCHOOL_BOOKMARKLET_HREF, copyToClipboard } from './utils/powerschoolBookmarklet.js';
import JSZip from 'jszip';

console.log('Testing PowerSchool Bookmarklet Module...');

// 1. Check exports exist
if (!POWERSCHOOL_PHOTO_SCRIPT || typeof POWERSCHOOL_PHOTO_SCRIPT !== 'string') {
  throw new Error('POWERSCHOOL_PHOTO_SCRIPT is missing or not a string');
}

if (!POWERSCHOOL_BOOKMARKLET_HREF || typeof POWERSCHOOL_BOOKMARKLET_HREF !== 'string') {
  throw new Error('POWERSCHOOL_BOOKMARKLET_HREF is missing or not a string');
}

if (typeof copyToClipboard !== 'function') {
  throw new Error('copyToClipboard is not a function');
}

// 2. Check bookmarklet starts with javascript:
if (!POWERSCHOOL_BOOKMARKLET_HREF.startsWith('javascript:')) {
  throw new Error('POWERSCHOOL_BOOKMARKLET_HREF must start with javascript:');
}

// 3. Check for core scraper logic and regexes
if (!POWERSCHOOL_PHOTO_SCRIPT.includes('getAllFrames')) {
  throw new Error('Script missing getAllFrames function');
}

if (!POWERSCHOOL_PHOTO_SCRIPT.includes('ph_thumb')) {
  throw new Error('Script missing ph_thumb check');
}

if (!POWERSCHOOL_PHOTO_SCRIPT.includes('\\b1\\d{8}\\b')) {
  throw new Error('Script missing 9-digit student ID regex (\\b1\\d{8}\\b)');
}

if (!POWERSCHOOL_PHOTO_SCRIPT.includes('ct-ps-hud')) {
  throw new Error('Script missing floating HUD element id');
}

// 4. Check for ZIP builder and Cancel logic
if (!POWERSCHOOL_PHOTO_SCRIPT.includes('buildZipBlob')) {
  throw new Error('Script missing buildZipBlob function');
}

if (!POWERSCHOOL_PHOTO_SCRIPT.includes('isCancelled')) {
  throw new Error('Script missing isCancelled state');
}

if (!POWERSCHOOL_PHOTO_SCRIPT.includes('ct-hud-cancel')) {
  throw new Error('Script missing Cancel button element');
}

if (!POWERSCHOOL_PHOTO_SCRIPT.includes('student_photos.zip')) {
  throw new Error('Script missing student_photos.zip filename');
}

// 5. Validate that the script syntax is valid JS by parsing via Function constructor
try {
  new Function(POWERSCHOOL_PHOTO_SCRIPT);
  console.log('✅ Script syntax parsed successfully via new Function()');
} catch (e) {
  throw new Error('JavaScript syntax error in POWERSCHOOL_PHOTO_SCRIPT: ' + e.message);
}

// 6. Test that JSZip can unzip dummy zip data
const zip = new JSZip();
zip.file('104829381.jpg', new Uint8Array([255, 216, 255]));
const zipBlob = await zip.generateAsync({ type: 'uint8array' });
const loaded = await JSZip.loadAsync(zipBlob);
if (!loaded.files['104829381.jpg']) {
  throw new Error('JSZip failed to verify test photo');
}
console.log('✅ JSZip archive unpacking verified successfully');

console.log('✅ All PowerSchool Bookmarklet and ZIP tests passed successfully!');
