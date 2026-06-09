var LETTERS=['A','B','C','D','E'];
var TOTAL_Q=40;
var EXAM_SECS=3600;
var currentPack=1;
var questions=[];
var userAnswers={};
var flagged={};
var currentQ=0;
var timerInterval=null;
var secondsLeft=0;
var reviewList=[];
var reviewIdx=0;

/* ── THEME ── */
var darkMode = false;
function toggleTheme(){
  darkMode=!darkMode;
  document.documentElement.setAttribute('data-theme', darkMode?'dark':'light');
  document.getElementById('theme-toggle').textContent = darkMode?'🌙':'☀️';
}

/* ── SCREENS ── */
function showScreen(id){
  var ss=document.querySelectorAll('.screen');
  for(var s=0;s<ss.length;s++) ss[s].classList.remove('active');
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

function showComingSoon(name){
  document.getElementById('coming-soon-title').textContent=name+' — Coming soon';
  document.getElementById('modal-coming-soon').classList.add('open');
}

/* ── EXAM ── */
function startExam(pack){
  currentPack=pack;
  questions=PACKS[String(pack)];
  userAnswers={};flagged={};currentQ=0;secondsLeft=EXAM_SECS;
  _autoSubmitted=false;_oneMinuteWarned=false;
  if(_timesUpInterval){clearInterval(_timesUpInterval);_timesUpInterval=null;}
  clearInterval(timerInterval);
  document.getElementById('exam-title').textContent='CT-GenAI \u2014 Pack #'+pack;
  showScreen('screen-exam');
  buildNavGrid();
  renderQuestion();
  updateTimerDisplay();
  timerInterval=setInterval(tickTimer,1000);
}

var _autoSubmitted=false;
var _oneMinuteWarned=false;
var _timesUpInterval=null;

function tickTimer(){
  secondsLeft--;
  if(secondsLeft<=0){
    secondsLeft=0;
    updateTimerDisplay();
    clearInterval(timerInterval);
    _autoSubmitted=true;
    showTimesUpModal();
    return;
  }
  if(secondsLeft<=60 && !_oneMinuteWarned){
    _oneMinuteWarned=true;
    showOneMinuteToast();
  }
  updateTimerDisplay();
}

function showOneMinuteToast(){
  var t=document.getElementById('one-min-toast');
  if(!t)return;
  t.classList.add('visible');
  setTimeout(function(){t.classList.remove('visible');},4000);
}

function showTimesUpModal(){
  var modal=document.getElementById('modal-times-up');
  if(!modal){doSubmit();return;}
  modal.classList.add('open');
  var counter=document.getElementById('times-up-counter');
  var n=5;
  if(counter)counter.textContent=n;
  if(_timesUpInterval)clearInterval(_timesUpInterval);
  _timesUpInterval=setInterval(function(){
    n--;
    if(counter)counter.textContent=n;
    if(n<=0){
      clearInterval(_timesUpInterval);_timesUpInterval=null;
      modal.classList.remove('open');
      doSubmit();
    }
  },1000);
}

function timesUpGoToResults(){
  if(_timesUpInterval){clearInterval(_timesUpInterval);_timesUpInterval=null;}
  var modal=document.getElementById('modal-times-up');
  if(modal)modal.classList.remove('open');
  doSubmit();
}

function updateTimerDisplay(){
  var m=Math.floor(secondsLeft/60),s=secondsLeft%60;
  var el=document.getElementById('timer');
  el.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  var cls='timer';
  if(secondsLeft<=10)cls+=' critical';
  else if(secondsLeft<=300)cls+=' danger';
  else if(secondsLeft<=600)cls+=' warning';
  el.className=cls;
}

function buildNavGrid(){
  var grid=document.getElementById('q-nav-grid');
  grid.innerHTML='';
  for(var i=0;i<TOTAL_Q;i++){
    (function(idx){
      var btn=document.createElement('button');
      btn.className='qnb';btn.textContent=idx+1;btn.id='qnb-'+idx;
      btn.addEventListener('click',function(){goTo(idx);});
      grid.appendChild(btn);
    })(i);
  }
}

function updateNav(){
  for(var i=0;i<TOTAL_Q;i++){
    var btn=document.getElementById('qnb-'+i);if(!btn)continue;
    var isAnswered=userAnswers[i]&&userAnswers[i].length>0;
    var keepFlash=btn.classList.contains('flash-unanswered')&&!isAnswered;
    var c='qnb';
    if(isAnswered)c+=' answered';
    if(flagged[i])c+=' flagged';
    if(i===currentQ)c+=' cur';
    if(keepFlash)c+=' flash-unanswered';
    btn.className=c;
  }
  var ans=countAnswered();
  document.getElementById('answered-count').textContent=ans+' / '+TOTAL_Q;
  document.getElementById('progress-fill').style.width=(ans/TOTAL_Q*100)+'%';
  document.getElementById('btn-submit').className=ans===TOTAL_Q?'btn-submit ready':'btn-submit';
}

function countAnswered(){
  var n=0;
  for(var i=0;i<TOTAL_Q;i++){if(userAnswers[i]&&userAnswers[i].length>0)n++;}
  return n;
}

function goTo(idx){
  if(idx<0||idx>=TOTAL_Q)return;
  currentQ=idx;renderQuestion();
}

function renderQuestion(){
  var q=questions[currentQ];
  document.getElementById('q-num-lbl').textContent='Question '+(currentQ+1)+' of '+TOTAL_Q;
  document.getElementById('q-text').innerHTML=renderQText(q.q);
  var ec=q.exp_count||1;
  var W=['','ONE','TWO','THREE','FOUR','FIVE'];
  var hintTxt='Select '+(ec<=5?W[ec]:ec)+' option'+(ec===1?'':'s');
  document.getElementById('multi-hint-wrap').innerHTML='<span class="multi-hint">'+hintTxt+'</span>';
  document.getElementById('flag-btn').className=flagged[currentQ]?'flag-btn flagged':'flag-btn';
  var list=document.getElementById('options-list');
  list.innerHTML='';
  var sel=userAnswers[currentQ]||[];
  for(var i=0;i<q.opts.length;i++){
    (function(idx){
      var btn=document.createElement('button');
      btn.className='opt-btn'+(sel.indexOf(idx)>=0?' selected':'');
      var ltr=document.createElement('span');ltr.className='opt-letter';ltr.textContent=LETTERS[idx];
      var txt=document.createElement('span');txt.textContent=q.opts[idx];
      btn.appendChild(ltr);btn.appendChild(txt);
      btn.addEventListener('click',function(){selectOpt(idx);});
      list.appendChild(btn);
    })(i);
  }
  document.getElementById('btn-prev').disabled=(currentQ===0);
  document.getElementById('btn-next').disabled=(currentQ===TOTAL_Q-1);
  updateNav();
}

function selectOpt(idx){
  var q=questions[currentQ];
  var ec=q.exp_count||1;
  var sel=(userAnswers[currentQ]||[]).slice();
  if(ec>1){var pos=sel.indexOf(idx);if(pos>=0)sel.splice(pos,1);else if(sel.length<ec)sel.push(idx);}
  else{sel=[idx];}
  userAnswers[currentQ]=sel;
  renderQuestion();
}

function toggleFlag(){
  flagged[currentQ]=!flagged[currentQ];
  document.getElementById('flag-btn').className=flagged[currentQ]?'flag-btn flagged':'flag-btn';
  updateNav();
}

var _flashTimer = null;
function handleSubmitClick(){
  var ans=countAnswered(),un=TOTAL_Q-ans;
  if(un===0){
    document.getElementById('modal-submit-all').classList.add('open');
    return;
  }
  for(var i=0;i<TOTAL_Q;i++){
    var btn=document.getElementById('qnb-'+i);
    if(!btn)continue;
    if(!userAnswers[i]||userAnswers[i].length===0){
      btn.classList.add('flash-unanswered');
    }
  }
  var notice=document.getElementById('submit-warning');
  if(notice){
    notice.textContent=un+' question'+(un===1?'':'s')+' unanswered — finish them all to submit';
    notice.classList.add('visible');
  }
  var firstUn=-1;
  for(var j=0;j<TOTAL_Q;j++){
    if(!userAnswers[j]||userAnswers[j].length===0){firstUn=j;break;}
  }
  if(firstUn>=0){
    var firstBtn=document.getElementById('qnb-'+firstUn);
    if(firstBtn&&firstBtn.scrollIntoView){firstBtn.scrollIntoView({block:'nearest',behavior:'smooth'});}
  }
  if(_flashTimer)clearTimeout(_flashTimer);
  _flashTimer=setTimeout(function(){
    var all=document.querySelectorAll('.qnb.flash-unanswered');
    for(var k=0;k<all.length;k++)all[k].classList.remove('flash-unanswered');
    if(notice)notice.classList.remove('visible');
  },4000);
}

function showLeaveModal(){document.getElementById('modal-leave').classList.add('open');}
var pendingProfileNav=false;
function closeModals(){
  var ms=document.querySelectorAll('.modal-overlay');
  for(var i=0;i<ms.length;i++)ms[i].classList.remove('open');
  pendingProfileNav=false;
}
function doLeave(){
  closeModals();
  clearInterval(timerInterval);
  if(pendingProfileNav){pendingProfileNav=false;openProfile();return;}
  showScreen('screen-genai-home');
}
function openProfileGuarded(){
  if(document.getElementById('screen-exam').classList.contains('active')){
    pendingProfileNav=true;
    showLeaveModal();
  }else{
    openProfile();
  }
}

function doSubmit(){
  closeModals();
  clearInterval(timerInterval);
  showResults();
}

/* ── REGISTRATION & GOOGLE FORMS SUBMISSION ── */
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS — replace the three values below after creating your form:
//   FORM_ACTION  → 'https://docs.google.com/forms/d/e/1FAIpQLSfUA3UjJ_D34yuwyXD4hB_D7NIovhyJBnsg5wp2_1Q89ODVYA/formResponse'
//   ENTRY_NAME   → 'entry.1166241678'
//   ENTRY_EMAIL  → 'entry.1981449668'
// ─────────────────────────────────────────────────────────────────────────────
var FORM_ACTION      = 'https://docs.google.com/forms/d/e/1FAIpQLSfUA3UjJ_D34yuwyXD4hB_D7NIovhyJBnsg5wp2_1Q89ODVYA/formResponse';
var ENTRY_NAME       = 'entry.1166241678';
var ENTRY_EMAIL      = 'entry.1981449668';
var ENTRY_ID         = 'entry.1288529537';
var ENTRY_COMPANY    = 'entry.194206428';
var ENTRY_COURSE     = 'entry.306410715';
var ENTRY_ACTIVITY   = 'entry.603643379';
var ENTRY_FAMILY     = 'entry.13800071';
var ENTRY_PACK_ROUND = 'entry.1466670342';
var ENTRY_CORRECT    = 'entry.619171338';
var ENTRY_WRONG      = 'entry.25304628';
var ENTRY_UNANSWERED = 'entry.1279254432';
var ENTRY_TOTAL      = 'entry.351831006';
var ENTRY_SCORE_PCT  = 'entry.703495371';
var ENTRY_VERDICT    = 'entry.239573195';

function generateUserId(){
  var t = Date.now().toString(36).toUpperCase();
  var r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return 'U-' + t + '-' + r;
}

function submitRegistration(){
  var nameEl    = document.getElementById('reg-name');
  var emailEl   = document.getElementById('reg-email');
  var companyEl = document.getElementById('reg-company');
  var courseEl  = document.getElementById('reg-course');
  var nameErr    = document.getElementById('reg-name-error');
  var emailErr   = document.getElementById('reg-email-error');
  var companyErr = document.getElementById('reg-company-error');
  var courseErr  = document.getElementById('reg-course-error');
  var btn        = document.getElementById('reg-submit-btn');

  // Reset errors
  [nameEl, emailEl, companyEl, courseEl].forEach(function(el){ el.classList.remove('error'); });
  [nameErr, emailErr, companyErr, courseErr].forEach(function(el){ el.classList.remove('visible'); });

  var name    = nameEl.value.trim();
  var email   = emailEl.value.trim();
  var company = companyEl.value.trim();
  var course  = courseEl.value;
  var valid = true;

  if(!name){
    nameEl.classList.add('error');
    nameErr.classList.add('visible');
    valid = false;
  }
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    emailEl.classList.add('error');
    emailErr.classList.add('visible');
    valid = false;
  }
  if(!company){
    companyEl.classList.add('error');
    companyErr.classList.add('visible');
    valid = false;
  }
  if(!course){
    courseEl.classList.add('error');
    courseErr.classList.add('visible');
    valid = false;
  }
  if(!valid) return;

  btn.disabled = true;
  btn.textContent = 'Saving…';

  var userId = generateUserId();
  var user = { name: name, email: email, company: company, course: course, id: userId };

  saveUser(user);
  updateProfileButton();
  submitRegistrationToForm(user);

  setTimeout(function(){
    showRegistrationSuccess(userId);
    btn.disabled = false;
    btn.textContent = 'Continue →';
  }, 600);
}

