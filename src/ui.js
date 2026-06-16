import { ATTRACTIONS, BUILDER_COST, BUILDER_SAL, PATH_COST } from './data.js';
import { fmt$ } from './utils.js';

export class UI {
  constructor(game) {
    this.game   = game;
    this.notifs = [];
    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    document.getElementById('attraction-grid').innerHTML =
      Object.values(ATTRACTIONS).map(a => `
        <div class="attr-card" data-id="${a.id}" data-cost="${a.cost}">
          <div class="attr-emoji">${a.emoji}</div>
          <div class="attr-name">${a.name}</div>
          <div class="attr-cost">${fmt$(a.cost)}</div>
          <div class="attr-size">${a.size[0]}×${a.size[1]} tiles • ${a.buildersNeeded} worker${a.buildersNeeded > 1 ? 's' : ''}</div>
          <div class="attr-desc">${a.desc}</div>
          <div class="attr-income">+${fmt$(a.incomePerVisit)}/visit</div>
        </div>
      `).join('');
  }

  _bindEvents() {
    // Toolbar buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.game.onToolAction(action);
      });
    });

    // Close panel buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panelId = btn.dataset.close;
        document.getElementById(panelId).classList.add('hidden');
        if (this.game.mode === 'build' || this.game.mode === 'path') {
          this.game.mode = 'normal';
          this.game.selectedBuild = null;
        }
      });
    });

    // Attraction cards
    document.getElementById('attraction-grid').addEventListener('click', e => {
      const card = e.target.closest('.attr-card');
      if (!card) return;
      const id = card.dataset.id;
      const def = ATTRACTIONS[id];
      if (!this.game.economy.canAfford(def.cost)) {
        this.notify(`❌ Not enough money! Need ${fmt$(def.cost)}`, 'error');
        return;
      }
      document.querySelectorAll('.attr-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      this.game.selectedBuild = id;
      this.game.mode = 'build';
      document.getElementById('build-panel').classList.add('hidden');
      this.notify(`📍 Click on the park to place ${def.name}`, 'info');
    });

    // Hire builder button
    document.getElementById('hire-btn').addEventListener('click', () => {
      this.game.onHireBuilder();
    });

    // Investment buttons (delegated)
    document.getElementById('invest-content').addEventListener('click', e => {
      const acceptBtn = e.target.closest('.accept-btn');
      const declineBtn = e.target.closest('.decline-btn');
      if (acceptBtn) this.game.investment.acceptDeal(acceptBtn.dataset.id);
      if (declineBtn) this.game.investment.declineDeal(declineBtn.dataset.id);
      if (acceptBtn || declineBtn) this.updateInvestPanel();
    });

    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.gameSpeed = parseFloat(btn.dataset.speed);
      });
    });

    // Touch/mouse on canvas (delegated to game)
    window.addEventListener('resize', () => this.game.renderer.resize());
  }

  update() {
    const eco = this.game.economy;
    const park = this.game.park;

    document.getElementById('money-display').textContent  = fmt$(eco.money);
    document.getElementById('day-display').textContent    = `Day ${eco.day}`;
    document.getElementById('visitor-display').textContent = park.totalVisitors;
    document.getElementById('builder-display').textContent = this.game.builders.length;

    // Star rating
    const stars = '⭐'.repeat(eco.rating) + '☆'.repeat(5 - eco.rating);
    document.getElementById('rating-display').textContent = stars;

    // Day progress bar
    const progress = document.getElementById('day-progress');
    if (progress) progress.style.width = (eco.dayProgress * 100) + '%';

    // Visitor count color (red if low)
    const visEl = document.getElementById('visitor-display');
    visEl.style.color = this.game.visitors.length > 5 ? '#2ecc71' : '#e74c3c';

    // Money color
    const moneyEl = document.getElementById('money-display');
    moneyEl.style.color = eco.money < 1000 ? '#e74c3c' : '#f1c40f';

    // Update hire panel info
    const salEl = document.getElementById('builder-salary');
    if (salEl) salEl.textContent = fmt$(BUILDER_SAL) + '/day each';

    // Update builder list
    const listEl = document.getElementById('builder-list');
    if (listEl) {
      if (this.game.builders.length === 0) {
        listEl.innerHTML = '<span style="font-size:12px;color:#666">No builders hired yet</span>';
      } else {
        listEl.innerHTML = this.game.builders
          .map(b => `<div class="builder-badge">👷 ${b.app.name} — ${b.state}</div>`)
          .join('');
      }
    }

    // Notification cleanup
    this.notifs = this.notifs.filter(n => n.alive);
  }

  updateInvestPanel() {
    const deals = this.game.investment.getAvailableDeals();
    const active = this.game.economy.investors;
    const cont = document.getElementById('invest-content');

    let html = '';

    if (active.length > 0) {
      html += '<div class="invest-section"><h3>Active Investors</h3>';
      for (const deal of active) {
        html += `
          <div class="investor-active">
            <div class="inv-row">
              <strong>${deal.name}</strong>
              <span class="inv-equity">${deal.equity}% equity</span>
            </div>
            <div class="inv-row">
              <span>Invested: ${fmt$(deal.amount)}</span>
              <span>${deal.daysLeft} days left</span>
            </div>
            <div class="invest-bar"><div class="invest-fill" style="width:${Math.min(100, (deal.daysLeft / 90) * 100)}%"></div></div>
          </div>`;
      }
      html += '</div>';
    }

    if (deals.length > 0) {
      html += '<div class="invest-section"><h3>Available Investors</h3>';
      for (const d of deals) {
        html += `
          <div class="investor-card">
            <div class="inv-header">
              <span class="inv-avatar">${d.avatar}</span>
              <div>
                <div class="inv-name">${d.name}</div>
                <div class="inv-desc">${d.desc}</div>
              </div>
            </div>
            <div class="inv-terms">
              <div class="inv-term">
                <span class="term-label">Invests</span>
                <span class="term-val green">${fmt$(d.amount)}</span>
              </div>
              <div class="inv-term">
                <span class="term-label">Takes</span>
                <span class="term-val red">${d.equity}% income</span>
              </div>
              <div class="inv-term">
                <span class="term-label">Duration</span>
                <span class="term-val">${d.daysLeft} days</span>
              </div>
            </div>
            <div class="inv-actions">
              <button class="accept-btn" data-id="${d.invId}">✅ Accept Deal</button>
              <button class="decline-btn" data-id="${d.invId}">❌ Decline</button>
            </div>
          </div>`;
      }
      html += '</div>';
    }

    if (deals.length === 0 && active.length === 0) {
      const rating = this.game.economy.rating;
      html = `
        <div class="invest-empty">
          <div class="invest-empty-icon">💼</div>
          <h3>No Investors Yet</h3>
          <p>Grow your park to attract investors!</p>
          <div class="requirements">
            <div class="req ${rating >= 2 ? 'met' : ''}">⭐⭐ 2-star rating → Angel investors</div>
            <div class="req ${rating >= 3 ? 'met' : ''}">⭐⭐⭐ 3-star rating → Venture capital</div>
            <div class="req ${rating >= 4 ? 'met' : ''}">⭐⭐⭐⭐ 4-star rating → Corporate deals</div>
          </div>
        </div>`;
    }

    cont.innerHTML = html;
  }

  notify(text, type = 'info') {
    const el = document.createElement('div');
    el.className = `notif notif-${type}`;
    el.textContent = text;
    document.getElementById('notifications').appendChild(el);

    const n = { el, alive: true };
    this.notifs.push(n);

    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => {
        el.remove();
        n.alive = false;
      }, 500);
    }, 3500);
  }

  showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'invest-panel') this.updateInvestPanel();
  }

  hideAll() {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  }
}
