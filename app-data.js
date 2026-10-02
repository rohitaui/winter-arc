const tasks=[['move','Move','10–15 minutes of easy walking or movement'],['workout','Workout','Beginner full-body · ~25 min'],['food','Eat intentionally','Protein and balanced meals'],['deepWork','Deep work','Make time for one focused task'],['learn','Learn','Read, practise, or learn something new'],['sleep','Sleep','Protect 7–8 hours tonight']];
const CONFIG=window.WINTER_ARC_CONFIG||{};
const CLOUD_READY=!!(CONFIG.SUPABASE_URL&&CONFIG.SUPABASE_ANON_KEY&&!CONFIG.SUPABASE_ANON_KEY.includes('YOUR_')&&window.supabase);
const sb=CLOUD_READY?window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY):null;
const TOTAL_DAYS=92;
let cloudUser=null,authMode='signin',syncTimer=null,progressStatus='signedOut',accountGeneration=0,loadGeneration=0;
let profileData={name:'',gender:'',date_of_birth:'',height_feet:'',height_inches:'',weight_kg:''};
function emptyState(){return {tasks:{},days:{},rows:{},journals:{},journal:'',workouts:0,pending:{}}}
// The old unowned winterArc cache is preserved, but never imported into an account.
function readCache(id){try{const value=JSON.parse(localStorage.getItem('winterArc:v2:'+id)||'null');return value&&value.owner===id?{...emptyState(),...value}:emptyState()}catch{return emptyState()}}
function readGuestCache(){try{const value=JSON.parse(localStorage.getItem('winterArc:guest:v2')||'null');return value&&value.owner==='guest'?{...emptyState(),...value}:emptyState()}catch{return emptyState()}}
let state=readGuestCache();
function writeCache(){const key=cloudUser?'winterArc:v2:'+cloudUser.id:'winterArc:guest:v2',owner=cloudUser?.id||'guest';try{localStorage.setItem(key,JSON.stringify({...state,owner}))}catch{document.getElementById('cloudNotice').textContent='Device storage is unavailable. Keep this page open until your changes sync.'}}
function dayNumber(){return Math.max(1,Math.min(92,ArcProgress.dayNumber(ArcProgress.key())))}
function dateKey(n=dayNumber()){return ArcProgress.dayKey(n)}
function currentKey(){return ArcProgress.key()}
function isDone(k){return state.tasks[currentKey()+':'+k]===true}
function applyRows(rows){
 state.rows={};state.tasks={};state.days={};state.journals={};state.workouts=0;
 rows.forEach(raw=>{const row=ArcProgress.normalize(raw);if(!row)return;state.rows[row.date]=row;state.days[row.date]=!!row.completed;state.journals[row.date]=row.journal||'';Object.entries(row.habits).forEach(([k,v])=>state.tasks[row.date+':'+k]=v===true);if(row.workout_completed)state.workouts++});
 state.journal=state.journals[currentKey()]||'';
}
function cloudDayPayload(date=currentKey()){
 const existing=state.rows[date];
 const habits={...(existing?.habits||{})};
 tasks.forEach(([k])=>{const value=state.tasks[`${date}:${k}`];if(date===currentKey()||value!==undefined)habits[k]=date===currentKey()?isDone(k):value===true});
 const journal=date===currentKey()?state.journal||'':state.journals[date]??existing?.journal??'';
 return {user_id:cloudUser?.id||null,day_number:ArcProgress.dayNumber(date),date,completed:tasks.every(([k])=>habits[k]===true),workout_completed:habits.workout===true,habits,journal};
}
function editableToday(){
 if(!cloudUser){if(currentKey()<ArcProgress.START||currentKey()>ArcProgress.END){toast('Check-ins are available October 1–December 31.');return false}return true}
 if(progressStatus==='loading'){toast('Your progress is still loading.');return false}
 if(progressStatus==='error'){toast('Retry loading your progress before making more changes.');return false}
 if(currentKey()<ArcProgress.START||currentKey()>ArcProgress.END){toast('Check-ins are available October 1–December 31.');return false}
 return true;
}
function saveLocal(){writeCache();render()}
function queueSync(date=currentKey()){
 if(!cloudUser){writeCache();document.getElementById('cloudNotice').textContent='Saved on this device. Sign in to sync across devices.';return}
 if(progressStatus!=='ready'||date<ArcProgress.START||date>currentKey()||date>ArcProgress.END)return;
 const payload=cloudDayPayload(date);state.rows[payload.date]=payload;state.journals[payload.date]=payload.journal;state.pending[payload.date]=payload;
 writeCache();document.getElementById('cloudNotice').textContent='Saving your changes…';
 clearTimeout(syncTimer);syncTimer=setTimeout(syncCloud,500);
}
function save(){queueSync();render()}
const syncJobs=new Map();
async function syncCloud(){
 if(!sb||!cloudUser)return;
 const id=cloudUser.id,generation=accountGeneration;
 if(syncJobs.has(generation))return syncJobs.get(generation);
 const job=(async()=>{
  while(cloudUser?.id===id&&generation===accountGeneration){
   const entry=Object.entries(state.pending)[0];if(!entry)break;
   const [date,payload]=entry;
   try{
    const {error}=await sb.from('arc_days').upsert(payload,{onConflict:'user_id,day_number'});if(error)throw error;
    if(cloudUser?.id!==id||generation!==accountGeneration)return;
    if(state.pending[date]===payload)delete state.pending[date];writeCache();
   }catch(error){
    if(cloudUser?.id===id&&generation===accountGeneration){progressStatus='error';document.getElementById('cloudNotice').textContent='Sync failed. Your changes are saved on this device. Retry from Progress.';renderProgress()}
    return;
   }
  }
  if(cloudUser?.id===id&&generation===accountGeneration){document.getElementById('cloudNotice').textContent='All changes saved.';renderProgress()}
 })();syncJobs.set(generation,job);try{await job}finally{syncJobs.delete(generation)}
}
async function loadCloud(){
 if(!sb||!cloudUser)return;
 const id=cloudUser.id,generation=accountGeneration,request=++loadGeneration;
 progressStatus='loading';renderProgress();
 try{
  const {data,error}=await sb.from('arc_days').select('*').eq('user_id',id).order('day_number');if(error)throw error;
  if(cloudUser?.id!==id||generation!==accountGeneration||request!==loadGeneration)return;
  const pending=state.pending;
  const rows=new Map((data||[]).filter(r=>r.user_id===id).map(r=>[r.day_number,r]));
  Object.values(pending).filter(r=>r.user_id===id).forEach(r=>rows.set(r.day_number,r));
  applyRows([...rows.values()]);state.pending=pending;progressStatus='ready';writeCache();render();
  if(Object.keys(pending).length)await syncCloud();
 }catch(error){
  if(cloudUser?.id===id&&generation===accountGeneration&&request===loadGeneration){progressStatus='error';renderProgress()}
 }
}
function toggle(k){
 if(!editableToday())return;
 state.tasks[currentKey()+':'+k]=!isDone(k);
 state.days[currentKey()]=tasks.every(([id])=>isDone(id));
 save();toast(isDone(k)?'Nice. Keep going.':'Unchecked. No pressure.');
}
function togglePastDay(date,k){
 if(date>=currentKey()||date<ArcProgress.START||date>ArcProgress.END)return;
 if(cloudUser&&progressStatus!=='ready'){toast(progressStatus==='loading'?'Your progress is still loading.':'Retry loading your progress before making more changes.');return}
 const key=`${date}:${k}`;
 state.tasks[key]=state.tasks[key]!==true;
 state.days[date]=tasks.every(([id])=>state.tasks[`${date}:${id}`]===true);
 const payload=cloudDayPayload(date);state.rows[date]=payload;state.journals[date]=payload.journal;
 queueSync(date);render();showDayDetails(date);
 toast(cloudUser?'Past check-in saved & syncing':'Past check-in saved on this device.');
}
function applySession(session){
 const user=session?.user||null;
 if(user?.id===cloudUser?.id){if(!user)renderProgress();return}
 clearTimeout(syncTimer);accountGeneration++;loadGeneration++;
 const loaded=user?readCache(user.id):readGuestCache();
 cloudUser=user;
 // Only pending drafts are read from account caches. Cloud remains the source of history.
 const pending=Object.fromEntries(Object.entries(loaded.pending||{}).filter(([,r])=>user&&r.user_id===user.id));
 state=user?emptyState():loaded;state.pending=pending;
 profileData={name:'',gender:'',date_of_birth:'',height_feet:'',height_inches:'',weight_kg:''};
 progressStatus=user?'loading':'signedOut';
 document.getElementById('dayDetails').close();document.getElementById('cloudNotice').textContent='';
 render();
 if(user){closeAuth();loadCloud();loadProfile()}else openAuth();
}
