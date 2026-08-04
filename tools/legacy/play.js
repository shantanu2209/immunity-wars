(function(){
  var $  = function(s){ return document.querySelector(s); };
  var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var role = 'captain', tmr;

  window.say = function(m){
    var t=$('#toast'); if(!t) return; t.textContent=m; t.classList.add('on');
    clearTimeout(tmr); tmr=setTimeout(function(){ t.classList.remove('on'); }, 1800);
  };

  window.toggleRole = function(){
    role = (role==='captain' ? 'player' : 'captain');
    $('#roleLabel').textContent = 'You: ' + (role==='captain'?'Captain':'Player');
    var pb=$('#phasebtn');
    if(role==='captain'){ pb.className='phasebtn'; pb.textContent='End command \u2192'; }
    else { pb.className='phasebtn wait'; pb.textContent='Waiting \u2014 captain is commanding\u2026'; }
  };
  window.phaseAct = function(){
    if(role!=='captain'){ say('Only the captain can drive the turn.'); return; }
    say('Would end the command phase \u2014 then pathogens move & multiply.');
  };

  function scrim(on){ var s=$('#scrim'); if(s) s.classList.toggle('on', on); }
  window.closeAll = function(){
    var p=$('#lpanel'); if(p) p.classList.remove('on');
    $$('.sheet').forEach(function(s){ s.classList.remove('on'); });
    scrim(false);
  };

  window.openPathList = function(id){
    closeAll(); $('#lpanel').classList.add('on'); scrim(true);
    if(id) selectPath(id);
  };
  window.selectPath = function(id){
    $$('.pcard').forEach(function(c){ c.style.display='none'; });
    var card=$('#card-'+id); if(card) card.style.display='block';
    $$('.prow').forEach(function(r){ r.classList.toggle('rsel', r.getAttribute('data-id')===id); });
    var row=$('.prow[data-id="'+id+'"]'); if(!row) return;
    flashBody(row.getAttribute('data-loc'));
    lightClass(row.getAttribute('data-fam'));
  };
  function flashBody(loc){
    if(!loc) return;
    var sel = (loc==='hub') ? '#mk-hub' : '#mk-'+loc.replace(':','-');
    var el=$(sel); if(!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setTimeout(function(){ el.classList.remove('flash'); }, 1900);
  }
  function lightClass(fam){
    if(!fam) return;
    var el=$('#ac-'+fam); if(!el) return;
    el.style.outline='2px solid #fff'; el.style.outlineOffset='1px';
    setTimeout(function(){ el.style.outline=''; }, 1500);
  }

  window.selCell = function(el, name, status){
    $$('.ctok').forEach(function(t){ t.classList.remove('sel'); });
    el.classList.add('sel');
    if(status==='spent') say(name+' is spent \u2014 regenerating, can\u2019t act yet.');
    else say(name+' selected \u2014 would open its zoomed panel to act.');
  };

  window.openDrawer = function(name){
    closeAll(); var d=$('#drawer-'+name); if(d){ d.classList.add('on'); scrim(true); }
  };
  window.openChat = function(){
    closeAll(); $('#chatSheet').classList.add('on'); scrim(true);
    var b=$('#chatBadge'); if(b) b.style.display='none';
  };
  window.sendChat = function(){
    var i=$('#chatInput'); if(!i || !i.value.trim()) return;
    var log=$('#chatLog');
    var m=document.createElement('div'); m.className='msg';
    m.innerHTML='<div class="who" style="color:#c084fc">You</div><div class="b">'+i.value.replace(/</g,'&lt;')+'</div>';
    log.appendChild(m); i.value=''; log.scrollTop=log.scrollHeight;
  };

  document.addEventListener('DOMContentLoaded', function(){
    var s=$('#scrim'); if(s) s.addEventListener('click', window.closeAll);
    var ci=$('#chatInput'); if(ci) ci.addEventListener('keydown', function(e){ if(e.key==='Enter') window.sendChat(); });
  });
})();
