/* ================= People from Ninja Adventure =================
   Soldiers, Vex and the knights are rebuilt from pack characters into the old sheet layout (16 x 32 walk cells, 32 x 32
   sword cells), so all their code keeps working; each swing gets the pack's katana. Villagers are drawn straight from
   the pack, each one a different person, and talking to someone shows their face beside the dialog. */
LV.naToLegacy = function (img) {
  const c = document.createElement('canvas'); c.width = 13 * 16; c.height = 256; const x = c.getContext('2d'), kat = LV.IMG.h_katana;
  for (let d = 0; d < 4; d++) {
    const nc = LV.HCOL[d], wr = LV.HERO_ROW[d] * 32, ar = 128 + LV.ATK_ROW[d] * 32;
    for (let k = 0; k < 13; k++) x.drawImage(img, nc * 16, (k % 4) * 16, 16, 16, k * 16, wr + 12, 16, 16);
    for (let f = 0; f < 4; f++) {
      const blade = function () { if (!kat) return; x.save(); x.beginPath(); x.rect(f * 32, ar, 32, 32); x.clip(); x.drawImage(kat, nc * 64, f * 64, 64, 64, f * 32 - 16, ar - 16 + 4, 64, 64); x.restore(); };
      if (d === 0) blade();
      x.drawImage(img, nc * 16, (f < 2 ? 4 : 4) * 16, 16, 16, f * 32 + 8, ar + 12, 16, 16);
      if (d !== 0) blade();
    }
  }
  return c;
};
LV.SOLDIER_CHARS = { green: 'Knight', blue: 'SamuraiBlue', purple: 'SamuraiRed', red: 'RedGladiator', teal: 'GladiatorBlue', grey: 'KnightGold', black: 'NinjaDark' };
(function () {
  const prep = LV.prepareEnemyArt;
  LV.prepareEnemyArt = function () {
    prep();
    Object.keys(LV.SOLDIER_CHARS).forEach(function (k) { const im = LV.IMG['c_' + LV.SOLDIER_CHARS[k]]; if (im) LV.IMG['soldier_' + k] = LV.naToLegacy(im); });
    if (LV.IMG.c_SorcererBlack) LV.IMG.vex = LV.naToLegacy(LV.IMG.c_SorcererBlack);
  };
})();

/* villagers: who they are depends on their trade and where they stand */
LV.PEOPLE = {
  elder: ['OldMan', 'OldMan2', 'OldMan3', 'OldWoman', 'Master'],
  farmer: ['Villager', 'Villager2', 'Villager3', 'Hunter', 'Woman', 'ManGreen', 'Caveman'],
  trader: ['Noble', 'Sultan', 'Sultan2', 'Inspector', 'Villager4'],
  fisher: ['Villager5', 'Villager6', 'Eskimo', 'Cavegirl', 'FighterWhite'],
  guard: ['Knight', 'KnightGold', 'Samurai', 'SamuraiBlue', 'GladiatorBlue'],
  scholar: ['Monk', 'Monk2', 'Shaman', 'SorcererOrange', 'Master'],
  baker: ['Woman', 'Princess', 'Villager3', 'OldWoman', 'Cavegirl']
};
LV.makeVillager = (function (orig) {
  return function (x, y, s) {
    const e = orig(x, y, s), pool = LV.PEOPLE[e.look] || LV.PEOPLE.farmer;
    e.who = (s && s.who) || pool[(Math.floor(x / 16) * 7 + Math.floor(y / 16) * 13) % pool.length];
    const old = e.draw;
    e.draw = function (ctx, ox, oy) {
      const im = LV.IMG['c_' + this.who]; if (!im) return old.call(this, ctx, ox, oy);
      const X = Math.round(this.x - ox), Y = Math.round(this.y - oy), c = LV.HCOL[this.dir];
      const row = this.goal ? Math.floor(this.anim) % 4 : 0, bob = this.goal ? 0 : (Math.floor(this.t * 1.5 + (this.home.x % 5)) % 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 5, Y - 2, 10, 3);
      ctx.drawImage(im, c * 16, row * 16, 16, 16 - bob, X - 8, Y - 16 + bob, 16, 16 - bob);
    };
    return e;
  };
})(LV.makeVillager);
LV.ENEMIES.villager = LV.makeVillager;
// whoever you talk to shows their face over the dialog box
LV.Game.prototype.interact = (function (orig) {
  return function (h) {
    const r = orig.call(this, h);
    if (r && this.dialog) { const d = LV.DIRS[h.dir], near = { x: h.x + d.x * 12 - 6, y: h.y - 10 + d.y * 12, w: 12, h: 12 }, far = { x: near.x + d.x * 16, y: near.y + d.y * 16, w: 12, h: 12 };
      const a = this.actors.find(function (a) { return a.npc && a.who && (LV.overlap(near, a.hurtBox()) || LV.overlap(far, a.hurtBox())); });
      if (a) this.dialog.face = a.who; }
    return r;
  };
})(LV.Game.prototype.interact);
LV.drawDialog = (function (orig) {
  return function (ctx, d) {
    orig(ctx, d);
    const im = d.face && LV.IMG['cf_' + d.face]; if (!im) return;
    const x = 24, y = (d.choices && d.i === d.lines.length - 1) ? 210 - (20 + d.choices.length * 12) - 46 : 146 - 46;
    const fb = LV.IMG.ui_facebox;
    if (fb) { ctx.drawImage(fb, x - 5, y - 5 - 2, 48, 48); ctx.drawImage(im, x, y - 2, 38, 38); }
    else { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 2, y - 2, 42, 42); ctx.fillStyle = '#18183a'; ctx.fillRect(x, y, 38, 38); ctx.drawImage(im, x, y, 38, 38); }
  };
})(LV.drawDialog);