function showRegistrationSuccess(userId){
  var modal = document.querySelector('#modal-registration .reg-modal');
  if(!modal) return;
  modal.innerHTML =
    '<div class="reg-modal-icon">✅</div>' +
    '<h2>You\'re all set!</h2>' +
    '<p class="reg-sub">Save this ID — it\'s your unique reference if you ever need to contact us about your results.</p>' +
    '<div class="reg-userid-box">' +
      '<div class="reg-userid-label">Your User ID</div>' +
      '<div class="reg-userid-value" id="reg-userid-value">' + userId + '</div>' +
      '<button type="button" class="reg-userid-copy" onclick="copyUserId()">Copy</button>' +
    '</div>' +
    '<button class="reg-submit-btn" onclick="closeRegistrationModal()">Start practicing →</button>';
}

function copyUserId(){
  var el = document.getElementById('reg-userid-value');
  if(!el) return;
  var txt = el.textContent;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).catch(function(){});
  } else {
    var ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
  }
  var btn = document.querySelector('.reg-userid-copy');
  if(btn){ var orig = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function(){ btn.textContent = orig; }, 1200); }
}

function closeRegistrationModal(){
  document.getElementById('modal-registration').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function(){
  updateProfileButton();
  if (!loadUser()) {
    document.getElementById('modal-registration').classList.add('open');
  }
});

