let students = [], items = [], uni = [], att = [];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayBoxes = name => DAYS.map(d => `<label class="chk"><input type="checkbox" name="${name}" value="${d}"> ${d.slice(0, 3)}</label>`).join('');
const picked = name => [...document.querySelectorAll(`[name=${name}]:checked`)].map(c => c.value);
const badTimes = (s, e) => !s || !e || e <= s;

(async () => {
  if (!await requireAuth()) return;
  const snap = await db.collection('students').where('userId', '==', USER.uid).get();
  students = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));

  $('stus').innerHTML = students.map(s =>
    `<label class="chk"><input type="checkbox" name="stu" value="${s.id}"> ${esc(s.name)} <small>(${esc(s.class)})</small></label>`).join('') || 'Add students first.';
  $('days').innerHTML = dayBoxes('day');
  $('udays').innerHTML = dayBoxes('uday');
  $('vf').innerHTML = '<option value="">Everyone</option>' + students.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('vf').onchange = draw;
  $('selAll').onclick = () => document.querySelectorAll('[name=stu]').forEach(c => c.checked = true);

  const listen = (n, fn) => db.collection(n).where('userId', '==', USER.uid).onSnapshot(sn => {
    fn(sn.docs.map(d => ({ id: d.id, ...d.data() }))); draw();
  }, e => toast(e.message, 'err'));
  listen('schedules', d => items = d);
  listen('myclasses', d => uni = d);

  db.collection('attendance').where('userId', '==', USER.uid).where('date', '>=', ymd(addDays(new Date(), -30)))
    .onSnapshot(sn => { att = sn.docs.map(d => ({ id: d.id, ...d.data() })); draw(); }, e => toast(e.message, 'err'));
})();

function draw() {
  const f = $('vf').value, today = new Date().getDay();
  const ws = addDays(new Date(), -((today + 1) % 7)); // start of week = Saturday
  const evs = [
    ...items.filter(x => !f || (x.student_ids || []).includes(f)).map(x => ({
      id: x.id, col: 'schedules', type: 'tuition', days: x.days || [x.day], start: x.start, end: x.end, ids: x.student_ids || [],
      title: (x.student_names || [x.class]).join(', '), sub: [x.location, x.notes].filter(Boolean).join(' · ') })),
    ...uni.map(x => ({
      id: x.id, col: 'myclasses', type: 'uni', days: x.days, start: x.start, end: x.end, ids: [],
      title: x.course, sub: [x.room, x.notes].filter(Boolean).join(' · ') }))
  ];
  $('wk').innerHTML = [6, 0, 1, 2, 3, 4, 5].map((i, k) => {
    const date = ymd(addDays(ws, k));
    const list = evs.filter(e => e.days.includes(DAYS[i])).sort((a, b) => a.start.localeCompare(b.start));
    const clash = e => list.some(o => o !== e && o.start < e.end && e.start < o.end);
    return `<div class="day ${i === today ? 'today' : ''}"><h3>${DAYS[i]}${i === today ? ' (today)' : ''}</h3>` +
      (list.map(e => {
        const gone = e.ids.length ? att.filter(a => a.date === date && a.status === 'missed' && e.ids.includes(a.student_id)) : [];
        return `<div class="ev ${e.type} ${clash(e) ? 'clash' : ''}">
        <span class="tag">${e.type === 'uni' ? 'UNI' : 'TUITION'}${clash(e) ? ' <span class="bad">· CLASH</span>' : ''}</span>
        <b>${e.start}-${e.end}</b> ${esc(e.title)}<br><small>${esc(e.sub)}</small>
        ${gone.length ? `<div class="miss-note">Class missed: ${esc(gone.map(a => a.student_name).join(', '))}</div>` : ''}
        <br><button class="btn danger" style="min-height:32px;padding:2px 10px;margin-top:4px" onclick="del('${e.col}','${e.id}')">Remove</button>
      </div>`; }).join('') || '<small>Free day</small>') + '</div>';
  }).join('');
  drawMissed();
}

function drawMissed() {
  const dayOf = d => DAYS[new Date(d + 'T00:00:00').getDay()];
  const list = att.filter(a => a.status === 'missed').sort((a, b) => b.date.localeCompare(a.date));
  $('mcount').textContent = list.filter(a => !a.makeup).length;
  $('mlist').innerHTML = list.map(a => {
    const slot = items.find(x => (x.student_ids || []).includes(a.student_id) && (x.days || [x.day]).includes(dayOf(a.date)));
    return `<tr><td>${a.date} <small>${dayOf(a.date).slice(0, 3)}</small></td><td>${esc(a.student_name)}</td><td>${esc(a.class || '')}</td>
      <td>${slot ? slot.start + '-' + slot.end : '-'}</td>
      <td><span class="badge ${a.makeup ? '' : 'inactive'}">${a.makeup ? 'Made up' : 'Pending'}</span></td>
      <td><button class="btn light" onclick="makeup('${a.id}',${!a.makeup})">${a.makeup ? 'Undo' : 'Mark made up'}</button></td></tr>`;
  }).join('') || '<tr><td colspan="6">No missed classes in the last 30 days.</td></tr>';
}

const makeup = (id, v) => db.collection('attendance').doc(id).update({ makeup: v }).catch(e => toast(e.message, 'err'));

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const ids = picked('stu'), days = picked('day');
  if (!ids.length) return toast('Select at least one student', 'err');
  if (!days.length) return toast('Select at least one day', 'err');
  if (badTimes($('start').value, $('end').value)) return toast('End time must be after start time', 'err');
  try {
    await db.collection('schedules').add({
      userId: USER.uid, student_ids: ids, days,
      student_names: ids.map(i => students.find(s => s.id === i).name),
      start: $('start').value, end: $('end').value,
      location: $('loc').value.trim(), notes: $('notes').value.trim() });
    e.target.reset(); toast('Added to routine');
  } catch (ex) { toast(ex.message, 'err'); }
});

$('uf').addEventListener('submit', async e => {
  e.preventDefault();
  const days = picked('uday');
  if (!$('ucourse').value.trim()) return toast('Enter the course name', 'err');
  if (!days.length) return toast('Select at least one day', 'err');
  if (badTimes($('ustart').value, $('uend').value)) return toast('End time must be after start time', 'err');
  try {
    await db.collection('myclasses').add({
      userId: USER.uid, course: $('ucourse').value.trim(), days,
      start: $('ustart').value, end: $('uend').value,
      room: $('uroom').value.trim(), notes: $('unotes').value.trim() });
    e.target.reset(); toast('University class added');
  } catch (ex) { toast(ex.message, 'err'); }
});

const del = (col, id) => db.collection(col).doc(id).delete().then(() => toast('Removed')).catch(e => toast(e.message, 'err'));