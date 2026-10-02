let students = [], pays = [];

(async () => {
  if (!await requireAuth()) return;
  $('method').innerHTML = METHODS.map(m => `<option>${m}</option>`).join('');
  $('month').value = localDate().slice(0, 7);
  const snap = await db.collection('students').where('userId', '==', USER.uid).get();
  students = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.status === 'active');
  $('stu').innerHTML = '<option value="">Select student</option>' +
    students.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.class)})</option>`).join('');
  $('stu').onchange = () => { const s = students.find(x => x.id === $('stu').value); if (s) $('amt').value = s.monthly_fee; };
  $('month').onchange = load;
  load();
})();

async function load() {
  try {
    const snap = await db.collection('payments').where('userId', '==', USER.uid).where('month', '==', $('month').value).get();
    pays = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.paid_on.localeCompare(a.paid_on));
    $('total').textContent = '৳' + pays.reduce((a, p) => a + p.amount, 0);
    $('rows').innerHTML = pays.map((p, i) => `<tr><td>${p.paid_on}</td><td>${esc(p.student_name)}</td>
      <td>৳${p.amount}</td><td>${esc(p.method)}</td>
      <td><button class="btn light" onclick="receipt(${i})">Receipt</button></td></tr>`).join('')
      || '<tr><td colspan="5">No payments for this month.</td></tr>';
  } catch (e) { toast(e.message, 'err'); }
}

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const s = students.find(x => x.id === $('stu').value);
  if (!s || !(+$('amt').value > 0) || !$('month').value) return toast('Choose a student, amount and month', 'err');
  try {
    await db.collection('payments').add({
      userId: USER.uid, student_id: s.id, student_name: s.name, class: s.class,
      amount: +$('amt').value, method: $('method').value, month: $('month').value, paid_on: localDate()
    });
    toast('Payment recorded'); $('amt').value = ''; load();
  } catch (ex) { toast(ex.message, 'err'); }
});

function receipt(i) {
  const p = pays[i], w = window.open('', '_blank');
  w.document.write(`<title>Receipt</title><body style="font-family:system-ui;max-width:420px;margin:40px auto;line-height:1.8">
    <h2>Payment Receipt</h2><p>No: ${p.id.slice(0, 8).toUpperCase()}</p>
    <p>Student: <b>${esc(p.student_name)}</b> (${esc(p.class)})</p>
    <p>Month: ${p.month}</p><p>Amount: <b>৳${p.amount}</b> via ${esc(p.method)}</p>
    <p>Date: ${p.paid_on}</p><script>print()<\/script>`);
  w.document.close();
}

$('csv').onclick = () => exportCSV(pays.map(p => ({ date: p.paid_on, student: p.student_name, class: p.class, amount: p.amount, method: p.method, month: p.month })), 'payments.csv');