function _postFormFields(fields){
  try {
    var frameName = 'gform-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    var iframe = document.createElement('iframe');
    iframe.setAttribute('name', frameName);
    iframe.name = frameName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    var formEl = document.createElement('form');
    formEl.method = 'POST';
    formEl.action = FORM_ACTION;
    formEl.target = frameName;

    for (var key in fields){
      if (!key || key.indexOf('PASTE_') !== -1) continue;
      var v = fields[key];
      if (v === undefined || v === null || v === '') continue;
      var input = document.createElement('input');
      input.type  = 'hidden';
      input.name  = key;
      input.value = String(v);
      formEl.appendChild(input);
    }

    document.body.appendChild(formEl);
    formEl.submit();

    setTimeout(function(){
      if (formEl.parentNode) formEl.parentNode.removeChild(formEl);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 3000);
  } catch(e){
    console.warn('Form submission failed:', e);
  }
}

function submitRegistrationToForm(u){
  if (!u) return;
  var fields = {};
  fields[ENTRY_NAME]     = u.name || '';
  fields[ENTRY_EMAIL]    = u.email || '';
  fields[ENTRY_ID]       = u.id || '';
  fields[ENTRY_COMPANY]  = u.company || '';
  fields[ENTRY_COURSE]   = u.course || '';
  fields[ENTRY_ACTIVITY] = 'Registration';
  _postFormFields(fields);
}

function attemptFormFields(att){
  var u = loadUser() || {};
  var fields = {};
  fields[ENTRY_NAME]    = u.name || '';
  fields[ENTRY_EMAIL]   = u.email || '';
  fields[ENTRY_ID]      = u.id || '';
  fields[ENTRY_COMPANY] = u.company || '';
  fields[ENTRY_COURSE]  = u.course || '';

  if (att.type === 'exam'){
    fields[ENTRY_ACTIVITY]   = 'Exam';
    fields[ENTRY_FAMILY]     = att.mode === 'ctai' ? 'CT-AI' : att.mode === 'ctfl' ? 'CTFL' : 'CT-GenAI';
    fields[ENTRY_PACK_ROUND] = 'Pack #' + att.pack;
    fields[ENTRY_CORRECT]    = att.correct;
    fields[ENTRY_WRONG]      = att.wrong;
    fields[ENTRY_UNANSWERED] = att.unanswered;
    fields[ENTRY_TOTAL]      = att.total;
    fields[ENTRY_SCORE_PCT]  = att.pct;
    fields[ENTRY_VERDICT]    = att.passed ? 'PASSED' : 'FAILED';
  } else if (att.type === 'blitz'){
    fields[ENTRY_ACTIVITY]   = 'Blitz';
    fields[ENTRY_FAMILY]     = poolLabel(att.pool);
    fields[ENTRY_PACK_ROUND] = '10Q round';
    fields[ENTRY_CORRECT]    = att.correct;
    fields[ENTRY_WRONG]      = att.total - att.correct;
    fields[ENTRY_UNANSWERED] = 0;
    fields[ENTRY_TOTAL]      = att.total;
    fields[ENTRY_SCORE_PCT]  = att.pct;
    fields[ENTRY_VERDICT]    = att.passed ? 'PASSED' : 'FAILED';
  } else if (att.type === 'glossary'){
    fields[ENTRY_ACTIVITY]   = 'Glossary';
    fields[ENTRY_FAMILY]     = poolLabel(att.pool);
    fields[ENTRY_PACK_ROUND] = '5 rounds';
    fields[ENTRY_CORRECT]    = att.correct;
    fields[ENTRY_WRONG]      = Math.max(0, (att.total || 0) - (att.correct || 0));
    fields[ENTRY_UNANSWERED] = 0;
    fields[ENTRY_TOTAL]      = att.total;
    fields[ENTRY_SCORE_PCT]  = att.pct;
    fields[ENTRY_VERDICT]    = '';
  }
  return fields;
}

function submitAttemptToForm(att){
  if (!att) return;
  _postFormFields(attemptFormFields(att));
}

function showResults(){
  var correct=0,wrong=0,unanswered=0;
  for(var i=0;i<TOTAL_Q;i++){
    var ans=userAnswers[i]||[];
    if(ans.length===0){unanswered++;continue;}
    if(ans.slice().sort().join(',')===questions[i].correct.slice().sort().join(','))correct++;
    else wrong++;
  }
  var pct=Math.round(correct/TOTAL_Q*100);
  var passed=pct>=65;
  var color=passed?'#22c55e':'#ef4444';
  var ring=document.getElementById('score-ring');
  ring.style.setProperty('--pct',pct+'%');ring.style.setProperty('--sc',color);
  var sp=document.getElementById('score-pct');sp.textContent=pct+'%';sp.style.color=color;
  var vd=document.getElementById('verdict');
  vd.textContent=passed?'PASSED':'FAILED';vd.className='verdict '+(passed?'pass':'fail');
  document.getElementById('result-sub').textContent='Pack #'+currentPack+' \u00b7 '+correct+'/'+TOTAL_Q+' correct \u00b7 Pass mark 65%';
  var autoBadge=document.getElementById('auto-submit-badge');
  if(autoBadge)autoBadge.style.display=_autoSubmitted?'':'none';
  _autoSubmitted=false;
  document.getElementById('stat-correct').textContent=correct;
  document.getElementById('stat-wrong').textContent=wrong;
  document.getElementById('stat-unanswered').textContent=unanswered;
  document.getElementById('review-filter').value='all';
  applyFilter();
  showScreen('screen-results');
  if (!_skipSaveAttempt) {
    saveAttempt({
      type: 'exam',
      mode: currentMode,
      pack: currentPack,
      correct: correct, wrong: wrong, unanswered: unanswered,
      total: TOTAL_Q, pct: pct, passed: passed,
      userAnswers: userAnswers
    });
  }
  _skipSaveAttempt = false;
}

/* ── REVIEW ── */
function applyFilter(){
  var filter=document.getElementById('review-filter').value;
  reviewList=[];
  for(var i=0;i<TOTAL_Q;i++){
    var ans=userAnswers[i]||[];
    var sa=ans.slice().sort().join(','),sc=questions[i].correct.slice().sort().join(',');
    var status=ans.length===0?'unanswered':(sa===sc?'correct':'wrong');
    if(filter==='all'||filter===status)reviewList.push({qi:i,status:status});
  }
  reviewIdx=0;renderReviewCard();
}

function renderReviewCard(){
  var card=document.getElementById('review-card');
  if(reviewList.length===0){
    card.innerHTML='<div style="text-align:center;color:var(--text4);padding:24px;font-size:14px;">No questions match this filter.</div>';
    document.getElementById('review-pos').textContent='0 / 0';
    document.getElementById('btn-rv-prev').disabled=true;
    document.getElementById('btn-rv-next').disabled=true;
    return;
  }
  var item=reviewList[reviewIdx];
  var q=questions[item.qi];
  var userAns=userAnswers[item.qi]||[];

  var fullExp=q.exp||'';
  var whyNotMatch=fullExp.match(/\n?(?:Why not the others|Why others are incorrect|Why others|Why not)[^\n]*[:\n]/i);
  var mainExp=fullExp,whyNot='';
  if(whyNotMatch){
    var splitIdx=fullExp.indexOf(whyNotMatch[0]);
    mainExp=fullExp.substring(0,splitIdx).trim();
    whyNot=fullExp.substring(splitIdx+whyNotMatch[0].length).trim();
  }

  var html='<div class="rv-qnum">Question '+(item.qi+1)+' of '+TOTAL_Q+'</div>';
  html+='<div class="rv-qtext">'+renderQText(q.q)+'</div>';
  html+='<div class="rv-opts">';
  for(var i=0;i<q.opts.length;i++){
    var isCor=q.correct.indexOf(i)>=0;
    var isSel=userAns.indexOf(i)>=0;
    var cls='rv-opt'+(isCor?' correct':isSel&&!isCor?' wrong':'');
    var icon=isCor?'&#10003;':isSel&&!isCor?'&#10007;':'&nbsp;';
    html+='<div class="'+cls+'"><span class="rv-icon">'+icon+'</span><span><span class="rv-letter">'+LETTERS[i]+')</span>'+esc(q.opts[i])+'</span></div>';
  }
  html+='</div>';
  if(mainExp){
    html+='<div class="rv-exp-block"><div class="rv-exp-title">Explanation</div><div class="rv-exp-text">'+esc(mainExp)+'</div></div>';
  }
  if(whyNot){
    html+='<div class="rv-why-block"><div class="rv-why-title">Why the others are wrong</div><div class="rv-why-text">'+esc(whyNot)+'</div></div>';
  }
  card.innerHTML=html;
  document.getElementById('review-pos').textContent=(reviewIdx+1)+' / '+reviewList.length;
  document.getElementById('btn-rv-prev').disabled=(reviewIdx===0);
  document.getElementById('btn-rv-next').disabled=(reviewIdx===reviewList.length-1);
}

function reviewNav(dir){
  reviewIdx=Math.max(0,Math.min(reviewList.length-1,reviewIdx+dir));
  renderReviewCard();
}

/* ── PDF EXPORT ── */
function downloadResultsPdf(){
  if (!questions || !questions.length) return;
  var u = loadUser() || {};
  var correct=0,wrong=0,unanswered=0;
  for(var i=0;i<TOTAL_Q;i++){
    var ans=userAnswers[i]||[];
    if(ans.length===0){unanswered++;continue;}
    if(ans.slice().sort().join(',')===questions[i].correct.slice().sort().join(','))correct++;
    else wrong++;
  }
  var pct=Math.round(correct/TOTAL_Q*100);
  var passed=pct>=65;
  var fam = currentMode==='ctai' ? 'CT-AI' : currentMode==='ctfl' ? 'CTFL' : 'CT-GenAI';
  var examTitle = fam + ' Exam · Pack #' + currentPack;
  var now = new Date();
  var pad = function(n){ return n<10?'0'+n:''+n; };
  var dateStr = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes());

  var html = '';
  html += '<div class="pdf-page">';
  html += '<div class="pdf-header">';
  html += '<div class="pdf-title">ISTQB® Exam Simulator — Results</div>';
  html += '<div class="pdf-sub">'+esc(examTitle)+' · '+esc(dateStr)+'</div>';
  html += '</div>';

  html += '<div class="pdf-user">';
  if (u.name)  html += '<div><b>Name:</b> '+esc(u.name)+'</div>';
  if (u.email) html += '<div><b>Email:</b> '+esc(u.email)+'</div>';
  if (u.id)    html += '<div><b>User ID:</b> '+esc(u.id)+'</div>';
  html += '</div>';

  html += '<div class="pdf-score-row">';
  html += '<div class="pdf-score-pct '+(passed?'pass':'fail')+'">'+pct+'%</div>';
  html += '<div class="pdf-score-meta">';
  html += '<div class="pdf-verdict '+(passed?'pass':'fail')+'">'+(passed?'PASSED':'FAILED')+'</div>';
  html += '<div>'+correct+' correct &middot; '+wrong+' wrong &middot; '+unanswered+' unanswered (out of '+TOTAL_Q+')</div>';
  html += '<div style="font-size:11px;color:#666;">Pass mark: 65%</div>';
  html += '</div>';
  html += '</div>';

  for (var qi=0; qi<TOTAL_Q; qi++){
    var q = questions[qi];
    var userAns = userAnswers[qi] || [];
    var isCorrect = userAns.length>0 && userAns.slice().sort().join(',')===q.correct.slice().sort().join(',');
    var status = userAns.length===0 ? 'unanswered' : (isCorrect ? 'correct' : 'wrong');
    var statusLabel = status==='correct' ? '✓ Correct' : status==='wrong' ? '✗ Wrong' : '— Unanswered';

    html += '<div class="pdf-q '+status+'">';
    html += '<div class="pdf-q-head">';
    html += '<span class="pdf-q-num">Q'+(qi+1)+'</span>';
    html += '<span class="pdf-q-status '+status+'">'+statusLabel+'</span>';
    html += '</div>';
    html += '<div class="pdf-q-text">'+renderQText(q.q)+'</div>';
    html += '<div class="pdf-opts">';
    for (var oi=0; oi<q.opts.length; oi++){
      var isCor = q.correct.indexOf(oi)>=0;
      var isSel = userAns.indexOf(oi)>=0;
      var optCls = 'pdf-opt';
      if (isCor) optCls += ' correct';
      else if (isSel) optCls += ' selected-wrong';
      var marker = isCor ? '✓' : (isSel ? '✗' : '·');
      html += '<div class="'+optCls+'"><span class="pdf-opt-mark">'+marker+'</span><b>'+LETTERS[oi]+')</b> '+esc(q.opts[oi])+'</div>';
    }
    html += '</div>';
    if (q.exp){
      html += '<div class="pdf-exp"><div class="pdf-exp-title">Explanation</div><div>'+esc(q.exp).replace(/\n/g,'<br>')+'</div></div>';
    }
    html += '</div>';
  }

  html += '<div class="pdf-footer">Generated by ISTQB Exam Simulator · '+esc(dateStr)+(u.id ? ' · '+esc(u.id) : '')+'</div>';
  html += '</div>';

  document.getElementById('print-area').innerHTML = html;
  document.body.classList.add('printing');
  // Give the browser a moment to apply layout, then open print dialog
  setTimeout(function(){
    window.print();
    document.body.classList.remove('printing');
  }, 50);
}

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderQText(s){
  return esc(s).replace(/\n\n/g,'<div class="q-gap"></div>').replace(/\n/g,'<br>');
}

