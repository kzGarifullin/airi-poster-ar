const $=s=>document.querySelector(s);
const ids=['01-book','02-sails'],names=['Книга','Паруса'];
let mindar=null,videos=[],textures=[],active=-1,starting=false,generation=0;
document.querySelectorAll('[data-play]').forEach(button=>button.addEventListener('click',()=>{
 const video=document.getElementById(button.dataset.play);video.hidden=false;video.parentElement.querySelector('img').hidden=true;
 video.play().catch(()=>{});button.textContent='Видео открыто';
}));
function message(text){$('#status').textContent=text;$('#ar-status').textContent=text;}
async function stop(){generation++;starting=false;$('#start').disabled=false;
 videos.forEach(v=>{v.pause();v.remove();});videos=[];active=-1;$('#resume').hidden=true;
 if(mindar){const old=mindar;mindar=null;try{await old.stop();}catch{}old.renderer?.setAnimationLoop(null);old.renderer?.dispose();}
 textures.forEach(t=>t.dispose());textures=[];
 $('#camera').querySelectorAll('video').forEach(v=>v.srcObject?.getTracks().forEach(t=>t.stop()));$('#camera').replaceChildren();
 $('#ar').hidden=true;document.body.classList.remove('scanning');
}
$('#close').addEventListener('click',()=>{stop();message('Камера закрыта. Можно открыть её снова или посмотреть видео.');});
$('#resume').addEventListener('click',async()=>{if(active<0)return;try{await videos[active].play();$('#resume').hidden=true;}catch{message('Не удалось запустить видео. Попробуйте обычный просмотр на странице.');}});
$('#start').addEventListener('click',async()=>{
 if(starting||mindar)return;
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){message('Для AR откройте страницу по HTTPS в Safari или Chrome. Видео можно посмотреть ниже.');return;}
 starting=true;const run=++generation;$('#start').disabled=true;message('Загружаем AR-камеру…');
 document.querySelectorAll('.media video').forEach(v=>v.pause());
 // Unlock both muted videos during the user's tap, before asynchronous engine loading.
 videos=ids.map(id=>{const v=document.createElement('video');v.src='./assets/media/'+id+'.mp4';v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.preload='auto';v.style.cssText='position:fixed;width:1px;height:1px;left:-10px;opacity:0';document.body.append(v);v.play().then(()=>v.pause()).catch(()=>{});return v;});
 try{
  const [THREE,{MindARThree}]=await Promise.all([import('three'),import('./vendor/mindar/mindar-image-three.prod.js')]);
  if(run!==generation)return;
  $('#ar').hidden=false;document.body.classList.add('scanning');
  mindar=new MindARThree({container:$('#camera'),imageTargetSrc:'./assets/targets/targets.mind?v=names-f87d3737',maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',filterMinCF:0.001,filterBeta:1000});
  mindar.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  videos.forEach((video,i)=>{const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;textures.push(texture);
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));
   const anchor=mindar.addAnchor(i);anchor.group.add(mesh);
   anchor.onTargetFound=()=>{if(run!==generation)return;active=i;videos.forEach((v,j)=>{if(j!==i)v.pause();});message(names[i]+': анимация запущена');video.play().then(()=>$('#resume').hidden=true).catch(()=>$('#resume').hidden=false);};
   anchor.onTargetLost=()=>{video.pause();if(active===i){active=-1;$('#resume').hidden=true;message('Наведите камеру на книгу или «Паруса» целиком.');}};
  });
  const engine=mindar;
  message('Разрешите доступ к камере…');await engine.start();
  if(run!==generation){await engine.stop();engine.renderer.dispose();return;}
  engine.renderer.setAnimationLoop(()=>engine.renderer.render(engine.scene,engine.camera));
  message('Наведите камеру на книгу или «Паруса» целиком.');
 }catch(error){console.error(error);await stop();message(error.name==='NotAllowedError'?'Доступ к камере не разрешён. Разрешите его в настройках браузера или смотрите видео ниже.':'Не удалось запустить AR. Откройте страницу в Safari или Chrome; видео доступны ниже.');}
 finally{starting=false;$('#start').disabled=false;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mindar){stop();message('Камера остановлена. Нажмите «Открыть AR-камеру», чтобы продолжить.');}});
