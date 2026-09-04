/* 健身动作指南 — 纯前端单页应用（Capacitor 套壳） */
(function () {
  'use strict';

  var EX = {};
  (window.EXERCISES || []).forEach(function (e) { EX[e.slug] = e; });

  var MUSCLE_CN = {
    'Chest': '胸部', 'Back': '背部', 'Lats': '背阔肌', 'Upper Back': '上背',
    'Lower Back': '下背', 'Shoulders': '肩部', 'Rear Delts': '后束',
    'Triceps': '肱三头', 'Biceps': '肱二头', 'Forearms': '前臂',
    'Quads': '股四头', 'Hamstrings': '腘绳肌', 'Glutes': '臀部',
    'Calves': '小腿', 'Core': '核心', 'Legs': '腿部', 'Hips': '髋部',
    'Adductors': '内收肌', 'Posterior Chain': '后链', 'Mobility': '柔韧'
  };
  var EQUIP_CN = {
    'Barbell': '杠铃', 'Dumbbell': '哑铃', 'Cable': '绳索', 'Machine': '器械',
    'Bodyweight': '自重', 'Kettlebell': '壶铃', 'Plate': '杠铃片',
    'Resistance Band': '弹力带', 'Pull-up Bar': '单杠', 'Bench': '卧凳',
    'Box': '跳箱', 'Chair': '椅子', 'Stability Ball': '瑞士球',
    'Towel': '毛巾', 'Wall': '墙面', 'Doorway': '门框', 'Cardio': '有氧'
  };
  var ZH_NAME = {
    'bench-press': '杠铃卧推', 'incline-dumbbell-press': '上斜哑铃卧推', 'cable-fly': '绳索夹胸',
    'overhead-press': '站姿推举', 'lateral-raise': '哑铃侧平举', 'tricep-pushdown': '绳索下压',
    'lat-pulldown': '高位下拉', 'barbell-row': '杠铃划船', 'seated-row': '坐姿划船',
    'face-pull': '面拉', 'bicep-curl': '哑铃弯举', 'hammer-curl': '锤式弯举',
    'squat': '杠铃深蹲', 'romanian-deadlift': '罗马尼亚硬拉', 'leg-press': '腿举',
    'walking-lunge': '行走箭步蹲', 'standing-calf-raise': '站姿提踵', 'plank': '平板支撑',
    'hanging-leg-raise': '悬垂举腿', 'pull-up': '引体向上', 'dip': '双杠臂屈伸',
    'deadlift': '硬拉', 'dumbbell-fly': '哑铃飞鸟', 'push-up': '俯卧撑'
  };
  function mc(m) { return MUSCLE_CN[m] || m; }
  function ec(e) { return EQUIP_CN[e] || e; }
  function zh(slug, name) { return ZH_NAME[slug] ? ZH_NAME[slug] + ' · ' + name : name; }

  /* ---------- 训练计划 ---------- */
  // kind: weight(有重量) / reps(自重计次) / time(计时秒)
  var PLAN = [
    {
      name: 'Day 1 · 胸 / 肩 / 三头',
      items: [
        { slug: 'bench-press', kind: 'weight', sets: 3, lo: 8, hi: 10, start: 30, step: 2.5, cue: '肩胛后缩下沉、双脚踩稳；控制下放，不要弹胸。' },
        { slug: 'incline-dumbbell-press', kind: 'weight', perHand: true, sets: 3, lo: 10, hi: 12, start: 8, step: 1, cue: '凳面约 20–30°；肩胛稳定，哑铃沿胸部两侧下放。' },
        { slug: 'cable-fly', kind: 'weight', sets: 3, lo: 12, hi: 15, start: 15, step: 2.5, cue: '肘微屈固定角度，用胸肌把手柄抱拢，顶峰收缩一秒。' },
        { slug: 'overhead-press', kind: 'weight', sets: 3, lo: 8, hi: 10, start: 20, step: 2.5, cue: '核心收紧不要过度挺腰，杠铃沿面部推至头顶正上方。' },
        { slug: 'lateral-raise', kind: 'weight', perHand: true, sets: 3, lo: 12, hi: 15, start: 4, step: 1, cue: '肘微屈抬到接近肩高；不要耸肩甩重量。' },
        { slug: 'tricep-pushdown', kind: 'weight', sets: 3, lo: 12, hi: 15, start: 15, step: 2.5, cue: '大臂贴紧身体只动小臂，下压到底做顶峰收缩。' }
      ]
    },
    {
      name: 'Day 2 · 背 / 二头 / 后束',
      items: [
        { slug: 'lat-pulldown', kind: 'weight', sets: 3, lo: 10, hi: 12, start: 30, step: 2.5, cue: '先下沉肩胛再让肘向下拉；不要大幅后仰借力。' },
        { slug: 'barbell-row', kind: 'weight', sets: 3, lo: 10, hi: 12, start: 25, step: 2.5, cue: '屈髋俯身约 45°，把肘拉向髋部，背肌发力而非挺身。' },
        { slug: 'seated-row', kind: 'weight', sets: 3, lo: 10, hi: 12, start: 25, step: 2.5, cue: '挺胸收肩胛，把手柄拉到下胸位置，慢放拉伸。' },
        { slug: 'face-pull', kind: 'weight', sets: 3, lo: 15, hi: 20, start: 10, step: 2.5, cue: '绳索拉向面部两侧、肘高于肩，锻炼后束与肩袖。' },
        { slug: 'bicep-curl', kind: 'weight', perHand: true, sets: 3, lo: 10, hi: 12, start: 6, step: 1, cue: '大臂固定不前后晃，顶峰收缩、缓慢下放。' },
        { slug: 'hammer-curl', kind: 'weight', perHand: true, sets: 3, lo: 12, hi: 15, start: 6, step: 1, cue: '中立握法（拳眼朝上），对肱肌和前臂更友好。' }
      ]
    },
    {
      name: 'Day 3 · 腿 / 核心',
      items: [
        { slug: 'squat', kind: 'weight', sets: 3, lo: 8, hi: 10, start: 30, step: 2.5, cue: '高杠位收紧上背，下蹲至大腿平行或更低，膝盖对齐脚尖。' },
        { slug: 'romanian-deadlift', kind: 'weight', sets: 3, lo: 10, hi: 12, start: 30, step: 2.5, cue: '膝盖微屈固定，臀部向后推，感受腘绳肌拉伸后站起。' },
        { slug: 'leg-press', kind: 'weight', sets: 3, lo: 10, hi: 12, start: 60, step: 5, cue: '双脚与肩同宽，下放时腰部不要离开靠垫，膝盖不内扣。' },
        { slug: 'walking-lunge', kind: 'weight', perHand: true, sets: 3, lo: 10, hi: 12, start: 6, step: 1, cue: '每侧步数计次；前膝对齐脚尖，躯干直立，步幅适中。' },
        { slug: 'standing-calf-raise', kind: 'weight', sets: 3, lo: 15, hi: 20, start: 30, step: 5, cue: '顶峰停顿一秒，底部充分拉伸小腿。' },
        { slug: 'plank', kind: 'time', sets: 3, lo: 45, hi: 60, start: 45, step: 5, cue: '手肘在肩正下方，收腹夹臀，身体从头到脚成一条直线。' },
        { slug: 'hanging-leg-raise', kind: 'reps', sets: 3, lo: 10, hi: 15, cue: '骨盆后倾带动抬腿，不要靠身体摆动借力。' }
      ]
    }
  ];

  /* ---------- 状态 ---------- */
  var STORE_KEY = 'fitguide-v1';
  var state = { weights: {}, sessions: [], body: [], draft: {} };
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {}
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

  function lastSessionFor(slug) {
    for (var i = state.sessions.length - 1; i >= 0; i--) {
      if (state.sessions[i].entries[slug]) return state.sessions[i].entries[slug];
    }
    return null;
  }
  // 根据上次表现给出建议重量
  function suggest(item, entry) {
    if (item.kind !== 'weight' || !entry) return null;
    var reps = entry.sets.map(function (s) { return parseFloat(s.r); }).filter(function (n) { return !isNaN(n); });
    var w = parseFloat(entry.sets[0] && entry.sets[0].w);
    if (!reps.length || isNaN(w)) return null;
    var allHi = reps.filter(function (r) { return r >= item.hi; }).length === reps.length;
    var anyLo = reps.some(function (r) { return r < item.lo; });
    var rir = entry.rir == null ? null : entry.rir;
    if (allHi && (rir == null || rir >= 3)) {
      return { w: Math.round((w + item.step) / item.step) * item.step, up: true };
    }
    if (anyLo) {
      var nw = Math.round((w * 0.9) / item.step) * item.step;
      return { w: Math.max(item.step, nw), up: false };
    }
    return { w: w, up: null };
  }

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.add('hidden'); }, 1800);
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function framePath(slug, i) { return 'assets/' + slug + '/frame-' + i + '.png'; }

  var anims = [];
  function startAnim(img, slug, interval) {
    var idx = 1;
    function tick() {
      idx = idx >= 3 ? 1 : idx + 1;
      img.src = framePath(slug, idx);
    }
    var timer = setInterval(tick, interval || 550);
    anims.push(timer);
    img.dataset.playing = '1';
    img.onclick = function () {
      if (img.dataset.playing === '1') {
        img.dataset.playing = '0';
        clearInterval(timer);
      } else {
        img.dataset.playing = '1';
        timer = setInterval(tick, interval || 550);
        anims.push(timer);
      }
    };
  }
  function clearAnims() { anims.forEach(clearInterval); anims = []; }

  /* ---------- 今日训练 ---------- */
  function currentDay() {
    if (state.sessions.length) {
      var last = state.sessions[state.sessions.length - 1];
      return (last.day + 1) % PLAN.length;
    }
    return 0;
  }

  function renderToday(dayIdx) {
    clearAnims();
    var day = PLAN[dayIdx];
    var draft = state.draft[dayIdx] || {};
    var doneCount = 0;
    var cards = day.items.map(function (item) {
      var ex = EX[item.slug];
      if (!ex) return '';
      var d = draft[item.slug] || { sets: [], rir: null, done: false };
      if (d.done) doneCount++;
      var last = lastSessionFor(item.slug);
      var sug = suggest(item, last);
      var curW = state.weights[item.slug] != null ? state.weights[item.slug] : item.start;
      var unit = item.kind === 'time' ? '秒' : '次';
      var rows = '';
      for (var i = 0; i < item.sets; i++) {
        var s = d.sets[i] || {};
        var rVal = s.r != null ? s.r : (last && last.sets[i] ? last.sets[i].r : '');
        rows += '<div class="set-row">'
          + '<label>第' + (i + 1) + '组</label>'
          + (item.kind === 'weight'
              ? '<input type="number" inputmode="decimal" data-k="w" data-i="' + i + '" value="' + esc(s.w != null ? s.w : curW) + '" placeholder="重量"><span class="unit">kg' + (item.perHand ? '/手' : '') + '</span>'
              : '')
          + '<input type="number" inputmode="numeric" data-k="r" data-i="' + i + '" value="' + esc(rVal) + '" placeholder="' + (item.kind === 'time' ? '秒数' : '次数') + '"><span class="unit">' + unit + '</span>'
          + '</div>';
      }
      var rirBtns = '';
      if (item.kind === 'weight') {
        rirBtns = '<div class="rir-row"><span>最后一组 RIR</span>';
        for (var r = 0; r <= 5; r++) {
          rirBtns += '<button data-rir="' + r + '" class="' + (d.rir === r ? 'on' : '') + '">' + r + '</button>';
        }
        rirBtns += '</div>';
      }
      var lastTxt = '';
      if (last) {
        var parts = last.sets.map(function (x) {
          if (item.kind === 'weight') return (x.w != null ? x.w + 'kg×' : '') + x.r;
          return x.r + unit;
        });
        lastTxt = '<div class="ex-last">上次：' + parts.join(' / ') + (last.rir != null ? ' · RIR ' + last.rir : '') + '</div>';
        if (sug && sug.up === true) lastTxt += '<div class="ex-sugg">↑ 状态不错，建议下次 ' + sug.w + 'kg</div>';
        else if (sug && sug.up === false) lastTxt += '<div class="ex-sugg">↓ 有点吃力，建议降到 ' + sug.w + 'kg</div>';
      }
      return '<div class="ex-card" data-slug="' + item.slug + '">'
        + '<div class="ex-head">'
        +   '<div class="ex-anim"><img src="' + framePath(item.slug, 1) + '" data-anim="' + item.slug + '"></div>'
        +   '<div class="ex-info">'
        +     '<p class="ex-name">' + esc(zh(ex.slug, ex.name)) + '</p>'
        +     '<div class="ex-meta">' + mc(ex.muscle) + (ex.secondary && ex.secondary.length ? '（' + ex.secondary.map(mc).join('、') + '）' : '') + ' · ' + ec(ex.equipment) + '</div>'
        +     '<div class="ex-target">目标：' + item.sets + ' × ' + item.lo + '–' + item.hi + unit + (item.kind === 'weight' ? ' · 起点 ' + item.start + 'kg' + (item.perHand ? '/手' : '') : '') + '</div>'
        +   '</div>'
        + '</div>'
        + lastTxt
        + '<div class="sets">' + rows + '</div>'
        + rirBtns
        + '<div class="ex-actions">'
        +   '<button class="btn ghost" data-detail="' + item.slug + '">看动作</button>'
        +   '<button class="btn ' + (d.done ? 'done' : '') + '" data-done="' + item.slug + '">' + (d.done ? '✓ 已完成' : '完成') + '</button>'
        + '</div>'
        + '<p class="ex-cue">💡 ' + esc(item.cue) + '</p>'
        + '</div>';
    }).join('');

    var html = '<div class="day-tabs">'
      + PLAN.map(function (p, i) { return '<button data-day="' + i + '" class="' + (i === dayIdx ? 'on' : '') + '">Day ' + (i + 1) + '</button>'; }).join('')
      + '</div>'
      + '<p class="day-hint">' + esc(day.name) + ' · 约 50–70 分钟。组间休息 60–120 秒（右上角 ⏱ 计时）。填好每组数据后点「完成」，最后保存本次训练。<br>加重规则：所有组达到次数上限且 RIR ≥ 3 → 下次加重；任一组低于下限 → 降重约 10%。</p>'
      + cards
      + '<div class="save-bar"><button class="btn primary" id="save-session">保存本次训练（已完成 ' + doneCount + '/' + day.items.length + '）</button></div>';

    $('#view').innerHTML = html;

    $all('[data-anim]', $('#view')).forEach(function (img) { startAnim(img, img.dataset.anim); });

    $all('[data-day]').forEach(function (b) {
      b.onclick = function () { renderToday(+b.dataset.day); };
    });
    $all('.ex-card').forEach(function (card) {
      var slug = card.dataset.slug;
      var item = day.items.filter(function (x) { return x.slug === slug; })[0];
      $all('input', card).forEach(function (inp) {
        inp.oninput = function () {
          var d = state.draft[dayIdx] = state.draft[dayIdx] || {};
          d[slug] = d[slug] || { sets: [], rir: null, done: false };
          var i = +inp.dataset.i;
          d[slug].sets[i] = d[slug].sets[i] || {};
          d[slug].sets[i][inp.dataset.k] = inp.value === '' ? null : Number(inp.value);
          save();
        };
      });
      $all('[data-rir]', card).forEach(function (btn) {
        btn.onclick = function () {
          var d = state.draft[dayIdx] = state.draft[dayIdx] || {};
          d[slug] = d[slug] || { sets: [], rir: null, done: false };
          d[slug].rir = d[slug].rir === +btn.dataset.rir ? null : +btn.dataset.rir;
          save();
          renderToday(dayIdx);
        };
      });
      var doneBtn = $('[data-done]', card);
      doneBtn.onclick = function () {
        var d = state.draft[dayIdx] = state.draft[dayIdx] || {};
        d[slug] = d[slug] || { sets: [], rir: null, done: false };
        d[slug].done = !d[slug].done;
        save();
        renderToday(dayIdx);
      };
      var detailBtn = $('[data-detail]', card);
      detailBtn.onclick = function () { openDetail(slug); };
    });

    $('#save-session').onclick = function () {
      var d = state.draft[dayIdx] || {};
      var entries = {};
      Object.keys(d).forEach(function (slug) {
        var v = d[slug];
        var item = day.items.filter(function (x) { return x.slug === slug; })[0];
        // 预填的重量不会触发 input 事件，保存时补齐默认重量
        if (item && item.kind === 'weight') {
          var defW = state.weights[slug] != null ? state.weights[slug] : item.start;
          for (var si = 0; si < item.sets; si++) {
            v.sets[si] = v.sets[si] || { r: null };
            if (v.sets[si].w == null) v.sets[si].w = defW;
          }
        }
        var hasData = v.sets.some(function (s) { return s && s.r != null; });
        if (v.done || hasData) {
          entries[slug] = v;
          var sug = suggest(item, v);
          if (sug) state.weights[slug] = sug.w;
        }
      });
      if (!Object.keys(entries).length) { toast('还没有填写任何训练数据'); return; }
      state.sessions.push({ ts: Date.now(), day: dayIdx, entries: entries });
      state.draft[dayIdx] = {};
      save();
      toast('训练已保存 💪');
      renderToday((dayIdx + 1) % PLAN.length);
    };
  }

  /* ---------- 动作库 ---------- */
  var libFilter = { q: '', muscle: '', equip: '' };
  function renderLibrary() {
    clearAnims();
    var muscles = [...new Set(window.EXERCISES.map(function (e) { return e.muscle; }))];
    var equips = [...new Set(window.EXERCISES.map(function (e) { return e.equipment; }))];
    var list = window.EXERCISES.filter(function (e) {
      if (libFilter.muscle && e.muscle !== libFilter.muscle && e.secondary.indexOf(libFilter.muscle) < 0) return false;
      if (libFilter.equip && e.equipment !== libFilter.equip) return false;
      if (libFilter.q) {
        var q = libFilter.q.toLowerCase();
        var hay = (e.name + ' ' + e.slug + ' ' + (ZH_NAME[e.slug] || '') + ' ' + mc(e.muscle)).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var html = '<input class="search-box" id="lib-q" placeholder="搜索动作，如 push up / 卧推 / 胸" value="' + esc(libFilter.q) + '">'
      + '<div class="chip-row" id="muscle-chips">'
      + '<span class="chip ' + (libFilter.muscle === '' ? 'on' : '') + '" data-m="">全部肌群</span>'
      + muscles.map(function (m) { return '<span class="chip ' + (libFilter.muscle === m ? 'on' : '') + '" data-m="' + esc(m) + '">' + mc(m) + '</span>'; }).join('')
      + '</div>'
      + '<div class="chip-row" id="equip-chips">'
      + '<span class="chip ' + (libFilter.equip === '' ? 'on' : '') + '" data-e="">全部器械</span>'
      + equips.map(function (eq) { return '<span class="chip ' + (libFilter.equip === eq ? 'on' : '') + '" data-e="' + esc(eq) + '">' + ec(eq) + '</span>'; }).join('')
      + '</div>'
      + '<p class="day-hint">共 ' + list.length + ' 个动作 · 点击任意动作查看三帧示范</p>'
      + list.map(function (e) {
        return '<div class="lib-item" data-detail="' + e.slug + '">'
          + '<div class="lib-thumb"><img src="' + framePath(e.slug, 1) + '" data-anim="' + e.slug + '"></div>'
          + '<div class="lib-info"><div class="lib-name">' + esc(zh(e.slug, e.name)) + '</div>'
          + '<div class="lib-meta">' + mc(e.muscle) + ' · ' + ec(e.equipment) + (e.stretch ? ' · 拉伸' : '') + '</div></div>'
          + '<span style="color:var(--muted)">›</span></div>';
      }).join('');
    $('#view').innerHTML = html;

    var qTimer;
    $('#lib-q').oninput = function () {
      clearTimeout(qTimer);
      var v = this.value;
      qTimer = setTimeout(function () { libFilter.q = v; renderLibrary(); var el = $('#lib-q'); el.focus(); el.setSelectionRange(v.length, v.length); }, 250);
    };
    $all('#muscle-chips .chip').forEach(function (c) {
      c.onclick = function () { libFilter.muscle = c.dataset.m; renderLibrary(); };
    });
    $all('#equip-chips .chip').forEach(function (c) {
      c.onclick = function () { libFilter.equip = c.dataset.e; renderLibrary(); };
    });
    $all('[data-anim]', $('#view')).forEach(function (img) { startAnim(img, img.dataset.anim, 700); });
    $all('[data-detail]', $('#view')).forEach(function (el) {
      el.onclick = function () { openDetail(el.dataset.detail); };
    });
  }

  function openDetail(slug) {
    var e = EX[slug];
    if (!e) return;
    var card = $('#modal-card');
    card.innerHTML =
      '<div class="detail-anim"><img src="' + framePath(slug, 1) + '" id="detail-img"></div>'
      + '<div class="detail-hint">点击图片可暂停 / 播放三帧动作</div>'
      + '<p class="detail-name">' + esc(zh(slug, e.name)) + '</p>'
      + '<div class="detail-tags">'
      +   '<span class="tag">主要肌群：' + mc(e.muscle) + '</span>'
      +   (e.secondary && e.secondary.length ? '<span class="tag">辅助：' + e.secondary.map(mc).join('、') + '</span>' : '')
      +   '<span class="tag">器械：' + ec(e.equipment) + '</span>'
      +   (e.stretch ? '<span class="tag">拉伸动作</span>' : '<span class="tag">力量动作</span>')
      + '</div>'
      + (PLAN.some(function (d) { return d.items.some(function (i) { return i.slug === slug; }); })
          ? '<p class="ex-cue">📌 该动作已包含在内置训练计划中。</p>' : '')
      + '<button class="btn primary modal-close" id="modal-close">关闭</button>';
    $('#modal').classList.remove('hidden');
    var img = $('#detail-img');
    startAnim(img, slug, 600);
    $('#modal-close').onclick = closeModal;
  }
  function closeModal() { $('#modal').classList.add('hidden'); $('#modal-card').innerHTML = ''; clearAnims(); }

  /* ---------- 记录 ---------- */
  function renderHistory() {
    clearAnims();
    var sessions = state.sessions.slice().reverse();
    var body = state.body.slice().reverse();
    var html = '<div class="section-title">身体数据</div>'
      + '<div class="body-row">'
      + '<input type="number" inputmode="decimal" id="bw" placeholder="体重 kg">'
      + '<input type="number" inputmode="decimal" id="waist" placeholder="腰围 cm（选填）">'
      + '<button class="btn primary" style="flex:0 0 70px" id="bw-save">保存</button>'
      + '</div>'
      + body.slice(0, 5).map(function (b) {
        return '<div class="hist-line"><span class="h-m">' + fmtDate(b.ts) + '</span><span>' + b.weight + ' kg' + (b.waist ? ' · 腰围 ' + b.waist + ' cm' : '') + '</span></div>';
      }).join('')
      + '<div class="section-title">训练历史（' + state.sessions.length + ' 次）</div>'
      + (sessions.length ? sessions.map(function (s) {
        var lines = Object.keys(s.entries).map(function (slug) {
          var ex = EX[slug];
          var en = s.entries[slug];
          var item = null;
          PLAN.forEach(function (d) { d.items.forEach(function (i) { if (i.slug === slug) item = i; }); });
          var unit = item && item.kind === 'time' ? '秒' : '次';
          var txt = en.sets.map(function (x) {
            if (!x || x.r == null) return '—';
            return (item && item.kind === 'weight' && x.w != null ? x.w + 'kg×' : '') + x.r + (item && item.kind !== 'weight' ? unit : '');
          }).join(' / ');
          return '<div class="hist-line"><span class="h-m">' + esc(ex ? zh(slug, ex.name) : slug) + '</span><span>' + txt + (en.rir != null ? ' · RIR' + en.rir : '') + '</span></div>';
        }).join('');
        return '<div class="hist-item"><div class="hist-date">' + fmtDate(s.ts) + ' · ' + PLAN[s.day].name + '</div>'
          + '<div class="hist-sub">完成 ' + Object.keys(s.entries).length + ' 个动作</div>' + lines + '</div>';
      }).join('') : '<p class="day-hint">还没有训练记录，去「训练」页开始第一次吧。</p>')
      + '<div class="section-title">数据备份</div>'
      + '<div class="ex-actions"><button class="btn" id="export-btn">导出 / 导入数据</button><button class="btn" id="clear-btn" style="color:var(--red)">清空全部数据</button></div>';
    $('#view').innerHTML = html;

    $('#bw-save').onclick = function () {
      var w = parseFloat($('#bw').value);
      if (isNaN(w)) { toast('请输入体重'); return; }
      state.body.push({ ts: Date.now(), weight: w, waist: parseFloat($('#waist').value) || null });
      save(); toast('已保存'); renderHistory();
    };
    $('#export-btn').onclick = function () {
      var card = $('#modal-card');
      card.innerHTML = '<p class="detail-name" style="font-size:17px">导出 / 导入</p>'
        + '<p class="ex-cue">导出：复制下面的 JSON 自行保存。换手机时粘贴到这里点导入即可恢复。</p>'
        + '<textarea id="io-text" style="width:100%;height:140px;background:var(--card2);border:1px solid var(--line);border-radius:10px;color:var(--text);padding:10px;font-size:12px">' + esc(JSON.stringify(state)) + '</textarea>'
        + '<div class="ex-actions"><button class="btn" id="io-copy">复制</button><button class="btn primary" id="io-import">导入</button></div>'
        + '<button class="btn modal-close" id="modal-close2">关闭</button>';
      $('#modal').classList.remove('hidden');
      $('#modal-close2').onclick = closeModal;
      $('#io-copy').onclick = function () {
        var ta = $('#io-text');
        ta.select();
        try { document.execCommand('copy'); toast('已复制到剪贴板'); } catch (e) { toast('请长按手动复制'); }
      };
      $('#io-import').onclick = function () {
        try {
          var data = JSON.parse($('#io-text').value);
          if (!data.sessions || !data.weights) throw new Error('bad');
          state = data; save(); closeModal(); toast('导入成功'); renderHistory();
        } catch (e) { toast('数据格式不正确'); }
      };
    };
    $('#clear-btn').onclick = function () {
      if (confirm('确定清空全部训练和身体数据？此操作不可恢复。')) {
        state = { weights: {}, sessions: [], body: [], draft: {} };
        save(); toast('已清空'); renderHistory();
      }
    };
  }

  /* ---------- 关于 ---------- */
  function renderAbout() {
    clearAnims();
    $('#view').innerHTML =
      '<div class="about">'
      + '<h3>健身动作指南</h3>'
      + '<p>内置 3 日分化训练计划（胸肩三头 / 背二头后束 / 腿核心），支持每组重量与次数记录、RIR 记录、自动加重 / 降重建议、休息计时、身体数据与训练历史，全部数据只保存在本机。</p>'
      + '<h3>动作素材署名</h3>'
      + '<p>302 个动作、906 张三帧示范图来自开源项目 <a href="https://github.com/bryllim/workout-guide">bryllim/workout-guide</a>：</p>'
      + '<p>视觉素材 © Bryl Lim（<a href="https://bryllim.com">bryllim.com</a>）及 Everkinetic，基于 <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> 协议发布；原始姿势数据来自 <a href="https://github.com/everkinetic/data">Everkinetic</a>（同为 CC BY-SA 4.0）。素材代码部分为 MIT 协议。</p>'
      + '<p>本应用为基于该素材库的二次创作，按 CC BY-SA 4.0 要求以相同协议共享。</p>'
      + '<h3>使用提示</h3>'
      + '<p>· RIR = 还能再做几次（0 表示力竭）；新手建议留 2–3 次。<br>'
      + '· 动作图为三帧循环动画，点击可暂停。<br>'
      + '· 重量起步仅供参考，请根据自身情况调整，动作标准优先于重量。</p>'
      + '</div>';
  }

  /* ---------- 休息计时器 ---------- */
  var restLeft = 0, restTimer = null;
  function restTick() {
    restLeft--;
    if (restLeft <= 0) {
      clearInterval(restTimer); restTimer = null;
      $('#rest-time').textContent = '0:00';
      if (navigator.vibrate) { navigator.vibrate([300, 100, 300]); }
      toast('休息结束，开始下一组！');
      setTimeout(function () { $('#rest-overlay').classList.add('hidden'); }, 800);
      return;
    }
    var m = Math.floor(restLeft / 60), s = restLeft % 60;
    $('#rest-time').textContent = m + ':' + String(s).padStart(2, '0');
  }
  function startRest(sec) {
    restLeft = sec;
    $('#rest-time').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    $('#rest-overlay').classList.remove('hidden');
    if (restTimer) clearInterval(restTimer);
    restTimer = setInterval(restTick, 1000);
  }
  $('#rest-btn').onclick = function () { startRest(90); };
  $('#rest-add').onclick = function () { restLeft += 15; restTick(); };
  $('#rest-skip').onclick = function () {
    clearInterval(restTimer); restTimer = null;
    $('#rest-overlay').classList.add('hidden');
  };
  $('#modal').addEventListener('click', function (ev) {
    if (ev.target.id === 'modal') closeModal();
  });

  /* ---------- 路由 ---------- */
  var TITLES = { today: '今日训练', library: '动作库（302）', history: '训练记录', about: '关于' };
  function route() {
    var tab = (location.hash || '#/today').replace('#/', '') || 'today';
    if (['today', 'library', 'history', 'about'].indexOf(tab) < 0) tab = 'today';
    $('#page-title').textContent = TITLES[tab];
    $all('.tabbar a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.tab === tab);
    });
    if (tab === 'today') renderToday(currentDay());
    else if (tab === 'library') renderLibrary();
    else if (tab === 'history') renderHistory();
    else renderAbout();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