/* ── CT-AI EXAM ── */
var currentMode = 'genai';

var _origStartExam = startExam;
startExam = function(pack) {
  currentMode = 'genai';
  _origStartExam(pack);
};

function startExamCtai(pack) {
  currentMode = 'ctai';
  currentPack = pack;
  questions = CTAI_PACKS[String(pack)];
  userAnswers = {}; flagged = {}; currentQ = 0; secondsLeft = EXAM_SECS;
  _autoSubmitted=false;_oneMinuteWarned=false;
  if(_timesUpInterval){clearInterval(_timesUpInterval);_timesUpInterval=null;}
  clearInterval(timerInterval);
  document.getElementById('exam-title').textContent = 'CT-AI \u2014 Pack #' + pack;
  showScreen('screen-exam');
  buildNavGrid();
  renderQuestion();
  updateTimerDisplay();
  timerInterval = setInterval(tickTimer, 1000);
}

function startExamCtfl(pack) {
  currentMode = 'ctfl';
  currentPack = pack;
  questions = CTFL_PACKS[String(pack)];
  userAnswers = {}; flagged = {}; currentQ = 0; secondsLeft = EXAM_SECS;
  _autoSubmitted=false;_oneMinuteWarned=false;
  if(_timesUpInterval){clearInterval(_timesUpInterval);_timesUpInterval=null;}
  clearInterval(timerInterval);
  document.getElementById('exam-title').textContent = 'CTFL \u2014 Pack #' + pack;
  showScreen('screen-exam');
  buildNavGrid();
  renderQuestion();
  updateTimerDisplay();
  timerInterval = setInterval(tickTimer, 1000);
}

