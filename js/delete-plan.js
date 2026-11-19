export function mentionsAthlete(m,id){return m.mvp===id||Object.values(m.lineups||{}).some(l=>l.captain===id||[...(l.starters||[]),...(l.bench||[])].includes(id))||(m.events||[]).some(e=>e.playerId===id||e.otherId===id)}
export function deletionPlan(kind,id,data){
 const plan={remove:[],detach:[],clearAttendance:[],clearTactics:[],blocked:[]};
 const item=(data[kind]||[]).find(x=>x.id===id);if(!item)throw Error('Registro não encontrado. Atualize a página.');
 const remove=(collection,id)=>plan.remove.push({collection,id});
 if(kind==='athletes'){
  const matches=data.matches.filter(m=>mentionsAthlete(m,id));if(matches.length)plan.blocked.push(`${matches.length} partida(s) com o atleta. Exclua as partidas de teste primeiro ou arquive o atleta para preservar o histórico.`);
  for(const t of data.tactics)if(t.frames?.some(f=>f.tokens?.some(p=>p.athleteId===id)))plan.clearTactics.push({id:t.id,frames:t.frames.map(f=>({...f,tokens:f.tokens.map(p=>p.athleteId===id?Object.fromEntries(Object.entries({...p,label:p.label||'?' }).filter(([k])=>!['athleteId','name'].includes(k))):p)}))});
  for(const t of data.trainings)if(Object.hasOwn(t.attendance||{},id)||Object.hasOwn(t.responses||{},id))plan.clearAttendance.push(t.id);
  for(const v of data.evaluations)if(v.athleteId===id)remove('evaluations',v.id);
  if(item.uid){for(const n of data.notices)if(n.uid===item.uid)remove('notices',n.id);for(const r of data.requests)if(r.uid===item.uid)remove('requests',r.id);remove('users',item.uid)}
  if(item.photoId)remove('athletePhotos',id);
 }else if(kind==='teams'){
  for(const [key,label,fn] of [['competitions','competição(ões)',v=>v.teamIds.includes(id)],['matches','partida(s)',m=>[m.homeId,m.awayId].includes(id)],['trainings','evento(s) do calendário',v=>v.teamId===id],['tactics','tática(s)',v=>v.teamId===id]]){const n=data[key].filter(fn).length;if(n)plan.blocked.push(`${n} ${label} vinculada(s). Exclua ou desvincule antes.`)}
  for(const a of data.athletes)if(a.teamIds.includes(id))plan.detach.push({id:a.id,teamIds:a.teamIds.filter(t=>t!==id)});
 }else if(kind==='competitions'){
  for(const m of data.matches)if(m.competitionId===id)remove('matches',m.id);
 }else if(!['matches','tactics','trainings'].includes(kind))throw Error('Tipo de exclusão inválido');
 remove(kind,id);return plan;
}
