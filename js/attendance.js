const LABEL = { present: 'P', absent: 'A', late: 'L', missed: 'M' };
let all = [], students = [], marks = {}, holiday = null;

(async () => {
  if (!await requireAuth()) return;
  $('cls').innerHTML = '<option value="">All classes</option>' + CLASSES.map(c => `<option>${c}</option>`).join('');
  $('date').value = localDate();
  $('rm').value = localDate().slice(0, 7);
  const snap = await db.collection('students').where('userId', '==', USER.uid).get();
  all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.status === 'active')
    .sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }) ||
                    a.roll.localeCompare(b.roll, undefined, { numeric: true }));
  $('rs').innerHTML = '<option value="">Select student</option>' +
    all.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.class)})</option>`).join('');
  $('date').onchange = $('cls').onchange = load;
  $('rs').onchange = $('rm').onchange = rec;
  $('all').onclick = markAll;
  load();
})();

async function load() {
  const date = $('date').value, cls = $('cls').value;
  if (!date) return;
  try {
    const q = n => db.collection(n).where('userId', '==', USER.uid);
    const [at, ho] = await Promise.all([q('attendance').where('date', '==', date).get(), q('holidays').where('date', '==', date).get()]);
    students = all.filter(s => !cls || s.class === cls);
    marks = {}; at.docs.forEach(d => marks[d.data().student_id] = d.data().status);
    holiday = ho.empty ? null : ho.docs[0].data().reason;
    render();
  } catch (e) { toast(e.message, 'err'); }
}

function render() {
  $('note').textContent = holiday ? `Holiday: ${holiday}. Attendance is disabled for this date.` : '';
  $('all').disabled = !!holiday;
  $('rows').innerHTML = students.map(s => `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.class)}</td>
    <td><div class="seg">${Object.keys(LABEL).map(v =>
      `<button class="btn ${marks[s.id] === v ? 'on-' + v : ''}" ${holiday ? 'disabled' : ''}
        aria-label="${v}" title="${v}" onclick="mark('${s.id}','${v}')">${LABEL[v]}</button>`).join('')}</div></td>
    <td><button class="btn light" onclick="openRec('${s.id}')">Record</button></td></tr>`).join('')
    || '<tr><td colspan="5">No active students found.</td></tr>';
}

function save(s, status) {
  const date = $('date').value;
  return db.collection('attendance').doc(`${s.id}_${date}`).set({
    userId: USER.uid, student_id: s.id, student_name: s.name, class: s.class, date, status }, { merge: true });
}

async function mark(id, status) {
  try {
    await save(students.find(s => s.id === id), status);
    marks[id] = status; render();
    if ($('rs').value === id) rec();
  } catch (e) { toast(e.message, 'err'); }
}

async function markAll() {
  try {
    await Promise.all(students.map(s => save(s, 'present')));
    students.forEach(s => marks[s.id] = 'present');
    render(); toast('All marked present');
    if ($('rs').value) rec();
  } catch (e) { toast(e.message, 'err'); }
}

function openRec(id) {
  $('rs').value = id; rec();
  $('recTop').scrollIntoView({ behavior: 'smooth' });
}

const pctOf = r => {
  const n = r.filter(x => x.status === 'present').length + r.filter(x => x.status === 'late').length;
  const t = n + r.filter(x => x.status === 'absent').length;
  return t ? Math.round(n / t * 100) + '%' : '-';
};

async function rec() {
  const id = $('rs').value, m = $('rm').value;
  $('rec').hidden = !id;
  if (!id || !m) return;
  try {
    const snap = await db.collection('attendance').where('userId', '==', USER.uid).where('student_id', '==', id).get();
    const every = snap.docs.map(d => d.data());
    const r = every.filter(x => x.date.startsWith(m)).sort((a, b) => a.date.localeCompare(b.date));
    const c = s => r.filter(x => x.status === s).length;
    $('rp').textContent = c('present'); $('rl').textContent = c('late');
    $('ra').textContent = c('absent'); $('rmi').textContent = c('missed');
    $('rpct').textContent = pctOf(r); $('rall').textContent = pctOf(every);
    $('rname').textContent = `${all.find(s => s.id === id).name} - ${m}`;
    $('rdays').innerHTML = r.map(x => {
      const d = new Date(x.date + 'T00:00:00');
      return `<span class="chk">${x.date.slice(8)} ${DAYS[d.getDay()].slice(0, 3)} - ${x.status}</span>`;
    }).join('') || 'No records this month.';
  } catch (e) { toast(e.message, 'err'); }
}