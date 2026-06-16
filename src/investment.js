import { INVESTOR_TYPES } from './data.js';
import { pick, rnd, rndInt, uid } from './utils.js';
import { Investor } from './character.js';

export class InvestmentSystem {
  constructor(game) {
    this.game        = game;
    this.timer       = rnd(30, 60);
    this.pending     = [];
    this.acceptedIds = new Set();
  }

  _spawnInvestor() {
    const park   = this.game.park;
    const econ   = this.game.economy;
    const rating = econ.rating;
    const vis    = park.totalVisitors;

    const eligible = INVESTOR_TYPES.filter(t =>
      rating >= t.minStar &&
      vis    >= t.minVis  &&
      !this.acceptedIds.has(t.id)
    );
    if (eligible.length === 0) return;

    const type = pick(eligible);
    const ex   = park.entranceX;
    const ey   = (park.entranceY + 1) * 56;
    const inv  = new Investor(ex * 56 + 28, ey + 100, type, this.game);
    this.pending.push(inv);
    const deal = { invId: inv.id, name: type.name, avatar: type.avatar, desc: type.desc, daysLeft: type.days };
    this.game.ui.notify(`${type.avatar} ${type.name} хочет встретиться! Открой раздел Инвестор.`, 'invest');
    // Auto-open modal after short delay
    setTimeout(() => { if (this.game.ui) this.game.ui.updateInvestSheet(); }, 1500);
  }

  getAvailableDeals() {
    return this.pending
      .filter(i => i.state === 'waiting')
      .map(i => {
        const t   = i.data;
        const amt = rndInt(t.amt[0], t.amt[1]);
        const eq  = parseFloat(rnd(t.eq[0], t.eq[1]).toFixed(1));
        return { invId: i.id, typeId: t.id, name: t.name, avatar: t.avatar, desc: t.desc, amount: amt, equity: eq, daysLeft: t.days };
      });
  }

  acceptDeal(invId) {
    const idx = this.pending.findIndex(i => i.id === invId);
    if (idx < 0) return;
    const inv = this.pending[idx];
    const t   = inv.data;
    const amt = rndInt(t.amt[0], t.amt[1]);
    const eq  = parseFloat(rnd(t.eq[0], t.eq[1]).toFixed(1));
    this.game.economy.addInvestment({ id: uid(), name: t.name, equity: eq, amount: amt, daysLeft: t.days });
    this.acceptedIds.add(t.id);
    inv.dismiss();
    setTimeout(() => {
      const i = this.pending.indexOf(inv);
      if (i >= 0) this.pending.splice(i, 1);
    }, 5000);
  }

  declineDeal(invId) {
    const inv = this.pending.find(i => i.id === invId);
    if (inv) {
      inv.dismiss();
      setTimeout(() => {
        const i = this.pending.indexOf(inv);
        if (i >= 0) this.pending.splice(i, 1);
      }, 5000);
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0 && this.pending.length < 2) {
      this.timer = rnd(45, 90);
      this._spawnInvestor();
    }
    for (const inv of this.pending) inv.update(dt, this.game);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].state === 'dead') this.pending.splice(i, 1);
    }
  }
}
