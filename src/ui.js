import { ATTRACTIONS, BUILDER_SAL, BUILDER_COST, PATH_COST } from './data.js';
import { fmt$ } from './utils.js';

export class UI {
  constructor(game) {
    this.game   = game;
    this._ntfs  = [];
    this._pendingDeal = null;
    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    document.getElementById('build-list').innerHTML =
      Object.values(ATTRACTIONS).map(a => `
        <div class="ac" data-id="${a.id}">
          <div class="ac-ico">${a.emoji}</div>
          <div class="ac-name">${a.name}</div>
          <div class="ac-cost">${fmt$(a.cost)}</div>
          <div class="ac-size">${a.size[0]}×${a.size[1]} тайла · ${a.buildersNeeded} рабочих</div>
          <div class="ac-desc">${a.desc}</div>
          <div class="ac-inc">+${fmt$(a.incomePerVisit)}/визит</div>
        </div>
      `).join('');
  }

  _bindEvents() {
    // Toolbar buttons
    document.querySelectorAll('.tb').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.p;
        document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._onToolbar(p);
      });
    });

    // Close sheet buttons
    document.querySelectorAll('.xbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.sh;
        if (id) document.getElementById(id).classList.add('hidden');
        this.game.mode = 'normal';
        this.game.selectedBuild = null;
        document.getElementById('modebar').classList.add('hidden');
        document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
      });
    });

    // Build attraction click
    document.getElementById('build-list').addEventListener('click', e => {
      const card = e.target.closest('.ac');
      if (!card) return;
      const id  = card.dataset.id;
      const def = ATTRACTIONS[id];
      if (!this.game.economy.canAfford(def.cost)) {
        this.notify(`❌ Нужно ${fmt$(def.cost)}`, 'error'); return;
      }
      document.querySelectorAll('.ac').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      this.game.selectedBuild  = id;
      this.game.mode           = 'build';
      document.getElementById('sh-build').classList.add('hidden');
      const mbar = document.getElementById('modebar');
      mbar.classList.remove('hidden');
      document.getElementById('modetext').textContent = `📍 Выберите место для ${def.name}`;
    });

    // Hire
    document.getElementById('hire-btn').addEventListener('click', () => {
      this.game.onHireBuilder();
      this._updateHirePanel();
    });

    // Mode cancel
    document.getElementById('modecancel').addEventListener('click', () => {
      this.game.mode = 'normal';
      this.game.selectedBuild = null;
      document.getElementById('modebar').classList.add('hidden');
      document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
    });

    // Speed
    document.querySelectorAll('.sp').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sp').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.gameSpeed = parseFloat(btn.dataset.spd);
      });
    });

    // Investor modal buttons
    document.getElementById('inv-accept').addEventListener('click', () => {
      if (!this._pendingDeal) return;
      this.game.investment.acceptDeal(this._pendingDeal.invId);
      this._pendingDeal = null;
      document.getElementById('inv-modal').classList.add('hidden');
      this.updateInvestSheet();
    });
    document.getElementById('inv-decline').addEventListener('click', () => {
      if (!this._pendingDeal) return;
      this.game.investment.declineDeal(this._pendingDeal.invId);
      this._pendingDeal = null;
      document.getElementById('inv-modal').classList.add('hidden');
    });
    document.getElementById('inv-backdrop').addEventListener('click', () => {
      document.getElementById('inv-modal').classList.add('hidden');
    });

    // Resize
    window.addEventListener('resize', () => this.game.resize());
  }

  _onToolbar(p) {
    this.hideAll();
    this.game.mode = 'normal';
    this.game.selectedBuild = null;
    document.getElementById('modebar').classList.add('hidden');
    switch (p) {
      case 'build':
        this.showSheet('sh-build');
        break;
      case 'path':
        this.game.mode = 'path';
        document.getElementById('modebar').classList.remove('hidden');
        document.getElementById('modetext').textContent = `🛤 Нажмите на траву, чтобы проложить дорожку ($${PATH_COST})`;
        break;
      case 'hire':
        this._updateHirePanel();
        this.showSheet('sh-hire');
        break;
      case 'invest':
        this.updateInvestSheet();
        this.showSheet('sh-invest');
        break;
      case 'stats':
        this.game.showStats();
        break;
    }
  }

  _updateHirePanel() {
    const blist = document.getElementById('blist');
    if (!blist) return;
    if (this.game.builders.length === 0) {
      blist.innerHTML = '<span style="font-size:12px;color:#666;padding:4px">Строителей нет</span>';
    } else {
      blist.innerHTML = this.game.builders.map((b, i) =>
        `<div class="bbadge">👷 Строитель ${i + 1} — ${b.state === 'building' ? '🔨 строит' : b.state === 'idle' ? '💤 ждёт' : '🚶 идёт'}</div>`
      ).join('');
    }
  }

  update() {
    const eco  = this.game.economy;
    const park = this.game.park;
    document.getElementById('h-money').textContent   = `💰 ${fmt$(eco.money)}`;
    document.getElementById('h-day').textContent     = `День ${eco.day}`;
    document.getElementById('h-vis').textContent     = `👥 ${this.game.visitors.length}`;
    document.getElementById('h-rating').textContent  = '⭐'.repeat(eco.rating) + '☆'.repeat(5 - eco.rating);
    const fill = document.getElementById('dayfill');
    if (fill) fill.style.width = (eco.dayProgress * 100) + '%';
    this._ntfs = this._ntfs.filter(n => n.alive);
  }

  updateInvestSheet() {
    const deals  = this.game.investment.getAvailableDeals();
    const active = this.game.economy.investors;
    const rating = this.game.economy.rating;
    const cont   = document.getElementById('invest-body');
    let html = '';

    if (active.length > 0) {
      html += '<div class="isec"><h3>Активные инвесторы</h3>';
      for (const d of active) {
        html += `<div class="i-active">
          <div class="irow"><strong>${d.name}</strong><span style="color:var(--red);font-weight:700">${d.equity}% доли</span></div>
          <div class="irow"><span>Вложено: ${fmt$(d.amount)}</span><span>${d.daysLeft} дней осталось</span></div>
          <div class="ibar"><div class="ibarf" style="width:${Math.min(100,(d.daysLeft/90)*100)}%"></div></div>
        </div>`;
      }
      html += '</div>';
    }

    if (deals.length > 0) {
      html += '<div class="isec"><h3>Доступные предложения</h3>';
      for (const d of deals) {
        html += `<div class="i-card">
          <div class="i-head">
            <div class="i-ava">${d.avatar}</div>
            <div><div class="i-nm">${d.name}</div><div class="i-ds">${d.desc}</div></div>
          </div>
          <div class="inv-terms">
            <div class="iterm"><span class="it-lbl">Инвестиция</span><div class="it-val green">${fmt$(d.amount)}</div></div>
            <div class="iterm"><span class="it-lbl">Доля</span><div class="it-val red">${d.equity}%</div></div>
            <div class="iterm"><span class="it-lbl">Срок</span><div class="it-val">${d.daysLeft} дн.</div></div>
          </div>
          <div class="inv-actions">
            <button class="btn-acpt" data-id="${d.invId}">✓ Принять</button>
            <button class="btn-dcln" data-id="${d.invId}">Отказать</button>
          </div>
        </div>`;
      }
      html += '</div>';
    }

    if (deals.length === 0 && active.length === 0) {
      html = `<div class="i-empty">
        <div class="i-empty-ico">💼</div>
        <h3>Инвесторов нет</h3>
        <p>Развивай парк — инвесторы придут сами!</p>
        <div class="reqs">
          <div class="req ${rating >= 1 ? 'met' : ''}">⭐ 1 звезда → Первые инвесторы</div>
          <div class="req ${rating >= 2 ? 'met' : ''}">⭐⭐ 2 звезды + 50 посетителей → Венчур</div>
          <div class="req ${rating >= 3 ? 'met' : ''}">⭐⭐⭐ 3 звезды + 200 посетителей → Корпорации</div>
        </div>
      </div>`;
    }
    cont.innerHTML = html;

    // Bind new buttons
    cont.querySelectorAll('.btn-acpt').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const d  = deals.find(x => x.invId === id);
        if (d) this.openInvestorModal(d);
      });
    });
    cont.querySelectorAll('.btn-dcln').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game.investment.declineDeal(btn.dataset.id);
        this.updateInvestSheet();
      });
    });
  }

  openInvestorModal(deal) {
    this._pendingDeal = deal;
    document.getElementById('inv-ava').textContent    = deal.avatar;
    document.getElementById('inv-badge').textContent  = deal.name.toUpperCase();
    document.getElementById('inv-name').textContent   = deal.name;
    document.getElementById('inv-desc').textContent   = deal.desc;
    document.getElementById('iv-amount').textContent  = fmt$(deal.amount);
    document.getElementById('iv-equity').textContent  = deal.equity + '% дохода';
    document.getElementById('iv-days').textContent    = deal.daysLeft + ' дней';
    document.getElementById('inv-modal').classList.remove('hidden');
  }

  // Called from investment system when new investor arrives
  onInvestorArrived(deal) {
    this.notify(`💼 ${deal.name} хочет встретиться! Открой раздел Инвестор.`, 'invest');
    // Auto-open modal after 2s if panel not already open
    setTimeout(() => {
      if (!document.getElementById('sh-invest').classList.contains('hidden')) {
        this.updateInvestSheet();
      }
    }, 2000);
  }

  notify(text, type = 'info') {
    const el = document.createElement('div');
    el.className = `notif notif-${type}`;
    el.textContent = text;
    document.getElementById('notifs').appendChild(el);
    const n = { el, alive: true };
    this._ntfs.push(n);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => { el.remove(); n.alive = false; }, 450);
    }, 3500);
  }

  showSheet(id) {
    document.querySelectorAll('.sheet').forEach(s => s.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
  }

  hideAll() {
    document.querySelectorAll('.sheet').forEach(s => s.classList.add('hidden'));
  }
}
