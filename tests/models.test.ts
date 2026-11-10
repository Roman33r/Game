import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildingModels,batchCity} from '../src/render/buildingModels';
import {BUILDINGS} from '../src/game/data';
import {CITY_BUILDINGS} from '../src/game/cityLayout';
test('every structure has a distinct finite model and construction scaffold',()=>{
 const material=new T.MeshStandardMaterial();const geometry=new T.BoxGeometry(1,1,1);
 const factory=buildingModels((parent,x,y,z,w,h,d)=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;},()=>material);
 const counts=new Set<number>();for(const kind of Object.keys(BUILDINGS)){const model=factory.military(kind);const bounds=new T.Box3().setFromObject(model);assert.ok(Number.isFinite(bounds.max.y)&&bounds.max.y>1,kind);assert.ok(model.children.every(o=>Number.isFinite(o.userData.revealAt)),kind);counts.add(model.children.length);assert.ok(factory.site(kind).children.length>10,kind);}
 assert.ok(counts.size>=8);const city=new T.Group();CITY_BUILDINGS.forEach(b=>city.add(factory.city(b)));const merged=batchCity(city);assert.equal(merged.children.length,1);const bounds=new T.Box3().setFromObject(merged);assert.ok(bounds.max.y>20&&bounds.min.x<-140);factory.dispose();geometry.dispose();material.dispose();merged.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
});
