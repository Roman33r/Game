import {useEffect,useRef} from 'react';
import * as T from 'three';
import {useGame,orderTo,placeBuilding,support} from '../game/store';
import {GROUP_KEYS,groupKey,selectUnits,selectedUnits,selectionCentre,storeGroup,recallGroup,unitsInRectangle} from '../game/commands';
import {distance,visible} from '../game/systems';
import {BUILDINGS,BUILDING_SIZE} from '../game/data';
import {MAP,BUILD_RADIUS,BASE_CLEARING,inBaseClearing} from '../game/mapConfig';
import {structureFootprint,rotateBlueprint} from '../game/structureGeometry';
import {CombatEffects} from './combatEffects';
import {CITY_BUILDINGS} from '../game/cityLayout';
import {constructionProgress,constructionCrew,placementError} from '../game/construction';
import {buildingModels,batchCity} from './buildingModels';
type Props={onDistrict:(id:number)=>void;supportMode:boolean;onSupport:()=>void;focus:number;strategic:boolean;focusPoint?:{x:number;z:number}|null;onBuildingHover?:(id:string|null,point:{x:number;y:number})=>void};
export default function WorldView({onDistrict,supportMode,onSupport,focus,strategic,focusPoint,onBuildingHover}:Props){
 const host=useRef<HTMLDivElement>(null);const api=useRef<{zoom:(v:number)=>void;focus:(p?:{x:number;z:number})=>void}|null>(null);const props=useRef({onDistrict,supportMode,onSupport,onBuildingHover});props.current={onDistrict,supportMode,onSupport,onBuildingHover};
 useEffect(()=>{api.current?.focus(focusPoint??undefined);},[focus]);useEffect(()=>{api.current?.zoom(strategic?4.6:1);},[strategic]);
 useEffect(()=>{
  const el=host.current!;const scene=new T.Scene();scene.background=new T.Color('#151e1b');scene.fog=new T.FogExp2('#1c2825',.0017);
  const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;el.appendChild(renderer.domElement);
  const camera=new T.OrthographicCamera(-100,100,70,-70,.1,2400);const center=new T.Vector3(-30,0,0);let zoom=1.12,targetZoom=1.12;const sun=new T.DirectionalLight('#ffd7a0',2.8);sun.position.set(-180,320,120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-390,right:390,top:320,bottom:-320,near:1,far:1000});sun.shadow.bias=-.0007;scene.add(sun,new T.AmbientLight('#afc4c2',1.2));
  const materials=new Map<string,T.MeshStandardMaterial>();const mat=(color:string)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:1}));return materials.get(color)!;};
  const boxGeo=new T.BoxGeometry(1,1,1);const box=(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{const mesh=new T.Mesh(boxGeo,mat(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  box(scene,0,-1,0,MAP.width+10,2,MAP.depth+10,'#343e35');
  box(scene,BASE_CLEARING.x,.007,BASE_CLEARING.z,BASE_CLEARING.width,.014,BASE_CLEARING.depth,'#414c3d');
  const streets=new T.Group();
  for(let x=MAP.minX;x<=MAP.maxX;x+=40){box(streets,x,.02,0,9,.1,MAP.depth,'#242b29');for(let z=MAP.minZ+5;z<MAP.maxZ;z+=9)box(streets,x,.1,z,.22,.03,3,'#807e59');box(streets,x-5,.1,0,1,.2,MAP.depth,'#687064');}
  for(let z=MAP.minZ;z<=MAP.maxZ;z+=40){box(streets,0,.08,z,MAP.width,.1,9,'#242b29');for(let x=MAP.minX+5;x<MAP.maxX;x+=9)box(streets,x,.15,z,3,.03,.22,'#807e59');box(streets,0,.12,z-5,MAP.width,.2,1,'#687064');}scene.add(batchCity(streets));
  let seed=72;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const modelFactory=buildingModels(box,mat);const chunks=new Map<string,T.Group>();
  for(const building of CITY_BUILDINGS){const key=`${Math.floor(building.x/80)},${Math.floor(building.z/80)}`;let group=chunks.get(key);if(!group){group=new T.Group();chunks.set(key,group);}group.add(modelFactory.city(building));}for(const group of chunks.values())scene.add(batchCity(group));
  // Abandoned cars, streetlights, vegetation and debris break up the road grid.
  for(let i=0;i<150;i++){let x=MAP.minX+10+rnd()*(MAP.width-20),z=Math.round((MAP.minZ+20+rnd()*(MAP.depth-40))/40)*40+2;if(inBaseClearing({x,z}))continue;const car=new T.Group();car.position.set(x,0,z);car.rotation.y=rnd()>.5?0:Math.PI/2;scene.add(car);box(car,0,1,0,2.5,1.5,5,['#8d7152','#535f5d','#72574b'][i%3]);box(car,0,2,0,2.2,1,2.6,'#293b39');for(const a of [-1.3,1.3])for(const b of [-1.6,1.6])box(car,a,.6,b,.5,1,1,'#1d2523');}
  for(let i=0;i<200;i++){const x=MAP.minX+5+rnd()*(MAP.width-10),z=MAP.minZ+5+rnd()*(MAP.depth-10);if(inBaseClearing({x,z}))continue;box(scene,x,.2,z,1+rnd()*2,.4,1,'#747261');}
  for(let i=0;i<70;i++){const x=Math.round((MAP.minX+20+rnd()*(MAP.width-40))/40)*40+7,z=MAP.minZ+10+rnd()*(MAP.depth-20);box(scene,x,3.5,z,.35,7,.35,'#282e29');box(scene,x+1,7,z,2.5,.4,.6,'#b3ad79');}
  const grid=new T.GridHelper(MAP.width,64,'#607064','#3d5145');grid.scale.z=MAP.depth/MAP.width;grid.position.y=.17;scene.add(grid);(grid.material as T.Material).transparent=true;(grid.material as T.Material).opacity=.15;
  const fires:T.Group[]=[];for(const [fx,fz] of [[70,40],[-140,-40],[80,80],[121,-79]]){const fire=new T.Group();fire.position.set(fx,0,fz);scene.add(fire);box(fire,0,.1,0,6,.12,8,'#20241c');for(let j=0;j<7;j++)box(fire,(rnd()-.5)*2,1+j*.4,(rnd()-.5)*2,.7,1.8,.7,j%2?'#e8a553':'#ae5b2d');for(let j=0;j<6;j++){const m=box(fire,Math.sin(j)*1.6,5+j*2,0,2+j*.45,2+j*.45,2+j*.45,'#40473d');m.material=new T.MeshStandardMaterial({color:'#434a40',transparent:true,opacity:.35-j*.04,depthWrite:false});}const light=new T.PointLight('#ff9d43',50,18);light.position.y=3;fire.add(light);fires.push(fire);}
  const rainPositions=new Float32Array(450*6);for(let i=0;i<450;i++){const x=MAP.minX+rnd()*MAP.width,z=MAP.minZ+rnd()*MAP.depth,y=rnd()*70;rainPositions.set([x,y,z,x-.4,y-2,z],i*6);}const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#9da99a',transparent:true,opacity:.13,depthWrite:false}));scene.add(rain);
  const dynamic=new T.Group();scene.add(dynamic);const models=new Map<string,T.Group>();
  function person(g:T.Group,x:number,z:number,color:string){box(g,x,1.4,z, .9,1.1,.65,color);box(g,x,2.25,z,.6,.65,.6,'#ad9776');box(g,x,2.65,z,.8,.35,.8,color);box(g,x-.27,.45,z,.3,.9,.4,'#252f28');box(g,x+.27,.45,z,.3,.9,.4,'#252f28');box(g,x+.6,1.5,z-.4,.25,.25,1.5,'#17201c');}
  function unitModel(kind:string){const g=new T.Group();if(['humvee','truck','tank'].includes(kind)){const tank=kind==='tank',truck=kind==='truck';box(g,0,1.3,0,tank?4.8:3,1.5,tank?7:6,'#78816a');box(g,0,2.5,0,tank?3.4:2.7,1.3,truck?4:3,'#5a6b51');if(tank){box(g,0,3.3,-3,.5,.5,5,'#79856a');for(const x of [-2.5,2.5])box(g,x,.65,0,1,1.3,7,'#26312c');}else{box(g,0,2.6,-1.5,2.4,.7,.1,'#253c39');for(const x of [-1.6,1.6])for(const z of [-2,2])box(g,x,.6,z,.7,1.2,1.2,'#202925');box(g,0,3.4,0,.4,.4,2,'#252f28');}box(g,-1,1,-3.1,.5,.4,.1,'#e6d59f');box(g,1,1,-3.1,.5,.4,.1,'#e6d59f');}else for(let i=0;i<6;i++)person(g,(i%3-1)*2.2,(Math.floor(i/3)-.5)*2.5,kind==='medic'?'#9eac94':kind==='engineer'?'#b29a5c':'#74866b');return g;}
  const rings=new Map<string,T.Mesh>();const ringGeo=new T.RingGeometry(4,4.3,32);const ringMat=new T.MeshBasicMaterial({color:'#b5d78b',side:T.DoubleSide,depthWrite:false});
  const zombieBody=new T.InstancedMesh(boxGeo,mat('#7d8060'),MAP.maxZombies),zombieHead=new T.InstancedMesh(boxGeo,mat('#ada281'),MAP.maxZombies),zombieLegs=new T.InstancedMesh(boxGeo,mat('#414d40'),MAP.maxZombies);scene.add(zombieBody,zombieHead,zombieLegs);const dummy=new T.Object3D();
  const combatEffects=new CombatEffects(scene);
  const route=new T.LineSegments(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#b8ce8c',dashSize:2,gapSize:1}));scene.add(route);
  const ghostMaterial=new T.MeshBasicMaterial({color:'#bfdc8a',transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide});
  const ghost=new T.Mesh(new T.PlaneGeometry(1,1),ghostMaterial);ghost.rotation.x=-Math.PI/2;ghost.visible=false;scene.add(ghost);
  const ghostArrow=new T.ArrowHelper(new T.Vector3(0,0,-1),new T.Vector3(),5,'#d6efac',1.6,1.2);scene.add(ghostArrow);
  const areaGeometry=new T.BufferGeometry().setFromPoints(Array.from({length:96},(_,i)=>new T.Vector3(Math.cos(i/96*Math.PI*2)*BUILD_RADIUS,.24,Math.sin(i/96*Math.PI*2)*BUILD_RADIUS)));
  const areaMaterial=new T.LineBasicMaterial({color:'#bad895',transparent:true,opacity:.65}),areaFillGeometry=new T.CircleGeometry(BUILD_RADIUS,96),areaFillMaterial=new T.MeshBasicMaterial({color:'#9bbf75',transparent:true,opacity:.045,depthWrite:false});
  const buildAreas=new Map<string,T.Group>();
  const ghostOutline=new T.BoxHelper(ghost,'#c9e8a0');scene.add(ghostOutline);let hover:{x:number;z:number}|null=null;
  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);const point=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const v=new T.Vector3();ray.ray.intersectPlane(plane,v);return {x:v.x,z:v.z};};
  const pickBuilding=()=>{
   const groups=useGame.getState().world.buildings.map(b=>models.get(b.id)).filter((g):g is T.Group=>!!g);
   for(const hit of ray.intersectObjects(groups,true)){let object:T.Object3D|null=hit.object,found:string|undefined,shown=true;while(object){if(!object.visible)shown=false;if(object.userData.structureId)found=object.userData.structureId;object=object.parent;}if(shown&&found)return found;}
   return null;
  };
  let lastPick=0;
  const clearWorldHover=()=>props.current.onBuildingHover?.(null,{x:0,y:0});
  const selectionBox=document.createElement('div');selectionBox.className='selection-box';el.appendChild(selectionBox);
  let drag:{x:number;y:number;cx:number;cz:number;button:number;pan:boolean}|null=null;let moved=false;let multi=false;const keys=new Set<string>();
  const down=(e:PointerEvent)=>{clearWorldHover();e.preventDefault();drag={x:e.clientX,y:e.clientY,cx:center.x,cz:center.z,button:e.button,pan:e.button===1||(e.button===0&&e.altKey)};moved=false;multi=e.shiftKey;renderer.domElement.setPointerCapture(e.pointerId);};
  const movePointer=(e:PointerEvent)=>{hover=point(e);if(!drag){if(!useGame.getState().world.buildMode&&!props.current.supportMode&&performance.now()-lastPick>70){lastPick=performance.now();props.current.onBuildingHover?.(pickBuilding(),{x:e.clientX+16,y:e.clientY+14});}return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)moved=true;
   if(moved&&drag.pan){center.x=drag.cx-(dx+dy*1.1)*.16*zoom;center.z=drag.cz+(dx-dy*1.1)*.16*zoom;}
   else if(moved&&drag.button===0&&!useGame.getState().world.buildMode&&!props.current.supportMode){const r=renderer.domElement.getBoundingClientRect();Object.assign(selectionBox.style,{display:'block',left:`${Math.min(e.clientX,drag.x)-r.left}px`,top:`${Math.min(e.clientY,drag.y)-r.top}px`,width:`${Math.abs(dx)}px`,height:`${Math.abs(dy)}px`});}
  };
  const up=(e:PointerEvent)=>{if(!drag)return;const start=drag;drag=null;selectionBox.style.display='none';const w=useGame.getState().world;
   if(moved){if(!start.pan&&start.button===0&&!w.buildMode&&!props.current.supportMode){const r=renderer.domElement.getBoundingClientRect(),ids=unitsInRectangle(w.units,u=>{const p=new T.Vector3(u.x,0,u.z).project(camera);if(p.z< -1||p.z>1)return {x:Infinity,z:Infinity};return {x:(p.x*.5+.5)*r.width,z:(-p.y*.5+.5)*r.height};},{x:start.x-r.left,z:start.y-r.top},{x:e.clientX-r.left,z:e.clientY-r.top});useGame.getState().mutate(w=>selectUnits(w,ids,multi?'add':'replace'));}return;}
   if(start.pan)return;const p=point(e);if(start.button===2){orderTo(p);return;}if(props.current.supportMode){support(p);props.current.onSupport();return;}if(w.buildMode){placeBuilding(p);return;}
   const u=w.units.filter(u=>distance(u,p)<7).sort((a,b)=>distance(a,p)-distance(b,p))[0],building=w.buildings.find(b=>distance(b,p)<7);
   if(u)useGame.getState().mutate(w=>selectUnits(w,[u.id],multi?'toggle':'replace'));
   else if(building)useGame.getState().mutate(w=>{w.selected=[building.id];});
   else{props.current.onDistrict(w.districts.reduce((a,b)=>distance(a,p)<distance(b,p)?a:b).id);if(!multi)useGame.getState().mutate(w=>{w.selected=[];});}
  };
  const cancelDrag=()=>{clearWorldHover();drag=null;selectionBox.style.display='none';keys.clear();};
  const wheel=(e:WheelEvent)=>{e.preventDefault();targetZoom=T.MathUtils.clamp(targetZoom*Math.exp(e.deltaY*.001),.3,5.5);};
  const keydown=(e:KeyboardEvent)=>{
   if(document.querySelector('[aria-modal="true"]')||['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName)||(e.target as HTMLElement).isContentEditable)return;
   if(e.repeat&&['Space','Tab'].includes(e.code))return;
   if(e.code==='KeyR'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&useGame.getState().world.buildMode){e.preventDefault();if(!e.repeat)useGame.getState().mutate(w=>rotateBlueprint(w,e.shiftKey?-1:1));return;}
   const group=groupKey(e);if(GROUP_KEYS.includes(group)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();useGame.getState().mutate(w=>{if(e.shiftKey)storeGroup(w,group);else recallGroup(w,group);});return;}
   if(e.ctrlKey&&e.code==='KeyA'){e.preventDefault();useGame.getState().mutate(w=>selectUnits(w,w.units.filter(u=>u.kind!=='truck').map(u=>u.id)));return;}
   keys.add(e.key.toLowerCase());if(e.code==='Space'){e.preventDefault();useGame.getState().mutate(w=>{w.paused=!w.paused;});}
   if(['1','2','3'].includes(e.key))useGame.getState().mutate(w=>{w.speed=Number(e.key)===3?4:Number(e.key);});
   if(e.key==='Tab'){e.preventDefault();targetZoom=targetZoom>2?.65:4.6;if(targetZoom>2)center.set(0,0,0);}
  };const keyup=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',movePointer);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',cancelDrag);renderer.domElement.addEventListener('pointercancel',cancelDrag);renderer.domElement.addEventListener('pointerleave',clearWorldHover);
  api.current={zoom:v=>{targetZoom=v;if(v>2)center.set(0,0,0);},focus:(p)=>{const w=useGame.getState().world;const units=selectedUnits(w),u=units.length?selectionCentre(units):w.buildings.find(b=>w.selected.includes(b.id));center.set(p?.x??u?.x??-40,0,p?.z??u?.z??0);targetZoom=p?Math.min(targetZoom,1.6):.85;}};
  const resize=()=>{const width=el.clientWidth,height=el.clientHeight;renderer.setSize(width,height);const aspect=width/height;camera.left=-75*aspect;camera.right=75*aspect;camera.top=75;camera.bottom=-75;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();
  let frame=0,last=performance.now(),acc=0;const labels=el.querySelector('.map-labels')!;const labelEls:HTMLDivElement[]=[];const addLabel=(d:{id:number;name:string})=>{const div=document.createElement('div');div.className='district-label';div.innerHTML=`<span>${String(d.id+1).padStart(2,'0')}</span> ${d.name.toUpperCase()}<small></small>`;labels.appendChild(div);return div;};
  const siteLabels=new Map<string,HTMLButtonElement>();
  function render(now:number){frame=requestAnimationFrame(render);const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;if(acc>.08){useGame.getState().step(acc);acc=0;}const w=useGame.getState().world;
   zoom=T.MathUtils.lerp(zoom,targetZoom,.1);const cs=dt*45*zoom;if(keys.has('w')){center.x-=cs;center.z-=cs;}if(keys.has('s')){center.x+=cs;center.z+=cs;}if(keys.has('a')){center.x-=cs;center.z+=cs;}if(keys.has('d')){center.x+=cs;center.z-=cs;}center.x=T.MathUtils.clamp(center.x,MAP.minX+5,MAP.maxX-5);center.z=T.MathUtils.clamp(center.z,MAP.minZ+5,MAP.maxZ-5);camera.position.copy(center).add(new T.Vector3(120,160,120).multiplyScalar(Math.max(1,zoom)));(scene.fog as T.FogExp2).density=.0017/Math.max(1,zoom);const blast=w.impacts.find(i=>i.kind==='explosion'&&i.age<.22&&Math.hypot(i.x-center.x,i.z-center.z)<90);if(blast&&!w.paused){const strength=(1-blast.age/.22)*.45;camera.position.x+=Math.sin(now*.12)*strength;camera.position.y+=Math.cos(now*.1)*strength;}camera.lookAt(center);camera.zoom=1/zoom;camera.updateProjectionMatrix();
   const daylight=.6+.4*Math.cos(w.time/200);sun.intensity=2.5*daylight;
   for(const fire of fires)fire.children.forEach((o,i)=>{if(i>0&&i<8)o.scale.y=1.4+Math.sin(w.time*9+i)*.6;if(i>=8&&i<14){o.position.x=Math.sin(w.time*.5+i)*2;o.position.y=6+(i-8)*2+Math.sin(w.time+i);}});
   rain.visible=w.weather;for(let i=0;i<450;i++){rainPositions[i*6+1]-=dt*20;rainPositions[i*6+4]-=dt*20;if(rainPositions[i*6+1]<0){rainPositions[i*6+1]=70;rainPositions[i*6+4]=68;}}rainGeo.attributes.position.needsUpdate=true;
   const ids=new Set([...w.units,...w.buildings].map(o=>o.id));for(const [id,m]of models)if(!ids.has(id)){dynamic.remove(m);models.delete(id);if(rings.has(id)){scene.remove(rings.get(id)!);rings.delete(id);}}
   for(const u of w.units){let model=models.get(u.id);if(!model){model=unitModel(u.kind);models.set(u.id,model);dynamic.add(model);}model.position.set(u.x,.2,u.z);if(u.target)model.rotation.y=Math.atan2(u.target.x-u.x,u.target.z-u.z)+Math.PI;else if(u.facing!==undefined)model.rotation.y=u.facing; if(!['humvee','tank','truck'].includes(u.kind))model.children.forEach((c,i)=>c.visible=Math.floor(i/6)<u.soldiers);
    let ring=rings.get(u.id);if(!ring){ring=new T.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;scene.add(ring);rings.set(u.id,ring);}ring.position.set(u.x,.25,u.z);ring.visible=w.selected.includes(u.id);
   }
   const crew=constructionCrew(w);
   for(const [id,label]of siteLabels)if(!w.buildings.some(b=>b.id===id&&b.construction)){label.remove();siteLabels.delete(id);}
   for(const b of w.buildings){
    let m=models.get(b.id);if(!m){m=new T.Group();m.add(modelFactory.military(b.kind),modelFactory.site(b.kind));models.set(b.id,m);dynamic.add(m);}m.position.set(b.x,0,b.z);m.rotation.y=(b.rotation||0)*Math.PI/180;m.userData.structureId=b.id;
    const progress=constructionProgress(b),solid=m.children[0],scaffold=m.children[1];scaffold.visible=!!b.construction;solid.children.forEach(part=>{part.visible=!b.construction||progress>=part.userData.revealAt;});
    if(b.construction){let label=siteLabels.get(b.id);if(!label){label=document.createElement('button');label.className='construction-label';label.innerHTML='<strong></strong><span><i></i></span><small></small>';label.onclick=()=>useGame.getState().mutate(w=>{w.selected=[b.id];});label.onmouseenter=e=>props.current.onBuildingHover?.(b.id,{x:e.clientX+16,y:e.clientY+14});label.onmouseleave=clearWorldHover;labels.appendChild(label);siteLabels.set(b.id,label);}
     const rate=Math.min(2,crew.get(b.id)||0),eta=Math.ceil((b.construction.duration-b.construction.elapsed)/Math.max(.01,rate));const p=new T.Vector3(b.x,b.kind==='tower'?15:9,b.z).project(camera);label.style.transform=`translate(${(p.x*.5+.5)*el.clientWidth}px,${(-p.y*.5+.5)*el.clientHeight}px) translate(-50%,-100%)`;label.querySelector('strong')!.textContent=`${BUILDINGS[b.kind].label} · ${Math.floor(progress*100)}%`;(label.querySelector('i') as HTMLElement).style.width=`${progress*100}%`;label.querySelector('small')!.textContent=w.paused?'ПАУЗА':rate?`СТРОИТЕЛЬСТВО · ${eta} с`:'ОЖИДАНИЕ ИНЖЕНЕРОВ';label.dataset.waiting=String(!rate);
    }
    let ring=rings.get(b.id);if(!ring){ring=new T.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;const size=BUILDING_SIZE[b.kind];ring.scale.setScalar(Math.max(...size)/7);scene.add(ring);rings.set(b.id,ring);}ring.position.set(b.x,.26,b.z);ring.visible=w.selected.includes(b.id);
   }
   for(const [id,area]of buildAreas)if(!w.units.some(u=>u.id===id&&u.kind==='engineer')){scene.remove(area);buildAreas.delete(id);}
   for(const engineer of w.units.filter(u=>u.kind==='engineer')){let area=buildAreas.get(engineer.id);if(!area){area=new T.Group();area.add(new T.LineLoop(areaGeometry,areaMaterial));const fill=new T.Mesh(areaFillGeometry,areaFillMaterial);fill.rotation.x=-Math.PI/2;fill.position.y=.2;area.add(fill);scene.add(area);buildAreas.set(engineer.id,area);}area.position.set(engineer.x,0,engineer.z);area.visible=!!w.buildMode;}
   ghost.visible=!!w.buildMode&&!!hover;ghostOutline.visible=ghost.visible;ghostArrow.visible=ghost.visible;
   if(w.buildMode&&hover){const [gw,gd]=structureFootprint(w.buildMode,w.buildRotation);ghost.position.set(hover.x,.3,hover.z);ghost.scale.set(gw,gd,1);const valid=!placementError(w,w.buildMode,hover);ghostMaterial.color.set(valid?'#bfdc8a':'#e58b62');ghostOutline.material.color.set(valid?'#d6efac':'#f29b75');ghostOutline.update();const angle=(w.buildRotation||0)*Math.PI/180;ghostArrow.position.set(hover.x,.55,hover.z);ghostArrow.setDirection(new T.Vector3(-Math.sin(angle),0,-Math.cos(angle)));ghostArrow.setColor(new T.Color(valid?'#d6efac':'#f29b75'));}
   let count=0;for(const z of w.zombies){if(count>=MAP.maxZombies||!visible(w,z))continue;const scale=z.kind==='heavy'?1.7:z.kind==='alpha'?2.5:1;dummy.position.set(z.x,1.2*scale,z.z);dummy.scale.set(.8*scale,1.2*scale,.7*scale);dummy.updateMatrix();zombieBody.setMatrixAt(count,dummy.matrix);dummy.position.y=2.1*scale;dummy.scale.set(.6*scale,.6*scale,.6*scale);dummy.updateMatrix();zombieHead.setMatrixAt(count,dummy.matrix);dummy.position.y=.35*scale;dummy.scale.set(.75*scale,.7*scale,.5*scale);dummy.updateMatrix();zombieLegs.setMatrixAt(count,dummy.matrix);count++;}for(const mesh of [zombieBody,zombieHead,zombieLegs]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;}
   combatEffects.update(w,w.paused?.08:acc);
   const routes=selectedUnits(w).flatMap(u=>u.target?[new T.Vector3(u.x,.4,u.z),new T.Vector3(u.target.x,.4,u.target.z)]:[]);route.geometry.dispose();route.geometry=new T.BufferGeometry().setFromPoints(routes);route.computeLineDistances();
   w.districts.forEach((d,i)=>{const p=new T.Vector3(d.x,0,d.z-27).project(camera);const div=labelEls[i]||(labelEls[i]=addLabel(d));div.style.transform=`translate(${(p.x*.5+.5)*el.clientWidth}px,${(-p.y*.5+.5)*el.clientHeight}px) translate(-50%,-50%)`;div.dataset.status=d.status;div.classList.toggle('strategic',zoom>2.8);div.style.opacity=zoom>.6?'1':'.4';div.querySelector('small')!.textContent=`${d.status==='controlled'?'КОНТРОЛЬ':d.status==='lost'?'НЕТ СВЯЗИ':'УГРОЗА'} · ${Math.ceil(d.survivors)} CIV`;});
   renderer.render(scene,camera);
  }frame=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();selectionBox.remove();window.removeEventListener('blur',cancelDrag);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);renderer.dispose();areaGeometry.dispose();areaMaterial.dispose();areaFillGeometry.dispose();areaFillMaterial.dispose();ghostArrow.dispose();combatEffects.dispose();siteLabels.forEach(label=>label.remove());modelFactory.dispose();scene.traverse(o=>{if(o instanceof T.Mesh&&o.geometry!==boxGeo)o.geometry.dispose();});boxGeo.dispose();materials.forEach(m=>m.dispose());el.removeChild(renderer.domElement);labelEls.forEach(d=>d.remove());};
 },[]);
 return <div className="world" ref={host}><div className="map-labels"/><div className="map-grain"/></div>;
}
