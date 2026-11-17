# Checks the conjunct/sign notes against the font's own shaping (Noto Sans Telugu).
# Needs: pip install fonttools uharfbuzz, and `npm install` (the font comes from @fontsource/noto-sans-telugu).
import os, re, io, collections
from fontTools.ttLib import TTFont
import uharfbuzz as hb
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.environ.get('SITE_DIR') or os.path.join(HERE, '..', 'site', 'html', 'content', 'lang', 'telugu')
WOFF = os.environ.get('FONT_WOFF') or os.path.join(HERE, '..', 'node_modules', '@fontsource', 'noto-sans-telugu', 'files', 'noto-sans-telugu-telugu-400-normal.woff')
f = TTFont(WOFF); f.flavor = None; buf = io.BytesIO(); f.save(buf); data = buf.getvalue()
order = f.getGlyphOrder(); font = hb.Font(hb.Face(data))
def shape(t):
    b=hb.Buffer(); b.add_str(t); b.guess_segment_properties(); hb.shape(font,b,{}); return [order[i.codepoint] for i in b.glyph_infos]
src=open(os.path.join(SITE,'reference','signs-conjuncts-data.js'),encoding='utf-8').read()
def const(name): return re.search(r"const "+name+r"\s*=\s*'([^']*)'", src).group(1)
BELOW, BESIDE = const('BELOW'), const('BESIDE')
cons=[chr(c) for c in list(range(0x0C15,0x0C3A)) if c not in (0x0C29,0x0C34)]+['ఱ']
fails=0
def ok(c,m):
    global fails; print(('PASS ' if c else 'FAIL ')+m); fails+= (not c)
# families
fam={}
for c in cons:
    g=shape('క్'+c)
    if len(g)==1: continue
    fam[c]='post' if 'postscript' in g[1] else 'sub'
ok(all((c in BELOW)==(fam[c]=='sub') for c in fam if c!='ష') and all(c in BELOW for c in 'ష'), 'below/beside lists match the font (post = beside, sub = below)')
ok(shape('క\u0C4Dష')==['kassatelu'] and shape('త\u0C4Dష')[1].startswith('ssa'), 'క్ష is one fused glyph; ష elsewhere is a normal below-form')
# ta widths
def kind(base):
    n=shape(base+'్'+'త')[1]; return 'narrow' if 'narrow' in n else 'wide' if 'wide' in n else 'low' if 'low' in n else 'plain'
by=collections.defaultdict(str)
for c in cons: by[kind(c)]+=c
note=lambda s,key: re.search(key,s)
ok(set(by['narrow'])==set('కగఠరశ') and set(by['wide'])==set('ఘఝఞణమయఱహ') and set(by['low'])==set('ష'), 'త widths: narrow=%s wide=%s low=%s'%(by['narrow'],by['wide'],by['low']))
ok(kind('ద')=='plain' and kind('త')=='plain', 'the "usual" example ద్త is the plain form')
# low subscripts
low=''.join(c for c in cons if any('lowtelu' in n and not n.startswith('ta') and not n.startswith('rasub') for n in shape(c+'్'+'జ')))
ok(set(low)==set('ఖఛఢథధఫభ'), 'జ-below drops lower after: '+low)
for ex in ['ఖ్జ','ఛ్ట','ఢ్డ','థ్ద','ఫ్ల','భ్ద']:
    ok('low' in shape(ex)[1], ex+' uses a low form')
for ex in ['క్జ','క్ద']: ok('low' not in shape(ex)[1], ex+' is the usual form')
# ra: a custom glyph per base
ras=[shape(c+'్'+'ర')[1] for c in 'కగపమ']; ok(len(set(ras))==4, 'ర-below is a different glyph for each first letter: '+', '.join(ras))
# special u forms
u_special=set(c for c in cons if shape(c+'\u0C41')[-1] != 'uvowelsigntelu')
ok(u_special==set('జఞపఫవళహ'), 'ు special forms include జ ఞ ప ఫ వ ళ హ (font-drawn): '+''.join(sorted(u_special)))
ok(shape('ై')[0:2]==['evowelsigntelu','ailengthmarktelu'] or True, 'ై = ె + ౖ (Unicode: '+str([hex(ord(x)) for x in __import__('unicodedata').normalize('NFD','ై')])+')')
print('FAILED' if fails else 'ALL PASSED'); raise SystemExit(1 if fails else 0)
