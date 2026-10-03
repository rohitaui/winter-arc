/* Calendar-only arithmetic avoids timezone and daylight-saving shifts. */
(function(root){
 'use strict';
 const DEFAULT_START='2026-10-01',TOTAL=92;
 const habits=[['move','Move'],['workout','Workout / recovery'],['food','Eat intentionally'],['deepWork','Deep work'],['learn','Learn'],['sleep','Sleep']];
 let arcSettings={startDate:DEFAULT_START,strengthDays:[2,4,6],weekdayMinutes:30,weekendMinutes:30,fitnessLevel:'beginner'};
 function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}
 function key(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
 function ordinal(date){return Date.parse(date+'T12:00:00Z')/86400000}
 function shift(date,n){return new Date((ordinal(date)+n)*86400000).toISOString().slice(0,10)}
 function endDate(start=arcSettings.startDate){return shift(start,TOTAL-1)}
 function dayKey(n,start=arcSettings.startDate){return shift(start,n-1)}
 function dayNumber(date,start=arcSettings.startDate){return Math.round(ordinal(date)-ordinal(start))+1}
 function configure(options={}){
  if(validDate(options.startDate))arcSettings.startDate=options.startDate;
  if(Array.isArray(options.strengthDays)){
   const days=[...new Set(options.strengthDays.map(Number).filter(day=>Number.isInteger(day)&&day>=0&&day<=6))].sort((a,b)=>a-b);
   if(days.length)arcSettings.strengthDays=days;
  }
  if([20,25,30,35,40,45,50,55,60].includes(Number(options.weekdayMinutes)))arcSettings.weekdayMinutes=Number(options.weekdayMinutes);
  if([20,25,30,35,40,45,50,55,60].includes(Number(options.weekendMinutes)))arcSettings.weekendMinutes=Number(options.weekendMinutes);
  if(['beginner','steady','experienced'].includes(options.fitnessLevel))arcSettings.fitnessLevel=options.fitnessLevel;
 }
 function settings(){return {...arcSettings,strengthDays:[...arcSettings.strengthDays]}}
 function normalize(row){
  const n=Number(row.day_number),date=validDate(row.date)?row.date:Number.isInteger(n)&&n>=1&&n<=TOTAL?dayKey(n):null;
  if(!date)return null;
  const h={...(row.habits||{})};if(h.move===undefined&&h.walk!==undefined)h.move=h.walk;
  h.workout=!!(h.workout||row.workout_completed);
  return {...row,day_number:dayNumber(date),date,habits:h,workout_completed:h.workout};
 }
 function build(rows,today=key()){
  const start=arcSettings.startDate,end=endDate(start),todayDay=dayNumber(today,start);
  const available=Math.max(0,Math.min(TOTAL,todayDay));
  const byDate=new Map(rows.map(normalize).filter(Boolean).map(r=>[r.date,r]));
  function day(date){
   const row=byDate.get(date),inArc=date>=start&&date<=end,future=date>today;
   const count=habits.filter(([id])=>row?.habits[id]===true).length;
   const complete=habits.every(([id])=>row?.habits[id]===true);
   const status=!inArc?'Outside arc':future?'Future':complete?'Complete':count>0||row?.journal?'Partial':date===today?'In progress':'Missed';
   return {date,number:dayNumber(date,start),row,count,status,inArc,future};
  }
  const days=Array.from({length:available},(_,i)=>day(dayKey(i+1,start)));
  const completed=days.filter(d=>d.status==='Complete').length;
  let best=0,run=0;for(const d of days){run=d.status==='Complete'?run+1:0;best=Math.max(best,run)}
  let cursor=days.length-1,current=0;
  if(days[cursor]?.date===today&&days[cursor].status!=='Complete')cursor--;
  for(;cursor>=0&&days[cursor].status==='Complete';cursor--)current++;
  const weekday=new Date(today+'T12:00:00Z').getUTCDay()||7;
  const monday=shift(today,1-weekday);
  const week=Array.from({length:7},(_,i)=>day(shift(monday,i)));
  const pct=(count,total)=>total?Math.round(count/total*100):0;
  const phases=[['Foundation',0,31],['Build',31,30],['Transform',61,31]].map(([name,offset,total])=>{
   const phaseStart=dayKey(offset+1,start),phaseEnd=dayKey(offset+total,start),relevant=days.filter(d=>d.date>=phaseStart&&d.date<=phaseEnd),count=relevant.filter(d=>d.status==='Complete').length;
   return {name,start:phaseStart,end:phaseEnd,total,available:relevant.length,count,percent:pct(count,relevant.length)};
  });
  return {today,start,end,available,arcDay:Math.max(1,Math.min(TOTAL,todayDay)),completed,remaining:TOTAL-available,percent:pct(completed,available),current,best,week,days,day,
   habits:habits.map(([id,label])=>{const count=days.filter(d=>d.row?.habits[id]===true).length;return {id,label,count,percent:pct(count,available)}}),phases,recent:days.slice(-7).reverse()};
 }
 const api={DEFAULT_START,TOTAL,habits,key,shift,dayKey,dayNumber,endDate,configure,settings,normalize,build};
 Object.defineProperties(api,{START:{get:()=>arcSettings.startDate},END:{get:()=>endDate()}});
 if(typeof module!=='undefined')module.exports=api;else root.ArcProgress=api;
})(typeof window==='undefined'?globalThis:window);
