import {createClient} from '@supabase/supabase-js';
import {readFileSync,existsSync} from 'node:fs';
if(existsSync('.env'))for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2]}
const url=process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const phone=String(process.env.ADMIN_PHONE||'').replace(/\D/g,''),password=process.env.ADMIN_PASSWORD,name=process.env.ADMIN_NAME||'Administrador';
if(!url||!key||phone.length<8||phone.length>15||!password||password.length<8){console.error('Configurá .env con URL, SERVICE_ROLE_KEY, ADMIN_PHONE y ADMIN_PASSWORD (8+ caracteres).');process.exit(1)}
const db=createClient(url,key);const {data:created,error}=await db.auth.admin.createUser({email:`${phone}@mistock.example.com`,password,email_confirm:true});
if(error){console.error('No se pudo crear administrador:',error.message);process.exit(1)}
const {error:pError}=await db.from('profiles').insert({id:created.user.id,phone,display_name:name,business_name:'Mi Stock',role:'admin',active:true});
if(pError){await db.auth.admin.deleteUser(created.user.id);console.error('No se pudo crear perfil:',pError.message);process.exit(1)}
console.log('Administrador creado. Ingresá con celular',phone,'y tu contraseña.');