var _origDoLeave = doLeave;
doLeave = function() {
  var wasPendingProfile = pendingProfileNav;
  closeModals();
  clearInterval(timerInterval);
  if (wasPendingProfile) { openProfile(); return; }
  showScreen(currentMode === 'ctai' ? 'screen-ctai-home' : currentMode === 'ctfl' ? 'screen-ctfl-home' : 'screen-genai-home');
};

var _origDoSubmit = doSubmit;
doSubmit = function() {
  var backScreen = currentMode === 'ctai' ? 'screen-ctai-home' : currentMode === 'ctfl' ? 'screen-ctfl-home' : 'screen-genai-home';
  var backBtn = document.getElementById('back-after-results');
  if (backBtn) backBtn.setAttribute('data-screen', backScreen);
  _origDoSubmit();
};

/* ── GLOSSARY GAME ── */
var glossRoundTerms = [];
var glossRound = 0;
var glossTotalAttempts = 0;
var glossTotalCorrect = 0;
var glossCurrentPairs = [];
var glossMatchedCount = 0;
var glossCurrentPool = 'ctfl';
var glossDetails = [];
var glossRoundWrongCount = {};

function startGlossary(type) {
  glossCurrentPool = type || 'ctfl';
  var pool = (type === 'ctai' ? CTAI_GLOSSARY : type === 'genai' ? GENAI_GLOSSARY : GLOSSARY).slice();
  document.querySelector('#screen-glossary .page-header-title').textContent =
    type === 'ctai' ? 'CT-AI Glossary Practice' : type === 'genai' ? 'GenAI Glossary Practice' : 'CTFL Glossary Practice';
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  glossRoundTerms = pool.slice(0, 30);
  glossRound = 0;
  glossTotalAttempts = 0;
  glossTotalCorrect = 0;
  glossDetails = [];
  glossRoundWrongCount = {};
  showScreen('screen-glossary');
  glossRenderRound();
}

function glossRenderRound() {
  var start = glossRound * 6;
  glossCurrentPairs = glossRoundTerms.slice(start, start + 6).map(function(p, i) {
    return { term: p.term, definition: p.definition, idx: i };
  });
  glossMatchedCount = 0;
  glossRoundWrongCount = {0:0,1:0,2:0,3:0,4:0,5:0};

  document.getElementById('gloss-round-badge').textContent = 'Round ' + (glossRound + 1) + ' of 5';
  document.getElementById('gloss-progress').style.width = (glossRound / 5 * 100) + '%';
  document.getElementById('gloss-next-btn').style.display = 'none';

  if (window.matchMedia('(max-width: 600px)').matches) {
    glossRenderDropdownRound();
  } else {
    glossRenderDragRound();
  }
}

function glossRenderDropdownRound() {
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  var defOrder  = shuffleArr([0,1,2,3,4,5]);
  var termOrder = shuffleArr([0,1,2,3,4,5]);

  var listEl = document.getElementById('gloss-dd-list');
  listEl.innerHTML = '';
  defOrder.forEach(function(pairIdx) {
    var card = document.createElement('div');
    card.className = 'gloss-dd-card';
    card.dataset.pairIdx = pairIdx;

    var defEl = document.createElement('div');
    defEl.className = 'gloss-dd-def';
    defEl.textContent = glossCurrentPairs[pairIdx].definition;
    card.appendChild(defEl);

    var select = document.createElement('select');
    select.className = 'gloss-dd-pick';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— pick a term —';
    select.appendChild(placeholder);
    termOrder.forEach(function(termPairIdx) {
      var opt = document.createElement('option');
      opt.value = String(termPairIdx);
      opt.textContent = glossCurrentPairs[termPairIdx].term;
      select.appendChild(opt);
    });
    select.addEventListener('change', glossOnSelect);
    card.appendChild(select);

    listEl.appendChild(card);
  });
}

function glossOnSelect(e) {
  var select = e.currentTarget;
  var card = select.closest('.gloss-dd-card');
  if (!card || card.classList.contains('matched-correct')) return;
  if (select.value === '') return;

  var pickedTermPairIdx = parseInt(select.value);
  var defPairIdx = parseInt(card.dataset.pairIdx);
  var correct = (pickedTermPairIdx === defPairIdx);

  glossTotalAttempts++;
  if (correct) {
    glossTotalCorrect++;
    glossMatchedCount++;
    var pair = glossCurrentPairs[defPairIdx];
    glossDetails.push({
      round: glossRound + 1,
      term: pair.term,
      definition: pair.definition,
      wrongCount: glossRoundWrongCount[defPairIdx] || 0
    });
    card.classList.add('matched-correct');
    var pickedTerm = glossCurrentPairs[pickedTermPairIdx].term;
    var lockedEl = document.createElement('div');
    lockedEl.className = 'gloss-dd-pick';
    lockedEl.textContent = '✓ ' + pickedTerm;
    select.replaceWith(lockedEl);

    document.querySelectorAll('#gloss-dd-list select.gloss-dd-pick').forEach(function(s) {
      var opt = s.querySelector('option[value="' + pickedTermPairIdx + '"]');
      if (opt) opt.remove();
    });

    if (glossMatchedCount === 6) {
      var btn = document.getElementById('gloss-next-btn');
      btn.style.display = 'block';
      btn.textContent = glossRound === 4 ? 'See results' : 'Next round →';
    }
  } else {
    glossRoundWrongCount[defPairIdx] = (glossRoundWrongCount[defPairIdx] || 0) + 1;
    card.classList.add('matched-wrong');
    setTimeout(function() {
      card.classList.remove('matched-wrong');
      select.value = '';
    }, 700);
  }
}

