# Checks the font files the app serves itself (fonts/, declared in base.css).
# A character a font file does not hold raises no error anywhere: the browser quietly draws it in a font of the
# device. So this looks inside the files: the weights each one holds, and the characters the app needs from it.
# Needs: pip install fonttools brotli (brotli is what opens a .woff2).
import os, re, glob
from fontTools.ttLib import TTFont
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.environ.get('SITE_DIR') or os.path.join(HERE, '..', 'site', 'html', 'content', 'lang', 'telugu')
fails = 0
def ok(c, m):
    global fails; print(('PASS ' if c else 'FAIL ') + m); fails += (not c)
def font(name):                                     # fonts/<name>-v<N>.woff2, whatever N is now
    found = glob.glob(os.path.join(SITE, 'fonts', name + '-v[0-9]*.woff2'))
    ok(len(found) == 1, 'fonts/ has one ' + name + ' file: ' + ', '.join(os.path.basename(f) for f in found))
    return TTFont(found[0]) if found else None
def weights(f):                                     # (lightest, heaviest) the file can draw
    if 'fvar' in f: return next((int(a.minValue), int(a.maxValue)) for a in f['fvar'].axes if a.axisTag == 'wght')
    return (f['OS/2'].usWeightClass,) * 2
show = lambda chars: ' '.join('U+%04X' % ord(c) for c in sorted(chars))

# Every character in the app's pages and scripts, comments included (a character only a comment uses costs nothing to check).
text = ''
for folder, _, names in os.walk(SITE):
    for n in names:
        if n.endswith(('.js', '.html')): text += open(os.path.join(folder, n), encoding='utf-8').read()
telugu = {c for c in text if '\u0C00' <= c <= '\u0C7F'} | {'\u200C', '\u200D', '\u25CC'}      # the block, the two joiners, the dotted circle
# What a sound is written with, in IPA or ISO: accented Latin, IPA letters, modifier letters, combining marks, Greek, Latin Extended Additional
sounds = {c for c in text if '\u00A0' <= c <= '\u03FF' or '\u1E00' <= c <= '\u1EFF'}
ascii_ = {chr(c) for c in range(0x20, 0x7F)}

WANT = {'inter': (400, 700), 'noto-sans': (400, 500), 'noto-sans-telugu': (400, 700), 'noto-serif-telugu': (400, 600), 'tiro-telugu': (400, 400)}
fonts = {name: font(name) for name in WANT}
if all(fonts.values()):
    for name, f in fonts.items():
        ok(weights(f) == WANT[name], name + ' holds weights %d to %d, as base.css declares' % weights(f))
    have = {name: {chr(c) for c in f.getBestCmap()} for name, f in fonts.items()}
    ok(len(telugu) > 70 and len(sounds) > 40, 'the app shows %d Telugu characters and %d sound characters' % (len(telugu), len(sounds)))
    for name in ('noto-sans-telugu', 'noto-serif-telugu', 'tiro-telugu'):
        ok(telugu <= have[name], name + ' has every Telugu character the app contains' + ('' if telugu <= have[name] else ' — missing ' + show(telugu - have[name])))
    ok(sounds <= have['noto-sans'], 'noto-sans (the font sounds are shown in) has every sound character the app contains' + ('' if sounds <= have['noto-sans'] else ' — missing ' + show(sounds - have['noto-sans'])))
    for name in WANT:
        ok(ascii_ <= have[name], name + ' has the plain Latin letters, digits, and punctuation, so mixed text stays in one font')
print('FAILED' if fails else 'ALL PASSED'); raise SystemExit(1 if fails else 0)
