import { DAY_SECS, BUILDER_SAL, ATTRACTIONS, START_MONEY } from './data.js';
import { fmt$ } from './utils.js';

export class Economy {
  constructor(game) {
    this.game        = game;
    this.money       = START_MONEY;
    this.dayTimer    = 0;
    this.day         = 1;
    this.income      = 0;   // this-day income
    this.expenses    = 0;   // this-day expenses
    this.netHistory  = [];  // last 7 days net
    this.totalEarned = 0;
    this.investors   = [];  // active deals [{id, name, equity, daily, daysLeft}]
    this.rating      = 1;
  }

  earn(amount) {
    this.money  += amount;
    this.income += amount;
    this.totalEarned += amount;
  }

  spend(amount) {
    this.money   -= amount;
    this.expenses += amount;
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  update(dt) {
    this.dayTimer += dt;
    if (this.dayTimer >= DAY_SECS) {
      this.dayTimer -= DAY_SECS;
      this._endOfDay();
    }
    this._updateRating();
  }

  _endOfDay() {
    // Builder salaries
    const salaries = this.game.builders.length * BUILDER_SAL;
    this.spend(salaries);

    // Operating costs for open attractions
    let opCosts = 0;
    for (const attr of this.game.park.attractions.values()) {
      if (attr.state === 'open') {
        opCosts += ATTRACTIONS[attr.typeId].opCost;
      }
    }
    this.spend(opCosts);

    // Pay active investors their equity
    let investorCut = 0;
    for (const deal of this.investors) {
      const cut = this.income * (deal.equity / 100);
      investorCut += cut;
      deal.daysLeft--;
    }
    this.investors = this.investors.filter(d => d.daysLeft > 0);
    if (investorCut > 0) this.spend(investorCut);

    const net = this.income - this.expenses;
    this.netHistory.push(net);
    if (this.netHistory.length > 7) this.netHistory.shift();

    this.game.park.totalDays++;
    this.day++;

    this.game.ui.notify(
      `📅 Day ${this.day} — Revenue: ${fmt$(this.income)} | Costs: ${fmt$(this.expenses)} | Net: ${fmt$(net)}`,
      net >= 0 ? 'success' : 'warn'
    );

    this.income   = 0;
    this.expenses = 0;
  }

  addInvestment(deal) {
    this.earn(deal.amount);
    this.investors.push(deal);
    this.game.ui.notify(`💼 ${deal.name} invested ${fmt$(deal.amount)}! (${deal.equity}% equity for ${deal.daysLeft} days)`, 'invest');
  }

  _updateRating() {
    const vis  = this.game.park.totalVisitors;
    const att  = this.game.park.getAttractionCount();
    const reqs = [
      { star: 5, vis: 1800, att: 15 },
      { star: 4, vis: 700,  att: 10 },
      { star: 3, vis: 250,  att: 6  },
      { star: 2, vis: 80,   att: 3  },
      { star: 1, vis: 0,    att: 0  },
    ];
    for (const r of reqs) {
      if (vis >= r.vis && att >= r.att) {
        if (this.rating !== r.star) {
          this.rating = r.star;
          this.game.ui.notify(`⭐ Park upgraded to ${r.star} star${r.star > 1 ? 's' : ''}!`, 'success');
        }
        break;
      }
    }
  }

  get dayProgress() {
    return this.dayTimer / DAY_SECS;
  }

  get avgNet() {
    if (this.netHistory.length === 0) return 0;
    return this.netHistory.reduce((a, b) => a + b, 0) / this.netHistory.length;
  }
}
