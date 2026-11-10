export type Point = { x:number; z:number };
export type Resource = 'fuel'|'ammo'|'food'|'medicine'|'materials'|'power';
export type UnitKind = 'infantry'|'engineer'|'medic'|'scout'|'humvee'|'tank'|'truck';
export type Order = 'move'|'hold'|'attack'|'rescue'|'retreat'|'escort'|'garrison';
export interface Unit extends Point { id:string; name:string; kind:UnitKind; hp:number; maxHp:number; soldiers:number; ammo:number; morale:number; target?:Point; order:Order; cooldown:number; cargo?:number; delivered?:boolean; facing?:number; escortOffset?:Point }
export interface Zombie extends Point { id:string; kind:'walker'|'runner'|'heavy'|'crawler'|'alpha'; hp:number; cooldown:number; vx?:number; vz?:number }
export interface Structure extends Point { id:string; kind:string; hp:number; maxHp:number; level:number; rotation?:number; construction?:{elapsed:number;duration:number} }
export interface District extends Point { id:number; name:string; survivors:number; stock:number; rescued:number; status:'controlled'|'threatened'|'critical'|'lost'; infrastructure:number }
export interface Shot { from:Point; to:Point; life:number; color:string; y?:number }
export type WeaponKind='rifle'|'sniper'|'machinegun'|'tank'|'mortar'|'artillery';
export interface Projectile extends Point { id:string; kind:WeaponKind; y:number; vx:number; vy:number; vz:number; gravity:number; damage:number; blastRadius:number; age:number; ttl:number; sourceId?:string }
export interface Impact extends Point {id:string;y:number;radius:number;age:number;life:number;kind:'flesh'|'spark'|'explosion'|'dust'}
export interface World { version:2; time:number; speed:number; paused:boolean; resources:Record<Resource,number>; units:Unit[]; zombies:Zombie[]; buildings:Structure[]; districts:District[]; log:{time:number;text:string;type:string}[]; shots:Shot[]; projectiles:Projectile[]; impacts:Impact[]; kills:number; rescued:number; nextEvent:number; phase:number; outcome:''|'won'|'lost'; selected:string[]; groups:Record<string,string[]>; buildMode:string|null; buildRotation?:number; sound:boolean; weather:boolean }