function glossRenderDragRound() {

  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  var defOrder  = shuffleArr([0,1,2,3,4,5]);
  var termOrder = shuffleArr([0,1,2,3,4,5]);


  var termsEl = document.getElementById('gloss-terms');
  termsEl.innerHTML = '';
  termOrder.forEach(function(pairIdx) {
    var el = document.createElement('div');
    el.className = 'gloss-term';
    el.textContent = glossCurrentPairs[pairIdx].term;
    el.dataset.pairIdx = pairIdx;
    el.draggable = true;
    el.addEventListener('dragstart', glossDragStart);
    el.addEventListener('dragend',   glossDragEnd);
    el.addEventListener('dragover',  glossTermDragOver);
    el.addEventListener('dragleave', glossTermDragLeave);
    el.addEventListener('drop',      glossTermDrop);
    termsEl.appendChild(el);
  });

  var defsEl = document.getElementById('gloss-defs');
  defsEl.innerHTML = '';
  defOrder.forEach(function(pairIdx) {
    var el = document.createElement('div');
    el.className = 'gloss-def';
    el.textContent = glossCurrentPairs[pairIdx].definition;
    el.dataset.pairIdx = pairIdx;
    el.addEventListener('dragover',  glossDefDragOver);
    el.addEventListener('dragleave', glossDefDragLeave);
    el.addEventListener('drop',      glossDefDrop);
    defsEl.appendChild(el);
  });
  /* Equalise heights: measure tallest natural tile, apply to all */
  setTimeout(function() {
    var allTiles = Array.prototype.slice.call(
      document.querySelectorAll('.gloss-term, .gloss-def')
    );
    allTiles.forEach(function(el) { el.style.height = 'auto'; });
    var maxH = allTiles.reduce(function(m, el) {
      return Math.max(m, el.getBoundingClientRect().height);
    }, 0);
    allTiles.forEach(function(el) { el.style.height = maxH + 'px'; });
  }, 0);
}

function glossDragStart(e) {
  glossDragSrc = parseInt(this.dataset.pairIdx);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(glossDragSrc));
}

function glossDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.gloss-def').forEach(function(d)  { d.classList.remove('drag-over'); });
  document.querySelectorAll('.gloss-term').forEach(function(t) { t.classList.remove('drag-over-term'); });
}

function glossDefDragOver(e) {
  e.preventDefault();
  if (!this.classList.contains('matched-correct')) this.classList.add('drag-over');
}
function glossDefDragLeave() { this.classList.remove('drag-over'); }

function glossTermDragOver(e) {
  e.preventDefault();
  if (parseInt(this.dataset.pairIdx) !== glossDragSrc && !this.classList.contains('matched-correct'))
    this.classList.add('drag-over-term');
}
function glossTermDragLeave() { this.classList.remove('drag-over-term'); }

function glossTermDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over-term');
  var targetIdx = parseInt(this.dataset.pairIdx);
  if (targetIdx === glossDragSrc || this.classList.contains('matched-correct')) return;
  /* Reorder terms — does NOT count as an attempt */
  var termsEl = document.getElementById('gloss-terms');
  var srcEl = null, tgtEl = null;
  termsEl.querySelectorAll('.gloss-term').forEach(function(el) {
    if (parseInt(el.dataset.pairIdx) === glossDragSrc) srcEl = el;
    if (parseInt(el.dataset.pairIdx) === targetIdx)    tgtEl = el;
  });
  if (!srcEl || !tgtEl) return;
  var srcNext = srcEl.nextSibling;
  var tgtNext = tgtEl.nextSibling;
  if (srcNext === tgtEl)       { termsEl.insertBefore(tgtEl, srcEl); }
  else if (tgtNext === srcEl)  { termsEl.insertBefore(srcEl, tgtEl); }
  else { termsEl.insertBefore(srcEl, tgtNext); termsEl.insertBefore(tgtEl, srcNext); }
}

function glossDefDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  if (this.classList.contains('matched-correct')) return;

  var defPairIdx  = parseInt(this.dataset.pairIdx);
  var termPairIdx = glossDragSrc;
  var correct     = (defPairIdx === termPairIdx);

  /* Count every drop onto a definition as one attempt */
  glossTotalAttempts++;
  if (correct) glossTotalCorrect++;
  else glossRoundWrongCount[defPairIdx] = (glossRoundWrongCount[defPairIdx] || 0) + 1;

  this.classList.add(correct ? 'matched-correct' : 'matched-wrong');

  var termsEl = document.getElementById('gloss-terms');
  termsEl.querySelectorAll('.gloss-term').forEach(function(el) {
    if (parseInt(el.dataset.pairIdx) === termPairIdx) {
      el.classList.add(correct ? 'matched-correct' : 'matched-wrong');
      if (correct) { el.draggable = false; el.style.cursor = 'default'; }
    }
  });

  if (correct) {
    glossMatchedCount++;
    var dragPair = glossCurrentPairs[defPairIdx];
    glossDetails.push({
      round: glossRound + 1,
      term: dragPair.term,
      definition: dragPair.definition,
      wrongCount: glossRoundWrongCount[defPairIdx] || 0
    });
    if (glossMatchedCount === 6) {
      var btn = document.getElementById('gloss-next-btn');
      btn.style.display = 'block';
      btn.textContent = glossRound === 4 ? 'See results' : 'Next round \u2192';
    }
  } else {
    var defEl = this;
    setTimeout(function() { defEl.classList.remove('matched-wrong'); }, 700);
    termsEl.querySelectorAll('.gloss-term').forEach(function(el) {
      if (parseInt(el.dataset.pairIdx) === termPairIdx)
        setTimeout(function() { el.classList.remove('matched-wrong'); }, 700);
    });
  }
}

function glossNextRound() {
  if (glossRound >= 4) { glossShowResults(); return; }
  glossRound++;
  glossRenderRound();
}

function glossShowResults() {
  var pct = glossTotalAttempts === 0 ? 100 : Math.round(glossTotalCorrect / glossTotalAttempts * 100);
  document.getElementById('gloss-final-pct').textContent = pct + '%';
  document.getElementById('gloss-final-detail').textContent =
    glossTotalCorrect + ' correct out of ' + glossTotalAttempts + ' total attempts';
  document.getElementById('gloss-progress').style.width = '100%';
  showScreen('screen-glossary-results');
  saveAttempt({
    type: 'glossary',
    pool: glossCurrentPool,
    correct: glossTotalCorrect, total: glossTotalAttempts, pct: pct,
    details: glossDetails.slice()
  });
}


/* ── KNOWLEDGE BLITZ ── */
var blitzPool=[];
var blitzQuestions=[];
var blitzIdx=0;
var blitzCorrect=0;
var blitzCurrentPool='ctfl';
var blitzAnswered=false;
var blitzDetails=[];

function startBlitz(pool){
  blitzCurrentPool=pool;
  var src=pool==='ctfl'?CTFL_BLITZ:pool==='ctai'?CTAI_BLITZ:pool==='genai'?GENAI_BLITZ:[];
  blitzPool=src;
  var _src=src.slice();for(var _i=_src.length-1;_i>0;_i--){var _j=Math.floor(Math.random()*(_i+1));var _t=_src[_i];_src[_i]=_src[_j];_src[_j]=_t;}blitzQuestions=_src.slice(0,10);
  blitzIdx=0;blitzCorrect=0;blitzDetails=[];
  document.getElementById('blitz-title').textContent=pool==='ctfl'?'CTFL Knowledge Blitz':pool==='ctai'?'CT-AI Knowledge Blitz':pool==='genai'?'GenAI Knowledge Blitz':'Blitz';
  showScreen('screen-blitz');
  blitzRenderQ();
}

