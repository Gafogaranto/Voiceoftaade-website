/* Search and details interactions for the Voiceoftaade physical-style bookshelf. */
(() => {
  const input=document.getElementById('bookshelfSearch');
  const clear=document.getElementById('clearBookshelfSearch');
  const display=document.getElementById('bookshelfDisplay');
  const status=document.getElementById('bookshelfResults');
  const panel=document.getElementById('bookDetailPanel');
  if(!input||!clear||!display||!status||!panel)return;
  const books=[...display.querySelectorAll('[data-book]')];
  const details={
    lifehacks:{title:'Series of Life Hacks to Live By',status:'FEATURED EBOOK · AVAILABLE NOW',byline:'By Taiwo Abdulgafar Adekunle · Voiceoftaade',description:'A collection of reflections on perspective, stillness, discipline, time, love, boundaries, fear, failure, and the challenges of modern life—written to encourage wiser choices and more purposeful living.',note:'The reading room checks access through your reader account. Purchase the ebook from the official Payhip listing.',artTitle:'LIFE HACKS',artSmall:'WISDOM FOR THE ROAD AHEAD',actions:[{label:'Purchase ebook ↗',href:'https://payhip.com/b/stSQH',kind:'dark',external:true},{label:'Open reading room ↗',href:'reader.html',kind:'outline'},{label:'Browse store ↗',href:'store.html',kind:'outline'}]},
    casestudy:{title:'Life: A Case Study',status:'COMING SOON',byline:'A forthcoming Voiceoftaade publication',description:'An exploration of human experience, choices, consequences, relationships, society, and the art of living wisely.',note:'This title is still in development. It is not yet available to purchase or read as a finished book.',artTitle:'LIFE: A CASE STUDY',artSmall:'COMING SOON',actions:[]},
    next:{title:'Other Releases',status:'COMING SOON',byline:'More titles from Voiceoftaade Publications',description:'New books and themed collections are being prepared for the Voiceoftaade library.',note:'Check back for release announcements. Purchase and reading options will appear when a title is officially available.',artTitle:'COMING SOON',artSmall:'FUTURE RELEASES',actions:[]}
  };
  function showDetails(key){
    const book=details[key];if(!book)return;
    document.getElementById('detailBookTitle').textContent=book.title;
    document.getElementById('detailBookStatus').textContent=book.status;
    document.getElementById('detailBookByline').textContent=book.byline;
    document.getElementById('detailBookDescription').textContent=book.description;
    document.getElementById('detailBookNote').textContent=book.note;
    const art=document.getElementById('detailBookArt');art.replaceChildren();
    const star=document.createElement('span');star.textContent='✳';
    const title=document.createElement('strong');title.textContent=book.artTitle;
    const small=document.createElement('small');small.textContent=book.artSmall;
    art.append(star,title,small);
    const actions=document.getElementById('detailBookActions');actions.replaceChildren();
    if(book.actions.length){book.actions.forEach(item=>{const a=document.createElement('a');a.className='button '+(item.kind==='dark'?'button-dark':'button-outline');a.href=item.href;a.textContent=item.label;if(item.external){a.target='_blank';a.rel='noopener noreferrer'}actions.appendChild(a)})}
    else {const badge=document.createElement('span');badge.className='pill';badge.textContent='COMING SOON';actions.appendChild(badge)}
    panel.hidden=false;panel.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }
  function update(){
    const q=input.value.trim().toLocaleLowerCase();let shown=0;
    books.forEach(book=>{const match=!q||(details[book.dataset.book].title+' '+details[book.dataset.book].description+' '+details[book.dataset.book].status).toLocaleLowerCase().includes(q);book.hidden=!match;if(match)shown++});
    status.textContent=q?(shown?'Showing '+shown+' matching book(s).':'No books match that search. Try a broader word.'):'Showing all books.';
    clear.disabled=!input.value;
  }
  books.forEach(book=>book.addEventListener('click',()=>showDetails(book.dataset.book)));
  input.addEventListener('input',update);
  clear.addEventListener('click',()=>{input.value='';update();input.focus()});
  document.getElementById('closeBookDetails')?.addEventListener('click',()=>{panel.hidden=true});
  update();
})();