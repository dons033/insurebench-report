'use strict';
let report;
const el=id=>document.getElementById(id);
const fmt=(v,d=2)=>v===null?'—':Number(v).toFixed(d);
function section(){return location.hash.startsWith('#binary')?'binary':'general';}
function render(){
  const mode=section(), cohort=el('cohort').value, binary=mode==='binary';
  for(const m of ['general','binary']){el(m+'-tab').toggleAttribute('aria-current',m===mode);if(m===mode)el(m+'-tab').setAttribute('aria-current','page');}
  el('section-title').textContent=binary?'Yes/No binary models':'General decisions';
  el('description').textContent=binary?'Yes/no evidence checks only. General decision models are evaluated here on their binary answers.':'Choices, yes/no checks and ordinal scores on the same submission evidence.';
  el('scope').textContent=binary?'3 binary':'10 mixed';
  el('scope-label').textContent='Evaluated questions per packet';
  el('packets').textContent=cohort==='core'?'180':'8';
  el('context').textContent=cohort==='core'?'Full benchmark: 180 related submission scenarios from 30 business profiles. Frozen inputs and author keys.':'Exploratory tests: the same eight packets, with saved JEV and KEV comparisons. Small samples and separate run dates; do not compare these percentages directly with the 180-packet benchmark.';
  el('timing-note').textContent=binary?'Binary accuracy uses only yes/no answers. Cost and latency cover the entire original request: 10 mixed questions for general models, 3 binary questions for Span. These are not matched batching-cost comparisons.':'Cost and latency cover ten-question packets. API timings include the network round trip; local timings are in-process. Saved runs were not simultaneous. Successful-request medians exclude retry waits.';
  const rows=report.rows.filter(r=>r.section===mode&&r.cohort===cohort);
  el('bars').replaceChildren();
  for(const r of rows){
    const row=document.createElement('div');row.className='bar-row';
    const label=document.createElement('div');label.className='model-label';label.textContent=r.model;
    const sub=document.createElement('small');sub.textContent=r.deployment;label.append(sub);
    const track=document.createElement('div');track.className='track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('div');fill.className='fill';fill.style.width=(100*r.correct/r.total)+'%';track.append(fill);
    const score=document.createElement('div');score.className='bar-score';score.textContent=fmt(100*r.correct/r.total,1)+'%';
    const count=document.createElement('small');count.textContent=r.correct+' / '+r.total;score.append(count);row.append(label,track,score);el('bars').append(row);
  }
  const heads=['Model','Correct','Median seconds','$/1,000 packets','Request size',...(binary?['False positives','False negatives']:['Correct routes','Wrong clears','Extra holds']),'GPU GiB','Run date'];
  el('thead').replaceChildren();const hr=document.createElement('tr');for(const h of heads){const th=document.createElement('th');th.scope='col';th.textContent=h;hr.append(th);}el('thead').append(hr);
  el('tbody').replaceChildren();
  for(const r of rows){const tr=document.createElement('tr');const cells=[r.model,r.correct+'/'+r.total,fmt(r.median_seconds,3),r.cost_per_1000_packets===null?'Not measured':('$'+fmt(r.cost_per_1000_packets,4)),r.questions_per_request+' questions',...(binary?[r.false_positives,r.false_negatives]:[r.routes_correct+'/'+r.packets,r.wrong_clears,r.unnecessary_holds]),fmt(r.gpu_gib),r.date];for(const value of cells){const td=document.createElement('td');td.textContent=value===null?'—':value;tr.append(td);}el('tbody').append(tr);}
  el('caption').textContent=(binary?'Yes/No binary models':'General decisions')+' · '+(cohort==='core'?'180-packet benchmark':'8-packet exploratory tests');
  const l=report.diagnostics[0];el('laya').textContent=(binary?l.binary_correct+'/'+l.binary_total+' binary answers correct. ':l.general_correct+'/'+l.general_total+' answers correct. ')+l.note;
}
el('cohort').addEventListener('change',render);
window.addEventListener('hashchange',()=>{if(report)render();});
fetch('/data/decisions.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{report=data;el('date').textContent=data.updated;render();}).catch(()=>{el('context').textContent='Results could not be loaded. Please refresh or download the aggregate JSON below.';});
