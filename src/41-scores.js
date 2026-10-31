/* ================= Leaderboard numbers: total playtime, completion and monsters defeated =================
   Each save file keeps its own count of monsters defeated (save.kills). When the game window closes, the best of the
   three files on each board is saved (lv_scores) and handed to Torn Arcade with one page event, 'varrowmere:scores'.
   The game itself never sends anything anywhere; Torn Arcade's optional Online play submits them. */
(function () {
  // every foe that falls counts once (not villagers, not things that were already gone)
  const kill = LV.Game.prototype.kill;
  LV.Game.prototype.kill = function (a) {
    const was = a && !a.dead && !a.npc && !a.isHero;
    const r = kill.apply(this, arguments);
    if (was && a.dead && this.save) this.save.kills = (this.save.kills || 0) + 1;
    return r;
  };

  // Completion, in tenths of a percent (0 to 1000): chests opened (45%), dungeon bosses beaten (30%), gear owned (15%),
  // side quests finished (10%)
  let TOT = null;
  function totals() {
    if (TOT) return TOT;
    const chests = [], dungeons = {};
    Object.keys(LV.MAPS).forEach(function (id) {
      const d = LV.MAPS[id];
      Object.keys(d.chests || {}).forEach(function (k) { chests.push(id + ':' + k); });
      if (d.boss && d.dungeon) (dungeons[d.dungeon] = dungeons[d.dungeon] || []).push(id);
    });
    return (TOT = { chests: chests, dungeons: dungeons, nd: Object.keys(dungeons).length });
  }
  LV.completion = function (s) {
    if (!s) return 0;
    const T = totals(), op = s.opened || {}, fl = s.flags || {};
    const c = T.chests.filter(function (k) { return op[k]; }).length / Math.max(1, T.chests.length);
    const b = Object.keys(T.dungeons).filter(function (dg) { return T.dungeons[dg].some(function (id) { return fl[id + ':boss']; }); }).length / Math.max(1, T.nd);
    let own = 0; LV.ITEMS.forEach(function (it) { try { if (it.need(s)) own++; } catch (e) {} });
    const g = own / Math.max(1, LV.ITEMS.length), q = LV.SIDEQUESTS ? LV.sideDone(s) / LV.SIDEQUESTS.length : 0;
    return Math.min(1000, Math.round(1000 * (0.45 * c + 0.3 * b + 0.15 * g + 0.1 * q)));
  };
  LV.scores = function () {
    const out = { time: 0, completion: 0, kills: 0 };
    LV.SLOT_KEYS.forEach(function (k, i) {
      let s = null; try { s = LV.storeFor(i).get(); } catch (e) {}
      if (!s) return;
      out.time = Math.max(out.time, Math.floor(s.time || 0));
      out.completion = Math.max(out.completion, LV.completion(s));
      out.kills = Math.max(out.kills, Math.floor(s.kills || 0));
    });
    return out;
  };
  // the open file's newest numbers count too (it may not have saved this second)
  function current(out) {
    const g = LV.game; if (!g || g.mode === 'title' || !g.save) return out;
    out.time = Math.max(out.time, Math.floor(g.save.time || 0)); out.completion = Math.max(out.completion, LV.completion(g.save)); out.kills = Math.max(out.kills, Math.floor(g.save.kills || 0));
    return out;
  }
  LV.handScores = function () {
    const sc = current(LV.scores()), txt = JSON.stringify(sc);
    try { if (typeof GM_setValue === 'function') GM_setValue('lv_scores', txt); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('varrowmere:scores', { detail: txt })); } catch (e) {}
    return sc;
  };
  const close = LV.close;
  LV.close = function () { if (LV.root && LV.root.style.display !== 'none') LV.handScores(); return close.apply(this, arguments); };
})();