function blitzRenderQ(){
  var q=blitzQuestions[blitzIdx];
  var num=blitzIdx+1;
  document.getElementById('blitz-q-num').textContent='Question '+num+' of 10';
  document.getElementById('blitz-round-badge').textContent='Q '+num+' of 10';
  document.getElementById('blitz-q-text').textContent=q.q;
  document.getElementById('blitz-progress').style.width=(blitzIdx/10*100)+'%';
  document.getElementById('blitz-feedback').textContent='';
  document.getElementById('blitz-feedback').className='blitz-feedback';
  var tb=document.getElementById('blitz-true-btn');
  var fb=document.getElementById('blitz-false-btn');
  tb.disabled=false;fb.disabled=false;
  tb.className='blitz-tf-btn true-btn';
  fb.className='blitz-tf-btn false-btn';
  blitzAnswered=false;
}

function blitzAnswer(answer){
  if(blitzAnswered)return;
  blitzAnswered=true;
  var q=blitzQuestions[blitzIdx];
  var correct=(answer===q.a);
  if(correct)blitzCorrect++;
  blitzDetails.push({ q: q.q, correctAns: q.a, userAns: answer, isCorrect: correct });
  var tb=document.getElementById('blitz-true-btn');
  var fb=document.getElementById('blitz-false-btn');
  tb.disabled=true;fb.disabled=true;
  var feedEl=document.getElementById('blitz-feedback');
  if(correct){
    (answer==='True'?tb:fb).className='blitz-tf-btn correct';
    feedEl.textContent='Correct!';
    feedEl.className='blitz-feedback correct-fb';
  } else {
    (answer==='True'?tb:fb).className='blitz-tf-btn wrong';
    (q.a==='True'?tb:fb).className='blitz-tf-btn reveal-correct';
    feedEl.textContent='Wrong - the answer is '+q.a;
    feedEl.className='blitz-feedback wrong-fb';
  }
  setTimeout(function(){
    blitzIdx++;
    if(blitzIdx>=10){blitzShowResults();}
    else{blitzRenderQ();}
  },900);
}

function blitzShowResults(){
  var pct=Math.round(blitzCorrect/10*100);
  var el=document.getElementById('blitz-final-pct');
  el.textContent=pct+'%';
  el.className='blitz-final-pct '+(pct>=65?'pass':'fail');
  document.getElementById('blitz-final-detail').textContent=
    blitzCorrect+' correct out of 10 questions - '+(pct>=65?'Great work!':'Keep practising!');
  document.getElementById('blitz-progress').style.width='100%';
  showScreen('screen-blitz-results');
  saveAttempt({
    type: 'blitz',
    pool: blitzCurrentPool,
    correct: blitzCorrect, total: 10, pct: pct, passed: pct>=65,
    details: blitzDetails.slice()
  });
}

/* ── PROFILE & PERSISTENCE ── */
var LS_USER = 'quizhub_user';
var LS_ATTEMPTS = 'quizhub_attempts';
var _skipSaveAttempt = false;

