import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CityBuilding} from '../game/cityLayout';
import {BUILDING_SIZE} from '../game/data';
export type BoxBuilder=(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>T.Mesh;
export function buildingModels(box:BoxBuilder,material:(c:string)=>T.Material){
 const cylinderGeometry=new T.CylinderGeometry(1,1,1,10);
 const coneGeometry=new T.ConeGeometry(1,1,8);
 function cylinder(g:T.Object3D,x:number,y:number,z:number,r:number,h:number,c:string){const m=new T.Mesh(cylinderGeometry,material(c));m.position.set(x,y,z);m.scale.set(r,h,r);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 function beam(g:T.Object3D,a:number[],b:number[],thickness:number,c:string){const start=new T.Vector3(...a as [number,number,number]),end=new T.Vector3(...b as [number,number,number]);const m=box(g,0,0,0,thickness,start.distanceTo(end),thickness,c);m.position.copy(start).lerp(end,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return m;}
 function gable(g:T.Object3D,w:number,d:number,y:number,c:string){for(const side of [-1,1]){const roof=box(g,side*w/4,y+1.1,0,w*.57,.35,d+.8,c);roof.rotation.z=side*-.4;}}
 function cross(g:T.Object3D,x:number,y:number,z:number){box(g,x,y,z,3,.12,.8,'#d7d7bc');box(g,x,y+.01,z,.8,.12,3,'#d7d7bc');box(g,x,y+.03,z,2,.12,.45,'#a94f3d');box(g,x,y+.04,z,.45,.12,2,'#a94f3d');}
 function crate(g:T.Object3D,x:number,y:number,z:number){box(g,x,y,z,1.7,1.4,1.4,'#8e8054');for(const side of [-.6,.6])box(g,x+side,y,z,.16,1.5,1.5,'#4c5940');}
 function sandbags(g:T.Object3D,r=3.5){for(let layer=0;layer<2;layer++)for(let i=0;i<13;i++){const a=(i+layer*.45)/13*Math.PI*1.75;const m=box(g,Math.cos(a)*r,.5+layer*.65,Math.sin(a)*r,1.4,.65,.85,layer?'#a49b72':'#8c8962');m.rotation.y=-a;}}
 function ladder(g:T.Object3D,x:number,z:number,height:number){for(const sx of [-.6,.6])box(g,x+sx,height/2,z,.14,height,.14,'#a4a490');for(let y=.7;y<height;y+=.7)box(g,x,y,z,1.3,.12,.2,'#858d78');}
 function drum(g:T.Object3D,x:number,z:number,c='#6d765b'){cylinder(g,x,1,z,.75,2,c);for(const y of [.35,1.7])cylinder(g,x,y,z,.78,.13,'#3d493b');}
 function military(kind:string){const g=new T.Group();g.name=kind;const [w,d]=BUILDING_SIZE[kind];
  box(g,0,.18,0,w+.6,.36,d+.6,'#555e4b');
  if(kind==='wall'){
   for(let x=-4.5;x<6;x+=3){const m=box(g,x,2,0,2.9,3.6,1.8,'#97998b');m.rotation.z=(x%2)*.004;box(g,x,3.9,0,3.1,.3,2,'#b1b19a');box(g,x,.55,0,3,1,2.7,'#727a68');box(g,x,2.3,-.92,.18,1.6,.12,'#7c8272');}
   for(let x=-5;x<6;x+=1.5){beam(g,[x,4,0],[x+.5,4.9,0],.08,'#55594c');box(g,x,4.55,0,.1,.1,1.4,'#68705e');}
  }else if(kind==='barricade'){
   for(let x=-4;x<=4;x+=2)for(let layer=0;layer<3;layer++)box(g,x+(layer%2)*.25,.55+layer*.65,0,1.9,.65,2.3,['#8c8962','#a49b72','#99926c'][layer]);
   for(const x of [-3,3]){beam(g,[x-1,.4,-1.5],[x+1,3,1.5],.3,'#626b59');beam(g,[x+1,.4,1.5],[x-1,3,-1.5],.3,'#626b59');}
  }else if(kind==='tower'){
   for(const x of [-2.8,2.8])for(const z of [-2.8,2.8]){box(g,x,.5,z,1.4,1,1.4,'#90937e');box(g,x,5,z,.4,9,.4,'#777e64');}
   for(const z of [-2.8,2.8]){beam(g,[-2.8,1,z],[2.8,8,z],.18,'#4c5d4a');beam(g,[2.8,1,z],[-2.8,8,z],.18,'#4c5d4a');}
   box(g,0,8.5,0,7,.5,7,'#8d8d6a');box(g,0,9.3,-3,7,1.2,.4,'#657854');box(g,-3.3,9.3,0,.4,1.2,6,'#657854');box(g,3.3,9.3,0,.4,1.2,6,'#657854');
   for(const x of [-3.3,3.3])for(const z of [-3,3])box(g,x,10.5,z,.2,4,.2,'#54674d');gable(g,7.5,7.5,12,'#4d6048');ladder(g,0,3.5,8.5);
   box(g,0,9.9,-3.3,.45,.4,3,'#283b2e');const light=cylinder(g,2.6,10,-3.4,.5,1,'#d9d4a6');light.rotation.x=Math.PI/2;
  }else if(kind==='mg'||kind==='mortar'){
   sandbags(g);if(kind==='mg'){for(const x of [-1,1])beam(g,[x,.5,1],[0,2.5,0],.18,'#3f4e3c');box(g,0,2.7,-.6,.7,.6,2,'#354533');box(g,0,2.75,-2.3,.25,.25,2.5,'#26372b');box(g,.7,2.5,.3,1,.65,1,'#74805a');}
   else{cylinder(g,0,.6,0,1.2,.25,'#3d4e3b');const barrel=cylinder(g,0,2.3,-.5,.3,3.8,'#657650');barrel.rotation.x=-.45;for(const x of [-1.4,1.4])beam(g,[x,.4,-1],[0,2.7,-.5],.18,'#394c36');}crate(g,-2,1,1);crate(g,2,1,2);
  }else if(kind==='fuel'){
   box(g,0,.5,0,9,.4,8,'#777b65');for(const x of [-2,2]){for(const z of [-2.4,2.4])box(g,x,1,z,1,1.4,.7,'#777f69');const tank=cylinder(g,x,2.5,0,1.6,6.5,'#97a08b');tank.rotation.x=Math.PI/2;for(const z of [-2.2,2.2]){const band=cylinder(g,x,2.5,z,1.65,.18,'#53664d');band.rotation.x=Math.PI/2;}box(g,x,4.15,0,.65,.3,.65,'#3d4e3b');}
   for(const x of [-4.4,4.4])for(const z of [-4.4,4.4])box(g,x,1.8,z,.15,3,.15,'#9a9e84');box(g,0,1,-4.1,6,.3,.3,'#9e8f52');drum(g,4,-2,'#a08b4b');
  }else if(kind==='generator'){
   box(g,0,.65,0,6,1,5,'#394c39');box(g,-.7,2,0,4.7,2.4,3.5,'#89916a');box(g,2,1.8,0,1,2.1,3.5,'#384b3b');for(let z=-1.3;z<1.6;z+=.4)box(g,2.55,1.8,z,.1,1.7,.12,'#9ca387');for(let x=-2.5;x<1;x+=.6)box(g,x,3.26,0,.15,.12,2.7,'#475b3f');cylinder(g,-2,4.2,1,.23,2.7,'#374939');box(g,-1,4.3,1,.2,.2,1,'#374939');box(g,-.5,2,-1.8,1,.6,.1,'#c7b168');drum(g,2.5,2.7);
  }else if(kind==='ammo'){
   box(g,0,2.6,0,8,4.6,5.5,'#60755b');for(let x=-3.7;x<=3.7;x+=.55){box(g,x,2.6,2.8,.12,4.2,.16,'#809071');box(g,x,2.6,-2.8,.12,4.2,.16,'#809071');}box(g,0,5,0,8.4,.3,5.9,'#889376');for(const x of [-1.8,1.8]){box(g,x,2.6,-2.92,3.4,4.2,.16,'#4c654d');box(g,x,2.6,-3.05,.12,3.7,.12,'#a8ac8f');}box(g,0,3.7,2.92,2.2,.8,.08,'#cbb46e');crate(g,-3,1,3.5);crate(g,-1,1,3.5);crate(g,-3,2.4,3.5);
  }else if(kind==='checkpoint'){
   box(g,-3,2,0,4,3.6,4,'#859071');box(g,-3,4,0,4.6,.4,4.6,'#4c614b');box(g,-3,2.7,-2.05,2.7,1.1,.1,'#284b47');box(g,-.94,2.5,0,.1,1.1,2,'#284b47');box(g,0,1.5,-1,.6,2.5,.6,'#a6a180');for(let x=.5;x<5.6;x+=.6)box(g,x,2.5,-1,.6,.35,.35,Math.floor(x*2)%2?'#c1b88f':'#5a6650');for(const x of [-5.5,5.5]){box(g,x,3,2,.15,6,.15,'#818d73');box(g,x,6,2,.9,.4,.7,'#ded8b1');}sandbags(g,3);
  }else if(kind==='workshop'){
   for(const x of [-4.8,4.8]){box(g,x,3.6,0,.4,6.5,10,'#6f8067');for(let z=-4.5;z<5;z+=1)box(g,x+(x>0?.25:-.25),3.5,z,.15,6,.12,'#929a7e');}box(g,0,3.5,4.8,10,6.5,.4,'#62775d');gable(g,10.8,11,7,'#586c51');box(g,0,6.2,-5,10,1,.4,'#8f9b78');box(g,3.7,2.2,1,2,1,5,'#777452');box(g,-3,1,2,2,1.5,3,'#334c3a');for(const x of [-2,2])box(g,x,3,0,.3,5,.3,'#b1a365');box(g,0,5.5,0,4.5,.35,.5,'#b1a365');beam(g,[0,5,0],[0,3,0],.09,'#313e30');crate(g,4,1,-5.5);
  }else{
   const medical=kind==='medical';box(g,0,.65,0,9.2,.7,10,'#667857');box(g,0,2.9,0,9,4.2,10,medical?'#9b9e7d':'#6c805f');gable(g,9.7,10.5,5.4,medical?'#b5b596':'#81916e');for(const x of [-4.6,4.6])for(let z=-4;z<=4;z+=2.7){box(g,x,2.8,z,.15,4.5,.2,'#555e47');beam(g,[x,5,z],[x*1.2,.4,z],.06,'#a3a082');}box(g,0,2,-5.1,2.6,3.2,.15,'#354c3c');for(const x of [-2.8,2.8])box(g,x,3,-5.1,1.7,.9,.15,'#2d5148');
   if(medical){cross(g,0,6.8,0);box(g,-3,.9,-5.8,2,.45,1,'#ddd7b3');crate(g,4,1,5.5);}else{const pole=cylinder(g,4.8,7,4.8,.12,13,'#bec1a4');pole.castShadow=false;box(g,6,11.5,4.8,2.5,1.5,.1,'#b8c699');for(let y=7;y<10;y+=.7)box(g,-4.5,y,4,.1,.12,2.8,'#b1b79b');cylinder(g,-4.5,6,4,.09,11,'#a8b196');const dish=new T.Mesh(coneGeometry,material('#c8c9af'));dish.position.set(-3,6.8,3);dish.scale.set(1.4,.45,1.4);dish.rotation.z=.7;g.add(dish);crate(g,-4,1,-5.6);crate(g,-2,1,-5.6);}}
  // Stage thresholds reveal the actual model from its foundation upward during construction.
  g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g);for(const part of g.children){const b=new T.Box3().setFromObject(part);part.userData.revealAt=Math.max(.08,Math.min(.9,b.min.y/Math.max(1,bounds.max.y)*.85));}
  return g;
 }
 function site(kind:string){const g=new T.Group();const [w,d]=BUILDING_SIZE[kind];const height=kind==='tower'?12:kind==='wall'?5:6;
  box(g,0,.16,0,w+1,.2,d+1,'#605f49');for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){box(g,x,height/2,z,.14,height,.14,'#b7a77c');box(g,x,.6,z,.7,1.2,.7,'#a28a4f');}
  for(let y=2;y<=height;y+=2){for(const x of [-w/2,w/2]){box(g,x,y,0,.16,.16,d,'#aba389');beam(g,[x,y-2,-d/2],[x,y,d/2],.08,'#8f957c');}for(const z of [-d/2,d/2])box(g,0,y,z,w,.16,.16,'#aba389');}
  for(let i=0;i<3;i++){box(g,w/2+.7,.5+i*.3,0,.6,.24,d*.7,'#928463');}crate(g,-w/2,.9,-d/2-1);for(const x of [-w/2,w/2]){const cone=new T.Mesh(coneGeometry,material('#cc9750'));cone.scale.set(.45,1.2,.45);cone.position.set(x,.6,d/2+1);g.add(cone);}return g;
 }
 function city(b:CityBuilding){const g=new T.Group();g.position.set(b.x,0,b.z);const {width:w,depth:d,height:h,style,ruined}=b;const facade=['#8a816b','#7b8375','#8c7764','#687f7a'][style],trim=['#b1a68c','#a4aa96','#baa487','#8eaaa0'][style];
  box(g,0,.35,0,w+1.5,.7,d+1.4,'#737b6b');
  if(ruined){
   box(g,-w*.28,h*.38,0,w*.44,h*.76,d,facade);box(g,w*.21,h*.19,d*.27,w*.55,h*.38,d*.45,facade);
   for(let y=3.6;y<h;y+=3.6){box(g,0,y,0,w,.24,d,'#898b78');if(y>h*.5)break;}
   for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,x,h*.4,z,.45,h*.8,.45,'#b3ad96');
   for(let j=0;j<14;j++){const r=Math.sin(b.seed+j*13)*.5+.5;const m=box(g,(r-.5)*w*1.2,.4+j%3*.3,d*.25+Math.cos(j)*d*.5,.8+r*1.6,.6+r,1.1, j%2?'#8d8973':'#535a4d');m.rotation.y=j*.7;}for(let j=0;j<5;j++)beam(g,[-w/2+j*2,h*.7,0],[-w/2+j*2+.6,h*.7+2,1],.07,'#555f50');
  }else{
   box(g,0,h/2,0,w,h,d,facade);box(g,0,1,0,w+.3,1.8,d+.3,'#5b6859');
   // Window recesses, lintels, ledges and a glazed shop floor wrap the visible facades.
   for(let y=3.4;y<h-.9;y+=3.7){for(let x=-w/2+1.8;x<w/2-1;x+=2.9){for(const side of [-1,1]){box(g,x,y,side*(d/2+.05),1.85,2.1,.16,'#424d45');box(g,x,y+.05,side*(d/2+.16),1.35,1.6,.1,(Math.round(x+y+b.seed)%9===0)?'#b29d66':'#2b4948');box(g,x,y-1.08,side*(d/2+.2),2,.18,.5,trim);box(g,x,y+.1,side*(d/2+.23),.08,1.6,.1,'#81958a');}}
    for(let z=-d/2+2;z<d/2-1;z+=3.4){box(g,w/2+.08,y,z,.16,2,1.8,'#414f46');box(g,w/2+.19,y,z,.12,1.5,1.4,'#2a4848');box(g,w/2+.2,y-1.1,z,.4,.18,2,trim);}if(style===1)box(g,0,y+1.4,0,w+.25,.2,d+.25,trim);
   }
   for(const x of [-w/2+.4,w/2-.4])box(g,x,h/2,-d/2-.13,.45,h,.3,trim);
   box(g,0,1.4,-d/2-.18,2,2.5,.3,'#263b34');box(g,1.5,.4,-d/2-1.1,4,.45,2,'#90927c');
   if(style===0){gable(g,w+1,d+1,h,'#4d6259');for(let z=-d/2+1;z<d/2;z+=2)box(g,0,h+1.4,z,w*.6,.18,.5,'#9ca88d');for(const x of [-w*.28,w*.28]){box(g,x,2,-d/2-.2,3,3.2,.2,'#4a5c51');for(let y=1;y<3.5;y+=.55)box(g,x,y,-d/2-.35,3,.1,.1,'#88917c');}box(g,0,4.5,-d/2-.3,w*.8,.7,.3,'#b2a47d');}
   else{box(g,0,h+.15,0,w+.8,.4,d+.8,'#4b6056');for(const x of [-w/2,w/2])box(g,x,h+.65,0,.35,1,d,'#a0a58d');for(const z of [-d/2,d/2])box(g,0,h+.65,z,w,1,.35,'#a0a58d');box(g,-1,h+.6,2,3,.9,4,'#8e9e8b');for(let z=.8;z<3.6;z+=.6)box(g,-1,h+1.1,z,2.6,.12,.15,'#4d6458');
    if(style===1){for(const x of [-2,2])for(const z of [-2,2])box(g,x,h+1.7,z,.18,3,.18,'#5b6c58');cylinder(g,0,h+3.8,0,2.5,3.2,'#7f8a70');const top=new T.Mesh(coneGeometry,material('#5a6c59'));top.position.set(0,h+6,0);top.scale.set(2.8,1.3,2.8);g.add(top);}
    if(style===2){for(let y=6;y<h;y+=3.7){box(g,w/2+1,y,0,2,.25,d*.55,'#60745d');for(let z=-d*.25;z<d*.26;z+=2)box(g,w/2+1.9,y+.7,z,.1,1.3,.1,'#7e9075');box(g,w/2+1.9,y+1.3,0,.12,.12,d*.55,'#80947a');}ladder(g,w/2+1,1,h);}
    if(style===3){box(g,0,h+2.7,2,w*.7,4,d*.5,'#82948b');box(g,0,h+4.9,2,w*.75,.4,d*.55,'#a5ad99');box(g,w/2+.4,h*.45,0,.7,h*.7,d*.7,'#345a55');for(let y=3;y<h*.8;y+=3.7)box(g,w/2+.85,y,0,.1,.12,d*.7,'#839d8a');}
   }
   if(style!==0){for(const x of [-w*.28,w*.28]){const canopy=box(g,x,3.1,-d/2-1,3.2,.25,2,'#7c9279');canopy.rotation.x=.13;}box(g,-w/2+.5,1.5,-d/2-.2,.8,2.1,.1,'#bfaf79');}
  }
  return g;
 }
 return {military,site,city,dispose:()=>{cylinderGeometry.dispose();coneGeometry.dispose();}};
}
// Static city detail is batched by material: richer facades without thousands of draw calls.
export function batchCity(source:T.Group):T.Group{
 source.updateMatrixWorld(true);const batches=new Map<T.Material,T.BufferGeometry[]>();source.traverse(o=>{if(!(o instanceof T.Mesh))return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld),m=o.material as T.Material;const list=batches.get(m)||[];list.push(geometry);batches.set(m,list);});
 const result=new T.Group();for(const [material,list]of batches){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(geometry){const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);}}return result;
}
