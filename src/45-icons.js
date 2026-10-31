/* ================= Item icons, redrawn =================
   Every item has a 16 x 16 icon drawn to one style: a dark outline, a base colour, a light edge and a shadow, so they
   read clearly at a glance in the menu and the item box. Drawn once into small canvases and reused. */
LV.ICON_PAL = {
  k: '#1a1220', w: '#ffffff', l: '#d0d8e8', m: '#8890a8', d: '#4a5068', b: '#9a6234', B: '#5a3418', t: '#d8a060',
  y: '#f8d048', Y: '#b07a18', o: '#f08830', r: '#e83838', R: '#901f2a', g: '#58c858', G: '#26783a', c: '#68d0f8', C: '#3060c8',
  n: '#1e2c6a', p: '#f8a8d8', v: '#9a58d8', V: '#55278a', e: '#c0f4ff', s: '#e8c8a0', a: '#6a4a2a'
};
LV.ICON_ART = {
  bow: [
    '................', '......kkk.......', '.....kbtkw......', '.....kbk..w.....', '....kbtk...w....', '....kbk....w....', '....kbk....w....', '....kyyk...w....',
    '....kyYk...w....', '....kbk....w....', '....kbk....w....', '....kbtk...w....', '.....kbk..w.....', '.....kbtkw......', '......kkk.......', '................'],
  dice: [
    '................', '................', '...kkkkkkkkkk...', '..kwwwwwwwwwlk..', '..kwrrwwwwwwlk..', '..kwrrwwwwwwlk..', '..kwwwwwwwwwlk..', '..kwwwwrrwwwlk..',
    '..kwwwwrrwwwlk..', '..kwwwwwwwwwlk..', '..kwwwwwwwrrlk..', '..kwwwwwwwrrlk..', '..kllllllllllk..', '..kmmmmmmmmmmk..', '...kkkkkkkkkk...', '................'],
  stars: [
    '................', '.......kk.......', '.......kwk......', '......klwk......', '..kk..klwk..kk..', '..kwkkklmkkkwk..', '...kllkmmkllk...', '....kmmddmmk....',
    '....kmmddmmk....', '...kllkmmkllk...', '..kwkkkmlkkkwk..', '..kk..kwlk..kk..', '......kwlk......', '.......kwk......', '.......kk.......', '................'],
  bombs: [
    '................', '..........y.....', '.........yoy....', '........kBk.....', '.......kBk......', '.....kkkkkk.....', '...kkCCCCCnkk...', '..kCClwCCCCnk...',
    '..kCwlCCCCCnk...', '..kCCCCCCCCnk...', '..kCCCCCCCnnk...', '..knCCCCCnnnk...', '...knnnnnnnk....', '....kkkkkkk.....', '................', '................'],
  lantern: [
    '................', '......kkkk......', '.....kk..kk.....', '......kkkk......', '.....kYYYYk.....', '....kYyyyyYk....', '....kywyyyyk....', '....kywoooyk....',
    '....kyooroyk....', '....kyoooyyk....', '....kyyyyyYk....', '.....kYYYYk.....', '....kkkkkkkk....', '................', '................', '................'],
  grapple: [
    '................', '...kk..kk..kk...', '..klk.klmk.klk..', '..klmkklmkklmk..', '...klmmlmmlmk...', '....kklmmlkk....', '......klmk......', '......kmdk......',
    '......kBbk......', '......kbBk......', '......kBbk......', '......kbBk......', '.....kkkkkk.....', '....kwbbbbBk....', '.....kkkkkk.....', '................'],
  rod: [
    '..........k.....', '.........kyk....', '........kyowk...', '.......kyorok...', '........kook....', '.......kBkk.....', '......kBbk......', '.....kBbk.......',
    '....kBbk........', '...kBbk.........', '..kBbk..........', '.kBbk...........', '.kkk............', '................', '................', '................'],
  frost: [
    '..........k.....', '.........kek....', '........kewck...', '.......keccCk...', '........kcck....', '.......kmkk.....', '......kmlk......', '.....kmlk.......',
    '....kmlk........', '...kmlk.........', '..kmlk..........', '.kmlk...........', '.kkk............', '................', '................', '................'],
  hammer: [
    '................', '..kkkkkkkkk.....', '.kmllllllldk....', '.kmlwlllllmk....', '.kmllllllldk....', '..kkkkBbkkk.....', '......kBbk......', '......kbBk......',
    '......kBbk......', '......kbBk......', '......kBbk......', '......kbBk......', '......kBbk......', '......kkkk......', '................', '................'],
  shovel: [
    '................', '......kkkk......', '.....kBbbBk.....', '......kbBk......', '......kBbk......', '......kbBk......', '......kBbk......', '.....kkkkkk.....',
    '....kmllllmk....', '....kmlwllmk....', '....kmllllmk....', '....kmlllldk....', '.....kmlldk.....', '......kmdk......', '.......kk.......', '................'],
  glove: [
    '................', '................', '.....kkkkk......', '....kttktktk....', '...ktttkttktk...', '...ktttktttttk..', '...kttttttttk...', '..kbktttttttk...',
    '..ktbtttttttk...', '...ktttttttbk...', '....ktttttbk....', '....kkkkkkkk....', '....kRRrrRRk....', '....kkkkkkkk....', '................', '................'],
  mirror: [
    '................', '......kkkk......', '....kkyYYykk....', '...kyYkkkkYyk...', '...kYkcwcckYk...', '..kyYkwcccCkYk..', '..kYkcccccCkYk..', '..kYkccccCCkYk..',
    '...kYkcccCkYk...', '...kyYkkkkYyk...', '....kkyYYykk....', '......kYYk......', '.....kyYYyk.....', '.....kkkkkk.....', '................', '................'],
  net: [
    '...kkkkk........', '..kmkmkmk.......', '.kmwmwmwmk......', '.kwmwmwmwk......', '.kmwmwmwmk......', '.kwmwmwmwk......', '..kmwmwmk.......', '...kkkkkbk......',
    '........kBk.....', '.........kBk....', '..........kBk...', '...........kBk..', '............kBk.', '.............kk.', '................', '................'],
  bottle: [
    '................', '......kkkk......', '......kBbk......', '......kkkk......', '......klek......', '.....klwek......', '....kleeeek.....', '...kleeeeeek....',
    '...kweeeeeek....', '...k@@@@@@@k....', '...k@@@@@@@k....', '...k@@@@@@@k....', '....k@@@@@k.....', '.....kkkkk......', '................', '................'],
  flame: [
    '.......y........', '......yoy.......', '......oro.......', '.......kk.......', '......kssk......', '......kkkk......', '......kgGk......', '.....kgggGk.....',
    '....kgwgggGk....', '....kgwgggGk....', '....kgggggGk....', '....kgggggGk....', '....kGgggGGk....', '.....kkkkkk.....', '................', '................'],
  storm: [
    '................', '........kkk.....', '.......kmwmk....', '......kkkkkkkk..', '.....kmlmk..kmk.', '....kkkkkkk.kk..', '...kGggggGGk....', '...kgwggggGk....',
    '...kgwggggGk....', '...kGGGGGGGk....', '...kggggggGk....', '...kggggggGk....', '...kgggggGGk....', '....kGGGGGk.....', '.....kkkkk......', '................'],
  quake: [
    '................', '......kkkk......', '.....kyyYYk.....', '.....kykkYk.....', '......kkkk......', '....kkkkkkkk....', '...kyyyyyyyYk...', '..kyyyBYYyyyYk..',
    '..kyyBYyBYyyYk..', '..kyyYByYBYyYk..', '..kyyyyyBYyyYk..', '..kYyyyyyyyYYk..', '...kYYYYYYYYk...', '....kkkkkkkk....', '................', '................'],
  cloak: [
    '................', '......kkkk......', '.....kVvvVk.....', '....kVvkkvVk....', '....kvk..kvk....', '....kVvkkvVk....', '...kVvvvvvvVk...', '...kvvvyyvvVk...',
    '..kVvwvvvvvvVk..', '..kvvwvvvvvvVk..', '..kVvvvvvvvvVk..', '.kVvvvvvvvvvVVk.', '.kVVvvvvvvvVVVk.', '.kkkkkkkkkkkkkk.', '................', '................'],
  riot: [
    '................', '...kkkkkkkkkk...', '..kmllllllllmk..', '..klwcccccccmk..', '..klccwcccccmk..', '..klcccccccCmk..', '..klcccccccCmk..', '..klccccccCCmk..',
    '..kmcccccCCCmk..', '...kmCCCCCCmk...', '....kmCCCCmk....', '.....kmCCmk.....', '......kmmk......', '.......kk.......', '................', '................'],
  wand: [
    '...........kkk..', '..........kyyYk.', '..........krrRk.', '..........krRRk.', '.........kBkkk..', '........kBbk....', '.......kBbk.....', '......kBbk......',
    '.....kBbk.......', '....kBbk........', '...kBbk.........', '..kBbk..........', '..kkk...........', '................', '................', '................'],
  kazoo: [
    '................', '................', '................', '..........kk....', '.........kyyk...', '..kkkkkkkkyYk...', '.kylwyyyyyyYk...', '.kyyyyyyyyyYk...',
    '.kYYYYYYYYYYk...', '..kkkkkkkkyYk...', '.........kYYk...', '..........kk....', '................', '................', '................', '................'],
  book: [
    '................', '...kkkkkkkkk....', '..kRrrrrrrrRk...', '..kRrwyyyyrRk...', '..kRryYYYyrRk...', '..kRrrrrrrrRk...', '..kRryyyyyrRk...', '..kRrrrrrrrRk...',
    '..kRrrrrrrrRk...', '..kRrrrrrrrRk...', '..kRkkkkkkkkk...', '..kRwwwwwwwwk...', '..kRkkkkkkkkk...', '...kk...........', '................', '................'],
  pepper: [
    '................', '......kkkk......', '.....kmlmmk.....', '......kkkk..o...', '.....krrrRk.yo..', '.....krwrRk..o..', '.....krwrRk.....', '.....krrrRk.....',
    '.....kwwwwk.....', '.....kRrrRk.....', '.....krrrRk.....', '.....krrrRk.....', '.....kRRRRk.....', '......kkkk......', '................', '................']
};
(function () {
  const cache = {};
  const BOTTLE_FILL = { red: ['#e83838', '#901f2a'], green: ['#58c858', '#26783a'], fairy: ['#f8a8d8', '#c060a8'], empty: null };
  function art(key, fill) {
    const ck = key + (fill ? ':' + fill.join() : ''); if (cache[ck]) return cache[ck];
    const rows = LV.ICON_ART[key], c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
    rows.forEach(function (r, j) {
      for (let i = 0; i < 16; i++) {
        let ch = r[i]; if (!ch || ch === '.') continue;
        let col = LV.ICON_PAL[ch];
        if (ch === '@') { if (!fill) { col = j >= 12 ? LV.ICON_PAL.l : LV.ICON_PAL.e; if (i === 4) col = LV.ICON_PAL.w; } else col = (i >= 9 || j >= 12) ? fill[1] : fill[0]; }
        x.fillStyle = col; x.fillRect(i, j, 1, 1);
      }
    });
    if (key === 'bottle' && fill && fill[0] === '#f8a8d8') { x.fillStyle = '#ffffff'; x.fillRect(6, 10, 2, 2); x.fillRect(8, 9, 1, 1); }
    return (cache[ck] = c);
  }
  const icon = LV.itemIcon;
  LV.itemIcon = function (ctx, id, x, y) {
    const s = LV.game && LV.game.save;
    let key = id, fill = null;
    if (id === 'dice' && s && s.items.ninjastars) key = 'stars';
    if (id === 'bottle') { const b = s && (s.bottles || [])[0]; fill = BOTTLE_FILL[b] || null; }
    if (!LV.ICON_ART[key]) return icon(ctx, id, x, y);
    ctx.drawImage(art(key, fill), Math.round(x), Math.round(y));
  };
})();
