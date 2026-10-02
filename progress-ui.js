function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function displayDate(date,options={month:'short',day:'numeric'}){return new Intl.DateTimeFormat('en',options).format(new Date(date+'T12:00:00'))}
function dashboardRows(){return Object.values(state.rows||{})}
function dashboardBar(percent,label){return `<div class="dashboard-bar" role="progressbar" aria-label="${escapeText(label)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div>`}
function renderProgress(){
 const n=dayNumber();
 document.getElementById('sideProgress').textContent=`Day ${n} / 92`;
 document.getElementById('sideBar').style.width=Math.min(100,Math.round(n/92*100))+'%';
 document.querySelector('#today .hero .eyebrow').textContent=displayDate(ArcProgress.key(),{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 document.querySelector('.date').textContent=`WINTER ARC ${String(n).padStart(2,'0')} / 92`;
 document.querySelector('#journal .card-head h3').textContent=`Day ${n} journal`;
 const root=document.getElementById('progressContent');
 if(!cloudUser){root.innerHTML='<div class="progress-message"><h3>Your progress, in one place.</h3><p>Sign in to see your saved Winter Arc.</p><button class="primary" id="progressSignIn">Sign in</button></div>';document.getElementById('progressSignIn').onclick=openAuth;return}
 if(progressStatus==='loading'){
  root.setAttribute('aria-busy','true');root.innerHTML='<p role="status" class="muted">Loading your progress…</p><div class="dashboard-skeleton" aria-hidden="true">'+Array.from({length:6},()=>'<div class="skeleton-card"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>').join('')+'</div>';return;
 }
 root.removeAttribute('aria-busy');
 if(progressStatus==='error'){
  root.innerHTML='<div class="progress-message" role="alert"><h3>We couldn\'t load your progress. Please try again.</h3><p>Your saved progress has not been replaced. Any unsynced changes are kept on this device for your account.</p><button class="primary" id="progressRetry">Retry</button></div>';document.getElementById('progressRetry').onclick=loadCloud;return;
 }
 const m=ArcProgress.build(dashboardRows());
 const availableWeek=m.week.filter(d=>d.inArc&&!d.future);
 const weekCompleted=availableWeek.filter(d=>d.status==='Complete').length;
 const weekWorkouts=availableWeek.filter(d=>d.row?.workout_completed).length;
 const weekHabits=availableWeek.reduce((sum,d)=>sum+d.count,0);
 const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 const empty=!m.days.some(d=>d.row&&(d.count||d.row.completed||d.row.journal));
 document.getElementById('progressIntro').textContent=m.available===0?'Your arc begins October 1. A fresh start is ahead.':empty?"You're just getting started. Complete today's minimums to begin building your streak.":'Small wins, made visible. Keep showing up for yourself.';
 const availability=m.available===0?'Starts October 1':m.today>ArcProgress.END?'Arc finished':`Day ${m.arcDay} of 92`;
 root.innerHTML=`<div class="dashboard-grid">
  <article class="card"><div class="dashboard-head"><h3>Your Winter Arc</h3><span>${availability}</span></div><div class="dashboard-number">${m.percent}% <small>of available days complete</small></div>${dashboardBar(m.percent,'Overall completion')}<div class="dashboard-meta"><div><b>${m.completed}</b>${m.completed===1?'day':'days'} completed</div><div><b>${m.available}</b>${m.available===1?'day':'days'} available</div><div><b>${m.remaining}</b>${m.remaining===1?'day':'days'} ahead</div></div><p class="dashboard-note">${m.completed} of ${m.available} available days complete · October 1 – December 31.<br>Future days never count against you.</p></article>
  <article class="card"><div class="dashboard-head"><h3>Keep the rhythm</h3><span>Never miss twice</span></div><div class="streak-values"><div><div class="dashboard-number">${m.current}</div><span>Current streak · days</span></div><div><div class="dashboard-number">${m.best}</div><span>Best streak · days</span></div></div><p class="dashboard-note">${m.current?'One day at a time. Keep your streak going.':'Every return counts. Your next completed day is a fresh start.'}<br>An unfinished today won’t break yesterday’s streak.</p></article>
  <article class="card dashboard-wide"><div class="dashboard-head"><h3>This week</h3><span>${displayDate(m.week[0].date)} – ${displayDate(m.week[6].date)}</span></div><div class="week-summary"><span><b>${weekCompleted}/${availableWeek.length}</b> days complete</span><span><b>${weekWorkouts}/${availableWeek.length}</b> workouts</span><span><b>${weekHabits}/${availableWeek.length*6}</b> habits checked</span></div><div class="dashboard-week">${m.week.map((d,i)=>`<button class="dashboard-day ${d.date===m.today?'is-today':''} ${d.status==='Complete'?'is-complete':''}" data-progress-date="${d.date}" ${!d.inArc||d.future?'disabled':''} aria-label="${displayDate(d.date,{weekday:'long',month:'long',day:'numeric'})}, ${d.status}, ${d.count} of 6 habits"><span class="weekday">${weekday[i]}</span><strong>${Number(d.date.slice(-2))}</strong><span class="day-status">${d.status==='Outside arc'?'Not in arc':d.status}</span><small>${!d.inArc||d.future?'—':`Workout ${d.row?.workout_completed?'✓':'—'}<br>${d.count}/6 habits`}</small></button>`).join('')}</div><p class="dashboard-note">Tap a day to see its habits and journal. Today is still in progress.</p></article>
  <article class="card"><div class="dashboard-head"><h3>Habit consistency</h3><span>Days checked</span></div>${m.habits.map(h=>`<div class="habit-row"><div class="habit-label"><b>${h.label}</b><span>${h.count}/${m.available} · ${h.percent}%</span></div>${dashboardBar(h.percent,h.label)}</div>`).join('')}<p class="dashboard-note">Move includes previous Walk check-ins. New habits have no assumed past check-ins.</p></article>
  <article class="card"><div class="dashboard-head"><h3>Three phases. One arc.</h3></div>${m.phases.map(p=>`<div class="phase-row"><div class="phase-heading"><b>${p.name}</b><span>${p.available?p.percent+'%':'Upcoming'}</span></div><p>${displayDate(p.start)} – ${displayDate(ArcProgress.shift(p.start,p.total-1))} · ${p.total} days</p>${dashboardBar(p.percent,p.name)}<p class="dashboard-note">${p.count}/${p.total} days complete · ${p.available} available so far</p></div>`).join('')}</article>
  <article class="card dashboard-wide"><div class="dashboard-head"><h3>Recent activity</h3><span>Latest seven available days</span></div>${m.recent.length?m.recent.map(d=>`<button class="activity-button" data-progress-date="${d.date}"><span><strong>Day ${d.number} · ${displayDate(d.date,{weekday:'short',month:'short',day:'numeric'})}</strong><small>${d.count}/6 habits checked${d.row?.journal?' · Journal saved':''}</small></span><span class="activity-status ${d.status==='Complete'?'complete':''}">${d.status} ›</span></button>`).join(''):'<p class="dashboard-note">Your story starts October 1. Your daily activity will appear here.</p>'}</article>
 </div>`;
 root.querySelectorAll('[data-progress-date]').forEach(b=>b.onclick=()=>showDayDetails(b.dataset.progressDate));
}
function showDayDetails(date){
 if(!cloudUser||progressStatus!=='ready')return;
 const d=ArcProgress.build(dashboardRows()).day(date);if(!d.inArc||d.future)return;
 const dialog=document.getElementById('dayDetails');
 document.getElementById('detailTitle').textContent=`Day ${d.number} · ${displayDate(date)}`;
 document.getElementById('detailStatus').textContent=d.status;
 document.getElementById('detailHabits').innerHTML=ArcProgress.habits.map(([id,name])=>`<li><b>${name}</b><span>${d.row?.habits[id]===true?'✓ Done':d.row?.habits[id]===false?'Not checked':'Not recorded'}</span></li>`).join('')+(d.row?.habits.water!==undefined?`<li><b>Water (previous habit)</b><span>${d.row.habits.water?'✓ Done':'Not checked'}</span></li>`:'');
 document.getElementById('detailJournal').textContent=d.row?.journal||'No journal entry for this day.';
 dialog.showModal();
}
