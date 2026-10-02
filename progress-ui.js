function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function displayDate(date,options={month:'short',day:'numeric'}){return new Intl.DateTimeFormat('en',options).format(new Date(date+'T12:00:00'))}
function dashboardRows(){return Object.values(state.rows||{})}
function dashboardBar(percent,label){return `<div class="dashboard-bar" role="progressbar" aria-label="${escapeText(label)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div>`}
function todayCopy(day){
 const phase=day<=31?{name:'Foundation',title:'Build the foundation.',guidance:'Keep the routine simple and repeatable.'}:day<=61?{name:'Build',title:'Build with consistency.',guidance:'Stay steady and focus on sustainable progress.'}:{name:'Transform',title:'Finish strong.',guidance:'Keep showing up and protect your recovery.'};
 return {title:phase.title,guidance:day===1?'Day 1 is deliberately easy. Your only job today is to show up.':`Day ${day} of 92 · ${phase.name} phase. ${phase.guidance}`};
}
function renderProgress(){
 const n=dayNumber();
 const copy=todayCopy(n);
 document.getElementById('todayHeadline').textContent=copy.title;
 document.getElementById('todayGuidance').textContent=copy.guidance;
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
 const strengthWeek=availableWeek.filter(d=>ArcWorkoutPlan.forDate(d.date).mode==='strength');
 const weekWorkouts=strengthWeek.filter(d=>d.row?.workout_completed).length;
 const weekHabits=availableWeek.reduce((sum,d)=>sum+d.count,0);
 const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 const empty=!m.days.some(d=>d.row&&(d.count||d.row.completed||d.row.journal));
 document.getElementById('progressIntro').textContent=m.available===0?'Your arc begins October 1. A fresh start is ahead.':empty?"You're just getting started. Complete today's minimums to begin building your streak.":'Small wins, made visible. Keep showing up for yourself.';
 const availability=m.available===0?'Starts October 1':m.today>ArcProgress.END?'Arc finished':`Day ${m.arcDay} of 92`;
 root.innerHTML=`<div class="dashboard-grid">
  <article class="card"><div class="dashboard-head"><h3>Your Winter Arc</h3><span>${availability}</span></div><div class="dashboard-number">${m.percent}% <small>of available days complete</small></div>${dashboardBar(m.percent,'Overall completion')}<div class="dashboard-meta"><div><b>${m.completed}</b>${m.completed===1?'day':'days'} completed</div><div><b>${m.available}</b>${m.available===1?'day':'days'} available</div><div><b>${m.remaining}</b>${m.remaining===1?'day':'days'} ahead</div></div><p class="dashboard-note">${m.completed} of ${m.available} available days complete · October 1 – December 31.<br>Future days never count against you.</p></article>
  <article class="card"><div class="dashboard-head"><h3>Keep the rhythm</h3><span>Never miss twice</span></div><div class="streak-values"><div><div class="dashboard-number">${m.current}</div><span>Current streak · days</span></div><div><div class="dashboard-number">${m.best}</div><span>Best streak · days</span></div></div><p class="dashboard-note">${m.current?'One day at a time. Keep your streak going.':'Every return counts. Your next completed day is a fresh start.'}<br>An unfinished today won’t break yesterday’s streak.</p></article>
  <article class="card dashboard-wide"><div class="dashboard-head"><h3>This week</h3><span>${displayDate(m.week[0].date)} – ${displayDate(m.week[6].date)}</span></div><div class="week-summary"><span><b>${weekCompleted}/${availableWeek.length}</b> days complete</span><span><b>${weekWorkouts}/${strengthWeek.length}</b> strength sessions</span><span><b>${weekHabits}/${availableWeek.length*6}</b> habits checked</span></div><div class="dashboard-week">${m.week.map((d,i)=>{const mode=ArcWorkoutPlan.forDate(d.date).mode;const label=mode==='strength'?'Strength':mode==='recovery'?'Recovery':'—';return `<button class="dashboard-day ${d.date===m.today?'is-today':''} ${d.status==='Complete'?'is-complete':''}" data-progress-date="${d.date}" ${!d.inArc||d.future?'disabled':''} aria-label="${displayDate(d.date,{weekday:'long',month:'long',day:'numeric'})}, ${label}, ${d.status}, ${d.count} of 6 habits"><span class="weekday">${weekday[i]}</span><strong>${Number(d.date.slice(-2))}</strong><span class="day-status">${d.status==='Outside arc'?'Not in arc':d.status}</span><small>${!d.inArc||d.future?'—':`${label} ${d.row?.workout_completed?'✓':'—'}<br>${d.count}/6 habits`}</small></button>`}).join('')}</div><p class="dashboard-note">Strength is scheduled Tuesday, Thursday, and Saturday. Recovery fills the other days. Tap a day for its check-ins and journal.</p></article>
  <article class="card"><div class="dashboard-head"><h3>Habit consistency</h3><span>Days checked</span></div>${m.habits.map(h=>`<div class="habit-row"><div class="habit-label"><b>${h.label}</b><span>${h.count}/${m.available} · ${h.percent}%</span></div>${dashboardBar(h.percent,h.label)}</div>`).join('')}<p class="dashboard-note">Move includes previous Walk check-ins. New habits have no assumed past check-ins.</p></article>
  <article class="card"><div class="dashboard-head"><h3>Three phases. One arc.</h3></div>${m.phases.map(p=>`<div class="phase-row"><div class="phase-heading"><b>${p.name}</b><span>${p.available?p.percent+'%':'Upcoming'}</span></div><p>${displayDate(p.start)} – ${displayDate(ArcProgress.shift(p.start,p.total-1))} · ${p.total} days</p>${dashboardBar(p.percent,p.name)}<p class="dashboard-note">${p.count}/${p.total} days complete · ${p.available} available so far</p></div>`).join('')}</article>
  <article class="card dashboard-wide"><div class="dashboard-head"><h3>Recent activity</h3><span>Latest seven available days</span></div>${m.recent.length?m.recent.map(d=>`<button class="activity-button" data-progress-date="${d.date}"><span><strong>Day ${d.number} · ${displayDate(d.date,{weekday:'short',month:'short',day:'numeric'})}</strong><small>${d.count}/6 habits checked${d.row?.journal?' · Journal saved':''}</small></span><span class="activity-status ${d.status==='Complete'?'complete':''}">${d.status} ›</span></button>`).join(''):'<p class="dashboard-note">Your story starts October 1. Your daily activity will appear here.</p>'}</article>
 </div>`;
 root.querySelectorAll('[data-progress-date]').forEach(b=>b.onclick=()=>showDayDetails(b.dataset.progressDate));
}
function showDayDetails(date){
 if(date<ArcProgress.START||date>currentKey()||date>ArcProgress.END)return;
 if(cloudUser&&progressStatus!=='ready'){toast(progressStatus==='loading'?'Your progress is still loading.':'Retry loading your progress before making more changes.');return}
 const editable=date<currentKey();
 const checked=tasks.filter(([id])=>state.tasks[`${date}:${id}`]===true).length;
 const status=checked===tasks.length?'Complete':checked?`${checked} of ${tasks.length} checked in`:'No check-ins yet';
 const dialog=document.getElementById('dayDetails');
 document.getElementById('detailTitle').textContent=`Day ${ArcProgress.dayNumber(date)} · ${displayDate(date,{weekday:'long',month:'long',day:'numeric'})}`;
 document.getElementById('detailStatus').textContent=`${editable?'PAST DAY':'TODAY'} · ${status.toUpperCase()}`;
 document.getElementById('detailHelp').textContent=editable?'Update this day’s check-ins. Changes save automatically.':'Today’s check-ins can be changed on the Today page.';
 document.getElementById('detailHabits').innerHTML=tasks.map(([id,name])=>{const label=id==='workout'?(ArcWorkoutPlan.forDate(date).mode==='strength'?'Strength session':'Recovery'):name,done=state.tasks[`${date}:${id}`]===true,recorded=state.tasks[`${date}:${id}`]!==undefined;return `<li><div><b>${label}</b><span class="detail-state">${done?'Checked in':recorded?'Not checked':'Not recorded'}</span></div>${editable?`<button type="button" data-history-task="${id}" aria-pressed="${done}">${done?'Unmark':'Mark'}</button>`:''}</li>`}).join('')+(state.rows[date]?.habits?.water!==undefined?`<li><div><b>Water (previous habit)</b><span class="detail-state">${state.rows[date].habits.water?'Checked in':'Not checked'}</span></div></li>`:'');
 document.getElementById('detailJournal').textContent=state.journals[date]||(date===currentKey()?state.journal:'')||state.rows[date]?.journal||'No journal entry for this day.';
 document.querySelectorAll('#detailHabits [data-history-task]').forEach(button=>button.onclick=()=>togglePastDay(date,button.dataset.historyTask));
 if(!dialog.open)dialog.showModal();
}
