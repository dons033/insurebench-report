'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Fixed model identities: selection, sorting and added models never shift colors.
const modelColors={"pplx12":"#6d28d9","pplx_flash12":"#0891b2","drex_max":"#be185d","span02":"#bd5d00","d1_ultra":"#a21caf","jev114":"#0369a1","classify":"#b34787","drex_v2":"#4b52bd","jev": "#2563eb", "luna": "#c69500", "perplexity": "#007f86", "perplexity_v11": "#9333ea", "microsoft": "#dc2626", "mercury_paid": "#16a34a", "mercury": "#64748b", "d1": "#f97316", "kev": "#7c9700", "clef": "#172554", "clef_flash": "#00a8d6", "tev": "#925526", "solar": "#db2777", "drex": "#242424", "clef_omni": "#005b3e", "qwen9": "#a78bfa", "qwen27": "#a34500", "qwen9bf16": "#008d73", "qwen27bf16": "#e481a8", "kev-4b_\u00b7_bf16": "#5f6db0", "kev-0.8b_\u00b7_bf16": "#795173", "kev-0.8b_\u00b7_fp32": "#c55748", "julia-1": "#3a6e43", "decider-2b_v11": "#b4a04d", "solar_decide": "#476779", "span-01": "#ad6f92", "span-01_lite": "#625140"};
const modelColor=id=>modelColors[id]||'#475569';
const modelDash=id=>id==='pplx12'?'10 3':id==='pplx_flash12'?'3 3':id==='drex_max'?'5 3':id==='jev114'?'9 3':id==='perplexity_v11'?'7 4':id==='perplexity'?'2 4':'';
let data,view='text',selected=new Set(),sort='accuracy',direction=-1;
const percent=r=>100*r.correct/r.total;
const money=v=>v==null?'Not measured':'$'+Number(v).toFixed(v<1?4:3);
const time=v=>v==null?'Not measured':Number(v).toFixed(3)+'s';
const allRows=()=>data.rows.filter(r=>r.workload===$('workload').value);
function eligible(r){return ($('availability').value==='all'||($('availability').value==='open'?r.open_weights:r.local_deployable))&&($('deployment').value==='all'||r.deployment===$('deployment').value);}
function reason(r){
 if(r.hidden_reason)return r.hidden_reason;
 if(r.deployment!=='API'||r.open_weights||r.local_deployable||r.cost==null||r.unknown_charges)return '';
 const dominates=allRows().find(o=>o.id!==r.id&&!o.hidden_reason&&o.deployment===r.deployment&&o.cost_basis===r.cost_basis&&!o.unknown_charges&&o.cost!=null&&o.seconds!=null&&r.seconds!=null&&percent(o)>=percent(r)&&o.cost<=r.cost&&o.seconds<=r.seconds&&(percent(o)>percent(r)||o.cost<r.cost||o.seconds<r.seconds));
 return dominates?'Lower accuracy, cost or speed trade-off than '+dominates.name+' on this workload':'';
}
function recommended(){selected=new Set(allRows().filter(r=>!reason(r)).map(r=>r.id));}
function save(){const q=new URLSearchParams({view,workload:$('workload').value,availability:$('availability').value,deployment:$('deployment').value,models:[...selected].join(','),floor:$('acc-floor').value});history.replaceState(null,'','?'+q);}
function chooseView(next,wanted,models){view=next;const options=data.workloads.filter(w=>w.view===view);$('workload').innerHTML=options.map(w=>`<option value="${w.id}">${esc(w.label)}</option>`).join('');if(options.some(w=>w.id===wanted))$('workload').value=wanted;recommended();if(models!==undefined)selected=new Set(models.split(',').filter(Boolean));render();}
function picker(){const search=$('model-search').value.toLowerCase();$('model-options').innerHTML=allRows().filter(r=>r.name.toLowerCase().includes(search)).map(r=>`<label><input type="checkbox" data-model="${esc(r.id)}" ${selected.has(r.id)?'checked':''}><span>${esc(r.name)}<small>${esc(r.deployment)}${r.open_weights?' · Open weights':''}${r.local_deployable?' · Local runtime':''}</small><small>${esc(reason(r)||'Available in recommended view')}${eligible(r)?'':' · Excluded by current filters'}</small></span></label>`).join('');}
function bars(rows,key,title,subtitle){rows=[...rows].sort((a,b)=>{const av=key==='accuracy'?percent(a):a[key],bv=key==='accuracy'?percent(b):b[key];if(av==null)return bv==null?a.name.localeCompare(b.name):1;if(bv==null)return -1;return (key==='accuracy'?bv-av:av-bv)||a.name.localeCompare(b.name);});const maximum=key==='accuracy'?100:Math.max(...rows.map(r=>r[key]??0),.00001),valid=rows.filter(r=>key==='accuracy'||r[key]!=null),best=[...valid].sort((a,b)=>key==='accuracy'?percent(b)-percent(a):a[key]-b[key])[0],bestValue=best?(key==='accuracy'?percent(best).toFixed(1)+'%':key==='cost'?money(best.cost):time(best.seconds)):'Not measured';return `<article class="chart-card chart-${key}"><div class="chart-kicker">${key==='accuracy'?'01 · QUALITY':key==='cost'?'02 · ECONOMICS':'03 · SPEED'}</div><h3>${title}</h3><p class="fine">${subtitle}</p><div class="chart-highlight"><strong>${esc(bestValue)}</strong><span>${esc(best?.name||'No measurements')}<small>${key==='accuracy'?'Highest observed accuracy':key==='cost'?'Lowest measured charge':'Fastest observed median'}</small></span></div>${rows.map(r=>{const v=key==='accuracy'?percent(r):r[key],icon=data.models[r.id]?.icon;const label=key==='accuracy'?v.toFixed(1)+'%':key==='cost'?money(v):time(v);return `<div class="bar-row" data-model-id="${esc(r.id)}" title="${esc(r.name)}: ${esc(label)}"><span class="bar-label">${icon?`<img src="${esc(icon)}" alt="">`:`<i style="background:${modelColor(r.id)}"></i>`}${esc(r.name)}</span><span class="bar-value">${esc(label)}</span><div class="track"><div class="fill" style="background:${modelColor(r.id)};width:${v==null?0:100*v/maximum}%"></div></div></div>`;}).join('')}<div class="chart-axis"><span>0${key==='accuracy'?'%':''}</span><span>${key==='accuracy'?'100%':key==='cost'?money(maximum):time(maximum)}</span></div></article>`;}
function scale(rows,key,target){
 const valid=rows.filter(r=>r[key]>0),lanes=[...new Set(valid.map(r=>r.id))],W=1100,H=430,L=90,R=300,T=40,B=60;
 if(!valid.length){$(target).innerHTML='<p>No positive measurements available.</p>';return;}
 const minimum=Math.min(...valid.map(r=>r[key]))*.75,maximum=Math.max(...valid.map(r=>r[key]))*1.25,y=v=>H-B-(Math.log(v)-Math.log(minimum))/(Math.log(maximum)-Math.log(minimum))*(H-T-B),sizes=[1,10,25,50,100],x=n=>L+sizes.indexOf(n)/(sizes.length-1)*(W-L-R);
 const metric=v=>key==='cost'?'$'+v.toFixed(v<.01?6:4):v.toFixed(3)+'s';
 const ticks=(key==='cost'?[.0001,.0003,.001,.003,.01,.03,.1,.3,1]:[.1,.25,.5,1,2,4,8,16,32]).filter(v=>v>=minimum&&v<=maximum);
 let body=ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e7ecf1"/><text x="${L-14}" y="${y(v)+5}" text-anchor="end">${key==='cost'?'$'+v:v+'s'}</text>`).join('');
 for(const n of sizes)body+=`<text x="${x(n)}" y="${H-B+26}" text-anchor="middle">${n}</text>`;
 const endpoints=lanes.map(lane=>{const rr=valid.filter(r=>r.id===lane).sort((a,b)=>a.size-b.size);return {lane,rr,last:rr[rr.length-1]};}).sort((a,b)=>y(a.last[key])-y(b.last[key]));
 let prev=T-44;for(const e of endpoints){e.labelY=Math.max(y(e.last[key]),prev+44);prev=e.labelY;}const overflow=Math.max(0,prev-(H-B-12));if(overflow)for(const e of endpoints)e.labelY-=overflow;
 for(let i=endpoints.length-2;i>=0;i--)endpoints[i].labelY=Math.min(endpoints[i].labelY,endpoints[i+1].labelY-44);
 endpoints.forEach(e=>{const {lane,rr,last,labelY}=e,color=modelColor(lane),native=rr.filter(r=>r.native),icon=data.models[lane]?.icon,name=data.models[lane]?.name||lane;
 let marks=`<polyline points="${native.map(r=>x(r.size)+','+y(r[key])).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="${modelDash(lane)}"/>`;
 rr.forEach(r=>{const title=`${name}: ${r.size} questions; ${metric(r[key])}${key==='cost'?' per 1,000 questions':''}; ${r.native?'native request':'sequential split workflow'}`;marks+=r.native?`<circle cx="${x(r.size)}" cy="${y(r[key])}" r="4" fill="white" stroke="${color}" stroke-width="2"><title>${esc(title)}</title></circle>`:`<path d="M ${x(r.size)} ${y(r[key])-6} l 6 6 l -6 6 l -6 -6 Z" fill="${color}"><title>${esc(title)}</title></path>`;});
 marks+=`<path d="M ${x(last.size)+9} ${y(last[key])} L ${W-R+22} ${labelY}" fill="none" stroke="${color}" stroke-width="1" opacity=".6"/>${icon?`<image href="${esc(icon)}" x="${W-R+30}" y="${labelY-12}" width="20" height="20"/>`:''}<text x="${W-R+58}" y="${labelY-2}" class="scale-direct-name">${esc(name)}</text><text x="${W-R+58}" y="${labelY+15}" class="scale-direct-value">${metric(last[key])} · ${last.size} questions${!last.native?' · split':''}</text>`;
 body+=`<g class="scale-series" data-scale-id="${esc(lane)}" tabindex="0" role="img" aria-label="${esc(name+': '+metric(last[key])+' at '+last.size+' questions')}">${marks}</g>`;
 });
 $(target).innerHTML=`<div class="scale-heading"><h3>${key==='seconds'?'Completion time':'Cost per 1,000 questions'}</h3><span>Lower is better · logarithmic vertical axis</span></div><div class="scale-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${key==='seconds'?'Seconds':'USD'} by measured questions per workflow, logarithmic vertical axis">${body}<text x="${(L+W-R)/2}" y="${H-7}" text-anchor="middle">Questions per workflow · measured batch sizes</text></svg></div><div class="scale-mobile-values">${endpoints.map(e=>`<div><span>${esc(data.models[e.lane]?.name||e.lane)}</span><strong>${metric(e.last[key])}</strong><small>${e.last.size} questions${e.last.native?'':' · split workflow'}</small></div>`).join('')}</div>`;
 const focus=id=>document.querySelectorAll('#scaling-section .scale-series').forEach(el=>el.classList.toggle('dimmed',!!id&&el.dataset.scaleId!==id));
 $(target).querySelectorAll('.scale-series').forEach(el=>{el.addEventListener('mouseenter',()=>focus(el.dataset.scaleId));el.addEventListener('mouseleave',()=>focus(null));el.addEventListener('focus',()=>focus(el.dataset.scaleId));el.addEventListener('blur',()=>focus(null));});
}
function scaling(shown){const ids=new Set(shown.map(r=>r.id)),rr=data.scaling.filter(r=>ids.has(r.id));$('scaling-section').hidden=view!=='text'||!rr.length;if($('scaling-section').hidden)return;scale(rr,'seconds','scale-time');scale(rr,'cost','scale-cost');$('hundred').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Model</th><th>Time</th><th>Cost / 1,000 questions</th><th>Quality on scaling workload</th><th>Workflow</th></tr></thead><tbody>${rr.filter(r=>r.size===100).map(r=>`<tr><td>${esc(data.models[r.id]?.name||r.id)}</td><td>${time(r.seconds)}</td><td>${money(r.cost)}</td><td>${r.correct}/${r.total}</td><td>${r.native?'Native 100':r.workflow_calls? r.workflow_calls+' sequential calls (≤16 each)':'2 × 50 questions'}</td></tr>`).join('')}</tbody></table></div>`;}
function powerRanking(){
 const rr=data.power_ranking||[];$('power-section').hidden=view!=='text'||$('workload').value!=='broader150'||!rr.length;if($('power-section').hidden)return;
 const keys=['accuracy','cost_regular','cost_100','time_regular','time_100'],labels=['Accuracy','Cost / regular packet','Cost / 100 questions','Time / regular packet','Time / 100 questions'];
 const heat=(value,values,higher)=>{const sorted=[...values].sort((a,b)=>a-b),first=sorted.indexOf(value),last=sorted.lastIndexOf(value);let t=sorted.length>1?(first+last)/2/(sorted.length-1):.5;if(!higher)t=1-t;const stops=[[252,230,230],[250,248,239],[218,241,226]],part=t<=.5?0:1,u=t<=.5?t*2:(t-.5)*2;return 'rgb('+stops[part].map((c,i)=>Math.round(c+(stops[part+1][i]-c)*u)).join(',')+')';};
 const format=(k,v)=>k==='accuracy'?(100*v).toFixed(1)+'%':k.startsWith('cost')?'$'+v.toFixed(6):v.toFixed(3)+'s';
 $('power-results').innerHTML=`<div class="power-color-key"><span>Less favorable</span><i></i><span>More favorable</span></div><div class="table-wrap"><table><thead><tr><th>Rank / model</th>${labels.map(l=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${rr.map((r,i)=>`<tr><td><div class="model-name"><b>#${i+1}</b>${data.models[r.id]?.icon?`<img src="${esc(data.models[r.id].icon)}" alt="">`:''}${esc(r.name)}</div></td>${keys.map(k=>`<td class="power-heat" style="background:${heat(r[k],rr.map(o=>o[k]),k==='accuracy')}">${format(k,r[k])}${k==='time_100'&&!r.native_100?`<small>${r.workflow_calls} sequential calls</small>`:''}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="fine">Green indicates higher accuracy or lower cost and time within each column. Values are actual measurements, not ranking points. Color shows relative standing, not statistical significance.</p>`;
}
// Cost against completion time, both logarithmic, with accuracy as fill and a floor.
// Position carries the two metrics the benchmark resolves sharply; accuracy — which at
// n=150 cannot separate most of the field — gates rather than ranks.
const accBand=p=>p>=95?'a3':p>=90?'a2':'a1';
const accLabel=p=>p>=95?'95% and above':p>=90?'90–95%':'below 90%';
function frontierSet(rows){
 // Pareto-minimal on (cost, seconds). Free routes are plotted but never anchor the
 // frontier: a promotional zero would dominate the cost axis on its own.
 const c=rows.filter(r=>r.cost>0);
 return c.filter(r=>!c.some(o=>o!==r&&o.cost<=r.cost&&o.seconds<=r.seconds&&(o.cost<r.cost||o.seconds<r.seconds)));
}
function frontier(rows){
 const plot=rows.filter(r=>r.cost!=null&&r.seconds>0);
 const section=$('frontier-section');
 // Needs at least two priced models: the cost axis is logarithmic and free routes
 // sit in their own lane outside it.
 section.hidden=plot.length<3||plot.filter(r=>r.cost>0).length<2;
 if(section.hidden)return;
 const floor=+$('acc-floor').value;
 $('acc-floor-value').textContent=floor?floor+'%':'off';
 const passes=r=>percent(r)>=floor-1e-9;
 const kept=plot.filter(passes), fr=frontierSet(kept), frIds=new Set(fr.map(r=>r.id));
 const free=plot.filter(r=>r.cost===0);
 const paid=plot.filter(r=>r.cost>0);
 const W=1100,H=430,L=96,R=300,T=40,B=62,FREE=free.length?62:0;
 const lo=Math.min(...paid.map(r=>r.cost))*.7,hi=Math.max(...paid.map(r=>r.cost))*1.4;
 const tLo=Math.min(...plot.map(r=>r.seconds))*.7,tHi=Math.max(...plot.map(r=>r.seconds))*1.4;
 const x0=L+FREE, x1=W-R;
 const x=v=>x0+(Math.log(v)-Math.log(lo))/(Math.log(hi)-Math.log(lo))*(x1-x0);
 const y=v=>H-B-(Math.log(v)-Math.log(tLo))/(Math.log(tHi)-Math.log(tLo))*(H-T-B);
 const freeX=L+FREE/2;
 // Dense ladders: a workload whose models sit inside one decade still needs gridlines.
 const costTicks=[.00003,.0001,.0002,.0005,.001,.002,.005,.01,.02,.03,.05,.075,.1,.15,.2,.3,.5,.75,1,2,3,5,10].filter(v=>v>=lo&&v<=hi);
 const timeTicks=[.1,.15,.2,.25,.3,.4,.5,.6,.75,1,1.5,2,3,4,6,8,12,16,24,32].filter(v=>v>=tLo&&v<=tHi);
 let body='';
 costTicks.forEach(v=>{body+=`<line x1="${x(v).toFixed(1)}" x2="${x(v).toFixed(1)}" y1="${T}" y2="${H-B}" stroke="#e7ecf1"/><text x="${x(v).toFixed(1)}" y="${H-B+24}" text-anchor="middle">$${v<.001?v.toFixed(5):v<1?v.toFixed(3):v}</text>`;});
 timeTicks.forEach(v=>{body+=`<line x1="${L}" x2="${x1}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#e7ecf1"/><text x="${L-14}" y="${(y(v)+5).toFixed(1)}" text-anchor="end">${v}s</text>`;});
 if(FREE){
  body+=`<line x1="${x0-12}" x2="${x0-12}" y1="${T}" y2="${H-B}" stroke="#c9d6d4" stroke-dasharray="3 4"/>`
   +`<text x="${freeX}" y="${H-B+24}" text-anchor="middle">$0</text>`;
 }
 body+=`<text x="${((x0+x1)/2).toFixed(1)}" y="${H-10}" text-anchor="middle" class="axis-title">Cost per 1,000 packets · logarithmic</text>`
  +`<text transform="translate(26,${((T+H-B)/2).toFixed(1)}) rotate(-90)" text-anchor="middle" class="axis-title">Median completion time · logarithmic</text>`
  +`<text x="${x0+8}" y="${H-B-10}" class="good-corner">cheaper and faster ↙</text>`;
 if(fr.length>1){
  const pts=[...fr].sort((a,b)=>a.cost-b.cost).map(r=>x(r.cost).toFixed(1)+','+y(r.seconds).toFixed(1)).join(' ');
  body+=`<polyline points="${pts}" fill="none" stroke="#0a8f84" stroke-width="2" stroke-dasharray="7 5" stroke-linejoin="round"/>`;
 }
 // Direct labels only for the frontier; every mark carries a title, and the list below
 // repeats all of them for small screens and screen readers.
 const labelled=[...fr].sort((a,b)=>y(a.seconds)-y(b.seconds));
 let prev=T-34;
 labelled.forEach(e=>{e._ly=Math.max(y(e.seconds),prev+34);prev=e._ly;});
 const over=Math.max(0,prev-(H-B-10));
 if(over)labelled.forEach(e=>{e._ly-=over;});
 for(let i=labelled.length-2;i>=0;i--)labelled[i]._ly=Math.min(labelled[i]._ly,labelled[i+1]._ly-34);
 plot.forEach(r=>{
  const cx=r.cost===0?freeX:x(r.cost),cy=y(r.seconds),p=percent(r),good=passes(r),onF=frIds.has(r.id);
  const title=`${data.models[r.id]?.name||r.name}: ${p.toFixed(1)}% accuracy; ${money(r.cost)} per 1,000 packets; ${time(r.seconds)} median${r.cost===0?'; free route':''}${good?(onF?'; on the efficient frontier':''):'; below the accuracy floor'}`;
  body+=`<circle class="fr-point ${good?'band-'+accBand(p):'fr-out'}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${onF?8:6.5}"><title>${esc(title)}</title></circle>`;
 });
 labelled.forEach(r=>{
  const cx=r.cost===0?freeX:x(r.cost),cy=y(r.seconds),icon=data.models[r.id]?.icon,name=data.models[r.id]?.name||r.name;
  body+=`<path d="M ${(cx+10).toFixed(1)} ${cy.toFixed(1)} L ${x1+22} ${r._ly.toFixed(1)}" fill="none" stroke="#9bacb1" stroke-width="1" opacity=".7"/>`
   +(icon?`<image href="${esc(icon)}" x="${x1+30}" y="${(r._ly-11).toFixed(1)}" width="18" height="18"/>`:'')
   +`<text x="${x1+(icon?54:30)}" y="${(r._ly-1).toFixed(1)}" class="scale-direct-name">${esc(name)}</text>`
   +`<text x="${x1+(icon?54:30)}" y="${(r._ly+15).toFixed(1)}" class="scale-direct-value">${money(r.cost)} · ${time(r.seconds)}</text>`;
 });
 const missing=rows.length-plot.length;
 $('frontier').innerHTML=`<div class="scale-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cost against median completion time, both logarithmic, with the efficient frontier among models meeting the accuracy floor">${body}</svg></div>`
  +`<div class="fr-legend"><span><i class="band-a1"></i>below 90%</span><span><i class="band-a2"></i>90–95%</span><span><i class="band-a3"></i>95% and above</span><span><i class="fr-out"></i>below your floor</span><span><i class="fr-line"></i>efficient frontier</span></div>`
  +`<div class="scale-mobile-values">${[...plot].sort((a,b)=>percent(b)-percent(a)).map(r=>`<div><span>${esc(data.models[r.id]?.name||r.name)}</span><strong>${percent(r).toFixed(1)}%</strong><small>${money(r.cost)} per 1,000 packets · ${time(r.seconds)} median${frIds.has(r.id)?' · on the frontier':''}</small></div>`).join('')}</div>`;
 $('frontier-note').textContent=
  `Three accuracy bands rather than a continuous ramp: at these sample sizes the benchmark cannot resolve finer differences, so a smooth gradient would imply precision the measurements do not carry. `
  +(fr.length?`The frontier holds ${fr.length} model${fr.length===1?'':'s'} at this floor. `:`No model clears this floor. `)
  +(free.length?`${free.length} free route${free.length===1?' is':'s are'} plotted in the $0 lane and excluded from the frontier, because a promotional zero would dominate the cost axis on its own. `:'')
  +(missing?`${missing} selected model${missing===1?' has':'s have'} no cost or timing measurement in this workload and ${missing===1?'is':'are'} not plotted.`:'');
}
let frontierRows=[];
function render(){const w=data.workloads.find(w=>w.id===$('workload').value);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));$('view-label').textContent={image:'IMAGE INPUTS',text:'GENERAL TEXT',binary:'YES/NO · BOOLEAN OUTPUTS'}[view];$('workload-title').textContent=w.label;$('scope').textContent=w.note;$('timing').textContent=w.timing;const visible=allRows().filter(r=>selected.has(r.id)&&eligible(r)).sort((a,b)=>percent(b)-percent(a)||a.name.localeCompare(b.name));$('selected-count').textContent='('+selected.size+')';$('model-count').textContent=visible.length;$('filter-note').textContent=allRows().length+' saved measurements in this workload · '+(allRows().length-selected.size)+' deselected · '+allRows().filter(r=>selected.has(r.id)&&!eligible(r)).length+' excluded by availability/deployment filters';$('empty').hidden=visible.length!==0;$('overview').hidden=!visible.length;$('overview').innerHTML=bars(visible,'accuracy','Accuracy','Correct / scored findings · higher is better')+bars(visible,'cost','Measured cost','USD per 1,000 packets · lower is better')+bars(visible,'seconds','Completion time','Median seconds · lower is better');$('selection-summary').textContent=selected.size===allRows().length?'All '+allRows().length+' evaluated models selected':selected.size+' of '+allRows().length+' models selected';$('all-models').textContent='Show all '+allRows().length+' models';frontierRows=visible;frontier(visible);powerRanking();picker();scaling(visible);save();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>chooseView(b.dataset.view));$('workload').onchange=()=>{recommended();render();};$('availability').onchange=render;$('deployment').onchange=render;$('acc-floor').oninput=()=>{frontier(frontierRows);save();};$('models-button').onclick=()=>{$('picker').hidden=!$('picker').hidden;$('models-button').setAttribute('aria-expanded',String(!$('picker').hidden));};$('model-search').oninput=picker;$('model-options').onchange=e=>{if(e.target.dataset.model){e.target.checked?selected.add(e.target.dataset.model):selected.delete(e.target.dataset.model);render();}};$('show-all').onclick=()=>{selected=new Set(allRows().map(r=>r.id));render();};$('all-models').onclick=()=>{selected=new Set(allRows().map(r=>r.id));$('availability').value='all';$('deployment').value='all';render();};$('clear').onclick=()=>{selected.clear();render();};$('reset').onclick=()=>{recommended();render();};document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{if(sort===b.dataset.sort)direction*=-1;else{sort=b.dataset.sort;direction=sort==='accuracy'?-1:1;}render();});
function restore(){const q=new URLSearchParams(location.search);$('availability').value=['all','open','local'].includes(q.get('availability'))?q.get('availability'):'all';$('deployment').value=['all','API','Local GPU'].includes(q.get('deployment'))?q.get('deployment'):'all';$('acc-floor').value=String(Math.min(100,Math.max(0,+q.get('floor')||0)));chooseView(['image','text','binary'].includes(q.get('view'))?q.get('view'):'text',q.get('workload'),q.has('models')?q.get('models'):undefined);}
window.onpopstate=()=>{if(data)restore();};fetch('data.json').then(r=>{if(!r.ok)throw Error('Unable to load saved results');return r.json();}).then(d=>{data=d;$('entrant-status').innerHTML=data.candidates.map(c=>{const measured=data.rows.find(r=>r.model_id===c.requested_model_id);return `<article><h2>${esc(c.display_name)}</h2><p>${measured?measured.correct+'/'+measured.total+' primary findings correct · '+time(measured.seconds)+' median · '+money(measured.cost)+' per 1,000 packets. '+(measured.workload==='broader150_textstate'?'Select the separate Classify text-state workload; input formatting differs.':['nace-ai/drex-v2.0','nace-ai/drex-max'].includes(c.requested_model_id)?'Broader text benchmark; native requests are limited to 16 questions.':'Broader text benchmark.'):'Awaiting evaluation. No InsureBench score, price, or timing yet.'}</p><a href="${esc(c.official_source)}" target="_blank" rel="noopener">Model details ↗</a></article>`;}).join('');restore();}).catch(e=>{$('scope').textContent=e.message+'. Please refresh the preview.';});
