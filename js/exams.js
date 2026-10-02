let exams = [], cur = null, stu = [], att = {}, mk = {};
const isUni = e => e.type === 'uni';

(async () => {
  if (!await requireAuth()) return;
  $('cls').innerHTML = CLASSES.map(c => `<option>${c}</option>`).join('');
  $('type').onchange = toggle; toggle();
  db.collection('exams').where('userId', '==', USER.uid).onSnapshot(sn => {
    exams = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.localeCompare(a.date));
    drawList();
  }, e => toast(e.message, 'err'));
})();

function toggle() {
  const u = $('type').value === 'uni';
  $('clsBox').hidden = u; $('timeBox').hidden = !u; $('roomBox').hidden = !u;
  $('tl').textContent = u ? 'Course / exam name' : 'Exam title';
  $('totl').textContent = u ? 'Total marks (optional)' : 'Total marks';
}

function status(e) {
  const t = localDate(), n = Math.round((new Date(e.date) - new Date(t)) / 864e5);
  if (n > 0) return `Upcoming (${n}d)`;
  if (n === 0) return 'Today';
  if (isUni(e)) return e.score != null ? `Done - ${e.score}${e.total ? '/' + e.total : ''}` : 'Done';
  return e.marked ? 'Marks saved' : 'Marks pending';
}

function drawList() {
  $('rows').innerHTML = exams.map(e => `<tr><td>${e.date}${e.time ? ' ' + e.time : ''}</td>
    <td><span class="badge ${isUni(e) ? 'inactive' : ''}">${isUni(e) ? 'UNI' : 'TUITION'}</span></td>
    <td>${esc(e.title)}</td><td>${esc(isUni(e) ? e.room || '-' : e.class)}</td><td>${e.total || '-'}</td>
    <td><span class="badge ${status(e) === 'Marks pending' ? 'inactive' : ''}">${status(e)}</span></td>
    <td>${isUni(e) ? `<button class="btn light" onclick="setScore('${e.id}')">My score</button>`
                   : `<button class="btn light" onclick="openMarks('${e.id}')">Marks</button>`}
    <button class="btn danger" onclick="delExam('${e.id}')">Delete</button></td></tr>`).join('')
    || '<tr><td colspan="7">No exams yet.</td></tr>';
}

$('f').addEventListener('submit', async ev => {
  ev.preventDefault();
  const u = $('type').value === 'uni';
  if (!$('title').value.trim() || !$('date').value) return toast('Fill the name and date', 'err');
  if (!u && !(+$('total').value > 0)) return toast('Enter total marks', 'err');
  const doc = { userId: USER.uid, type: u ? 'uni' : 'tuition', title: $('title').value.trim(),
    date: $('date').value, total: +$('total').value || 0 };
  if (u) Object.assign(doc, { time: $('time').value, room: $('room').value.trim() });
  else Object.assign(doc, { class: $('cls').value, marked: false });
  try { await db.collection('exams').add(doc); ev.target.reset(); toggle(); toast('Exam added'); }
  catch (ex) { toast(ex.message, 'err'); }
});

async function setScore(id) {
  const e = exams.find(x => x.id === id), v = prompt('Your score (leave empty to clear):', e.score ?? '');
  if (v === null) return;
  if (v !== '' && (isNaN(v) || +v < 0 || (e.total && +v > e.total))) return toast('Enter a valid score', 'err');
  try { await db.collection('exams').doc(id).update({ score: v === '' ? null : +v }); toast('Saved'); }
  catch (ex) { toast(ex.message, 'err'); }
}

async function openMarks(id) {
  cur = exams.find(e => e.id === id);
  try {
    const q = n => db.collection(n).where('userId', '==', USER.uid);
    const [s, a, m] = await Promise.all([
      q('students').where('class', '==', cur.class).get(),
      q('attendance').where('date', '==', cur.date).get(),
      q('examMarks').where('exam_id', '==', id).get()
    ]);
    stu = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.status === 'active')
      .sort((x, y) => x.roll.localeCompare(y.roll, undefined, { numeric: true }));
    att = {}; a.docs.forEach(d => att[d.data().student_id] = d.data().status);
    mk = {}; m.docs.forEach(d => mk[d.data().student_id] = d.data().marks);
    $('bt').textContent = `${cur.title} - ${cur.class} - ${cur.date} (out of ${cur.total})`;
    $('box').hidden = false; drawMarks();
    $('box').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { toast(e.message, 'err'); }
}

function drawMarks() {
  $('mrows').innerHTML = stu.map(s => {
    const a = att[s.id] || 'not marked', v = mk[s.id] ?? '';
    return `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td>
      <td><span class="badge ${a === 'present' ? '' : 'inactive'}">${a}</span></td>
      <td><input type="number" min="0" max="${cur.total}" value="${v}" data-id="${s.id}" style="width:100px" aria-label="Marks for ${esc(s.name)}"></td>
      <td>${v === '' ? '' : Math.round(v / cur.total * 100) + '%'}</td></tr>`;
  }).join('') || '<tr><td colspan="5">No active students in this class.</td></tr>';
  const vals = Object.values(mk).filter(v => v !== '' && v != null);
  $('cnt').textContent = vals.length;
  $('avg').textContent = vals.length ? (vals.reduce((t, v) => t + v, 0) / vals.length).toFixed(1) : '-';
  $('hi').textContent = vals.length ? Math.max(...vals) : '-';
}

$('save').onclick = async () => {
  const inputs = [...document.querySelectorAll('#mrows input')];
  for (const i of inputs) if (i.value !== '' && (+i.value < 0 || +i.value > cur.total)) return toast(`Marks must be between 0 and ${cur.total}`, 'err');
  try {
    const batch = db.batch();
    inputs.forEach(i => {
      const ref = db.collection('examMarks').doc(`${cur.id}_${i.dataset.id}`);
      if (i.value === '') { batch.delete(ref); delete mk[i.dataset.id]; }
      else { mk[i.dataset.id] = +i.value;
        batch.set(ref, { userId: USER.uid, exam_id: cur.id, student_id: i.dataset.id, marks: +i.value }); }
    });
    batch.update(db.collection('exams').doc(cur.id), { marked: Object.keys(mk).length > 0 });
    await batch.commit();
    toast('Marks saved'); drawMarks();
  } catch (e) { toast(e.message, 'err'); }
};

$('csv').onclick = () => exportCSV(stu.map(s => ({ roll: s.roll, name: s.name, class: s.class, exam: cur.title,
  exam_date: cur.date, attendance_on_exam_day: att[s.id] || 'not marked', marks: mk[s.id] ?? '', total: cur.total })),
  `${cur.title}-marks.csv`);

async function delExam(id) {
  if (!confirm('Delete this exam' + (isUni(exams.find(e => e.id === id)) ? '?' : ' and its marks?'))) return;
  try {
    const batch = db.batch();
    batch.delete(db.collection('exams').doc(id));
    (await db.collection('examMarks').where('userId', '==', USER.uid).where('exam_id', '==', id).get()).forEach(d => batch.delete(d.ref));
    await batch.commit();
    $('box').hidden = true; toast('Deleted');
  } catch (e) { toast(e.message, 'err'); }
}