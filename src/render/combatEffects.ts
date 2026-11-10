import * as T from 'three';
import type {World} from '../game/types';
import {WEAPONS} from '../game/ballistics';
export class CombatEffects {
 private group=new T.Group();private dummy=new T.Object3D();private color=new T.Color();
 private geometry=new T.OctahedronGeometry(1,0);
 private heads=new T.InstancedMesh(this.geometry,new T.MeshBasicMaterial({color:'white'}),256);
 private flashes=new T.InstancedMesh(this.geometry,new T.MeshBasicMaterial({color:'#ffe1a0'}),128);
 private particles=new T.InstancedMesh(this.geometry,new T.MeshBasicMaterial({color:'white',transparent:true,opacity:.75,depthWrite:false}),1024);
 private rings=new T.InstancedMesh(new T.RingGeometry(.87,1,32),new T.MeshBasicMaterial({color:'#e7bc79',transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}),128);
 private trailGeo=new T.BufferGeometry();private trails:T.LineSegments;
 private vertices=new Float32Array(256*6);private colors=new Float32Array(256*6);
 constructor(scene:T.Scene){
  this.trailGeo.setAttribute('position',new T.BufferAttribute(this.vertices,3));this.trailGeo.setAttribute('color',new T.BufferAttribute(this.colors,3));
  this.trails=new T.LineSegments(this.trailGeo,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9}));
  for(const object of [this.heads,this.flashes,this.particles,this.rings,this.trails]){object.frustumCulled=false;this.group.add(object);}scene.add(this.group);
 }
 update(w:World,accumulator:number){
  let count=0;for(const p of w.projectiles.slice(0,256)){
   const t=-Math.min(p.age,Math.max(0,.08-accumulator)),x=p.x+p.vx*t,y=p.y+p.vy*t-.5*p.gravity*t*t,z=p.z+p.vz*t;
   const heavy=p.blastRadius>0,tail=Math.min(.045,p.age);this.vertices.set([x-p.vx*tail,y-p.vy*tail,z-p.vz*tail,x,y,z],count*6);
   this.color.set(WEAPONS[p.kind].color);this.colors.set([this.color.r*.3,this.color.g*.25,this.color.b*.2,this.color.r,this.color.g,this.color.b],count*6);
   this.dummy.position.set(x,y,z);this.dummy.scale.setScalar(heavy?.3:.13);this.dummy.updateMatrix();this.heads.setMatrixAt(count,this.dummy.matrix);this.heads.setColorAt(count,this.color);count++;
  }this.heads.count=count;this.heads.instanceMatrix.needsUpdate=true;if(this.heads.instanceColor)this.heads.instanceColor.needsUpdate=true;this.trailGeo.setDrawRange(0,count*2);this.trailGeo.attributes.position.needsUpdate=true;this.trailGeo.attributes.color.needsUpdate=true;
  count=0;for(const s of w.shots.slice(0,128)){this.dummy.position.set(s.from.x,s.y??2,s.from.z);this.dummy.scale.set(.3+s.life*2,.3+s.life*2,.3+s.life*2);this.dummy.updateMatrix();this.flashes.setMatrixAt(count++,this.dummy.matrix);}this.flashes.count=count;this.flashes.instanceMatrix.needsUpdate=true;
  let particle=0,ring=0;for(const impact of w.impacts){
   const explosion=impact.kind==='explosion',phase=impact.age/impact.life,seed=impact.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0);
   for(let j=0;j<(explosion?8:4)&&particle<1024;j++){
    const angle=j*2.4+seed,r=(explosion?impact.radius*.35:1.5)*phase*(.6+j*.09),h=explosion?2+Math.sin(j+seed)*2:1;
    this.dummy.position.set(impact.x+Math.cos(angle)*r,Math.max(.2,impact.y)+h*phase+phase*phase*(explosion?4:1),impact.z+Math.sin(angle)*r);
    const scale=explosion?(phase<.22?(.5+phase*5)*(impact.radius/12):(.3+phase*2)*(1-phase)*impact.radius/6):.15*(1-phase);
    this.dummy.scale.setScalar(Math.max(.01,scale));this.dummy.rotation.set(j+phase,j*.5,phase*2);this.dummy.updateMatrix();this.particles.setMatrixAt(particle,this.dummy.matrix);
    this.color.set(explosion?(phase<.22?(j%2?'#ffcf77':'#f28c3b'):'#54574b'):impact.kind==='flesh'?'#ae5e40':impact.kind==='spark'?'#ffe2a6':'#aca17d');this.particles.setColorAt(particle++,this.color);
   }
   if(explosion&&ring<128){this.dummy.position.set(impact.x,.3,impact.z);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.scale.setScalar(impact.radius*Math.min(1,phase*2));this.dummy.updateMatrix();this.rings.setMatrixAt(ring++,this.dummy.matrix);}
  }this.particles.count=particle;this.particles.instanceMatrix.needsUpdate=true;if(this.particles.instanceColor)this.particles.instanceColor.needsUpdate=true;this.rings.count=ring;this.rings.instanceMatrix.needsUpdate=true;this.dummy.rotation.set(0,0,0);
 }
 dispose(){this.group.removeFromParent();this.geometry.dispose();this.rings.geometry.dispose();this.trailGeo.dispose();for(const mesh of [this.heads,this.flashes,this.particles,this.rings,this.trails])(mesh.material as T.Material).dispose();}
}
