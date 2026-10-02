/* Calendar-only arithmetic avoids timezone and daylight-saving shifts. */
(function(root){
 'use strict';
 const START='2026-10-01',END='2026-12-31',TOTAL=92;
 const habits=[['move','Move'],['workout','Workout'],['food','Eat intentionally'],['deepWork','Deep work'],['learn','Learn'],['sleep','Sleep']];
 function key(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
 function ordinal(date){return Date.parse(date+'T12:00:00Z')/86400000}
 function shift(date,n){return new Date((ordinal(date)+n)*86400000).toISOString().slice(0,10)}
 function dayKey(n){return shift(START,n-1)}
 function dayNumber(date){return Math.round(ordinal(date)-ordinal(START))+1}
 function normalize(row){
  const n=Number(row.day_number);if(!Number.isInteger(n)||n<1||n>TOTAL)return null;
  const h={...(row.habits||{})};if(h.move===undefined&&h.walk!==undefined)h.move=h.walk;
  h.workout=!!(h.workout||row.workout_completed);
  return {...row,day_number:n,date:dayKey(n),habits:h,workout_completed:h.workout};
 }
 function build(rows,today=key()){
  const available=Math.max(0,Math.min(TOTAL,dayNumber(today)));
  const byDate=new Map(rows.map(normalize).filter(Boolean).map(r=>[r.date,r]));
  function day(date){
   const row=byDate.get(date),inArc=date>=START&&date<=END,future=date>today;
   const count=habits.filter(([id])=>row?.habits[id]===true).length;
   const status=!inArc?'Outside arc':future?'Future':row?.completed?'Complete':count>0||row?.journal?'Partial':date===today?'In progress':'Missed';
   return {date,number:dayNumber(date),row,count,status,inArc,future};
  }
  const days=Array.from({length:available},(_,i)=>day(dayKey(i+1)));
  const completed=days.filter(d=>d.status==='Complete').length;
  let best=0,run=0;for(const d of days){run=d.status==='Complete'?run+1:0;best=Math.max(best,run)}
  let cursor=days.length-1,current=0;
  // Today is still an opportunity, not a missed day.
  if(days[cursor]?.date===today&&days[cursor].status!=='Complete')cursor--;
  for(;cursor>=0&&days[cursor].status==='Complete';cursor--)current++;
  const weekday=new Date(today+'T12:00:00Z').getUTCDay()||7;
  const monday=shift(today,1-weekday);
  const week=Array.from({length:7},(_,i)=>day(shift(monday,i)));
  const pct=(count,total)=>total?Math.round(count/total*100):0;
  return {today,available,arcDay:Math.max(1,Math.min(92,dayNumber(today))),completed,remaining:TOTAL-available,percent:pct(completed,available),current,best,week,days,day,
   habits:habits.map(([id,label])=>{const count=days.filter(d=>d.row?.habits[id]===true).length;return {id,label,count,percent:pct(count,available)}}),
   phases:[['Foundation','2026-10-01',31],['Build','2026-11-01',30],['Transform','2026-12-01',31]].map(([name,start,total])=>{const relevant=days.filter(d=>d.date>=start&&d.date<=shift(start,total-1));const count=relevant.filter(d=>d.status==='Complete').length;return {name,start,total,available:relevant.length,count,percent:pct(count,relevant.length)}}),
   recent:days.slice(-7).reverse()};
 }
 const api={START,END,TOTAL,habits,key,shift,dayKey,dayNumber,normalize,build};
 if(typeof module!=='undefined')module.exports=api;else root.ArcProgress=api;
})(typeof window==='undefined'?globalThis:window);
