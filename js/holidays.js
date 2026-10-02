let list = [];

(async () => {
  if (!await requireAuth()) return;
  load();
})();

async function load() {
  try {
    const snap = await db.collection('holidays').where('userId', '==', USER.uid).get();
    list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date));
    $('rows').innerHTML = list.map(h => `<tr><td>${h.date}</td><td>${esc(h.reason)}</td>
      <td><button class="btn danger" onclick="del('${h.id}')">Remove</button></td></tr>`).join('')
      || '<tr><td colspan="3">No holidays yet.</td></tr>';
  } catch (e) { toast(e.message, 'err'); }
}

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const date = $('date').value, reason = $('reason').value.trim();
  if (!date || !reason) return toast('Enter a date and a reason', 'err');
  if (list.some(h => h.date === date)) return toast('That date is already a holiday', 'err');
  try {
    await db.collection('holidays').add({ userId: USER.uid, date, reason });
    e.target.reset(); toast('Holiday added'); load();
  } catch (ex) { toast(ex.message, 'err'); }
});

async function del(id) {
  try { await db.collection('holidays').doc(id).delete(); toast('Removed'); load(); }
  catch (ex) { toast(ex.message, 'err'); }
}