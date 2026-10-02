let list = [];
const TEACHER_KEY = () => USER ? `tuitionflow_teacher_${USER.uid}` : 'tuitionflow_teacher';

(async () => {
  if (!await requireAuth()) return;
  $('month').value = localDate().slice(0, 7);
  $('teacher').value = localStorage.getItem(TEACHER_KEY()) || USER.displayName || '';
  $('saveTeacher').onclick = saveTeacher;
  $('month').onchange = load;
  load();
})();

function saveTeacher() {
  const name = $('teacher').value.trim();
  if (!name) return toast('Enter the teacher name first', 'err');
  localStorage.setItem(TEACHER_KEY(), name);
  toast('Teacher name saved');
}

async function load() {
  const m = $('month').value;
  const q = n => db.collection(n).where('userId', '==', USER.uid);
  try {
    const [st, py] = await Promise.all([
      q('students').get(),
      q('payments').where('month', '==', m).get()
    ]);
    const paid = new Set(py.docs.map(d => d.data().student_id));
    list = st.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(s => s.status === 'active')
      .map(s => ({ ...s, paid: paid.has(s.id) }));
    $('rows').innerHTML = list.map((s, i) => `<tr>
      <td><strong>${esc(s.name)}</strong></td><td>${esc(s.class)}</td><td>৳${esc(s.monthly_fee)}</td>
      <td><span class="badge ${s.paid ? '' : 'inactive'}">${s.paid ? 'Paid' : 'Unpaid'}</span></td>
      <td class="actions"><button class="btn light" onclick="inv(${i})">Invoice</button>
      <button class="btn" onclick="wa(${i})">WhatsApp</button></td></tr>`).join('')
      || '<tr><td colspan="5" class="empty">No active students.</td></tr>';
  } catch (e) {
    toast(`Invoices: ${e.message}`, 'err');
  }
}

function inv(i) {
  const s = list[i];
  if (!s) return toast('Invoice data not found', 'err');
  const m = $('month').value;
  const teacher = ($('teacher').value.trim() || USER.displayName || 'Teacher');
  const invoiceNo = `${m}-${s.roll || s.id.slice(0, 6).toUpperCase()}`;
  const w = window.open('', '_blank');
  if (!w) return toast('Please allow pop-ups to print the invoice', 'err');
  w.document.write(`<!doctype html><html><head><title>TuitionFlow Invoice</title>
    <style>
      *{box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f7fb;color:#0f172a;margin:0;padding:32px}
      .invoice{max-width:760px;margin:0 auto;background:rgba(255,255,255,.9);border:1px solid #dbe4f0;border-radius:24px;padding:38px;box-shadow:0 20px 60px rgba(15,23,42,.12)}
      .top{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #e2e8f0;padding-bottom:24px}.brand{font-size:26px;font-weight:800;color:#2563eb}.muted{color:#64748b}.row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid #eef2f7}.total{font-size:22px;font-weight:800}.status{display:inline-block;padding:6px 12px;border-radius:999px;background:${s.paid ? '#dcfce7' : '#fee2e2'};color:${s.paid ? '#166534' : '#991b1b'};font-weight:700}.footer{margin-top:28px;color:#64748b;font-size:13px}.print{margin-top:22px;padding:11px 18px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}@media print{body{background:#fff;padding:0}.invoice{box-shadow:none;border:0;max-width:none}.print{display:none}}
    </style></head><body><section class="invoice">
      <div class="top"><div><div class="brand">TuitionFlow</div><div class="muted">Tuition Fee Invoice</div></div><div style="text-align:right"><strong>Invoice #${esc(invoiceNo)}</strong><div class="muted">${esc(m)}</div></div></div>
      <div style="padding:22px 0"><div class="muted">Teacher</div><strong>${esc(teacher)}</strong></div>
      <div class="row"><span>Student</span><strong>${esc(s.name)}</strong></div>
      <div class="row"><span>Class</span><strong>${esc(s.class)}</strong></div>
      <div class="row"><span>Monthly fee</span><strong>৳${esc(s.monthly_fee)}</strong></div>
      <div class="row"><span>Status</span><span class="status">${s.paid ? 'PAID' : 'UNPAID'}</span></div>
      <div class="row total"><span>Total</span><span>৳${esc(s.monthly_fee)}</span></div>
      <div class="footer">Payment methods: Cash, Bkash, Nagad, Rocket or Bank Transfer.</div>
      <button class="print" onclick="print()">Print / Save PDF</button>
    </section></body></html>`);
  w.document.close();
}

function wa(i) {
  const s = list[i];
  if (!/^01\d{9}$/.test(s.phone || '')) return toast('Add a valid phone (01XXXXXXXXX) for this student first', 'err');
  const t = `Tuition fee for ${$('month').value}: ৳${s.monthly_fee} (${s.name}, ${s.class}). Status: ${s.paid ? 'Paid, thank you' : 'Unpaid'}.`;
  window.open(`https://wa.me/88${s.phone}?text=${encodeURIComponent(t)}`, '_blank');
}
