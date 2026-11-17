// Where the Telugu app lives. The GitHub Action checks the website repo out to ./site and sets SITE_DIR;
// locally, point SITE_DIR at html/content/lang/telugu inside your clone of the website repo.
const path = require('path'), fs = require('fs');
const SITE_DIR = path.resolve(process.env.SITE_DIR || path.join(__dirname, '..', 'site', 'html', 'content', 'lang', 'telugu'));
if (!fs.existsSync(path.join(SITE_DIR, 'index.html'))) {
  console.error('SITE_DIR does not contain index.html: ' + SITE_DIR + '\nSet SITE_DIR to the Telugu app folder (html/content/lang/telugu in the website repo).');
  process.exit(2);
}
module.exports = { SITE_DIR };
