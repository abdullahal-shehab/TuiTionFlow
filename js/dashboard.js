(async () => {
  if (!(await requireAuth())) return;
  const today = localDate(), month = today.slice(0, 7), dow = new Date().getDay();
  const col = n => db.collection(n).where('userId', '==', USER.uid);
  let st = [], pay = [], att = [], sch = [], uni = [], exm = [];

  const put = (id, html, asText) => { const el = $(id); if (el) el[asText ? 'textContent' : 'innerHTML'] = html; };
  const names = x => esc((x.student_names || [x.class]).join(', '));
  const hasDay = (x, d) => (x.days || [x.day]).includes(d);
  const byTime = (a, b) => a.start.localeCompare(b.start);
  const li = x => `<li><b>${x.start}-${x.end}</b> ${names(x)}<br><small>${esc(x.location || '')} ${esc(x.notes || '')}</small></li>`;
  const daysUntil = d => Math.round((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 864e5);

  function draw() {
    const active = st.filter(s => s.status === 'active');
    const paid = new Set(pay.filter(p => p.month === month).map(p => p.student_id));
    const sum = a => a.reduce((t, p) => t + p.amount, 0);

    // Stats
    put('tot', '৳' + sum(pay), true);
    put('inc', '৳' + sum(pay.filter(p => p.month === month)), true);
    const missed = att.filter(a => a.status === 'missed');
    put('miss', missed.length, true);
    put('missm', missed.filter(a => a.date.startsWith(month)).length, true);
    put('s', active.length, true);
    put('pres', att.filter(a => a.date === today && (a.status === 'present' || a.status === 'late')).length, true);

    // Exam reminders
    const ex = exm.filter(e => e.date >= today || (!e.marked && e.type !== 'uni'))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
    put('exams', ex.map(e => {
      const n = daysUntil(e.date), u = e.type === 'uni';
      const label = n < 0 ? 'Marks pending' : n === 0 ? 'TODAY' : n === 1 ? 'Tomorrow' : `in ${n} days`;
      return `<li><span class="badge ${u ? 'inactive' : ''}">${u ? 'UNI' : 'TUITION'}</span> <b>${esc(e.title)}</b>
        <small>(${esc(u ? [e.room, e.time].filter(Boolean).join(' ') || 'university' : e.class)}, ${e.date})</small><br>
        <span class="badge ${n < 0 ? 'inactive' : ''}">${label}</span></li>`;
    }).join('') || '<li>No upcoming exams.</li>');

    // Combined week board
    const evs = [
      ...sch.map(x => ({ days: x.days || [x.day], start: x.start, end: x.end, type: 'tuition',
        title: (x.student_names || [x.class]).join(', '), sub: [x.location, x.notes].filter(Boolean).join(' · ') })),
      ...uni.map(x => ({ days: x.days, start: x.start, end: x.end, type: 'uni',
        title: x.course, sub: [x.room, x.notes].filter(Boolean).join(' · ') }))
    ];
    put('wk', [6, 0, 1, 2, 3, 4, 5].map(i => {
      const list = evs.filter(e => e.days.includes(DAYS[i])).sort(byTime);
      const clash = e => list.some(o => o !== e && o.start < e.end && e.start < o.end);
      return `<div class="day ${i === dow ? 'today' : ''}"><h3>${DAYS[i]}${i === dow ? ' (today)' : ''}</h3>` +
        (list.map(e => `<div class="ev ${e.type} ${clash(e) ? 'clash' : ''}">
          <span class="tag">${e.type === 'uni' ? 'UNI' : 'TUITION'}${clash(e) ? ' <span class="bad">· CLASH</span>' : ''}</span>
          <b>${e.start}-${e.end}</b> ${esc(e.title)}<br><small>${esc(e.sub)}</small></div>`).join('')
          || '<small>Free day</small>') + '</div>';
    }).join(''));

    // Today's tuition
    put('today', sch.filter(x => hasDay(x, DAYS[dow])).sort(byTime).map(li).join('') || '<li>No classes today.</li>');

    // Unpaid
    const due = active.filter(s => !paid.has(s.id));
    put('duelist', due.map(s => `<li>${esc(s.name)} <small>(${esc(s.class)})</small> ৳${s.monthly_fee}</li>`).join('') || '<li>Everyone has paid.</li>');

    // Income chart
    const ms = [5, 4, 3, 2, 1, 0].map(i => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return [d.toLocaleString('en', { month: 'short' }), sum(pay.filter(p => p.month === k))];
    });
    const max = Math.max(...ms.map(m => m[1]), 1);
    put('bars', ms.map(([l, v]) => `<div>৳${v}<i style="height:${v / max * 100}px"></i>${l}</div>`).join(''));
  }

  const on = (n, fn) => col(n).onSnapshot(sn => {
    fn(sn.docs.map(d => ({ id: d.id, ...d.data() }))); draw();
  }, e => toast(`${n}: ${e.message}`, 'err'));

  on('students', d => st = d);
  on('payments', d => pay = d);
  on('attendance', d => att = d);
  on('schedules', d => sch = d);
  on('myclasses', d => uni = d);
  on('exams', d => exm = d);
})();