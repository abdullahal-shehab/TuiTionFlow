let all = [];

(async () => {
  if (!await requireAuth()) return;
  const opts = CLASSES.map(c => `<option>${c}</option>`).join('');
  $('cls').innerHTML = opts;
  $('fc').insertAdjacentHTML('beforeend', opts);
  ['q', 'fc', 'fs', 'so'].forEach(id => $(id).addEventListener('input', render));
  load();
})();

async function load() {
  try {
    const snap = await db.collection('students').where('userId', '==', USER.uid).get();
    all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  } catch (e) { toast(e.message, 'err'); }
}

function render() {
  const q = $('q').value.toLowerCase(), c = $('fc').value, s = $('fs').value;
  const list = all.filter(x =>
    (!c || x.class === c) && (!s || x.status === s) &&
    (!q || x.name.toLowerCase().includes(q) || x.roll.toLowerCase().includes(q)));
  list.sort($('so').value === 'fee'
    ? (a, b) => b.monthly_fee - a.monthly_fee
    : (a, b) => a.name.localeCompare(b.name));
  $('rows').innerHTML = list.map(x => `<tr>
    <td>${esc(x.roll)}</td><td>${esc(x.name)}</td><td>${esc(x.class)}</td><td>${esc(x.phone)}</td>
    <td>৳${x.monthly_fee}</td>
    <td><span class="badge ${x.status}">${x.status}</span></td>
    <td>
      <button class="btn light" onclick="toggle('${x.id}')">${x.status === 'active' ? 'Deactivate' : 'Activate'}</button>
      <button class="btn danger" onclick="del('${x.id}')">Delete</button>
    </td></tr>`).join('') || '<tr><td colspan="7">No students found.</td></tr>';
}

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  if (!e.target.checkValidity()) return toast('Please fill all required fields correctly', 'err');
  const roll = $('roll').value.trim(), cls = $('cls').value;
  if (all.some(s => s.roll === roll && s.class === cls)) return toast('This roll already exists in that class', 'err');
  try {
    await db.collection('students').add({
      userId: USER.uid, name: $('name').value.trim(), roll, class: cls,
      phone: $('phone').value, monthly_fee: +$('fee').value, status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    e.target.reset(); toast('Student added'); load();
  } catch (ex) { toast(ex.message, 'err'); }
});

async function toggle(id) {
  const s = all.find(x => x.id === id);
  try {
    await db.collection('students').doc(id).update({ status: s.status === 'active' ? 'inactive' : 'active' });
    load();
  } catch (ex) { toast(ex.message, 'err'); }
}

async function del(id) {
  if (!confirm('Delete this student and all their records?')) return;
  try {
    const batch = db.batch();
    batch.delete(db.collection('students').doc(id));
    for (const col of ['attendance', 'payments', 'feedback']) {
      const s = await db.collection(col).where('userId', '==', USER.uid).where('student_id', '==', id).get();
      s.forEach(d => batch.delete(d.ref));
    }
    await batch.commit();
    toast('Deleted'); load();
  } catch (ex) { toast(ex.message, 'err'); }
}

$('csv').onclick = () => exportCSV(
  all.map(({ name, roll, class: c, phone, monthly_fee, status }) => ({ name, roll, class: c, phone, monthly_fee, status })),
  'students.csv');