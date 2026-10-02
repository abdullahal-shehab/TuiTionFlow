let students = [];
(async () => {
  if (!await requireAuth()) return;
  const snap = await db.collection('students').where('userId', '==', USER.uid).get();
  students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  $('stu').innerHTML = '<option value="">Select student</option>' + students.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.class)})</option>`).join('');
  db.collection('feedback').where('userId', '==', USER.uid).onSnapshot(sn => {
    const l = sn.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.localeCompare(a.date));
    $('avg').textContent = l.length ? (l.reduce((t, x) => t + x.rating, 0) / l.length).toFixed(1) + ' / 5' : '-';
    $('rows').innerHTML = l.map(x => `<tr><td>${x.date}</td><td>${esc(x.student_name)}</td><td>${x.from}</td>
      <td>${'★'.repeat(x.rating)}</td><td style="white-space:normal">${esc(x.comment)}</td>
      <td><button class="btn danger" onclick="del('${x.id}')">Delete</button></td></tr>`).join('') || '<tr><td colspan="6">No feedback yet.</td></tr>';
  }, e => toast(e.message, 'err'));
})();

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const s = students.find(x => x.id === $('stu').value);
  if (!s) return toast('Select a student', 'err');
  try {
    await db.collection('feedback').add({ userId: USER.uid, student_id: s.id, student_name: s.name, from: $('from').value,
      rating: +$('rate').value, comment: $('txt').value.trim(), date: localDate() });
    e.target.reset(); toast('Saved');
  } catch (ex) { toast(ex.message, 'err'); }
});
const del = id => db.collection('feedback').doc(id).delete().then(() => toast('Deleted')).catch(e => toast(e.message, 'err'));