function loadUser(){
  try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
  catch(e){ return null; }
}
function saveUser(u){
  try { localStorage.setItem(LS_USER, JSON.stringify(u)); } catch(e){}
}
function loadAttempts(){
  try { return JSON.parse(localStorage.getItem(LS_ATTEMPTS) || '[]'); }
  catch(e){ return []; }
}
var lastAttemptId = null;
function saveAttempt(att){
  try {
    var arr = loadAttempts();
    att.id = Date.now() + '-' + Math.random().toString(36).slice(2,7);
    att.date = new Date().toISOString();
    arr.unshift(att);
    if (arr.length > 100) arr = arr.slice(0, 100);
    localStorage.setItem(LS_ATTEMPTS, JSON.stringify(arr));
    lastAttemptId = att.id;
    submitAttemptToForm(att);
    return att.id;
  } catch(e){ console.warn('Save attempt failed:', e); return null; }
}
function getInitials(name){
  if(!name) return '?';
  var parts = name.trim().split(/\s+/);
  var first = parts[0]?parts[0][0]:'';
  var second = parts[1]?parts[1][0]:'';
  return (first + second).toUpperCase() || '?';
}
function updateProfileButton(){
  var btn = document.getElementById('profile-btn');
  if(!btn) return;
  var u = loadUser();
  if (u && u.name) {
    btn.textContent = getInitials(u.name);
    btn.title = u.name + ' — view profile';
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
}

function openProfile(){
  renderProfile();
  showScreen('screen-profile');
}

function formatAttemptDate(iso){
  var d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  var pad = function(n){ return n<10?'0'+n:''+n; };
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' · '+pad(d.getHours())+':'+pad(d.getMinutes());
}

function attemptLabel(att){
  if (att.type === 'exam') {
    var fam = att.mode === 'ctai' ? 'CT-AI' : att.mode === 'ctfl' ? 'CTFL' : 'CT-GenAI';
    return fam + ' Exam · Pack #' + att.pack;
  }
  if (att.type === 'blitz') {
    var fam2 = att.pool === 'ctai' ? 'CT-AI' : att.pool === 'genai' ? 'GenAI' : 'CTFL';
    return fam2 + ' Knowledge Blitz';
  }
  if (att.type === 'glossary') {
    var fam3 = att.pool === 'ctai' ? 'CT-AI' : att.pool === 'genai' ? 'GenAI' : 'CTFL';
    return fam3 + ' Glossary Practice';
  }
  return att.type;
}

function renderProfile(){
  var u = loadUser();
  document.getElementById('profile-avatar').textContent = u && u.name ? getInitials(u.name) : '👤';
  document.getElementById('profile-name').textContent = u && u.name ? u.name : 'Guest';
  document.getElementById('profile-email').textContent = u && u.email ? u.email : 'No email registered';
  document.getElementById('profile-userid').textContent = u && u.id ? 'ID: ' + u.id : '';

  var listEl = document.getElementById('profile-attempts');
  var arr = loadAttempts();
  if (arr.length === 0) {
    listEl.innerHTML = '<div class="profile-empty">No attempts yet. Complete an exam, blitz, or glossary practice to see it here.</div>';
    return;
  }
  var html = '';
  for (var i=0; i<arr.length; i++) {
    var a = arr[i];
    var verdictText = a.type === 'exam' ? (a.passed?'PASSED':'FAILED') : (a.type === 'blitz' ? (a.passed?'PASSED':'FAILED') : '');
    var verdictCls = a.passed ? 'pass' : 'fail';
    var pctColor = a.type==='glossary' ? '#1cb0f6' : (a.passed ? '#16a34a' : '#ef4444');
    var clickable = (a.type === 'exam' && a.userAnswers) ||
                    ((a.type === 'blitz' || a.type === 'glossary') && a.details && a.details.length);
    var onclickAttr = '';
    if (clickable) {
      if (a.type === 'exam') onclickAttr = ' onclick="reopenAttempt(\''+a.id+'\')"';
      else if (a.type === 'blitz') onclickAttr = ' onclick="reopenBlitzAttempt(\''+a.id+'\')"';
      else if (a.type === 'glossary') onclickAttr = ' onclick="reopenGlossaryAttempt(\''+a.id+'\')"';
    }
    html += '<div class="attempt-item'+(clickable?' clickable':'')+'"'+onclickAttr+'>'+
      '<div class="attempt-meta">'+
        '<div class="attempt-type">'+esc(attemptLabel(a))+'</div>'+
        '<div class="attempt-date">'+esc(formatAttemptDate(a.date))+(a.type!=='glossary' ? ' · '+a.correct+'/'+a.total+' correct' : ' · '+a.correct+'/'+a.total+' attempts')+'</div>'+
      '</div>'+
      '<div class="attempt-score">'+
        '<div class="attempt-pct" style="color:'+pctColor+'">'+a.pct+'%</div>'+
        (verdictText ? '<div class="attempt-verdict '+verdictCls+'">'+verdictText+'</div>' : '')+
      '</div>'+
      '</div>';
  }
  listEl.innerHTML = html;
}

function reopenAttempt(id){
  var arr = loadAttempts();
  var att = null;
  for (var i=0; i<arr.length; i++) { if (arr[i].id === id) { att = arr[i]; break; } }
  if (!att || att.type !== 'exam' || !att.userAnswers) return;

  currentMode = att.mode;
  currentPack = att.pack;
  questions = (att.mode === 'ctai' ? CTAI_PACKS : att.mode === 'ctfl' ? CTFL_PACKS : PACKS)[String(att.pack)];
  if (!questions) return;
  userAnswers = att.userAnswers;
  _skipSaveAttempt = true;
  showResults();
}

function findAttempt(id){
  var arr = loadAttempts();
  for (var i=0; i<arr.length; i++) { if (arr[i].id === id) return arr[i]; }
  return null;
}

function viewLastAttempt(type){
  if (!lastAttemptId) return;
  if (type === 'blitz') reopenBlitzAttempt(lastAttemptId);
  else if (type === 'glossary') reopenGlossaryAttempt(lastAttemptId);
  else if (type === 'exam') reopenAttempt(lastAttemptId);
}

function poolLabel(pool){
  return pool === 'ctai' ? 'CT-AI' : pool === 'genai' ? 'GenAI' : 'CTFL';
}

function reopenBlitzAttempt(id){
  var att = findAttempt(id);
  if (!att || att.type !== 'blitz' || !att.details) return;

  document.getElementById('blitz-review-title').textContent =
    poolLabel(att.pool) + ' Knowledge Blitz — review';
  document.getElementById('blitz-review-meta').textContent =
    formatAttemptDate(att.date) + ' · ' + att.correct + '/' + att.total + ' correct · ' + att.pct + '%';

  var html = '';
  for (var i=0; i<att.details.length; i++){
    var d = att.details[i];
    var cls = d.isCorrect ? 'correct' : 'wrong';
    var icon = d.isCorrect ? '✓' : '✗';
    html += '<div class="rv-item '+cls+'">';
    html += '<div class="rv-item-head"><span class="rv-item-num">Q'+(i+1)+'</span>';
    html += '<span class="rv-item-status '+cls+'">'+icon+' '+(d.isCorrect?'Correct':'Wrong')+'</span></div>';
    html += '<div class="rv-item-q">'+esc(d.q)+'</div>';
    html += '<div class="rv-item-ans">';
    html += '<div>Your answer: <b>'+esc(d.userAns)+'</b></div>';
    if (!d.isCorrect) html += '<div>Correct answer: <b>'+esc(d.correctAns)+'</b></div>';
    html += '</div>';
    html += '</div>';
  }
  document.getElementById('blitz-review-list').innerHTML = html;
  showScreen('screen-blitz-review');
}

var _glossReviewByRound = {};
var _glossReviewRound = 1;
var _glossReviewMaxRound = 5;

function reopenGlossaryAttempt(id){
  var att = findAttempt(id);
  if (!att || att.type !== 'glossary' || !att.details) return;

  document.getElementById('gloss-review-title').textContent =
    poolLabel(att.pool) + ' Glossary Practice — review';
  document.getElementById('gloss-review-meta').textContent =
    formatAttemptDate(att.date) + ' · ' + att.correct + '/' + att.total + ' attempts · ' + att.pct + '%';

  var firstTry = 0, retried = 0;
  _glossReviewByRound = {};
  var maxRound = 1;
  for (var i=0; i<att.details.length; i++){
    var d = att.details[i];
    if (d.wrongCount===0) firstTry++; else retried++;
    var r = d.round || 1;
    if (r > maxRound) maxRound = r;
    if (!_glossReviewByRound[r]) _glossReviewByRound[r] = [];
    _glossReviewByRound[r].push(d);
  }
  _glossReviewMaxRound = maxRound;

  document.getElementById('gloss-review-summary').innerHTML =
    '<div><b>'+firstTry+'</b> matched on first try</div>'+
    '<div><b>'+retried+'</b> needed retries</div>';

  var tabsHtml = '';
  for (var r=1; r<=maxRound; r++){
    var pairs = _glossReviewByRound[r] || [];
    var hasRetry = false;
    for (var k=0;k<pairs.length;k++) if (pairs[k].wrongCount>0) { hasRetry = true; break; }
    var dotCls = hasRetry ? 'retry' : 'clean';
    tabsHtml += '<button class="gloss-rv-tab" data-round="'+r+'" onclick="glossReviewSelectRound('+r+')">';
    tabsHtml += 'Round '+r+'<span class="gloss-rv-dot '+dotCls+'"></span></button>';
  }
  document.getElementById('gloss-review-tabs').innerHTML = tabsHtml;

  _glossReviewRound = 1;
  glossReviewSelectRound(1);
  showScreen('screen-glossary-review');
}

function glossReviewSelectRound(r){
  _glossReviewRound = r;
  var tabs = document.querySelectorAll('#gloss-review-tabs .gloss-rv-tab');
  for (var i=0;i<tabs.length;i++){
    var tr = parseInt(tabs[i].getAttribute('data-round'));
    tabs[i].classList.toggle('active', tr === r);
  }
  var pairs = _glossReviewByRound[r] || [];
  var html = '';
  for (var j=0; j<pairs.length; j++){
    var d = pairs[j];
    var cls = d.wrongCount===0 ? 'correct' : 'retried';
    var icon = d.wrongCount===0 ? '✓' : '↻';
    var statusText = d.wrongCount===0 ? 'First try' : (d.wrongCount + ' wrong before correct');
    html += '<div class="rv-item '+cls+'">';
    html += '<div class="rv-item-head"><span class="rv-item-num">Pair '+(j+1)+' of '+pairs.length+'</span>';
    html += '<span class="rv-item-status '+cls+'">'+icon+' '+statusText+'</span></div>';
    html += '<div class="rv-item-q"><b>'+esc(d.term)+'</b></div>';
    html += '<div class="rv-item-ans">'+esc(d.definition)+'</div>';
    html += '</div>';
  }
  document.getElementById('gloss-review-list').innerHTML = html;
  document.getElementById('gloss-review-pos').textContent = 'Round '+r+' of '+_glossReviewMaxRound;
  document.getElementById('gloss-review-prev').disabled = (r <= 1);
  document.getElementById('gloss-review-next').disabled = (r >= _glossReviewMaxRound);
}

function glossReviewNav(dir){
  var n = _glossReviewRound + dir;
  if (n < 1 || n > _glossReviewMaxRound) return;
  glossReviewSelectRound(n);
}
