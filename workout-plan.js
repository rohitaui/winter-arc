/* A simple 92-day schedule: strength Tue/Thu/Sat, recovery on other days. */
(function(root){
 'use strict';
 const calendar=typeof module!=='undefined'&&module.exports?require('./progress.js'):root.ArcProgress;
 const strengthWeekdays=new Set([2,4,6]); // UTC weekday: Tuesday, Thursday, Saturday.
 const baseExercises=[
  ['Bodyweight Squats',10,'reps'],
  ['Incline Push-ups',8,'reps'],
  ['Reverse Lunges',5,'/ leg'],
  ['Glute Bridges',10,'reps'],
  ['Backpack Rows',10,'reps'],
  ['Dead Bug',5,'/ side'],
  ['Plank',15,'sec']
 ];
 function forDate(date){
  const day=calendar.dayNumber(date);
  if(date<calendar.START||date>calendar.END)return {date,day,mode:'outside',phase:'Transform',rounds:0,step:0,exercises:[]};
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();
  const phase=day<=31?'Foundation':day<=61?'Build':'Transform';
  if(!strengthWeekdays.has(weekday))return {date,day,mode:'recovery',phase,rounds:0,step:0,exercises:[]};
  const rounds=day<=14?1:2;
  const step=day<=31?0:day<=45?1:day<=61?2:day<=75?3:4;
  const exercises=baseExercises.map(([name,base,unit])=>{
   if(name==='Plank')return {name,reps:`${base+step*5}–${base+5+step*5} sec`};
   const count=base+step;
   return {name,reps:unit==='reps'?`${count} reps`:`${count} ${unit}`};
  });
  return {date,day,mode:'strength',phase,rounds,step,exercises};
 }
 const api={forDate,strengthWeekdays:[...strengthWeekdays]};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcWorkoutPlan=api;
})(typeof window==='undefined'?globalThis:window);
